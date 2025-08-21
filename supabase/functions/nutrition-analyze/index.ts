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

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // Credentials from Supabase secrets
    const APP_ID = Deno.env.get('EDA_APP_ID');
    const APP_KEY = Deno.env.get('EDA_APP_KEY');

    if (!APP_ID || !APP_KEY) {
      return new Response(JSON.stringify({ error: 'Missing Edamam credentials' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Read client payload (Edamam expects a JSON recipe-like object)
    const payload = await req.json();

    // Build upstream endpoint
    const upstream = new URL(`${EDA_BASE}/api/nutrition-details`);
    upstream.searchParams.set('app_id', APP_ID);
    upstream.searchParams.set('app_key', APP_KEY);

    const ifNoneMatch = req.headers.get('if-none-match') ?? undefined;

    const res = await fetch(upstream.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(ifNoneMatch ? { 'If-None-Match': ifNoneMatch } : {}),
      },
      body: JSON.stringify(payload),
    });

    const etag = res.headers.get('etag') ?? undefined;
    const contentType = res.headers.get('content-type') || 'application/json';
    const body = await res.text();

    const headers: Record<string, string> = {
      ...corsHeaders,
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=86400',
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
