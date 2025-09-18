import { serve } from 'std/http/server.ts';

// Simple CORS for Expo apps and local testing
const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
};

const TOKEN_ENDPOINT = 'https://oauth.fatsecret.com/connect/token';

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);

    // Diagnostic ping to verify egress/DNS from the Edge Function runtime
    if (req.method === 'GET' && url.searchParams.get('ping') === '1') {
      try {
        const res = await fetch('https://httpbin.org/get', { method: 'GET' });
        const body = await res.text();
        return new Response(body, { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      } catch (e) {
        const err = e instanceof Error ? e.message : String(e);
        return new Response(JSON.stringify({ error: `Ping failed: ${err}` }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    const CLIENT_ID = Deno.env.get('FATSECRET_CLIENT_ID');
    const CLIENT_SECRET = Deno.env.get('FATSECRET_CLIENT_SECRET');

    if (!CLIENT_ID || !CLIENT_SECRET) {
      return new Response(
        JSON.stringify({ error: 'Missing FATSECRET_CLIENT_ID or FATSECRET_CLIENT_SECRET in Function env' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Optional: allow overriding scope via query (?scope=basic)
    const scope = url.searchParams.get('scope') || 'basic';

    const basic = btoa(`${CLIENT_ID}:${CLIENT_SECRET}`);
    const body = new URLSearchParams();
    body.set('grant_type', 'client_credentials');
    body.set('scope', scope);

    // Add a timeout to avoid long hangs
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const upstream = await fetch(TOKEN_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${basic}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    const text = await upstream.text();
    let json: any;
    try {
      json = JSON.parse(text);
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid token response', raw: text }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!upstream.ok) {
      return new Response(JSON.stringify({ error: 'Token fetch failed', details: json }), {
        status: upstream.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Return minimal token fields
    const { access_token, token_type, expires_in, scope: grantedScope } = json;
    return new Response(
      JSON.stringify({ access_token, token_type, expires_in, scope: grantedScope }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } },
    );
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
