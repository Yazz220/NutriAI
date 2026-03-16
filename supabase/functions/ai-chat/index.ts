/**
 * ai-chat Edge Function
 *
 * Secure AI proxy that forwards chat requests to OpenRouter (or any
 * OpenAI-compatible provider). The provider API key lives here as a
 * Supabase Function secret — never in the client app.
 *
 * Required Supabase Function secrets:
 *   AI_API_KEY   – OpenRouter (or compatible) API key
 *   AI_API_BASE  – Provider base URL (default: https://openrouter.ai/api/v1)
 *   AI_MODEL     – Default model (default: openai/gpt-oss-20b:free)
 *
 * The client authenticates with the Supabase anon key as a Bearer token.
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ---------------------------------------------------------------------------
// Configuration (all from Supabase Function secrets)
// ---------------------------------------------------------------------------
const AI_API_KEY = Deno.env.get('AI_API_KEY') || '';
const AI_API_BASE = Deno.env.get('AI_API_BASE') || 'https://openrouter.ai/api/v1';
const AI_MODEL = Deno.env.get('AI_MODEL') || 'openai/gpt-oss-20b:free';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // -----------------------------------------------------------------------
    // 1. Verify the caller is authenticated via Supabase JWT
    // -----------------------------------------------------------------------
    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.startsWith('Bearer ')) {
      return jsonError('Missing Authorization header', 401);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return jsonError('Unauthorized', 401);
    }

    // -----------------------------------------------------------------------
    // 2. Parse request body
    // -----------------------------------------------------------------------
    const body = await req.json();
    const {
      messages,
      context,
      model = AI_MODEL,
      temperature = 0.7,
      max_tokens,
      top_p,
    } = body as {
      messages: Array<{ role: string; content: unknown }>;
      context?: Record<string, unknown>;
      model?: string;
      temperature?: number;
      max_tokens?: number;
      top_p?: number;
    };

    if (!Array.isArray(messages) || messages.length === 0) {
      return jsonError('messages array is required', 400);
    }

    if (!AI_API_KEY) {
      return jsonError('AI provider not configured (missing AI_API_KEY secret)', 503);
    }

    // -----------------------------------------------------------------------
    // 3. Build enriched messages (inject context as a system message)
    // -----------------------------------------------------------------------
    const enrichedMessages = [...messages];

    if (context && Object.keys(context).length > 0) {
      const contextSummary = buildContextSummary(context);
      if (contextSummary) {
        // Prepend a system message with user context
        enrichedMessages.unshift({
          role: 'system',
          content: contextSummary,
        });
      }
    }

    // -----------------------------------------------------------------------
    // 4. Forward to AI provider
    // -----------------------------------------------------------------------
    const providerUrl = `${AI_API_BASE.replace(/\/$/, '')}/chat/completions`;

    const providerBody: Record<string, unknown> = {
      model,
      messages: enrichedMessages,
      temperature,
    };
    if (typeof max_tokens === 'number') providerBody.max_tokens = max_tokens;
    if (typeof top_p === 'number') providerBody.top_p = top_p;

    const providerRes = await fetch(providerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${AI_API_KEY}`,
        'HTTP-Referer': 'https://nosh.app',
        'X-Title': 'Nosh',
      },
      body: JSON.stringify(providerBody),
    });

    if (!providerRes.ok) {
      const errText = await providerRes.text().catch(() => '');
      console.error('[ai-chat] provider error', providerRes.status, errText.slice(0, 500));
      return jsonError(
        `AI provider error (${providerRes.status})`,
        providerRes.status === 429 ? 429 : 502,
      );
    }

    const providerJson = await providerRes.json();

    // -----------------------------------------------------------------------
    // 5. Return the provider's response directly (OpenAI-compatible shape)
    // -----------------------------------------------------------------------
    return new Response(JSON.stringify(providerJson), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[ai-chat] unexpected error', err);
    return jsonError('Internal error', 500);
  }
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function buildContextSummary(context: Record<string, unknown>): string {
  const parts: string[] = [];

  const profile = context.profile as Record<string, unknown> | undefined;
  if (profile) {
    if (profile.display_name) parts.push(`User: ${profile.display_name}`);
    if (profile.units) parts.push(`Units: ${profile.units}`);
    if (profile.goals) parts.push(`Goals: ${JSON.stringify(profile.goals)}`);
    if (profile.preferences) parts.push(`Preferences: ${JSON.stringify(profile.preferences)}`);
  }

  const inventory = context.inventory as unknown[];
  if (Array.isArray(inventory) && inventory.length > 0) {
    const names = inventory
      .slice(0, 30)
      .map((i: any) => i.name)
      .filter(Boolean);
    if (names.length > 0) {
      parts.push(`Inventory (${inventory.length} items): ${names.join(', ')}`);
    }
  }

  const meals = context.plannedMeals as unknown[];
  if (Array.isArray(meals) && meals.length > 0) {
    parts.push(`Planned meals: ${meals.length} upcoming`);
  }

  return parts.length > 0
    ? `[User context]\n${parts.join('\n')}`
    : '';
}
