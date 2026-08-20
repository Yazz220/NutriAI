/**
 * nosh-chat Edge Function
 *
 * Multi-turn kitchen chat with tool-calling capability. The Nosh assistant
 * lives inside the cookbook reader and can:
 *   - Scale servings
 *   - Substitute ingredients
 *   - Start timers
 *   - Guide to the next step
 *   - Update the recipe graph live (the typesetter re-renders)
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
const MAX_AGENT_TURNS = 5;
const CHAT_TIMEOUT_MS = 60_000;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type JsonRecord = Record<string, unknown>;

interface CookbookContext {
  title?: string;
  styleId?: string;
  otherRecipes?: Array<{ title: string; category?: string }>;
}

interface RequestBody {
  messages: ChatMessage[];
  recipeGraph?: JsonRecord;
  cookbookContext?: CookbookContext;
  tools?: string[];
  temperature?: number;
  max_tokens?: number;
}

// ---------------------------------------------------------------------------
// Tool definitions — the 5 Nosh tools
// ---------------------------------------------------------------------------
const ALL_TOOLS: Record<string, ToolDefinition> = {
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
  update_page_data: {
    type: 'function',
    function: {
      name: 'update_page_data',
      description:
        'Update the recipe graph with JSON-patch-style operations. Use for edits that don\'t fit the other tools: changing a step\'s text, adding a note, fixing a quantity, adjusting temperature. The client applies patches and the typesetter re-renders live.',
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
};

function selectTools(requested?: string[]): ToolDefinition[] {
  if (!requested || requested.length === 0) {
    return Object.values(ALL_TOOLS);
  }
  return requested
    .map((name) => ALL_TOOLS[name])
    .filter((tool): tool is ToolDefinition => tool !== undefined);
}

// ---------------------------------------------------------------------------
// System prompt — injects the active recipe graph as context
// ---------------------------------------------------------------------------
function buildSystemPrompt(recipeGraph?: JsonRecord, cookbookContext?: CookbookContext): string {
  const parts: string[] = [
    'You are Nosh, an in-book chef assistant living inside a personal cookbook app.',
    'You help the user cook the recipe on the current page and manage their cookbook.',
    '',
    'PERSONALITY:',
    '- Warm, concise, practical. You are a helpful cook, not a chatbot.',
    '- Answer from the active recipe first, then the rest of the cookbook.',
    '- When the user asks to change something (scale, substitute, edit), use the appropriate tool.',
    '- When you call a tool, briefly explain what you\'re doing in the content field.',
    '- Never invent recipe data that isn\'t in the graph. If you don\'t know, say so.',
    '',
  ];

  if (recipeGraph && Object.keys(recipeGraph).length > 0) {
    parts.push('ACTIVE RECIPE (current page):');
    parts.push(JSON.stringify(recipeGraph, null, 2));
    parts.push('');
  } else {
    parts.push('No active recipe on the current page.');
    parts.push('');
  }

  if (cookbookContext) {
    parts.push('CURRENT COOKBOOK:');
    if (cookbookContext.title) parts.push(`Title: ${cookbookContext.title}`);
    if (cookbookContext.styleId) parts.push(`Style: ${cookbookContext.styleId}`);
    if (cookbookContext.otherRecipes && cookbookContext.otherRecipes.length > 0) {
      parts.push(`Other recipes in this book:`);
      for (const recipe of cookbookContext.otherRecipes.slice(0, 20)) {
        parts.push(`  - ${recipe.title}${recipe.category ? ` (${recipe.category})` : ''}`);
      }
    }
    parts.push('');
  }

  parts.push('TOOL USE GUIDELINES:');
  parts.push('- Use scale_servings when the user says "double this", "halve", "make it for 8 people", etc.');
  parts.push('- Use substitute_ingredient when the user asks to swap an ingredient or adapt for dietary needs.');
  parts.push('- Use start_timer when the user asks to time something or references a step with a duration.');
  parts.push('- Use guide_next_step when the user asks "what\'s next" or wants to jump to a step.');
  parts.push('- Use update_page_data for any other edit to the recipe (fixing text, adding notes, adjusting temperature).');
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
    case 'scale_servings':
      return typeof call.arguments.targetServings === 'number' && call.arguments.targetServings >= 1;
    case 'substitute_ingredient':
      return typeof call.arguments.ingredientName === 'string' && typeof call.arguments.substituteName === 'string';
    case 'start_timer':
      return typeof call.arguments.durationMinutes === 'number' && call.arguments.durationMinutes >= 1;
    case 'guide_next_step':
      return typeof call.arguments.stepId === 'string';
    case 'update_page_data':
      return Array.isArray(call.arguments.operations);
    default:
      return false;
  }
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------
serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return corsResponse(req);

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

    const tools = selectTools(body.tools);
    const systemPrompt = buildSystemPrompt(body.recipeGraph, body.cookbookContext);

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
    const invalidCount = parsedToolCalls.length - validToolCalls.length;
    if (invalidCount > 0) {
      logError('nosh-chat: rejected invalid tool calls', { count: invalidCount });
    }

    // Build the response in Nosh's format
    const result = {
      message: {
        role: 'assistant',
        content: assistantMessage.content ?? '',
        tool_calls: rawToolCalls ?? undefined,
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
    });

    return jsonResponse(result, 200, req);
  } catch (err) {
    return errorResponse(err, req);
  }
});
