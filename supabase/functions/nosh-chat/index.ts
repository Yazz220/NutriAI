/**
 * nosh-chat Edge Function
 *
 * Multi-turn cookbook chat with tool-calling capability. Nosh can:
 *   - Hand recipe sources to the single capture pipeline
 *   - Scale servings
 *   - Substitute ingredients
 *   - Start timers
 *   - Guide to the next step
 *   - Update the canonical recipe graph and refresh its generated page
 *
 * This replaces the legacy ai-chat function. Key differences:
 *   - Injects the active RecipeGraph as system context
 *   - Passes tool definitions to the model via function calling
 *   - Uses :exacto routing for tool-calling reliability
 *   - Returns tool calls that the client executes
 *
 * Required Supabase Function secrets:
 *   AI_API_KEY   — OpenRouter API key
 *   AI_API_BASE  — Provider base URL (default: https://openrouter.ai/api/v1)
 *   AI_MODEL     — Chat model (default: qwen/qwen3.6-35b-a3b:exacto)
 *
 * Request body:
 *   { messages: ChatMessage[],
 *     recipeGraph?: RecipeGraph,        // active page's recipe
 *     cookbookContext?: { title, styleId, otherRecipes },
 *     tools?: string[],                 // subset of tool names to enable
 *     temperature?: number,
 *     max_tokens?: number
 *   }
 *
 * Response body:
 *   { message: { role, content, tool_calls? },
 *     toolCalls: NoshToolCall[],        // parsed, validated tool calls
 *     usage: { prompt_tokens, completion_tokens, total_tokens, cost? }
 *   }
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { verifyAuth } from '../_shared/auth.ts';
import { corsResponse, jsonError, jsonResponse } from '../_shared/cors.ts';
import { errorResponse } from '../_shared/error.ts';
import { logError, logInfo } from '../_shared/log.ts';
import {
  MAX_LOADED_RECIPES_PER_REQUEST,
  countCompletedToolCallsSinceLatestUser,
} from '../_shared/noshContextLimits.ts';
import {
  callChatCompletion,
  type ChatMessage,
  type ToolDefinition,
  type ToolCall,
} from '../_shared/openrouter.ts';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
// Use :exacto suffix for tool-calling reliability — OpenRouter routes to
// providers with the best tool-calling success rates.
const AI_MODEL = Deno.env.get('AI_MODEL') || 'qwen/qwen3.6-35b-a3b:exacto';
const CHAT_TIMEOUT_MS = 60_000;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type JsonRecord = Record<string, unknown>;

interface CookbookContext {
  activeCookbookId?: string;
  title?: string;
  styleId?: string;
  availableCookbooks?: Array<{ id: string; title: string }>;
}

interface InteractionContext {
  entryPoint: 'shelf-nosh' | 'recipe-ask' | 'cookbook-add' | 'share-to-nosh' | 'walkthrough';
  task: 'collection' | 'recipe-help' | 'capture' | 'walkthrough';
  focus: JsonRecord;
  visibleContext: JsonRecord;
  focusStatus?: 'ready' | 'loading' | 'missing';
  hasAttachedImage?: boolean;
}

interface RequestBody {
  messages: ChatMessage[];
  recipeGraph?: JsonRecord;
  cookbookContext?: CookbookContext;
  interactionContext?: InteractionContext;
  tools?: string[];
  temperature?: number;
  max_tokens?: number;
}

// ---------------------------------------------------------------------------
// Tool definitions — recipe production and in-book cooking tools
// ---------------------------------------------------------------------------
const ALL_TOOLS: Record<string, ToolDefinition> = {
  start_recipe_capture: {
    type: 'function',
    function: {
      name: 'start_recipe_capture',
      description:
        'Ask the user to explicitly move a recipe URL, pasted recipe text, or recipe video from general conversation into the recipe capture flow.',
      parameters: {
        type: 'object',
        properties: {
          sourceType: {
            type: 'string',
            enum: ['url', 'text', 'image', 'video'],
          },
          input: {
            type: 'string',
            description: 'The complete recipe URL, pasted recipe text, or video URL. Omit for an attached image.',
          },
        },
        required: ['sourceType'],
        additionalProperties: false,
      },
    },
  },
  search_recipe_collection: {
    type: 'function',
    function: {
      name: 'search_recipe_collection',
      description:
        'Search the signed-in user\'s entire saved recipe collection. Use this when they name or describe a saved recipe and it is not unambiguously the active recipe.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Recipe name or concise description from the user' },
          cookbookId: {
            type: 'string',
            description: 'Optional cookbook restriction. Only provide it when the user explicitly limits the request to one cookbook.',
          },
          recentFirst: {
            type: 'boolean',
            description: 'Set true only when the user asks for a recent or most recently updated saved recipe.',
          },
          limit: { type: 'integer', minimum: 1, maximum: 5 },
        },
        required: ['query'],
        additionalProperties: false,
      },
    },
  },
  load_recipe: {
    type: 'function',
    function: {
      name: 'load_recipe',
      description:
        'Load the complete canonical RecipeGraph for a recipe returned by search_recipe_collection. Use before answering ingredient, step, serving, adaptation, or shopping-list questions.',
      parameters: {
        type: 'object',
        properties: {
          pageId: { type: 'string', description: 'Exact page id returned by collection search' },
        },
        required: ['pageId'],
        additionalProperties: false,
      },
    },
  },
  open_recipe: {
    type: 'function',
    function: {
      name: 'open_recipe',
      description:
        'Open a resolved saved recipe in its cookbook. Call only when the user explicitly asks to open, show, or take them to that recipe.',
      parameters: {
        type: 'object',
        properties: {
          pageId: { type: 'string', description: 'Exact page id returned by collection search' },
        },
        required: ['pageId'],
        additionalProperties: false,
      },
    },
  },
  list_cookbooks: {
    type: 'function',
    function: {
      name: 'list_cookbooks',
      description: 'Return the compact list of cookbooks available to the signed-in user. Use to resolve a requested destination by title before proposing a collection change.',
      parameters: {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
    },
  },
  organize_recipe: {
    type: 'function',
    function: {
      name: 'organize_recipe',
      description: 'Present a guided confirmation card for moving or copying one resolved recipe to one resolved cookbook. This tool does not mutate until the user confirms the card.',
      parameters: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['move', 'copy'] },
          pageId: { type: 'string', description: 'Exact page id returned by collection search' },
          destinationCookbookId: { type: 'string', description: 'Exact cookbook id returned by list_cookbooks' },
        },
        required: ['action', 'pageId', 'destinationCookbookId'],
        additionalProperties: false,
      },
    },
  },
  scale_servings: {
    type: 'function',
    function: {
      name: 'scale_servings',
      description:
        'Scale all ingredient quantities to a new serving count. Use when the user asks to double, halve, or change the recipe yield. The client recalculates all quantities and preserves originals.',
      parameters: {
        type: 'object',
        properties: {
          targetServings: {
            type: 'integer',
            description: 'The desired number of servings',
            minimum: 1,
            maximum: 100,
          },
        },
        required: ['targetServings'],
        additionalProperties: false,
      },
    },
  },
  substitute_ingredient: {
    type: 'function',
    function: {
      name: 'substitute_ingredient',
      description:
        'Substitute one ingredient for another with culinary awareness. Use when the user asks to swap an ingredient, make a recipe vegan/gluten-free, or use what they have on hand.',
      parameters: {
        type: 'object',
        properties: {
          ingredientName: {
            type: 'string',
            description: 'The name of the ingredient being replaced',
          },
          substituteName: {
            type: 'string',
            description: 'The name of the substitute ingredient',
          },
          substituteQuantity: {
            type: 'string',
            description: 'Quantity for the substitute, if different from original. Use strings for fractions.',
          },
          substituteUnit: {
            type: 'string',
            description: 'Unit for the substitute, if different from original',
          },
          reason: {
            type: 'string',
            description: 'Culinary reasoning for the substitution, shown to the user',
          },
        },
        required: ['ingredientName', 'substituteName'],
        additionalProperties: false,
      },
    },
  },
  start_timer: {
    type: 'function',
    function: {
      name: 'start_timer',
      description:
        'Start a cooking timer on the user\'s device. Use when the user asks to time something, or when referencing a step with a duration.',
      parameters: {
        type: 'object',
        properties: {
          durationMinutes: {
            type: 'integer',
            description: 'Timer duration in minutes',
            minimum: 1,
            maximum: 600,
          },
          label: {
            type: 'string',
            description: 'Optional label for the timer, e.g., "Bake the bread"',
          },
        },
        required: ['durationMinutes'],
        additionalProperties: false,
      },
    },
  },
  guide_next_step: {
    type: 'function',
    function: {
      name: 'guide_next_step',
      description:
        'Highlight a specific step on the page to guide the user. Use when the user asks what to do next, or wants to jump to a step.',
      parameters: {
        type: 'object',
        properties: {
          stepId: {
            type: 'string',
            description: 'The id of the step to highlight, from the recipe graph',
          },
        },
        required: ['stepId'],
        additionalProperties: false,
      },
    },
  },
  set_walkthrough: {
    type: 'function',
    function: {
      name: 'set_walkthrough',
      description:
        'Start or end temporary step-by-step cooking guidance. Start only when the user explicitly asks for a walkthrough, guided cooking, or step-by-step help.',
      parameters: {
        type: 'object',
        properties: {
          active: { type: 'boolean', description: 'True to start guided steps, false to stop' },
        },
        required: ['active'],
        additionalProperties: false,
      },
    },
  },
  update_page_data: {
    type: 'function',
    function: {
      name: 'update_page_data',
      description:
        'Propose JSON-patch-style operations for edits that do not fit the other tools: changing a step, adding a note, fixing a quantity, or adjusting temperature. A saved update refreshes the complete generated page.',
      parameters: {
        type: 'object',
        properties: {
          operations: {
            type: 'array',
            description: 'List of patch operations to apply to the recipe graph',
            items: {
              type: 'object',
              properties: {
                path: {
                  type: 'string',
                  description: 'JSON Pointer path, e.g., "/ingredientGroups/0/ingredients/2/quantity"',
                },
                value: {
                  description: 'The new value, or null to delete',
                },
              },
              required: ['path', 'value'],
              additionalProperties: false,
            },
          },
        },
        required: ['operations'],
        additionalProperties: false,
      },
    },
  },
  regenerate_recipe_page: {
    type: 'function',
    function: {
      name: 'regenerate_recipe_page',
      description:
        'Propose a visually revised complete page for the focused recipe. Use only when the user explicitly asks to change the page design or imagery. The client shows the one-credit cost and keeps the current page selected until the user approves a finished candidate.',
      parameters: {
        type: 'object',
        properties: {
          instruction: {
            type: 'string',
            description: 'The user\'s visual edit or generation direction, without changing recipe text',
            maxLength: 600,
          },
        },
        additionalProperties: false,
      },
    },
  },
};

function selectTools(requested?: string[]): ToolDefinition[] {
  if (!requested) {
    return Object.values(ALL_TOOLS);
  }
  return requested
    .map((name) => ALL_TOOLS[name])
    .filter((tool): tool is ToolDefinition => tool !== undefined);
}

// ---------------------------------------------------------------------------
// System prompt — injects the active recipe graph as context
// ---------------------------------------------------------------------------
function buildSystemPrompt(
  recipeGraph?: JsonRecord,
  cookbookContext?: CookbookContext,
  interactionContext?: InteractionContext,
): string {
  const parts: string[] = [
    'You are Nosh, an AI chef holding the user\'s living personal cookbook.',
    'The cookbook is the primary product. You are the same capable Nosh across purpose-built entry points.',
    'Use natural conversation for reasoning and guided tools when the user is reviewing or committing a change.',
    'The wrapper provides active task context; it does not reduce your culinary intelligence.',
    '',
    'PERSONALITY:',
    '- Warm, concise, practical. You are a helpful cook, not a chatbot.',
    '- Answer from the focused recipe first. Search the collection when the user names another saved recipe.',
    '- When the user asks to change a recipe, use the appropriate preview tool. Never describe a persistent edit as saved until its result says mode="update" or mode="new-version".',
    '- When you call a tool, briefly explain what you\'re doing in the content field.',
    '- Never invent recipe data that isn\'t in the graph. If you don\'t know, say so.',
    '',
  ];

  if (recipeGraph && Object.keys(recipeGraph).length > 0) {
    parts.push('FOCUSED RECIPE:');
    parts.push(JSON.stringify(recipeGraph, null, 2));
    parts.push('');
  } else {
    parts.push('No recipe is currently focused.');
    parts.push('');
  }

  if (cookbookContext) {
    parts.push('CURRENT COOKBOOK:');
    if (cookbookContext.title) parts.push(`Title: ${cookbookContext.title}`);
    if (cookbookContext.styleId) parts.push(`Style: ${cookbookContext.styleId}`);
    if (cookbookContext.activeCookbookId) {
      parts.push(`Active cookbook id: ${cookbookContext.activeCookbookId}`);
    }
    if (cookbookContext.availableCookbooks && cookbookContext.availableCookbooks.length > 0) {
      parts.push('Available cookbooks:');
      for (const cookbook of cookbookContext.availableCookbooks) {
        parts.push(`  - ${cookbook.title} (id: ${cookbook.id})`);
      }
    }
    parts.push('');
  }

  if (interactionContext) {
    parts.push('INTERACTION CONTEXT:');
    parts.push(`Entry point: ${interactionContext.entryPoint}`);
    parts.push(`Active task: ${interactionContext.task}`);
    parts.push(`Conversation focus: ${JSON.stringify(interactionContext.focus)}`);
    parts.push(`Visible app context: ${JSON.stringify(interactionContext.visibleContext)}`);
    parts.push('Conversation focus controls references such as "this recipe". Visible app context is only a route hint and must not silently replace focus.');
  }
  if (interactionContext?.focusStatus === 'missing') {
    parts.push('The focused recipe was deleted or is unavailable. Explain this and help the user search for it or choose another recipe.');
  }
  if (interactionContext?.task === 'capture') {
    parts.push('The active task is recipe capture. The dedicated capture interface owns extraction, destination resolution, page generation, and publishing. Do not call legacy extraction or review tools.');
  }
  if (interactionContext?.task === 'walkthrough') {
    parts.push('- A walkthrough is active because the user explicitly requested it. Track progress only in this conversation. Call set_walkthrough with active=false when the user asks to stop.');
  } else {
    parts.push('- Normal cooking help is open conversation. Call set_walkthrough with active=true only when the user explicitly asks for step-by-step guidance.');
  }
  if (interactionContext?.hasAttachedImage) {
    parts.push('A recipe photo is attached on the client. Call start_recipe_capture with sourceType="image" and omit input.');
  }
  if (interactionContext) parts.push('');

  parts.push('TOOL USE GUIDELINES:');
  if (interactionContext?.task !== 'capture') {
    parts.push('- If the user supplies a recipe URL, pasted recipe text, recipe photo, or recipe video to save, call start_recipe_capture. The dedicated capture interface will continue the import.');
  }
  parts.push('- If a tool returns an error, explain it briefly and ask the user to retry or use another source. Do not automatically call the same failed tool again.');
  parts.push('- Words like "this recipe" refer to the focused recipe, even if the reader is visibly showing another page.');
  parts.push('- When the user names or describes another saved recipe, call search_recipe_collection across the whole collection. Do not assume it must be in the active cookbook.');
  parts.push('- If collection search is ambiguous, briefly name the best candidates with their cookbook titles and ask the user to choose. Never guess.');
  parts.push('- After one saved recipe is resolved, call load_recipe before stating its ingredients, steps, quantities, servings, or building a shopping list. Ground the answer only in the loaded graph.');
  parts.push(`- Load at most ${MAX_LOADED_RECIPES_PER_REQUEST} canonical recipes for one user request. If the user asks for more, help them narrow the set instead of expanding the context.`);
  parts.push('- Before proposing a change to a named recipe outside the current focus, search for it and load its canonical graph. Never modify a recipe from a title match alone.');
  parts.push('- For comparisons, resolve and load each requested recipe separately. Compare only the loaded canonical graphs; never ask for or place the whole collection in context.');
  parts.push('- Call open_recipe only when the user explicitly asks to open, show, or navigate to the resolved recipe. Searching or answering alone must not change screens.');
  parts.push('- When the user asks to move or copy a saved recipe, resolve the exact recipe first, then call list_cookbooks to resolve the exact destination. If either name is ambiguous, ask the user to choose.');
  parts.push('- Call organize_recipe only with exact ids. The card is a proposal, and the persistent change happens only after the user confirms it. Never claim a move or copy succeeded before the tool result confirms it.');
  parts.push('- Conversational delete, bulk organization, and reorder are unavailable. Explain that plainly instead of simulating a change.');
  parts.push('- Use scale_servings when the user says "double this", "halve", "make it for 8 people", etc. The tool offers temporary session use, saved update, saved copy, or cancel. Do not choose for the user.');
  parts.push('- Use substitute_ingredient when the user asks to swap an ingredient or adapt for dietary needs. The tool previews the exact change before anything is saved.');
  parts.push('- Use start_timer when the user asks to time something or references a step with a duration.');
  parts.push('- Use guide_next_step only when the user explicitly asks to be guided, asks what step is next, or asks to jump to a named step. Do not turn normal cooking questions into a walkthrough.');
  parts.push('- Use update_page_data for any other proposed recipe edit (fixing text, adding notes, adjusting temperature). It must remain a preview until the user chooses how to apply it.');
  parts.push('- Use regenerate_recipe_page only after an explicit visual request. Saved recipe-data edits create their own refreshed page through the client workflow.');
  parts.push('- You can call multiple tools in one response if needed.');
  parts.push('- Always explain what you\'re doing in the content field before/alongside tool calls.');

  return parts.join('\n');
}

// ---------------------------------------------------------------------------
// Tool call parsing and validation
// ---------------------------------------------------------------------------
interface ParsedToolCall {
  id: string;
  name: string;
  arguments: JsonRecord;
}

function parseToolCalls(toolCalls: ToolCall[] | undefined): ParsedToolCall[] {
  if (!toolCalls || !Array.isArray(toolCalls)) return [];

  return toolCalls
    .map((call): ParsedToolCall | null => {
      if (!call || call.type !== 'function') return null;
      if (!call.function || typeof call.function.name !== 'string') return null;

      let args: JsonRecord;
      try {
        args = JSON.parse(call.function.arguments || '{}');
      } catch {
        logError('nosh-chat: tool call arguments are not valid JSON', {
          name: call.function.name,
          args: call.function.arguments,
        });
        return null;
      }

      return {
        id: call.id,
        name: call.function.name,
        arguments: args,
      };
    })
    .filter((call): call is ParsedToolCall => call !== null);
}

function validateToolCall(call: ParsedToolCall): boolean {
  switch (call.name) {
    case 'start_recipe_capture':
      return ['url', 'text', 'image', 'video'].includes(String(call.arguments.sourceType))
        && (call.arguments.sourceType === 'image'
          ? call.arguments.input === undefined || typeof call.arguments.input === 'string'
          : typeof call.arguments.input === 'string' && call.arguments.input.trim().length > 0);
    case 'scale_servings':
      return typeof call.arguments.targetServings === 'number' && call.arguments.targetServings >= 1;
    case 'substitute_ingredient':
      return typeof call.arguments.ingredientName === 'string' && typeof call.arguments.substituteName === 'string';
    case 'start_timer':
      return typeof call.arguments.durationMinutes === 'number' && call.arguments.durationMinutes >= 1;
    case 'guide_next_step':
      return typeof call.arguments.stepId === 'string';
    case 'set_walkthrough':
      return typeof call.arguments.active === 'boolean';
    case 'update_page_data':
      return Array.isArray(call.arguments.operations);
    case 'regenerate_recipe_page':
      return call.arguments.instruction === undefined
        || (typeof call.arguments.instruction === 'string' && call.arguments.instruction.length <= 600);
    case 'search_recipe_collection':
      return typeof call.arguments.query === 'string'
        && call.arguments.query.trim().length > 0
        && (call.arguments.cookbookId === undefined || typeof call.arguments.cookbookId === 'string')
        && (call.arguments.recentFirst === undefined || typeof call.arguments.recentFirst === 'boolean')
        && (call.arguments.limit === undefined
          || (typeof call.arguments.limit === 'number' && call.arguments.limit >= 1 && call.arguments.limit <= 5));
    case 'load_recipe':
      return typeof call.arguments.pageId === 'string' && call.arguments.pageId.length > 0;
    case 'open_recipe':
      return typeof call.arguments.pageId === 'string' && call.arguments.pageId.length > 0;
    case 'list_cookbooks':
      return Object.keys(call.arguments).length === 0;
    case 'organize_recipe':
      return ['move', 'copy'].includes(String(call.arguments.action))
        && typeof call.arguments.pageId === 'string'
        && call.arguments.pageId.length > 0
        && typeof call.arguments.destinationCookbookId === 'string'
        && call.arguments.destinationCookbookId.length > 0;
    default:
      return false;
  }
}

function latestToolResult(messages: ChatMessage[], toolName: string): JsonRecord | null {
  const toolNamesById = new Map<string, string>();
  let latest: JsonRecord | null = null;
  for (const message of messages) {
    if (message.role === 'assistant') {
      for (const call of message.tool_calls ?? []) {
        toolNamesById.set(call.id, call.function.name);
      }
    }
    if (
      message.role === 'tool'
      && message.tool_call_id
      && toolNamesById.get(message.tool_call_id) === toolName
      && typeof message.content === 'string'
    ) {
      try {
        const parsed = JSON.parse(message.content);
        if (parsed && typeof parsed === 'object') latest = parsed as JsonRecord;
      } catch {
        // The normal request validator will let the model handle malformed results.
      }
    }
  }
  return latest;
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------
serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return corsResponse(req);
  const requestStartedAt = Date.now();

  const { error: authError } = await verifyAuth(req);
  if (authError) return authError;

  try {
    let body: RequestBody;
    try {
      body = (await req.json()) as RequestBody;
    } catch {
      return jsonError('Invalid JSON body', 400, req);
    }

    if (!Array.isArray(body.messages) || body.messages.length === 0) {
      return jsonError('messages array is required', 400, req);
    }

    // Validate message roles
    for (const msg of body.messages) {
      if (!msg || typeof msg.role !== 'string') {
        return jsonError('Invalid message format', 400, req);
      }
      if (msg.role !== 'system' && msg.role !== 'user' && msg.role !== 'assistant' && msg.role !== 'tool') {
        return jsonError(`Unsupported message role: ${msg.role}`, 400, req);
      }
    }

    if (body.messages.at(-1)?.role === 'tool') {
      const searchResult = latestToolResult(body.messages, 'search_recipe_collection');
      if (typeof searchResult?.status === 'string') {
        logInfo('nosh collection search outcome', {
          status: searchResult.status,
          candidateCount: Array.isArray(searchResult.candidates)
            ? searchResult.candidates.length
            : undefined,
        });
      }
    }

    const loadedRecipeCount = countCompletedToolCallsSinceLatestUser(
      body.messages,
      'load_recipe',
    );
    const tools = selectTools(body.tools).filter((tool) => (
      loadedRecipeCount < MAX_LOADED_RECIPES_PER_REQUEST || tool.function.name !== 'load_recipe'
    ));
    const systemPrompt = buildSystemPrompt(
      body.recipeGraph,
      body.cookbookContext,
      body.interactionContext,
    );

    // Prepend our system prompt. If the client also sent a system message,
    // append it after ours so user instructions are preserved.
    const userSystemMessages = body.messages.filter((m) => m.role === 'system');
    const nonSystemMessages = body.messages.filter((m) => m.role !== 'system');

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...userSystemMessages,
      ...nonSystemMessages,
    ];

    logInfo('nosh-chat started', {
      messageCount: body.messages.length,
      hasRecipeGraph: !!body.recipeGraph,
      toolCount: tools.length,
      toolNames: tools.map((t) => t.function.name),
      loadedRecipeCount,
      entryPoint: body.interactionContext?.entryPoint,
      task: body.interactionContext?.task,
    });

    // Single-turn call — we return the model's response (with any tool calls)
    // to the client. The client executes the tools and sends results back in
    // the next message. This keeps the function stateless and simple.
    let response;
    try {
      response = await callChatCompletion(
        {
          model: AI_MODEL,
          messages,
          temperature: body.temperature ?? 0.4,
          max_tokens: body.max_tokens ?? 2000,
          tools: tools.length > 0 ? tools : undefined,
          tool_choice: tools.length > 0 ? 'auto' : undefined,
        },
        { timeoutMs: CHAT_TIMEOUT_MS },
      );
    } catch (modelErr) {
      const message = modelErr instanceof Error ? modelErr.message : 'Chat request failed';
      logError('nosh-chat model call failed', { error: message });
      return jsonError(message, 502, req);
    }

    const choice = response.choices?.[0];
    if (!choice) {
      return jsonError('No response from model', 502, req);
    }

    const assistantMessage = choice.message;
    const rawToolCalls = assistantMessage.tool_calls;
    const parsedToolCalls = parseToolCalls(rawToolCalls);

    // Validate tool calls
    const validToolCalls = parsedToolCalls.filter(validateToolCall);
    const validToolCallIds = new Set(validToolCalls.map((call) => call.id));
    const safeToolCalls = rawToolCalls?.filter((call) => validToolCallIds.has(call.id));
    const invalidCount = parsedToolCalls.length - validToolCalls.length;
    if (invalidCount > 0) {
      logError('nosh-chat: rejected invalid tool calls', { count: invalidCount });
    }

    // Build the response in Nosh's format
    const result = {
      message: {
        role: 'assistant',
        content: assistantMessage.content ?? '',
        tool_calls: safeToolCalls?.length ? safeToolCalls : undefined,
      },
      toolCalls: validToolCalls.map((call) => ({
        tool: call.name,
        ...call.arguments,
      })),
      finishReason: choice.finish_reason,
      usage: response.usage,
    };

    logInfo('nosh-chat completed', {
      finishReason: choice.finish_reason,
      toolCallCount: validToolCalls.length,
      cost: response.usage.cost,
      promptTokens: response.usage.prompt_tokens,
      completionTokens: response.usage.completion_tokens,
      totalTokens: response.usage.total_tokens,
      durationMs: Date.now() - requestStartedAt,
      loadedRecipeCount,
      entryPoint: body.interactionContext?.entryPoint,
      task: body.interactionContext?.task,
    });

    return jsonResponse(result, 200, req);
  } catch (err) {
    return errorResponse(err, req);
  }
});
