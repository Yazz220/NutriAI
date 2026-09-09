const allowedOrigins = new Set([
  'http://localhost:8081',
  'http://localhost:8082',
  'http://localhost:19006',
  'https://nosh.app',
]);

export function getCorsHeaders(req?: Request): HeadersInit {
  const origin = req?.headers.get('origin') ?? '';
  const allowOrigin = allowedOrigins.has(origin) ? origin : '*';

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, sentry-trace, baggage, traceparent, tracestate',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };
}

export function corsResponse(req?: Request): Response {
  return new Response('ok', { headers: getCorsHeaders(req) });
}

export function jsonResponse(body: unknown, status = 200, req?: Request): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
  });
}

export function jsonError(message: string, status: number, req?: Request): Response {
  return jsonResponse({ error: message }, status, req);
}
