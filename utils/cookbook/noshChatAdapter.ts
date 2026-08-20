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
import { callAuthenticatedFunction } from '@/utils/supabaseEdge';
import type { RecipeGraph } from '@/types/recipeGraph';
import type { CookbookPage } from '@/types/cookbook';

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
    title?: string;
    styleId?: string;
    otherRecipes?: Array<{ title: string; category?: string }>;
  };
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
  pages: CookbookPage[],
  cookbookTitle?: string,
  styleId?: string,
): NoshChatRequest['cookbookContext'] {
  return {
    title: cookbookTitle,
    styleId,
    otherRecipes: pages
      .filter((p) => p.title)
      .slice(0, 20)
      .map((p) => ({ title: p.title, category: p.section })),
  };
}

// ---------------------------------------------------------------------------
// The ChatModelAdapter
// ---------------------------------------------------------------------------

export interface NoshChatAdapterContext {
  /** The active page's RecipeGraph (sent as system context to nosh-chat) */
  recipeGraph?: RecipeGraph | null;
  /** All pages in the current cookbook (for cookbook context) */
  cookbookPages: CookbookPage[];
  /** Cookbook title */
  cookbookTitle?: string;
  /** Cookbook style ID */
  styleId?: string;
}

/**
 * Create a ChatModelAdapter that bridges to the nosh-chat Edge Function.
 * The context (recipeGraph, cookbook info) is captured at call time so
 * the adapter always sends the latest page state.
 */
export function createNoshChatAdapter(
  getContext: () => NoshChatAdapterContext,
): ChatModelAdapter {
  return {
    async run({ messages }) {
      const ctx = getContext();

      const requestBody: NoshChatRequest = {
        messages: convertMessagesToNoshFormat(messages),
        ...(ctx.recipeGraph ? { recipeGraph: ctx.recipeGraph } : {}),
        cookbookContext: buildCookbookContext(
          ctx.cookbookPages,
          ctx.cookbookTitle,
          ctx.styleId,
        ),
      };

      const response = await callAuthenticatedFunction<NoshChatResponse>(
        'nosh-chat',
        requestBody as unknown as Record<string, unknown>,
        { timeoutMs: 60_000 },
      );

      // Build the content parts from the response
      const content: ThreadAssistantMessagePart[] = [];

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
          content.push({
            type: 'tool-call',
            toolCallId: tc.id,
            toolName: tc.function.name,
            args: args as Record<string, never>,
            argsText,
          });
        }
      }

      // If no content at all, provide a fallback
      if (content.length === 0) {
        content.push({ type: 'text', text: 'I can help with this recipe.' });
      }

      return { content };
    },
  };
}
