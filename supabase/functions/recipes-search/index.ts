import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, if-none-match',
};

const EDA_BASE = 'https://api.edamam.com';

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);

    // Edamam credentials from Supabase secrets
    const APP_ID = Deno.env.get('EDA_APP_ID');
    const APP_KEY = Deno.env.get('EDA_APP_KEY');

    if (!APP_ID || !APP_KEY) {
      return new Response(JSON.stringify({ error: 'Missing Edamam credentials' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build upstream URL (public recipe search v2)
    // Keep all client query params except creds; append app_id/app_key
    const upstream = new URL(`${EDA_BASE}/api/recipes/v2`);
    // Edamam v2 requires type=public
    upstream.searchParams.set('type', url.searchParams.get('type') || 'public');

    // Pass-through common search params (q, diet, health, cuisineType, mealType, dishType, calories, imageSize, random, field, beta)
    url.searchParams.forEach((value, key) => {
      if (key === 'app_id' || key === 'app_key' || key === 'type') return; // enforce our own
      upstream.searchParams.append(key, value);
    });

    upstream.searchParams.set('app_id', APP_ID);
    upstream.searchParams.set('app_key', APP_KEY);

    // Forward request
    const ifNoneMatch = req.headers.get('if-none-match') ?? undefined;
    const res = await fetch(upstream.toString(), {
      method: 'GET',
      headers: {
        ...(ifNoneMatch ? { 'If-None-Match': ifNoneMatch } : {}),
      },
    });

    const etag = res.headers.get('etag') ?? undefined;

    // Prepare response body (JSON or text for non-200)
    const body = await res.text();

    const headers: Record<string, string> = {
      ...corsHeaders,
      'Content-Type': res.headers.get('content-type') || 'application/json',
      'Cache-Control': 'public, max-age=3600',
      'X-Attribution': 'Data by Edamam',
    };
    if (etag) headers['ETag'] = etag;

    return new Response(body, { status: res.status, headers });
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
