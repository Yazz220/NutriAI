/**
 * Shared OpenRouter API helpers for Edge Functions.
 *
 * All three new Edge Functions (extract-recipe, nosh-chat) call the
 * OpenRouter Chat Completions API. This module centralizes the request
 * construction, headers, and response parsing.
 *
 * generate-page-art uses the Image API (separate helper in the function
 * itself) since the request/response shape is different.
 */

import { fetchWithRetry } from './fetchRetry.ts';
import { logError } from './log.ts';

const AI_API_KEY = Deno.env.get('AI_API_KEY') || '';
const AI_API_BASE = (Deno.env.get('AI_API_BASE') || 'https://openrouter.ai/api/v1').replace(/\/$/, '');

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | ContentPart[];
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

export type ContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } }
  | { type: 'video_url'; video_url: { url: string } };

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface ResponseFormat {
  type: 'json_schema' | 'json_object';
  json_schema?: {
    name: string;
    strict?: boolean;
    schema: Record<string, unknown>;
  };
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  response_format?: ResponseFormat;
  tools?: ToolDefinition[];
  tool_choice?: string | { type: string; function?: { name: string } };
  seed?: number;
  top_p?: number;
  reasoning?: {
    enabled?: boolean;
    effort?: 'low' | 'medium' | 'high';
    exclude?: boolean;
  };
  provider?: {
    require_parameters?: boolean;
  };
}

export interface ChatCompletionResponse {
  id: string;
  choices: Array<{
    message: {
      role: 'assistant';
      content: string | ContentPart[] | null;
      tool_calls?: ToolCall[];
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    cost?: number;
  };
}

export interface ChatCompletionStreamChunk {
  choices?: Array<{
    delta?: {
      content?: string | null;
      tool_calls?: Array<{
        index: number;
        id?: string;
        type?: 'function';
        function?: { name?: string; arguments?: string };
      }>;
    };
    finish_reason?: string | null;
  }>;
  usage?: ChatCompletionResponse['usage'];
}

/**
 * Call the OpenRouter Chat Completions API with retry.
 * Throws AppError on non-retryable failures.
 */
export async function callChatCompletion(
  request: ChatCompletionRequest,
  options?: { timeoutMs?: number },
): Promise<ChatCompletionResponse> {
  if (!AI_API_KEY) {
    throw new Error('OpenRouter is not configured (missing AI_API_KEY)');
  }

  const controller = new AbortController();
  const timeoutMs = options?.timeoutMs ?? 60_000;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetchWithRetry(`${AI_API_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${AI_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://nosh.app',
        'X-Title': 'Folio Cookbook',
      },
      body: JSON.stringify(request),
      signal: controller.signal,
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const message =
        typeof data?.error?.message === 'string'
          ? data.error.message
          : typeof data?.error === 'string'
            ? data.error
            : `OpenRouter request failed (${res.status})`;
      logError('OpenRouter chat completion failed', {
        provider: 'openrouter',
        operation: 'chat_completion',
        model: request.model,
        status: res.status,
        error: message,
      });
      throw new Error(message);
    }

    return data as ChatCompletionResponse;
  } finally {
    clearTimeout(timeout);
  }
}

/** Stream OpenRouter's SSE chat-completion chunks while retaining timeout and cancellation. */
export async function* streamChatCompletion(
  request: ChatCompletionRequest,
  options?: { timeoutMs?: number; signal?: AbortSignal },
): AsyncGenerator<ChatCompletionStreamChunk> {
  if (!AI_API_KEY) {
    throw new Error('OpenRouter is not configured (missing AI_API_KEY)');
  }

  const controller = new AbortController();
  const abortFromExternal = () => controller.abort();
  if (options?.signal?.aborted) controller.abort();
  options?.signal?.addEventListener('abort', abortFromExternal, { once: true });
  const timeout = setTimeout(() => controller.abort(), options?.timeoutMs ?? 60_000);

  try {
    const res = await fetchWithRetry(`${AI_API_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${AI_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://nosh.app',
        'X-Title': 'Folio Cookbook',
      },
      body: JSON.stringify({
        ...request,
        stream: true,
        stream_options: { include_usage: true },
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const message =
        typeof data?.error?.message === 'string'
          ? data.error.message
          : typeof data?.error === 'string'
            ? data.error
            : `OpenRouter request failed (${res.status})`;
      logError('OpenRouter chat stream failed', {
        provider: 'openrouter',
        operation: 'chat_stream',
        model: request.model,
        status: res.status,
        error: message,
      });
      throw new Error(message);
    }

    if (!res.body) throw new Error('OpenRouter returned an empty stream');
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const data = trimmed.slice(5).trim();
        if (!data || data === '[DONE]') continue;
        yield JSON.parse(data) as ChatCompletionStreamChunk;
      }

      if (done) break;
    }

    const finalLine = buffer.trim();
    if (finalLine.startsWith('data:')) {
      const data = finalLine.slice(5).trim();
      if (data && data !== '[DONE]') {
        yield JSON.parse(data) as ChatCompletionStreamChunk;
      }
    }
  } finally {
    clearTimeout(timeout);
    options?.signal?.removeEventListener('abort', abortFromExternal);
  }
}

/**
 * Extract the text content from a chat completion response.
 * Handles both string content and array-of-parts content.
 */
export function extractTextContent(response: ChatCompletionResponse): string {
  const content = response.choices?.[0]?.message?.content;
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((part: any) => (part?.type === 'text' ? part.text : ''))
      .join('\n');
  }
  return '';
}

/**
 * Extract and parse JSON from a response that should contain JSON.
 * Strips markdown code fences and extracts the outermost JSON object.
 */
export function extractJsonObject<T = Record<string, unknown>>(text: string): T {
  const trimmed = text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  const jsonText = start >= 0 && end > start ? trimmed.slice(start, end + 1) : trimmed;

  try {
    return JSON.parse(jsonText) as T;
  } catch {
    throw new Error('AI returned invalid JSON');
  }
}
