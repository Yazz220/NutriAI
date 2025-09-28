import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, if-none-match',
};

const THEMEALDB_BASE = 'https://www.themealdb.com/api/json/v1';

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);

    // Path format expected:
    // /functions/v1/mealdb-proxy/themealdb/:key/<path>
    // Example:
    // /functions/v1/mealdb-proxy/themealdb/1/search.php?s=chicken
    const parts = url.pathname.split('/').filter(Boolean);
    const fnIndex = parts.indexOf('mealdb-proxy');
    const afterFn = parts.slice(fnIndex + 1); // [ 'themealdb', ':key', ...rest ]

    if (afterFn.length < 3 || afterFn[0] !== 'themealdb') {
      return new Response(
        JSON.stringify({ error: 'Invalid path. Use /mealdb-proxy/themealdb/<key>/<path>' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = afterFn[1];
    const restPath = afterFn.slice(2).join('/');

    if (!apiKey || !restPath) {
      return new Response(
        JSON.stringify({ error: 'Missing API key or path.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build upstream URL
    const upstream = new URL(`${THEMEALDB_BASE}/${apiKey}/${restPath}`);
    // Pass through query params
    url.searchParams.forEach((value, key) => {
      upstream.searchParams.append(key, value);
    });

    const res = await fetch(upstream.toString(), {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Referer: 'https://nosh.app',
      },
    });

    const contentType = res.headers.get('content-type') || 'application/json';
    const body = await res.text();

    const headers: Record<string, string> = {
      ...corsHeaders,
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=900', // 15 minutes
      'X-Upstream': 'TheMealDB',
    };

    return new Response(body, { status: res.status, headers });
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
