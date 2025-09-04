// Simple AI client for OpenRouter (OpenAI-compatible chat completions)
// Uses Expo public env vars. For production, prefer routing through a secure backend proxy.

const AI_PROVIDER = process.env.EXPO_PUBLIC_AI_PROVIDER || 'openrouter';
const AI_API_BASE = process.env.EXPO_PUBLIC_AI_API_BASE || 'https://openrouter.ai/api/v1';
const AI_MODEL = process.env.EXPO_PUBLIC_AI_MODEL || 'openai/gpt-oss-20b:free';
const AI_API_KEY = process.env.EXPO_PUBLIC_AI_API_KEY; // If unset, requests must go through proxy
const AI_PROXY_BASE = process.env.EXPO_PUBLIC_AI_PROXY_BASE; // Optional proxy

// Masked runtime config log (no secrets)
try {
  // eslint-disable-next-line no-console
  console.log('[AI] config', {
    provider: AI_PROVIDER,
    hasProxy: Boolean(AI_PROXY_BASE),
    hasKey: Boolean(AI_API_KEY),
    base: (AI_PROXY_BASE || AI_API_BASE)?.replace(/:\/\//, '://'),
  });
} catch {}

export function isAiConfigured() {
  return Boolean(AI_PROXY_BASE || AI_API_KEY);
}

export type ChatMessage = { 
  role: 'system' | 'user' | 'assistant'; 
  content: string | Array<{ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }>;
};
export type AiProfileContext = { display_name?: string; units?: string; goals?: Record<string, unknown> | null; preferences?: Record<string, unknown> | null };
export type InventoryItemCtx = { id?: string | number; name: string; quantity?: number; unit?: string | null; category?: string | null; expiryDate?: string | null };
export type PlannedMealCtx = { id?: string | number; recipeId: string; date: string; mealType: string; servings?: number; notes?: string | null; isCompleted?: boolean };
export type AiContext = { profile?: AiProfileContext | null; inventory?: InventoryItemCtx[]; plannedMeals?: PlannedMealCtx[] };

export async function createChatCompletion(messages: ChatMessage[]): Promise<string> {
  return await requestWithRetry(messages, false);
}

// Vision-enabled chat completion for image analysis
export async function createVisionChatCompletion(messages: ChatMessage[]): Promise<string> {
  return await requestWithRetryVision(messages, false);
}

// Deterministic variant for import flows
export async function createChatCompletionDeterministic(messages: ChatMessage[]): Promise<string> {
  return await requestWithRetryCustom(messages, { stream: false, temperature: 0, top_p: 0 });
}

export async function createChatCompletionStream(
  messages: ChatMessage[],
  onDelta: (chunk: string) => void
): Promise<string> {
  // Fallback to non-streaming, then pseudo-stream chunks
  const full = await requestWithRetry(messages, false);
  // Pseudo-stream by splitting into sentences
  const parts = full.split(/(?<=[.!?])\s+/);
  for (const p of parts) {
    if (p) onDelta(p + ' ');
  }
  return full;
}

async function requestWithRetry(messages: ChatMessage[], stream: boolean, maxRetries = 2): Promise<string> {
  if (!isAiConfigured()) {
    throw new Error(
      'AI is not configured. Set EXPO_PUBLIC_AI_PROXY_BASE (recommended) or EXPO_PUBLIC_AI_API_KEY in your env and restart Expo.'
    );
  }
  const base = AI_PROXY_BASE || AI_API_BASE;
  const url = `${base.replace(/\/$/, '')}/chat/completions`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (!AI_PROXY_BASE && AI_API_KEY) {
    headers['Authorization'] = `Bearer ${AI_API_KEY}`;
    // Optional headers recommended by OpenRouter
    headers['HTTP-Referer'] = 'https://nutriai.app';
    headers['X-Title'] = 'NutriAI';
  }

  const body = {
    model: AI_MODEL,
    messages,
    temperature: 0.7,
    stream,
  } as const;

  return await makeRequest(url, headers, body, maxRetries);
}

async function requestWithRetryVision(messages: ChatMessage[], stream: boolean, maxRetries = 2): Promise<string> {
  if (!isAiConfigured()) {
    throw new Error(
      'AI is not configured. Set EXPO_PUBLIC_AI_PROXY_BASE (recommended) or EXPO_PUBLIC_AI_API_KEY in your env and restart Expo.'
    );
  }
  const base = AI_PROXY_BASE || AI_API_BASE;
  const url = `${base.replace(/\/$/, '')}/chat/completions`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (!AI_PROXY_BASE && AI_API_KEY) {
    headers['Authorization'] = `Bearer ${AI_API_KEY}`;
    headers['HTTP-Referer'] = 'https://nutriai.app';
    headers['X-Title'] = 'NutriAI';
  }

  // Use vision model for image processing
  const visionModel = process.env.EXPO_PUBLIC_AI_VISION_MODEL || 'openai/gpt-4o-mini';
  const body = {
    model: visionModel,
    messages,
    temperature: 0.1,
    max_tokens: 1000,
    stream,
  } as const;

  return await makeRequest(url, headers, body, maxRetries);
}

async function makeRequest(url: string, headers: Record<string, string>, body: any, maxRetries: number): Promise<string> {

  let attempt = 0;
  let lastErr: any;
  while (attempt <= maxRetries) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        // Retry on 429/5xx
        if (res.status === 429 || res.status >= 500) {
          throw new RetryableError(`AI request failed (${res.status}): ${text}`);
        }
        throw new Error(`AI request failed (${res.status}): ${text}`);
      }
      const json = await res.json();
      const content = json?.choices?.[0]?.message?.content;
      if (typeof content !== 'string') {
        throw new Error('AI response missing content');
      }
      return content.trim();
    } catch (err) {
      lastErr = err;
      const isRetryable = err instanceof RetryableError;
      if (!isRetryable || attempt === maxRetries) break;
      const delayMs = Math.pow(2, attempt) * 500; // 0.5s, 1s, 2s
      await new Promise((r) => setTimeout(r, delayMs));
      attempt++;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

class RetryableError extends Error {}

// Customizable requester used by deterministic flows (temperature/top_p)
async function requestWithRetryCustom(
  messages: ChatMessage[],
  opts: { stream: boolean; temperature: number; top_p?: number },
  maxRetries = 2
): Promise<string> {
  if (!isAiConfigured()) {
    throw new Error(
      'AI is not configured. Set EXPO_PUBLIC_AI_PROXY_BASE (recommended) or EXPO_PUBLIC_AI_API_KEY in your env and restart Expo.'
    );
  }
  const base = AI_PROXY_BASE || AI_API_BASE;
  const url = `${base.replace(/\/$/, '')}/chat/completions`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (!AI_PROXY_BASE && AI_API_KEY) {
    headers['Authorization'] = `Bearer ${AI_API_KEY}`;
    headers['HTTP-Referer'] = 'https://nutriai.app';
    headers['X-Title'] = 'NutriAI';
  }

  const body: any = {
    model: AI_MODEL,
    messages,
    temperature: opts.temperature,
    stream: opts.stream,
  };
  if (typeof opts.top_p === 'number') body.top_p = opts.top_p;

  let attempt = 0;
  let lastErr: any;
  while (attempt <= maxRetries) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        if (res.status === 429 || res.status >= 500) {
          throw new RetryableError(`AI request failed (${res.status}): ${text}`);
        }
        throw new Error(`AI request failed (${res.status}): ${text}`);
      }
      const json = await res.json();
      const content = json?.choices?.[0]?.message?.content;
      if (typeof content !== 'string') {
        throw new Error('AI response missing content');
      }
      return content;
    } catch (err) {
      lastErr = err;
      if (err instanceof RetryableError && attempt < maxRetries) {
        attempt++;
        const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

// ---------------------------------------------------------------------------
// Secure path used in production: call our Supabase Edge Function ai-chat.
// This avoids exposing any provider API keys in the client app.
// ---------------------------------------------------------------------------

export type ChatStructuredBlock = {
  kind: 'text' | 'tip' | 'recipe' | 'plan';
  title?: string;
  content?: string;
  data?: unknown;
};

export type ChatStructuredResponse = {
  type: 'chat';
  model?: string;
  output?: {
    summary?: string;
    suggestions?: string[];
    blocks?: ChatStructuredBlock[];
  };
};

/**
 * aiChat: calls the Supabase Edge Function (functions/v1/ai-chat)
 * using the public anon key as a bearer token. No provider keys in the app.
 */
export async function aiChat(messages: ChatMessage[], context?: AiContext): Promise<ChatStructuredResponse> {
  const base = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!base || !anon) throw new Error('Missing EXPO_PUBLIC_SUPABASE_URL or ANON_KEY');

  const url = `${base.replace(/\/$/, '')}/functions/v1/ai-chat`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${anon}`,
      apikey: anon,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ messages, context }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`ai-chat failed (${res.status}): ${text}`);
  }
  const json = await res.json();
  // Support both structured and legacy { reply } shapes
  if (json && json.type === 'chat') return json as ChatStructuredResponse;
  if (json && typeof json.reply === 'string') {
    return {
      type: 'chat',
      output: {
        summary: json.reply,
        blocks: [{ kind: 'text', title: 'Coach', content: json.reply }],
      },
    };
  }
  return json as ChatStructuredResponse;
}
