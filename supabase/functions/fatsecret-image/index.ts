import { serve } from 'std/http/server.ts';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, if-none-match',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
};

const TOKEN_ENDPOINT = 'https://oauth.fatsecret.com/connect/token';
const API_BASE = 'https://platform.fatsecret.com/rest/server.api';

async function getAccessToken(scope: string = 'basic image-recognition'): Promise<string> {
  const CLIENT_ID = Deno.env.get('FATSECRET_CLIENT_ID');
  const CLIENT_SECRET = Deno.env.get('FATSECRET_CLIENT_SECRET');
  if (!CLIENT_ID || !CLIENT_SECRET) throw new Error('Missing FATSECRET_CLIENT_ID or FATSECRET_CLIENT_SECRET');
  const basic = btoa(`${CLIENT_ID}:${CLIENT_SECRET}`);
  const body = new URLSearchParams({ grant_type: 'client_credentials', scope });
  const res = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Authorization': `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  const text = await res.text();
  let json: any;
  try { json = JSON.parse(text); } catch { throw new Error(`Invalid token response: ${text}`); }
  if (!res.ok) throw new Error(`Token fetch failed ${res.status}: ${text}`);
  return json.access_token as string;
}

type RecognitionRequest = {
  image_b64: string;
  region?: string; // e.g., 'US'
  language?: string; // e.g., 'en'
  include_food_data?: boolean;
  eaten_foods?: Array<{
    food_id?: number;
    food_name?: string;
    food_brand?: string | null;
    serving_description?: string;
    serving_size?: number;
  }>;
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  try {
    const payload = (await req.json()) as Partial<RecognitionRequest>;
    const image_b64 = (payload?.image_b64 || '').trim();
    if (!image_b64) {
      return new Response(JSON.stringify({ error: 'Missing image_b64' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Acquire token (will fail if image-recognition scope not granted)
    let token = '';
    try {
      token = await getAccessToken('basic image-recognition');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return new Response(JSON.stringify({ error: 'Token error', details: msg }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Construct upstream request body
    const body = {
      method: 'image.recognition.v1',
      format: 'json',
      image_b64,
      region: payload.region || 'US',
      language: payload.language || 'en',
      include_food_data: payload.include_food_data ?? true,
      eaten_foods: Array.isArray(payload.eaten_foods) ? payload.eaten_foods : undefined,
    } as Record<string, unknown>;

    const res = await fetch(API_BASE, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const text = await res.text();
    const headers = {
      ...corsHeaders,
      'Content-Type': res.headers.get('content-type') || 'application/json',
      'Cache-Control': 'no-store',
    };

    // Pass through response (client will normalize)
    return new Response(text, { status: res.status, headers });
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
