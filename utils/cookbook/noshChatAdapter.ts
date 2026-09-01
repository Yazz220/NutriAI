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
import type { CookingPreference } from '@/utils/cookbook/cookingPreferences';

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
  recipeGraphSource?: 'canonical' | 'session-preview';
  cookingPreferences?: CookingPreference[];
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
  requestId?: string;
  threadId?: string;
  userMessageId?: string;
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
  requestId?: string;
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

function latestUserMessageHasImage(messages: readonly ThreadMessage[]): boolean {
  const latestUserMessage = [...messages].reverse().find((message) => message.role === 'user');
  if (!latestUserMessage) return false;
  return Boolean(
    latestUserMessage.attachments?.some((attachment) => attachment.type === 'image')
    || (Array.isArray(latestUserMessage.content)
      && latestUserMessage.content.some((part) => part.type === 'image')),
  );
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
  /** Resolve recipe context before a recipe-scoped run starts. */
  resolveRecipeGraph?: () => Promise<RecipeGraph | null>;
  /** Session previews are intentionally newer than the canonical database graph. */
  recipeGraphSource?: 'canonical' | 'session-preview';
  /** Focused cookbook title. */
  cookbookTitle?: string;
  /** Focused cookbook id, used by page-creation tools. */
  activeCookbookId?: string;
  /** Cookbook style ID */
  styleId?: string;
  /** Real cookbooks available as page destinations */
  availableCookbooks?: Array<{ id: string; title: string }>;
  /** Resolve explicit, user-approved cooking preferences before each run. */
  resolveCookingPreferences?: () => Promise<CookingPreference[]>;
  /** Entry point, active task, stable focus, and visible route hint. */
  interaction: NoshInteractionEnvelope;
  /** Whether the composer has a recipe image ready for extraction */
  hasAttachedImage?: boolean;
}

const TOOLS_BY_TASK: Record<NoshTask, string[]> = {
  collection: ['start_recipe_capture', 'browse_recipe_collection', 'search_recipe_collection', 'load_recipe', 'open_recipe', 'list_cookbooks', 'organize_recipe', 'save_cooking_preference'],
  'recipe-help': [
    'start_recipe_capture',
    'search_recipe_collection',
    'browse_recipe_collection',
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
    'save_cooking_preference',
  ],
  capture: [],
  walkthrough: [
    'search_recipe_collection',
    'browse_recipe_collection',
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
    'save_cooking_preference',
  ],
};

/**
 * Create a ChatModelAdapter that bridges to the nosh-chat Edge Function.
 * The context (recipeGraph, cookbook info) is captured at call time so
 * the adapter always sends the latest page state.
 */
export function createNoshChatAdapter(
  getContext: () => NoshChatAdapterContext,
  requestConsent?: () => Promise<boolean>,
): ChatModelAdapter {
  return {
    async *run({
      messages,
      context,
      abortSignal,
      unstable_assistantMessageId,
      unstable_threadId,
    }) {
      if (requestConsent && !await requestConsent()) {
        throw new Error('Allow AI processing to send messages to Folio.');
      }
      const ctx = getContext();
      const resolvedRecipeGraph = ctx.resolveRecipeGraph
        ? await ctx.resolveRecipeGraph()
        : ctx.recipeGraph;
      const shouldSendRecipeGraph = ctx.recipeGraphSource === 'session-preview';
      const cookingPreferences = ctx.resolveCookingPreferences
        ? await ctx.resolveCookingPreferences()
        : [];
      const latestUserMessage = [...messages].reverse().find((message) => message.role === 'user');
      const requestBody: NoshChatRequest = {
        messages: convertMessagesToNoshFormat(messages),
        ...(shouldSendRecipeGraph && resolvedRecipeGraph ? { recipeGraph: resolvedRecipeGraph } : {}),
        ...(resolvedRecipeGraph ? { recipeGraphSource: ctx.recipeGraphSource ?? 'canonical' } : {}),
        ...(cookingPreferences.length ? { cookingPreferences } : {}),
        cookbookContext: buildCookbookContext(
          ctx.activeCookbookId,
          ctx.cookbookTitle,
          ctx.styleId,
          ctx.availableCookbooks,
        ),
        interactionContext: {
          ...ctx.interaction,
          hasAttachedImage: Boolean(
            ctx.hasAttachedImage || latestUserMessageHasImage(messages),
          ),
        },
        tools: TOOLS_BY_TASK[ctx.interaction.task],
        stream: true,
        requestId: unstable_assistantMessageId,
        threadId: unstable_threadId,
        userMessageId: latestUserMessage?.id,
      };

      let response: NoshChatResponse | null = null;
      let streamedText = '';
      try {
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
      } catch (error) {
        // supabaseEdge wraps fetch AbortError instances. The runtime only treats
        // cancellation as intentional when the original signal is checked here.
        if (abortSignal.aborted) return;
        throw error;
      }

      if (abortSignal.aborted) return;
      if (!response) throw new Error('Folio returned an incomplete response.');

      // Build the content parts from the response
      const content: ThreadAssistantMessagePart[] = [];
      let toolExecutionFailed = false;

      const finalText = response.message.content ?? '';
      if (finalText.trim()) {
        content.push({ type: 'text', text: finalText });
      }

      const parsedToolCalls = (response.message.tool_calls ?? []).map((toolCall) => {
        const argsText = toolCall.function.arguments || '{}';
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(argsText);
        } catch {
          // Keep malformed model arguments visible to the tool UI as an empty object.
        }
        const part: ThreadAssistantMessagePart = {
          type: 'tool-call',
          toolCallId: toolCall.id,
          toolName: toolCall.function.name,
          args: args as Record<string, never>,
          argsText,
        };
        content.push(part);
        return { toolCall, args, partIndex: content.length - 1 };
      });

      const hasFrontendTool = parsedToolCalls.some(({ toolCall }) => (
        context.tools?.[toolCall.function.name]?.type === 'frontend'
      ));
      if (hasFrontendTool) {
        // Let Assistant UI render the in-progress tool state before execution.
        yield { content: [...content] };
      }

      for (const { toolCall, args, partIndex } of parsedToolCalls) {
        const registeredTool = context.tools?.[toolCall.function.name];
        let result: unknown;
        let isError = false;

        if (registeredTool?.type === 'frontend' && registeredTool.execute) {
          try {
            result = await registeredTool.execute(args, {
              toolCallId: toolCall.id,
              abortSignal,
              human: async () => {
                throw new Error('This tool requires input through its review card.');
              },
            });
          } catch (error) {
            if (abortSignal.aborted) return;
            isError = true;
            toolExecutionFailed = true;
            result = {
              error: error instanceof Error ? error.message : 'Tool execution failed',
            };
          }
        } else if (!registeredTool) {
          isError = true;
          toolExecutionFailed = true;
          result = { error: `Folio tool ${toolCall.function.name} is unavailable` };
        }

        if (result !== undefined) {
          content[partIndex] = {
            ...content[partIndex],
            result,
            isError,
          } as ThreadAssistantMessagePart;
        }

        if (hasFrontendTool) {
          yield { content: [...content] };
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

      const status = toolExecutionFailed
        ? { type: 'complete' as const, reason: 'stop' as const }
        : parsedToolCalls.length
        ? { type: 'requires-action' as const, reason: 'tool-calls' as const }
        : { type: 'complete' as const, reason: 'stop' as const };
      const metadata = response.requestId
        ? { custom: { noshAgentRequestId: response.requestId } }
        : undefined;

      // Text-only streaming already supplied the exact content. A status-only
      // update avoids replacing it once more at the end of the run.
      if (parsedToolCalls.length === 0 && streamedText === finalText && content.length > 0) {
        yield { status, metadata };
      } else {
        yield { content, status, metadata };
      }
    },
  };
}
