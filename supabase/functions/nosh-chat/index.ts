/**
 * nosh-chat Edge Function
 *
 * Multi-turn cookbook chat with tool-calling capability. Folio can:
 *   - Hand recipe sources to the single capture pipeline
 *   - Scale servings
 *   - Substitute ingredients
 *   - Start timers
 *   - Guide to the next step
 *   - Update the canonical recipe graph and refresh its generated page
 *
 * Agent shape:
 *   - Injects the focused RecipeGraph plus a CONVERSATION STATE block derived
 *     from the thread's tool results (current subject, recent result list)
 *   - Runs a bounded loop: read-only tools (search, browse, load, list
 *     cookbooks) execute here and feed the next model round in the same request
 *   - Returns client-side tool calls (cards, navigation, timers, capture) for
 *     the app to execute
 *   - Streams NDJSON events: text-delta, tool-call, tool-result, result, error
 *
 * Required Supabase Function secrets:
 *   AI_API_KEY   — OpenRouter API key
 *   AI_API_BASE  — Provider base URL (default: https://openrouter.ai/api/v1)
 *   CHAT_MODEL   — Chat model (default: qwen/qwen3.6-35b-a3b)
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
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { verifyAuth } from '../_shared/auth.ts';
import { corsResponse, getCorsHeaders, jsonError, jsonResponse } from '../_shared/cors.ts';
import { errorResponse } from '../_shared/error.ts';
import { logError, logInfo } from '../_shared/log.ts';
import {
  MAX_COLLECTION_LOOKUPS_PER_REQUEST,
  MAX_LOADED_RECIPES_PER_REQUEST,
  compactChatHistory,
  countCompletedToolCallsSinceLatestUser,
} from '../_shared/noshContextLimits.ts';
import {
  applyToolResult,
  deriveConversationState,
  emptyConversationState,
  formatConversationState,
  fromThreadStateRow,
  mergeWithPersisted,
  toThreadStateRow,
  type ConversationRecipeRef,
  type ConversationState,
} from '../_shared/noshConversationState.ts';
import {
  NOSH_SAFETY_RULES,
  buildSafeChatMessages,
  getNoshSafetyIntervention,
} from '../_shared/noshSafety.ts';
import {
  streamChatCompletion,
  type ChatMessage,
  type ToolDefinition,
  type ToolCall,
} from '../_shared/openrouter.ts';
import {
  buildNoshQuickSocialReply,
  getNoshQuickSocialIntent,
} from '../_shared/noshTurnPolicy.ts';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
const CHAT_MODEL = Deno.env.get('CHAT_MODEL')
  || Deno.env.get('AI_MODEL')
  || 'qwen/qwen3.6-35b-a3b';
const CHAT_TIMEOUT_MS = 60_000;
declare const EdgeRuntime: { waitUntil(promise: Promise<unknown>): void };
const PROMPT_VERSION = '2026-09-05.v1';
/**
 * Read-only tools that nosh-chat executes itself, inside one request, so a
 * search -> load -> answer chain costs one round trip instead of three.
 * Anything that mutates, navigates, or needs a confirmation card stays on the
 * client.
 */
const SERVER_TOOL_NAMES = new Set([
  'search_recipe_collection',
  'browse_recipe_collection',
  'load_recipe',
  'list_cookbooks',
]);
const MAX_SERVER_TOOL_ROUNDS = 3;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || '';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const NOSH_TEMPERATURE = Number(Deno.env.get('NOSH_TEMPERATURE') ?? '0.4');
const NOSH_REASONING_EFFORT = Deno.env.get('NOSH_REASONING_EFFORT');

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
  entryPoint: 'shelf-nosh' | 'cookbook-nosh' | 'recipe-ask' | 'cookbook-add' | 'share-to-nosh' | 'settings-preferences';
  task: 'collection' | 'cookbook-help' | 'recipe-help' | 'capture' | 'preferences';
  focus: JsonRecord;
  visibleContext: JsonRecord;
  focusStatus?: 'ready' | 'loading' | 'missing' | 'stale';
  /** User messages that already existed when the current focus was accepted. */
  focusUserMessageCount?: number;
  hasAttachedImage?: boolean;
}

interface RequestBody {
  messages: ChatMessage[];
  recipeGraph?: JsonRecord;
  recipeGraphSource?: 'canonical' | 'session-preview';
  cookingPreferences?: Array<{ key: string; value: string }>;
  cookbookContext?: CookbookContext;
  interactionContext?: InteractionContext;
  tools?: string[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
  requestId?: string;
  threadId?: string;
  userMessageId?: string;
  responseMode?: 'quick';
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
        'Find a saved recipe by name or short description across the whole collection. Use only for a recipe that is NOT already the conversation subject or in the most recent result list; for those, use their pageId directly.',
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
  browse_recipe_collection: {
    type: 'function',
    function: {
      name: 'browse_recipe_collection',
      description:
        'Browse, filter, count, or recommend from saved recipes using compact metadata. Use for inventory questions, ingredient filters, dietary filters, time limits, categories, cuisines, and "what can I make?" requests.',
      parameters: {
        type: 'object',
        properties: {
          cookbookIds: { type: 'array', items: { type: 'string' }, maxItems: 10 },
          text: { type: 'string', maxLength: 120 },
          ingredientsAll: { type: 'array', items: { type: 'string' }, maxItems: 10 },
          ingredientsAny: { type: 'array', items: { type: 'string' }, maxItems: 10 },
          excludeIngredients: { type: 'array', items: { type: 'string' }, maxItems: 10 },
          tags: { type: 'array', items: { type: 'string' }, maxItems: 10 },
          category: { type: 'string', maxLength: 80 },
          cuisine: { type: 'string', maxLength: 80 },
          maxTotalMinutes: { type: 'integer', minimum: 1, maximum: 1440 },
          sort: { type: 'string', enum: ['relevance', 'recent', 'title', 'time'] },
          cursor: { type: 'string' },
          limit: { type: 'integer', minimum: 1, maximum: 20 },
        },
        additionalProperties: false,
      },
    },
  },
  load_recipe: {
    type: 'function',
    function: {
      name: 'load_recipe',
      description:
        'Read the full saved recipe (ingredients, quantities, steps, servings) for a known pageId. Use it for the conversation subject or a result-list item before answering ingredient, step, quantity, shopping-list, or adaptation questions about that recipe.',
      parameters: {
        type: 'object',
        properties: {
          pageId: { type: 'string', description: 'Exact pageId from CONVERSATION STATE or a search/browse result' },
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
  save_cooking_preference: {
    type: 'function',
    function: {
      name: 'save_cooking_preference',
      description:
        'Ask for explicit confirmation before remembering or forgetting a durable cooking preference. Use only when the user directly asks Folio to remember, always use, never use, or forget something.',
      parameters: {
        type: 'object',
        properties: {
          key: {
            type: 'string',
            enum: ['allergy', 'dietary_restriction', 'disliked_ingredient', 'measurement_system', 'default_servings', 'appliance', 'cooking_goal'],
          },
          value: { type: 'string', minLength: 1, maxLength: 200 },
          action: { type: 'string', enum: ['save', 'remove'] },
        },
        required: ['key', 'value', 'action'],
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
        'Propose a visually revised complete page for the focused recipe. Use only when the user explicitly asks to change the page design or imagery. The client keeps the current page selected until the user approves a finished candidate.',
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
  recipeGraph: JsonRecord | undefined,
  cookbookContext: CookbookContext | undefined,
  interactionContext: InteractionContext | undefined,
  cookingPreferences: Array<{ key: string; value: string }>,
  conversationState: ConversationState,
): string {
  const hasFocusedRecipe = Boolean(recipeGraph && Object.keys(recipeGraph).length > 0);
  const parts: string[] = [
    'ROLE',
    'You are Folio, the chef inside the user\'s personal cookbook. You know what they have saved, you remember what this conversation is about, and you finish the task in front of you instead of reporting lookups.',
    '',
    'STYLE',
    '- Warm, concise, practical. Short paragraphs for a narrow mobile chat; usually under 120 words unless the task needs more (a shopping list may).',
    '- Plain text only. Use the bullet character • for lists. No Markdown headings, tables, bold markers, or code fences.',
    '- Saved-recipe quantities, ingredients, steps, and timings are grounded facts from the loaded recipe. Never invent them. General culinary knowledge is welcome for substitutions, technique, and ideas; keep it clearly separate from what the recipe says.',
    '- Never describe a persistent edit as saved until a tool result says mode="update" or mode="new-version".',
    '',
    NOSH_SAFETY_RULES,
    '',
  ];

  if (hasFocusedRecipe) {
    parts.push('FOCUSED RECIPE (the page the user opened Folio from; full graph):');
    parts.push(JSON.stringify(recipeGraph));
  } else {
    parts.push('FOCUSED RECIPE: none. The user is talking to you from the shelf or a cookbook, not from an open recipe page.');
  }
  parts.push('');

  parts.push(...formatConversationState(conversationState));
  parts.push('');

  parts.push('RESOLVING REFERENCES (do this before choosing any tool)');
  parts.push('1. "It", "that", "this one", "the recipe", "the fajitas", or an unnamed follow-up (e.g. "what ingredients?", "make a shopping list", "scale it for six") means the Current subject above. Use its pageId directly. Do not search again for a recipe you already have.');
  parts.push('2. "The first one", "the second", "the 30-minute one" means an item in the most recent result list above.');
  parts.push(hasFocusedRecipe
    ? '3. "This recipe" or "the open recipe" means the FOCUSED RECIPE. If the Current subject is a different recipe, "it" still means the subject; only "this recipe" means the focused page.'
    : '3. With no focused recipe, every recipe reference resolves to the Current subject or the result list.');
  parts.push('4. Search only when the user names or describes a recipe that is neither the subject nor in the result list. If a search is ambiguous, name the candidates with their cookbook titles and ask which one. Never guess between them.');
  parts.push('5. Once a recipe is resolved, call load_recipe with its pageId before stating ingredients, quantities, steps, servings, or building a shopping list, unless its full graph is already in this turn.');
  parts.push('');

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
    parts.push('WHERE THE USER IS');
    parts.push(`Entry point: ${interactionContext.entryPoint}. Active task: ${interactionContext.task}.`);
    parts.push(`Visible screen: ${JSON.stringify(interactionContext.visibleContext)}`);
    if (interactionContext.focusStatus === 'missing') {
      parts.push('The focused recipe was deleted or is unavailable. Explain this and help the user search for it or choose another recipe.');
    }
    if (interactionContext.task === 'capture') {
      parts.push('The active task is recipe capture. The dedicated capture interface owns extraction, destination resolution, page generation, and publishing. Do not call legacy extraction or review tools.');
    }
    if (interactionContext.task === 'preferences') {
      parts.push('The user opened Folio from Cooking preferences. Help them state one explicit preference at a time, then call save_cooking_preference so the confirmation card can save it.');
    }
    if (interactionContext.task === 'cookbook-help') {
      parts.push('The user opened Folio from a cookbook. "This book" or "in here" means that cookbook: pass its id in browse or search filters. Broader questions still cover the whole collection.');
    }
    if (interactionContext.hasAttachedImage) {
      parts.push('A recipe photo is attached on the client. Call start_recipe_capture with sourceType="image" and omit input.');
    }
    parts.push('');
  }

  if (cookingPreferences.length > 0) {
    parts.push('USER-APPROVED COOKING PREFERENCES');
    for (const preference of cookingPreferences.slice(0, 30)) {
      parts.push(`- ${preference.key}: ${preference.value}`);
    }
    parts.push('- Allergies are safety constraints: flag conflicts before advising, never silently rewrite the saved recipe.');
    parts.push('- Apply dietary restrictions and dislikes by default when recommending or adapting. Use the preferred measurement system in your own explanations while preserving source units when quoting.');
    parts.push('- Default servings apply only when no target is given. A request that overrides a preference for this turn is not a reason to forget the preference.');
    parts.push('');
  }

  parts.push('CONVERSATION FIRST');
  parts.push('- Answer immediately when the supplied recipe and conversation contain enough information. Do not call tools to restate known steps, quantities, substitutions, or cooking advice.');
  parts.push('- "Help me make this" means begin helping with the current recipe. Give the first useful step naturally, without a menu, setup questions, or a walkthrough mode.');
  parts.push('- Follow conversational progress: "done, next" continues from the last step discussed; "all the steps" gives the complete method immediately. Answer interruptions and substitutions without resetting the conversation. Ask only when something necessary is genuinely unclear.');
  parts.push('- Advice is not permission to edit. Explain substitutions and scaled quantities in text. Use change-preview tools only when the user asks to apply a change or explicitly requests an interactive preview.');
  parts.push('- Keep simple answers brief; provide the full method or detail when requested. Do not narrate internal tools or context management.');
  parts.push('');
  parts.push('TOOLS');
  parts.push('- Complete the task in one reply: chain lookups (search or browse → load_recipe → answer) silently, then answer once with the result. Never narrate lookups or report "I found N recipes" as the answer when the user asked for something else.');
  parts.push('- browse_recipe_collection answers inventory, counts, "what can I make with…", exclusions, cuisine, category, tags, time limits ("quickest", "under 30 minutes" → sort=time or maxTotalMinutes), and pagination. Its compact rows are enough for recommendations; load only the recipes the user asks about.');
  parts.push(`- Budget per user request: at most ${MAX_COLLECTION_LOOKUPS_PER_REQUEST} searches, ${MAX_COLLECTION_LOOKUPS_PER_REQUEST} browses, and ${MAX_LOADED_RECIPES_PER_REQUEST} loaded recipes. For comparisons, load each recipe separately. If the user asks for more, help them narrow instead.`);
  parts.push('- Shopping lists: use the supplied full recipe graphs, loading only missing recipes, then list every ingredient with quantity and unit, grouped sensibly (produce, protein, dairy, pantry). Merge duplicates across recipes. If the user says what they already have, omit those and say so.');
  parts.push('- open_recipe only when the user explicitly asks to open, show, or go to a recipe. Answering never changes screens.');
  parts.push('- scale_servings, substitute_ingredient, and update_page_data preview a change to the FOCUSED RECIPE and let the user choose temporary use, saved update, or cancel. Do not choose for the user. If the user wants to change a recipe that is not the focused page, explain how to open it first, or offer the scaled or substituted quantities in text.');
  parts.push('- Moving or copying: resolve the exact recipe, call list_cookbooks for the exact destination, then organize_recipe with ids. The card is a proposal; nothing changes until the user confirms.');
  parts.push('- save_cooking_preference only when the user explicitly asks you to remember or forget something; never infer preferences from ordinary talk.');
  if (interactionContext?.task !== 'capture') {
    parts.push('- A recipe URL, pasted recipe text, photo, or video to save → start_recipe_capture. The capture interface finishes the import.');
  }
  parts.push('- start_timer when asked to time something. For step-by-step cooking guidance, just walk the user through the recipe in text — you have the full recipe graph. No special tool is needed.');
  parts.push('- regenerate_recipe_page only on an explicit visual request. Saved recipe-data edits create their own refreshed page; do not regenerate for content changes.');
  parts.push('- Conversational delete, bulk organization, and reorder are unavailable; say so plainly.');
  parts.push('- If a tool errors, explain briefly and offer a next step. Do not repeat the same failed call.');
  parts.push('- Use one short lead-in only when a tool shows the user a card, navigation, or timer.');
  parts.push('');

  parts.push('EXAMPLES OF STAYING WITH THE SUBJECT');
  parts.push('User: Do I have a chicken fajita recipe? → search_recipe_collection("chicken fajita") → resolved: Chicken Fajitas (pageId p1) → "Yes, Chicken Fajitas in Weeknight Dinners."');
  parts.push('User: What ingredients do I need? → subject is p1 → load_recipe(p1) → list its ingredients.');
  parts.push('User: Make me a shopping list for it. → subject is still p1 (already loaded this conversation; reload if quantities are not in this turn) → grouped shopping list. No search.');
  parts.push('User: Which of my recipes is quickest tonight? → browse_recipe_collection(sort="time", limit=5) → name the top few with times. User: The second one, what do I need? → result list item 2 → load_recipe → ingredients.');

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
    case 'browse_recipe_collection':
      return (call.arguments.limit === undefined
          || (typeof call.arguments.limit === 'number' && call.arguments.limit >= 1 && call.arguments.limit <= 20))
        && (call.arguments.maxTotalMinutes === undefined
          || (typeof call.arguments.maxTotalMinutes === 'number' && call.arguments.maxTotalMinutes >= 1))
        && (call.arguments.text === undefined || typeof call.arguments.text === 'string');
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
    case 'save_cooking_preference':
      return ['save', 'remove'].includes(String(call.arguments.action))
        && ['allergy', 'dietary_restriction', 'disliked_ingredient', 'measurement_system', 'default_servings', 'appliance', 'cooking_goal']
          .includes(String(call.arguments.key))
        && typeof call.arguments.value === 'string'
        && call.arguments.value.trim().length > 0
        && call.arguments.value.length <= 200;
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

function immediateAssistantResponse(
  req: Request,
  stream: boolean | undefined,
  content: string,
  requestId?: string,
): Response {
  const result = {
    message: { role: 'assistant', content },
    toolCalls: [],
    finishReason: 'stop',
    usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
    requestId,
  };
  if (!stream) return jsonResponse(result, 200, req);

  const body = [
    JSON.stringify({ type: 'text-delta', delta: content }),
    JSON.stringify({ type: 'result', result }),
    '',
  ].join('\n');
  return new Response(body, {
    status: 200,
    headers: {
      ...getCorsHeaders(req),
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

function quickSocialReply(
  messages: ChatMessage[],
  interaction?: InteractionContext,
): string | null {
  const latestUserText = [...messages]
    .reverse()
    .find((message) => message.role === 'user')
    ?.content;
  if (typeof latestUserText !== 'string') return null;
  const intent = getNoshQuickSocialIntent(latestUserText);
  return intent ? buildNoshQuickSocialReply(intent, interaction) : null;
}

function safeIdentifier(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed && trimmed.length <= 200 ? trimmed : undefined;
}

function focusedRecipePageId(interaction?: InteractionContext): string | undefined {
  if (interaction?.focus?.kind !== 'recipe') return undefined;
  return safeIdentifier(interaction.focus.pageId);
}

async function resolveAgentContext(req: Request, body: RequestBody, userId: string): Promise<{
  recipeGraph?: JsonRecord;
  interactionContext?: InteractionContext;
  cookingPreferences: Array<{ key: string; value: string }>;
}> {
  const authHeader = req.headers.get('Authorization') ?? '';
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader }, fetch: (url, init) => fetch(url, { ...init, signal: req.signal }) },
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const interactionContext = body.interactionContext
    ? { ...body.interactionContext }
    : undefined;
  const pageId = focusedRecipePageId(interactionContext);

  const recipeGraphPromise = (async (): Promise<JsonRecord | undefined> => {
    if (!pageId || body.recipeGraphSource === 'session-preview') return body.recipeGraph;
    const { data, error } = await userClient
      .schema('nutriai')
      .from('cookbook_pages')
      .select('recipe_graph')
      .eq('id', pageId)
      .not('recipe_graph', 'is', null)
      .maybeSingle();
    if (error) {
      logError('nosh-chat canonical recipe lookup failed', { userId, pageId, error: error.message });
      throw new Error('The open recipe could not be loaded. Please try again.');
    }
    return data?.recipe_graph as JsonRecord | undefined;
  })();

  const cookingPreferencesPromise = (async (): Promise<Array<{ key: string; value: string }>> => {
    const { data: preferenceRows, error: preferenceError } = await userClient
      .schema('nutriai')
      .from('cooking_preferences')
      .select('preference_key, value')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(30);
    if (preferenceError) {
      // Keep chat usable during a staged rollout, while never granting the
      // model access to preferences that the client did not already possess.
      logError('nosh-chat cooking preference lookup failed', { userId, error: preferenceError.message });
      return body.cookingPreferences ?? [];
    }
    return (preferenceRows ?? []).map((row) => ({
      key: String(row.preference_key),
      value: String(row.value),
    }));
  })();

  const [recipeGraph, cookingPreferences] = await Promise.all([
    recipeGraphPromise,
    cookingPreferencesPromise,
  ]);
  if (pageId && body.recipeGraphSource !== 'session-preview' && interactionContext) {
    interactionContext.focusStatus = recipeGraph ? 'ready' : 'missing';
  }

  return { recipeGraph, interactionContext, cookingPreferences };
}

function traceClient() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return null;
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function startAgentRun(input: {
  requestId: string;
  userId: string;
  body: RequestBody;
  tools: ToolDefinition[];
}): Promise<void> {
  const admin = traceClient();
  if (!admin) return;
  const focus = input.body.interactionContext?.focus;
  const { error } = await admin.schema('nutriai').from('nosh_agent_runs').upsert({
    request_id: input.requestId,
    user_id: input.userId,
    thread_id: safeIdentifier(input.body.threadId),
    user_message_id: safeIdentifier(input.body.userMessageId),
    prompt_version: PROMPT_VERSION,
    model: CHAT_MODEL,
    task: input.body.interactionContext?.task,
    focus_kind: typeof focus?.kind === 'string' ? focus.kind : null,
    focus_page_id: focusedRecipePageId(input.body.interactionContext) ?? null,
    focus_status: input.body.interactionContext?.focusStatus,
    visible_page_id: safeIdentifier(input.body.interactionContext?.visibleContext?.pageId) ?? null,
    tool_names: input.tools.map((tool) => tool.function.name),
    status: 'started',
  }, { onConflict: 'user_id,request_id' });
  if (error) logError('nosh-chat trace start failed', { error: error.message });
}

async function finishAgentRun(input: {
  requestId: string;
  userId: string;
  status: 'completed' | 'failed' | 'cancelled';
  startedAt: number;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
  toolNames?: string[];
  error?: unknown;
}): Promise<void> {
  const admin = traceClient();
  if (!admin) return;
  const errorClass = input.error instanceof Error ? input.error.name : input.error ? 'UnknownError' : null;
  const { error } = await admin.schema('nutriai').from('nosh_agent_runs').update({
    status: input.status,
    prompt_tokens: input.usage?.prompt_tokens,
    completion_tokens: input.usage?.completion_tokens,
    total_tokens: input.usage?.total_tokens,
    tool_names: input.toolNames,
    latency_ms: Date.now() - input.startedAt,
    error_class: errorClass,
    completed_at: new Date().toISOString(),
  }).eq('user_id', input.userId).eq('request_id', input.requestId);
  if (error) logError('nosh-chat trace finish failed', { error: error.message });
}

// ---------------------------------------------------------------------------
// Thread state persistence — nosh_thread_state
//
// The server reads the persisted state at the start of each request (to fill
// in fields lost to history compaction and to recover activeTask), then
// upserts the freshly-derived state after computation. Uses the caller's JWT
// client so RLS is preserved.
// ---------------------------------------------------------------------------

async function readThreadState(
  userClient: UserClient,
  threadId: string,
): Promise<ConversationState> {
  try {
    const { data, error } = await userClient
      .schema('nutriai')
      .from('nosh_thread_state')
      .select('subject_page_id, subject_title, subject_cookbook_id, subject_source, recent_candidates, loaded_recipes, active_task')
      .eq('thread_id', threadId)
      .maybeSingle();
    if (error || !data) return emptyConversationState();
    return fromThreadStateRow(data);
  } catch {
    return emptyConversationState();
  }
}

async function upsertThreadState(
  userClient: UserClient,
  threadId: string,
  state: ConversationState,
): Promise<void> {
  try {
    const { error } = await userClient
      .schema('nutriai')
      .from('nosh_thread_state')
      .upsert({
        thread_id: threadId,
        ...toThreadStateRow(state),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,thread_id' });
    if (error) logError('nosh-chat thread state upsert failed', { error: error.message });
  } catch (error) {
    logError('nosh-chat thread state upsert error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

function modelTuning() {
  const temperature = Number.isFinite(NOSH_TEMPERATURE)
    ? Math.max(0, Math.min(NOSH_TEMPERATURE, 1.5))
    : 0.4;
  const effort = ['low', 'medium', 'high'].includes(NOSH_REASONING_EFFORT ?? '')
    ? NOSH_REASONING_EFFORT as 'low' | 'medium' | 'high'
    : undefined;
  return {
    temperature,
    ...(effort ? { reasoning: { enabled: true, effort, exclude: true } } : {}),
  };
}

// ---------------------------------------------------------------------------
// Server-executed read tools
//
// These mirror the client implementations in utils/cookbook/recipeCollection.ts
// and return the same shapes, so the existing tool cards render unchanged.
// They run through the caller's JWT client: both RPCs are security invoker
// and cookbook_pages is protected by RLS.
// ---------------------------------------------------------------------------
// deno-lint-ignore no-explicit-any
type UserClient = any;

interface CollectionRow {
  page_id: string;
  cookbook_id: string;
  cookbook_title: string;
  title: string;
  description: string | null;
  category: string | null;
  cuisine: string | null;
  servings: number | null;
  tags: string[] | null;
  ingredient_preview: string[] | null;
  updated_at: string;
  score: number | string;
  total_time_minutes?: number | null;
  dietary_tags?: string[] | null;
  match_reason?: string;
  total_count?: number | string;
}

function mapCollectionCandidate(row: CollectionRow): JsonRecord {
  return {
    pageId: row.page_id,
    cookbookId: row.cookbook_id,
    cookbookTitle: row.cookbook_title,
    title: row.title,
    ...(row.description ? { description: row.description } : {}),
    ...(row.category ? { category: row.category } : {}),
    ...(row.cuisine ? { cuisine: row.cuisine } : {}),
    ...(row.servings != null ? { servings: row.servings } : {}),
    tags: row.tags ?? [],
    ingredientPreview: row.ingredient_preview ?? [],
    updatedAt: row.updated_at,
    score: Number(row.score),
  };
}

function classifyCollectionMatches(candidates: JsonRecord[]): JsonRecord {
  if (candidates.length === 0) return { status: 'empty', candidates: [] };
  if (candidates.length === 1) return { status: 'resolved', candidate: candidates[0], candidates };
  const [first, second] = candidates;
  if (Number(first.score) - Number(second.score) >= 0.75) {
    return { status: 'resolved', candidate: first, candidates };
  }
  return { status: 'ambiguous', candidates };
}

async function executeServerTool(
  userClient: UserClient,
  call: ParsedToolCall,
  body: RequestBody,
): Promise<JsonRecord> {
  const schema = userClient.schema('nutriai');
  const args = call.arguments;
  switch (call.name) {
    case 'search_recipe_collection': {
      const limit = typeof args.limit === 'number' ? Math.max(1, Math.min(args.limit, 5)) : 5;
      const { data, error } = await schema.rpc('search_recipe_collection', {
        search_query: String(args.query).trim(),
        cookbook_filter: typeof args.cookbookId === 'string' ? args.cookbookId : null,
        recent_first: args.recentFirst === true,
        result_limit: limit,
      });
      if (error) throw new Error(error.message);
      return classifyCollectionMatches(((data ?? []) as CollectionRow[]).map(mapCollectionCandidate));
    }
    case 'browse_recipe_collection': {
      const offset = Number.parseInt(typeof args.cursor === 'string' ? args.cursor : '0', 10);
      const safeOffset = Number.isFinite(offset) ? Math.max(0, Math.min(offset, 500)) : 0;
      const limit = typeof args.limit === 'number' ? Math.max(1, Math.min(args.limit, 20)) : 12;
      const list = (value: unknown) => Array.isArray(value) && value.length ? value.map(String) : null;
      const text = typeof args.text === 'string' && args.text.trim() ? args.text.trim() : null;
      const { data, error } = await schema.rpc('browse_recipe_collection', {
        cookbook_filters: list(args.cookbookIds),
        text_filter: text,
        ingredients_all: list(args.ingredientsAll),
        ingredients_any: list(args.ingredientsAny),
        exclude_ingredients: list(args.excludeIngredients),
        tag_filters: list(args.tags),
        category_filter: typeof args.category === 'string' && args.category.trim() ? args.category.trim() : null,
        cuisine_filter: typeof args.cuisine === 'string' && args.cuisine.trim() ? args.cuisine.trim() : null,
        max_total_minutes: typeof args.maxTotalMinutes === 'number' ? args.maxTotalMinutes : null,
        sort_mode: typeof args.sort === 'string' ? args.sort : (text ? 'relevance' : 'recent'),
        result_offset: safeOffset,
        result_limit: limit,
      });
      if (error) throw new Error(error.message);
      const rows = (data ?? []) as CollectionRow[];
      const recipes = rows.map((row) => ({
        ...mapCollectionCandidate(row),
        ...(row.total_time_minutes != null ? { totalTimeMinutes: row.total_time_minutes } : {}),
        dietaryTags: row.dietary_tags ?? [],
        matchReason: row.match_reason ?? 'filters',
      }));
      const totalCount = rows.length > 0 ? Number(rows[0].total_count) : 0;
      const nextOffset = safeOffset + recipes.length;
      return {
        recipes,
        totalCount,
        ...(nextOffset < totalCount ? { nextCursor: String(nextOffset) } : {}),
      };
    }
    case 'load_recipe': {
      const { data, error } = await schema
        .from('cookbook_pages')
        .select('id, cookbook_id, recipe_graph')
        .eq('id', String(args.pageId))
        .not('recipe_graph', 'is', null)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) return { error: 'That saved recipe is no longer available.' };
      const row = data as { id: string; cookbook_id: string; recipe_graph: JsonRecord };
      return { pageId: row.id, cookbookId: row.cookbook_id, recipeGraph: row.recipe_graph };
    }
    case 'list_cookbooks': {
      if (body.cookbookContext?.availableCookbooks?.length) {
        return { cookbooks: body.cookbookContext.availableCookbooks };
      }
      const { data, error } = await schema.from('cookbooks').select('id, title').order('title');
      if (error) throw new Error(error.message);
      return { cookbooks: (data ?? []) as Array<{ id: string; title: string }> };
    }
    default:
      throw new Error(`Tool ${call.name} does not run on the server`);
  }
}

// ---------------------------------------------------------------------------
// Agent loop
//
// One request may contain several model rounds. Read-only tool calls are
// executed here and fed back to the model; the loop ends when the model
// answers in text, asks for a client-side tool (card, navigation, timer,
// capture handoff), or exhausts its round budget.
// ---------------------------------------------------------------------------
type AgentEvent =
  | { type: 'text-delta'; delta: string }
  | { type: 'tool-call'; toolCall: ToolCall }
  | { type: 'tool-result'; toolCallId: string; result: JsonRecord; isError: boolean }
  | {
      type: 'result';
      result: {
        message: { role: 'assistant'; content: string; tool_calls?: ToolCall[] };
        toolCalls: Array<{ tool: string } & JsonRecord>;
        finishReason: string;
        usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number; cost?: number };
        requestId: string;
      };
    };

type TurnUsage = Extract<AgentEvent, { type: 'result' }>['result']['usage'];

function toolBudgetFilter(
  tools: ToolDefinition[],
  counts: Record<string, number>,
): ToolDefinition[] {
  const limits: Record<string, number> = {
    load_recipe: MAX_LOADED_RECIPES_PER_REQUEST,
    browse_recipe_collection: MAX_COLLECTION_LOOKUPS_PER_REQUEST,
    search_recipe_collection: MAX_COLLECTION_LOOKUPS_PER_REQUEST,
  };
  return tools.filter((tool) => {
    const limit = limits[tool.function.name];
    return limit === undefined || (counts[tool.function.name] ?? 0) < limit;
  });
}

async function* runAgentTurn(input: {
  req: Request;
  requestId: string;
  userClient: UserClient;
  body: RequestBody;
  systemPrompt: string;
  history: ChatMessage[];
  tools: ToolDefinition[];
  initialCounts: Record<string, number>;
  conversationState: ConversationState;
  onToolExecuted: (name: string) => void;
  onStateChange?: (state: ConversationState) => void;
}): AsyncGenerator<AgentEvent> {
  const { req, body } = input;
  const usage: TurnUsage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
  const counts = { ...input.initialCounts };
  let messages = buildSafeChatMessages(input.systemPrompt, input.history) as ChatMessage[];
  let state = input.conversationState;
  const deadline = Date.now() + CHAT_TIMEOUT_MS;

  for (let round = 0; ; round += 1) {
    if (Date.now() >= deadline) throw new Error('Folio took too long to respond. Please try again.');
    // The final round synthesizes an answer instead of escaping into another client read loop.
    const tools = round >= MAX_SERVER_TOOL_ROUNDS ? [] : toolBudgetFilter(input.tools, counts);
    const rawToolCalls = new Map<number, ToolCall>();
    let content = '';
    let finishReason = 'stop';

    for await (const chunk of streamChatCompletion(
      {
        model: CHAT_MODEL,
        messages,
        ...modelTuning(),
        max_tokens: body.max_tokens ?? 2000,
        tools: tools.length > 0 ? tools : undefined,
        tool_choice: tools.length > 0 ? 'auto' : undefined,
      },
      { timeoutMs: Math.max(1, deadline - Date.now()), signal: req.signal },
    )) {
      const choice = chunk.choices?.[0];
      const textDelta = choice?.delta?.content;
      if (textDelta) {
        content += textDelta;
        yield { type: 'text-delta', delta: textDelta };
      }
      for (const delta of choice?.delta?.tool_calls ?? []) {
        const current = rawToolCalls.get(delta.index) ?? {
          id: '',
          type: 'function' as const,
          function: { name: '', arguments: '' },
        };
        if (delta.id) current.id += delta.id;
        if (delta.function?.name) current.function.name += delta.function.name;
        if (delta.function?.arguments) current.function.arguments += delta.function.arguments;
        rawToolCalls.set(delta.index, current);
      }
      if (choice?.finish_reason) finishReason = choice.finish_reason;
      if (chunk.usage) {
        usage.prompt_tokens += chunk.usage.prompt_tokens;
        usage.completion_tokens += chunk.usage.completion_tokens;
        usage.total_tokens += chunk.usage.total_tokens;
        if (typeof chunk.usage.cost === 'number') usage.cost = (usage.cost ?? 0) + chunk.usage.cost;
      }
    }

    const orderedRaw = [...rawToolCalls.entries()]
      .sort(([left], [right]) => left - right)
      .map(([, call]) => call)
      .filter((call) => call.id && call.function.name);
    const parsed = parseToolCalls(orderedRaw);
    const valid = parsed.filter((call) => validateToolCall(call) && tools.some((tool) => tool.function.name === call.name));
    const invalidCount = parsed.length - valid.length;
    if (invalidCount > 0) logError('nosh-chat: rejected invalid tool calls', { count: invalidCount });
    const validIds = new Set(valid.map((call) => call.id));
    const safeRaw = orderedRaw.filter((call) => validIds.has(call.id));

    const serverCalls = valid.filter((call) => SERVER_TOOL_NAMES.has(call.name));
    const clientCalls = valid.filter((call) => !SERVER_TOOL_NAMES.has(call.name));
    if (serverCalls.length === 0) {
      yield {
        type: 'result',
        result: {
          message: {
            role: 'assistant',
            content,
            tool_calls: safeRaw.length ? safeRaw : undefined,
          },
          toolCalls: valid.map((call) => ({ tool: call.name, ...call.arguments })),
          finishReason,
          usage,
          requestId: input.requestId,
        },
      };
      return;
    }

    const serverRaw = safeRaw.filter((call) => SERVER_TOOL_NAMES.has(call.function.name));
    for (const call of serverRaw) yield { type: 'tool-call', toolCall: call };
    const results = await Promise.all(serverCalls.map(async (call) => {
      try {
        const result = await executeServerTool(input.userClient, call, body);
        return { call, result, isError: typeof result.error === 'string' };
      } catch (error) {
        logError('nosh-chat server tool failed', {
          tool: call.name,
          error: error instanceof Error ? error.message : 'Unknown tool error',
        });
        return { call, result: { error: 'The lookup failed. Tell the user briefly and offer to retry.' }, isError: true };
      }
    }));

    const toolMessages: ChatMessage[] = [];
    for (const { call, result, isError } of results) {
      counts[call.name] = (counts[call.name] ?? 0) + 1;
      input.onToolExecuted(call.name);
      if (!isError) state = applyToolResult(state, call.name, result, call.arguments);
      yield { type: 'tool-result', toolCallId: call.id, result, isError };
      toolMessages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(result) });
    }

    if (state !== input.conversationState) {
      input.onStateChange?.(state);
    }
    if (clientCalls.length) {
      yield { type: 'result', result: {
        message: { role: 'assistant', content, tool_calls: safeRaw.filter((call) => !SERVER_TOOL_NAMES.has(call.function.name)) },
        toolCalls: clientCalls.map((call) => ({ tool: call.name, ...call.arguments })),
        finishReason, usage, requestId: input.requestId,
      } };
      return;
    }
    messages = [
      ...messages,
      { role: 'assistant', content, tool_calls: safeRaw },
      ...toolMessages,
    ];
    if (state !== input.conversationState) {
      // Refresh the working-memory block so the next round sees the new subject.
      messages[0] = { role: 'system', content: replaceConversationStateBlock(input.systemPrompt, state) };
    }
  }
}

function replaceConversationStateBlock(systemPrompt: string, state: ConversationState): string {
  return systemPrompt.replace(
    /CONVERSATION STATE:[\s\S]*?\n\n/,
    `${formatConversationState(state).join('\n')}\n\n`,
  );
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------
serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return corsResponse(req);
  const requestStartedAt = Date.now();
  const turnAbort = new AbortController();
  req = new Request(req, { signal: AbortSignal.any([req.signal, turnAbort.signal, AbortSignal.timeout(CHAT_TIMEOUT_MS)]) });

  const { user, error: authError } = await verifyAuth(req);
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

    const requestId = safeIdentifier(body.requestId) ?? crypto.randomUUID();
    const safetyIntervention = getNoshSafetyIntervention(body.messages);
    if (safetyIntervention) {
      logInfo('nosh-chat safety intervention', { reason: safetyIntervention.reason });
      return immediateAssistantResponse(req, body.stream, safetyIntervention.message, requestId);
    }

    if (body.responseMode === 'quick') {
      const reply = quickSocialReply(body.messages, body.interactionContext);
      if (reply) {
        logInfo('nosh-chat quick response', {
          entryPoint: body.interactionContext?.entryPoint,
          task: body.interactionContext?.task,
        });
        return immediateAssistantResponse(req, body.stream, reply, requestId);
      }
    }

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' }, fetch: (url, init) => fetch(url, { ...init, signal: req.signal }) },
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const threadId = safeIdentifier(body.threadId);
    const persistedStatePromise = threadId ? readThreadState(userClient, threadId) : Promise.resolve(emptyConversationState());
    const [resolvedContext, persistedState] = await Promise.all([
      resolveAgentContext(req, body, user!.id), persistedStatePromise,
    ]);
    body.interactionContext = resolvedContext.interactionContext;

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

    const focus = resolvedContext.interactionContext?.focus;
    const focusRef: ConversationRecipeRef | null = focus?.kind === 'recipe'
      && typeof focus.pageId === 'string'
      && typeof focus.title === 'string'
      && resolvedContext.interactionContext?.focusStatus !== 'missing'
      ? {
        pageId: focus.pageId,
        title: focus.title,
        ...(typeof focus.cookbookId === 'string' ? { cookbookId: focus.cookbookId } : {}),
      }
      : null;
    const derivedState = deriveConversationState(
      body.messages,
      focusRef,
      resolvedContext.interactionContext?.focusUserMessageCount ?? 0,
    );
    const activeTask = resolvedContext.interactionContext?.task ?? persistedState.activeTask ?? null;
    const conversationState: ConversationState = {
      ...mergeWithPersisted(derivedState, persistedState),
      activeTask,
    };

    const initialCounts: Record<string, number> = {};
    for (const name of ['load_recipe', 'browse_recipe_collection', 'search_recipe_collection']) {
      initialCounts[name] = countCompletedToolCallsSinceLatestUser(body.messages, name);
    }
    const tools = selectTools(body.tools);
    let systemPrompt = buildSystemPrompt(
      resolvedContext.recipeGraph,
      body.cookbookContext,
      resolvedContext.interactionContext,
      resolvedContext.cookingPreferences,
      conversationState,
    );

    // Hydrate the resolved subject once before inference. Historical graphs stay compact,
    // while follow-ups receive fresh, RLS-checked quantities without a model/tool round.
    if (conversationState.subject && conversationState.subject.pageId !== focusRef?.pageId) {
      const { data, error } = await userClient.schema('nutriai').from('cookbook_pages')
        .select('recipe_graph').eq('id', conversationState.subject.pageId).maybeSingle();
      if (error) throw new Error('The recipe could not be loaded. Please try again.');
      systemPrompt += data?.recipe_graph
        ? `\nCURRENT SUBJECT RECIPE (fresh full graph; answer directly):\n${JSON.stringify(data.recipe_graph)}`
        : '\nThe current subject recipe is unavailable. Do not use historical quantities or steps; ask the user to choose another recipe.';
    }

    const compactMessages = compactChatHistory(body.messages);
    const traceStartPromise = startAgentRun({ requestId, userId: user!.id, body, tools })
      .catch((error) => {
        logError('nosh-chat trace start request failed', {
          error: error instanceof Error ? error.message : 'Unknown trace error',
        });
      });

    logInfo('nosh-chat started', {
      messageCount: compactMessages.length,
      originalMessageCount: body.messages.length,
      hasRecipeGraph: !!resolvedContext.recipeGraph,
      hasSubject: Boolean(conversationState.subject),
      subjectSource: conversationState.subjectSource,
      activeTask: conversationState.activeTask,
      hasPersistedSubject: Boolean(persistedState.subject),
      toolCount: tools.length,
      toolNames: tools.map((t) => t.function.name),
      initialCounts,
      entryPoint: body.interactionContext?.entryPoint,
      task: body.interactionContext?.task,
    });

    const executedToolNames: string[] = [];
    let finalConversationState = conversationState;
    let firstTextAt: number | undefined;
    logInfo('nosh-chat context ready', { requestId, durationMs: Date.now() - requestStartedAt });
    const turn = runAgentTurn({
      req,
      requestId,
      userClient,
      body,
      systemPrompt,
      history: compactMessages,
      tools,
      initialCounts,
      conversationState,
      onToolExecuted: (name) => executedToolNames.push(name),
      onStateChange: (state) => { finalConversationState = state; },
    });

    const finishTrace = async (
      status: 'completed' | 'failed' | 'cancelled',
      result?: Extract<AgentEvent, { type: 'result' }>['result'],
      error?: unknown,
    ) => {
      await traceStartPromise;
      await finishAgentRun({
        requestId,
        userId: user!.id,
        status,
        startedAt: requestStartedAt,
        usage: result?.usage,
        toolNames: [...executedToolNames, ...(result?.toolCalls.map((call) => call.tool) ?? [])],
        error,
      });
      if (result) {
        logInfo('nosh-chat completed', {
          finishReason: result.finishReason,
          serverToolCount: executedToolNames.length,
          clientToolCallCount: result.toolCalls.length,
          cost: result.usage.cost,
          promptTokens: result.usage.prompt_tokens,
          completionTokens: result.usage.completion_tokens,
          totalTokens: result.usage.total_tokens,
          durationMs: Date.now() - requestStartedAt,
          entryPoint: body.interactionContext?.entryPoint,
          task: body.interactionContext?.task,
          streamed: Boolean(body.stream),
        });
      }
      if (threadId && status === 'completed') {
        const stateToPersist: ConversationState = {
          ...finalConversationState,
          activeTask: activeTask ?? finalConversationState.activeTask,
        };
        // The client may close its reader as soon as it receives the result.
        // Persist with the same user authorization, independently of that signal.
        const persistenceClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
          global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
          auth: { autoRefreshToken: false, persistSession: false },
        });
        await upsertThreadState(persistenceClient, threadId, stateToPersist);
      }
    };

    if (body.stream) {
      const encoder = new TextEncoder();
      let streamCancelled = false;
      const responseStream = new ReadableStream<Uint8Array>({
        cancel() { streamCancelled = true; turnAbort.abort(); },
        async start(controller) {
          const send = (event: unknown) => {
            if (!streamCancelled) controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
          };
          try {
            let finalResult: Extract<AgentEvent, { type: 'result' }>['result'] | undefined;
            for await (const event of turn) {
              if (event.type === 'text-delta' && firstTextAt === undefined) {
                firstTextAt = Date.now();
                logInfo('nosh-chat first text', { requestId, durationMs: firstTextAt - requestStartedAt });
              }
              send(event);
              if (event.type === 'result') finalResult = event.result;
            }
            EdgeRuntime.waitUntil(finishTrace('completed', finalResult).catch((error) => {
              logError('nosh-chat completion bookkeeping failed', { error: String(error) });
            }));
          } catch (modelErr) {
            const message = modelErr instanceof Error ? modelErr.message : 'Chat request failed';
            logError('nosh-chat stream failed', { error: message });
            EdgeRuntime.waitUntil(finishTrace(req.signal.aborted ? 'cancelled' : 'failed', undefined, modelErr).catch((error) => {
              logError('nosh-chat failure bookkeeping failed', { error: String(error) });
            }));
            send({ type: 'error', error: message });
          } finally {
            if (!streamCancelled) controller.close();
          }
        },
      });

      return new Response(responseStream, {
        status: 200,
        headers: {
          ...getCorsHeaders(req),
          'Content-Type': 'application/x-ndjson; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          'X-Content-Type-Options': 'nosniff',
        },
      });
    }

    // Non-streaming callers receive the final round plus the server-executed
    // tool calls, so they can persist the same thread shape as the stream.
    const serverToolCalls: Array<{ toolCall: ToolCall; result?: JsonRecord; isError?: boolean }> = [];
    let finalResult: Extract<AgentEvent, { type: 'result' }>['result'] | undefined;
    try {
      for await (const event of turn) {
        if (event.type === 'tool-call') serverToolCalls.push({ toolCall: event.toolCall });
        if (event.type === 'tool-result') {
          const entry = serverToolCalls.find((item) => item.toolCall.id === event.toolCallId);
          if (entry) {
            entry.result = event.result;
            entry.isError = event.isError;
          }
        }
        if (event.type === 'result') finalResult = event.result;
      }
    } catch (modelErr) {
      const message = modelErr instanceof Error ? modelErr.message : 'Chat request failed';
      logError('nosh-chat model call failed', { error: message });
      await finishTrace('failed', undefined, modelErr);
      return jsonError(message, 502, req);
    }
    if (!finalResult) {
      await finishTrace('failed', undefined, new Error('Missing model choice'));
      return jsonError('No response from model', 502, req);
    }

    await finishTrace('completed', finalResult);
    return jsonResponse({ ...finalResult, serverToolCalls, userId: user!.id }, 200, req);
  } catch (err) {
    return errorResponse(err, req);
  }
});

