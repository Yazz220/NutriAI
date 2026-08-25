/**
 * NoshChatAdapter — bridges the assistant-ui ChatModelAdapter to the
 * nosh-chat Supabase Edge Function.
 *
 * The adapter receives messages from the assistant-ui runtime (in
 * ThreadMessage[] format), converts them to the OpenAI-compatible format
 * that nosh-chat expects, calls the Edge Function, and returns the
 * response with text + tool-call parts.
 *
 * The runtime handles the tool-calling loop:
 *   1. Adapter returns content with tool-call parts
 *   2. Runtime executes tools via the toolkit
 *   3. Runtime calls adapter again — tool results are on the assistant
 *      message's tool-call parts (result field)
 *   4. Adapter extracts results, sends as "tool" role messages to nosh-chat
 *   5. nosh-chat returns final text response
 */

import type { ChatModelAdapter, ThreadMessage, ThreadAssistantMessagePart } from '@assistant-ui/react-native';
import { streamAuthenticatedFunction } from '@/utils/supabaseEdge';
import type { RecipeGraph } from '@/types/recipeGraph';
import type { NoshInteractionEnvelope, NoshTask } from '@/types/noshInteraction';

// ---------------------------------------------------------------------------
// Types — mirrors of the nosh-chat Edge Function's request/response
// ---------------------------------------------------------------------------

interface NoshChatToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

interface NoshChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_calls?: NoshChatToolCall[];
  tool_call_id?: string;
}

interface NoshChatRequest {
  messages: NoshChatMessage[];
  recipeGraph?: RecipeGraph;
  cookbookContext?: {
    activeCookbookId?: string;
    title?: string;
    styleId?: string;
    availableCookbooks?: Array<{ id: string; title: string }>;
  };
  interactionContext: NoshInteractionEnvelope & {
    hasAttachedImage: boolean;
  };
  tools: string[];
  stream?: boolean;
}

interface NoshChatResponse {
  message: {
    role: 'assistant';
    content: string;
    tool_calls?: NoshChatToolCall[];
  };
  toolCalls: Array<{ tool: string } & Record<string, unknown>>;
  finishReason?: string;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number; cost?: number };
}

type NoshChatStreamEvent =
  | { type: 'text-delta'; delta: string }
  | { type: 'result'; result: NoshChatResponse }
  | { type: 'error'; error: string };

// ---------------------------------------------------------------------------
// Message conversion: assistant-ui ThreadMessage[] → OpenAI-compatible format
// ---------------------------------------------------------------------------

function convertMessagesToNoshFormat(messages: readonly ThreadMessage[]): NoshChatMessage[] {
  const result: NoshChatMessage[] = [];

  for (const msg of messages) {
    if (msg.role === 'system') {
      const text = extractText(msg.content);
      if (text) result.push({ role: 'system', content: text });
      continue;
    }

    if (msg.role === 'user') {
      const text = extractText(msg.content);
      if (text) result.push({ role: 'user', content: text });
      continue;
    }

    if (msg.role === 'assistant') {
      const text = extractText(msg.content);
      const toolCalls: NoshChatToolCall[] = [];
      const toolResults: Array<{ toolCallId: string; result: unknown }> = [];

      for (const part of msg.content) {
        if (part.type === 'tool-call') {
          toolCalls.push({
            id: part.toolCallId,
            type: 'function',
            function: {
              name: part.toolName,
              arguments: part.argsText || JSON.stringify(part.args ?? {}),
            },
          });
          // If the tool has been executed, extract the result
          if (part.result !== undefined) {
            toolResults.push({ toolCallId: part.toolCallId, result: part.result });
          }
        }
      }

      result.push({
        role: 'assistant',
        content: text || '',
        ...(toolCalls.length > 0 ? { tool_calls: toolCalls } : {}),
      });

      // Emit tool result messages (OpenAI format: role "tool" with tool_call_id)
      for (const tr of toolResults) {
        result.push({
          role: 'tool',
          content: typeof tr.result === 'string' ? tr.result : JSON.stringify(tr.result),
          tool_call_id: tr.toolCallId,
        });
      }
      continue;
    }
  }

  return result;
}

function extractText(content: ThreadMessage['content']): string {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content
    .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
    .map((p) => p.text)
    .join('\n');
}

// ---------------------------------------------------------------------------
// Cookbook context builder
// ---------------------------------------------------------------------------

function buildCookbookContext(
  activeCookbookId?: string,
  cookbookTitle?: string,
  styleId?: string,
  availableCookbooks?: Array<{ id: string; title: string }>,
): NoshChatRequest['cookbookContext'] {
  return {
    activeCookbookId,
    title: cookbookTitle,
    styleId,
    availableCookbooks,
  };
}

// ---------------------------------------------------------------------------
// The ChatModelAdapter
// ---------------------------------------------------------------------------

export interface NoshChatAdapterContext {
  /** The focused recipe graph, which does not follow reader swipes. */
  recipeGraph?: RecipeGraph | null;
  /** Focused cookbook title. */
  cookbookTitle?: string;
  /** Focused cookbook id, used by page-creation tools. */
  activeCookbookId?: string;
  /** Cookbook style ID */
  styleId?: string;
  /** Real cookbooks available as page destinations */
  availableCookbooks?: Array<{ id: string; title: string }>;
  /** Entry point, active task, stable focus, and visible route hint. */
  interaction: NoshInteractionEnvelope;
  /** Whether the composer has a recipe image ready for extraction */
  hasAttachedImage?: boolean;
}

const TOOLS_BY_TASK: Record<NoshTask, string[]> = {
  collection: ['start_recipe_capture', 'search_recipe_collection', 'load_recipe', 'open_recipe', 'list_cookbooks', 'organize_recipe'],
  'recipe-help': [
    'start_recipe_capture',
    'search_recipe_collection',
    'load_recipe',
    'open_recipe',
    'list_cookbooks',
    'organize_recipe',
    'scale_servings',
    'substitute_ingredient',
    'start_timer',
    'guide_next_step',
    'set_walkthrough',
    'update_page_data',
    'regenerate_recipe_page',
  ],
  capture: [],
  walkthrough: [
    'search_recipe_collection',
    'load_recipe',
    'open_recipe',
    'list_cookbooks',
    'organize_recipe',
    'start_timer',
    'guide_next_step',
    'set_walkthrough',
    'scale_servings',
    'substitute_ingredient',
    'update_page_data',
    'regenerate_recipe_page',
  ],
};

/**
 * Create a ChatModelAdapter that bridges to the nosh-chat Edge Function.
 * The context (recipeGraph, cookbook info) is captured at call time so
 * the adapter always sends the latest page state.
 */
export function createNoshChatAdapter(
  getContext: () => NoshChatAdapterContext,
): ChatModelAdapter {
  return {
    async *run({ messages, context, abortSignal }) {
      const ctx = getContext();
      const requestBody: NoshChatRequest = {
        messages: convertMessagesToNoshFormat(messages),
        ...(ctx.recipeGraph ? { recipeGraph: ctx.recipeGraph } : {}),
        cookbookContext: buildCookbookContext(
          ctx.activeCookbookId,
          ctx.cookbookTitle,
          ctx.styleId,
          ctx.availableCookbooks,
        ),
        interactionContext: {
          ...ctx.interaction,
          hasAttachedImage: ctx.hasAttachedImage ?? false,
        },
        tools: TOOLS_BY_TASK[ctx.interaction.task],
        stream: true,
      };

      let response: NoshChatResponse | null = null;
      let streamedText = '';
      for await (const event of streamAuthenticatedFunction<NoshChatStreamEvent | NoshChatResponse>(
        'nosh-chat',
        requestBody as unknown as Record<string, unknown>,
        { timeoutMs: 60_000, signal: abortSignal },
      )) {
        if ('type' in event && event.type === 'text-delta') {
          streamedText += event.delta;
          yield { content: [{ type: 'text', text: streamedText }] };
        } else if ('type' in event && event.type === 'result') {
          response = event.result;
        } else if ('type' in event && event.type === 'error') {
          throw new Error(event.error);
        } else {
          // Compatibility with a nosh-chat deployment that has not yet been
          // upgraded to NDJSON streaming.
          response = event;
        }
      }

      if (!response) throw new Error('Nosh returned an incomplete response.');

      // Build the content parts from the response
      const content: ThreadAssistantMessagePart[] = [];
      let toolExecutionFailed = false;

      const text = response.message.content?.trim();
      if (text) {
        content.push({ type: 'text', text });
      }

      // Convert tool calls to assistant-ui format
      if (response.message.tool_calls) {
        for (const tc of response.message.tool_calls) {
          const argsText = tc.function.arguments || '{}';
          let args: Record<string, unknown> = {};
          try {
            args = JSON.parse(argsText);
          } catch {
            // malformed args — send empty
          }
          const registeredTool = context.tools?.[tc.function.name];
          let result: unknown;
          let isError = false;

          if (registeredTool?.type === 'frontend' && registeredTool.execute) {
            try {
              result = await registeredTool.execute(args, {
                toolCallId: tc.id,
                abortSignal,
                human: async () => {
                  throw new Error('This tool requires input through its review card.');
                },
              });
            } catch (error) {
              isError = true;
              toolExecutionFailed = true;
              result = {
                error: error instanceof Error ? error.message : 'Tool execution failed',
              };
            }
          } else if (!registeredTool) {
            isError = true;
            toolExecutionFailed = true;
            result = { error: `Nosh tool ${tc.function.name} is unavailable` };
          }

          content.push({
            type: 'tool-call',
            toolCallId: tc.id,
            toolName: tc.function.name,
            args: args as Record<string, never>,
            argsText,
            ...(result !== undefined ? { result, isError } : {}),
          });
        }
      }

      if (toolExecutionFailed) {
        content.push({
          type: 'text',
          text: 'I could not finish that action. Please try again, or send the recipe in another format.',
        });
      }

      // If no content at all, provide a fallback
      if (content.length === 0) {
        content.push({ type: 'text', text: 'I can help with this recipe.' });
      }

      yield {
        content,
        status: toolExecutionFailed
          ? { type: 'complete', reason: 'stop' }
          : response.message.tool_calls?.length
          ? { type: 'requires-action', reason: 'tool-calls' }
          : { type: 'complete', reason: 'stop' },
      };
    },
  };
}
