// AI client — all requests route through the Supabase ai-chat Edge Function.
// No provider API keys are ever shipped in the client bundle.

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const AI_MODEL = process.env.EXPO_PUBLIC_AI_MODEL || 'openai/gpt-oss-20b:free';
const AI_VISION_MODEL = process.env.EXPO_PUBLIC_AI_VISION_MODEL || 'openai/gpt-4o-mini';

function edgeFunctionUrl(): string {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(
      'AI is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in your .env and restart Expo.',
    );
  }
  return `${SUPABASE_URL.replace(/\/$/, '')}/functions/v1/ai-chat`;
}

function authHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    apikey: SUPABASE_ANON_KEY!,
    'Content-Type': 'application/json',
  };
}

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content:
    | string
    | Array<
        { type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }
      >;
};

export type AiProfileContext = {
  display_name?: string;
  units?: string;
  goals?: Record<string, unknown> | null;
  preferences?: Record<string, unknown> | null;
};

export type InventoryItemCtx = {
  id?: string | number;
  name: string;
  quantity?: number;
  unit?: string | null;
  category?: string | null;
  expiryDate?: string | null;
};

export type PlannedMealCtx = {
  id?: string | number;
  recipeId: string;
  date: string;
  mealType: string;
  servings?: number;
  notes?: string | null;
  isCompleted?: boolean;
};

export type AiContext = {
  profile?: AiProfileContext | null;
  inventory?: InventoryItemCtx[];
  plannedMeals?: PlannedMealCtx[];
};

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

// ---------------------------------------------------------------------------
// Configuration check
// ---------------------------------------------------------------------------

export function isAiConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

// ---------------------------------------------------------------------------
// Core request helper
// ---------------------------------------------------------------------------

class RetryableError extends Error {}

async function edgeFunctionRequest(
  payload: Record<string, unknown>,
  maxRetries = 2,
): Promise<any> {
  const url = edgeFunctionUrl();
  const headers = authHeaders();

  let attempt = 0;
  let lastErr: unknown;

  while (attempt <= maxRetries) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        if (res.status === 429 || res.status >= 500) {
          throw new RetryableError(`ai-chat failed (${res.status}): ${text}`);
        }
        throw new Error(`ai-chat failed (${res.status}): ${text}`);
      }

      return await res.json();
    } catch (err) {
      lastErr = err;
      if (!(err instanceof RetryableError) || attempt === maxRetries) break;
      const delayMs = Math.pow(2, attempt) * 500;
      await new Promise((r) => setTimeout(r, delayMs));
      attempt++;
    }
  }

  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

// ---------------------------------------------------------------------------
// Public API — simple chat completions (OpenAI-compatible response shape)
// ---------------------------------------------------------------------------

export async function createChatCompletion(messages: ChatMessage[]): Promise<string> {
  const json = await edgeFunctionRequest({ messages, model: AI_MODEL, temperature: 0.7 });
  return extractContent(json);
}

export async function createVisionChatCompletion(messages: ChatMessage[]): Promise<string> {
  const json = await edgeFunctionRequest({
    messages,
    model: AI_VISION_MODEL,
    temperature: 0.1,
    max_tokens: 1000,
  });
  return extractContent(json);
}

export async function createChatCompletionDeterministic(messages: ChatMessage[]): Promise<string> {
  const json = await edgeFunctionRequest({
    messages,
    model: AI_MODEL,
    temperature: 0,
    top_p: 0,
  });
  return extractContent(json);
}

export async function createChatCompletionStream(
  messages: ChatMessage[],
  onDelta: (chunk: string) => void,
): Promise<string> {
  const full = await createChatCompletion(messages);
  // Pseudo-stream by splitting into sentences
  const parts = full.split(/(?<=[.!?])\s+/);
  for (const p of parts) {
    if (p) onDelta(p + ' ');
  }
  return full;
}

// ---------------------------------------------------------------------------
// Public API — structured chat (rich response with blocks/suggestions)
// ---------------------------------------------------------------------------

export async function aiChat(
  messages: ChatMessage[],
  context?: AiContext,
): Promise<ChatStructuredResponse> {
  const json = await edgeFunctionRequest({ messages, context, model: AI_MODEL });

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

  // Fallback: wrap raw OpenAI-compatible response
  const content = json?.choices?.[0]?.message?.content;
  if (typeof content === 'string') {
    return {
      type: 'chat',
      model: json.model,
      output: {
        summary: content,
        blocks: [{ kind: 'text', title: 'Coach', content }],
      },
    };
  }

  return json as ChatStructuredResponse;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractContent(json: any): string {
  // Structured edge function response
  if (json?.output?.summary) return json.output.summary;
  if (json?.reply) return json.reply;
  // OpenAI-compatible response forwarded by edge function
  const content = json?.choices?.[0]?.message?.content;
  if (typeof content === 'string') return content.trim();
  throw new Error('AI response missing content');
}
