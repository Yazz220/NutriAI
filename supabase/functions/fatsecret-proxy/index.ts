import { serve } from 'std/http/server.ts';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, if-none-match',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
};

const TOKEN_ENDPOINT = 'https://oauth.fatsecret.com/connect/token';
const API_BASE = 'https://platform.fatsecret.com/rest/server.api';

async function getAccessToken(): Promise<string> {
  const CLIENT_ID = Deno.env.get('FATSECRET_CLIENT_ID');
  const CLIENT_SECRET = Deno.env.get('FATSECRET_CLIENT_SECRET');
  if (!CLIENT_ID || !CLIENT_SECRET) throw new Error('Missing FATSECRET_CLIENT_ID or FATSECRET_CLIENT_SECRET');
  const basic = btoa(`${CLIENT_ID}:${CLIENT_SECRET}`);
  const body = new URLSearchParams({ grant_type: 'client_credentials', scope: 'basic' });
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

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const url = new URL(req.url);

    // Diagnostic ping
    if (req.method === 'GET' && url.searchParams.get('ping') === '1') {
      const ping = await fetch('https://httpbin.org/get');
      const body = await ping.text();
      return new Response(body, { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Build upstream URL preserving query parameters exactly
    const upstream = new URL(API_BASE);
    url.searchParams.forEach((v, k) => {
      upstream.searchParams.append(k, v);
    });

    const token = await getAccessToken();

    const ifNoneMatch = req.headers.get('if-none-match') ?? undefined;
    const res = await fetch(upstream.toString(), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        ...(ifNoneMatch ? { 'If-None-Match': ifNoneMatch } : {}),
      },
    });

    const body = await res.text();
    const headers: Record<string, string> = {
      ...corsHeaders,
      'Content-Type': res.headers.get('content-type') || 'application/json',
      'Cache-Control': 'public, max-age=600',
    };
    const etag = res.headers.get('etag');
    if (etag) headers['ETag'] = etag;

    return new Response(body, { status: res.status, headers });
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
