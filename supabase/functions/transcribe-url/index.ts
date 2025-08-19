// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

function json(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "*",
      ...headers,
    },
  });
}

function normalizeYouTube(u: string): string {
  try {
    const url = new URL(u);
    if (url.hostname === "youtu.be" && url.pathname.length > 1) {
      return `https://www.youtube.com/watch?v=${url.pathname.slice(1)}`;
    }
    const m = url.pathname.match(/\/shorts\/([^\/?#]+)/);
    if (m?.[1]) return `https://www.youtube.com/watch?v=${m[1]}`;
    return u;
  } catch {
    return u;
  }
}

function extractYouTubeId(u: string): string | null {
  try {
    const url = new URL(u);
    if (url.hostname === "youtu.be" && url.pathname.length > 1) return url.pathname.slice(1);
    if (url.hostname.includes("youtube.com")) {
      const v = url.searchParams.get("v");
      if (v) return v;
      const m = url.pathname.match(/\/shorts\/([^\/?#]+)/);
      if (m?.[1]) return m[1];
    }
    return null;
  } catch {
    return null;
  }
}

async function readUrlFromRequest(req: Request): Promise<string | null> {
  const contentType = req.headers.get("content-type") || "";
  try {
    // Support JSON { url }
    if (contentType.includes("application/json")) {
      const body = await req.json().catch(() => ({} as any));
      const val = String((body as any)?.url || "").trim();
      return val || null;
    }
    // Support multipart/form-data with 'file' containing a URL string
    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const fileField = (form as any).get?.("file");
      if (typeof fileField === "string") {
        return fileField.trim() || null;
      }
      // If a Blob/File was uploaded, we currently do not support uploading user media through the proxy.
      // Return a friendly error to the client.
      return null;
    }
  } catch (_) {
    // fallthrough
  }
  return null;
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Allow-Methods": "POST,OPTIONS",
      },
    });
  }

  if (req.method !== "POST") {
    return json({ error: "method_not_allowed" }, 405);
  }

  // Allow both /transcribe-url and /transcribe-url/audio/transcriptions
  const url = new URL(req.url);
  const path = url.pathname;
  if (!path.endsWith("/transcribe-url") && !path.includes("/transcribe-url/")) {
    // Still process, but note path
  }

  // Read input URL from JSON or FormData
  const inputUrl = await readUrlFromRequest(req);
  if (!inputUrl) {
    return json({ error: "missing_or_unsupported_input", hint: "Send JSON {url} or multipart with file=<url string>" }, 400);
  }

  const normUrl = normalizeYouTube(inputUrl);

  try {
    // 1) Resolve direct audio stream
    const RESOLVER = Deno.env.get("AUDIO_RESOLVER_BASE") || "";
    const RESOLVER_KEY = Deno.env.get("AUDIO_RESOLVER_KEY") || "";
    let audioUrl = "";

    if (RESOLVER) {
      // Use configured resolver
      const resolverRes = await fetch(`${RESOLVER}?url=${encodeURIComponent(normUrl)}`, {
        headers: RESOLVER_KEY ? { Authorization: `Bearer ${RESOLVER_KEY}` } : undefined,
      });
      const resolverText = await resolverRes.text();
      if (!resolverRes.ok) {
        return json({ error: "resolver_failed", status: resolverRes.status, body: resolverText }, 502);
      }
      try {
        const j = JSON.parse(resolverText);
        audioUrl = j.audio || j.stream || j.url || "";
      } catch {
        if (/^https?:\/\//i.test(resolverText.trim())) audioUrl = resolverText.trim();
      }
    } else {
      // Built-in Piped fallback (no resolver required)
      const vid = extractYouTubeId(normUrl);
      if (!vid) return json({ error: "cannot_extract_video_id" }, 422);
      const pipedApi = "https://piped.video/api/v1/streams/" + encodeURIComponent(vid);
      const pRes = await fetch(pipedApi);
      if (!pRes.ok) {
        const t = await pRes.text().catch(() => "");
        return json({ error: "piped_failed", status: pRes.status, body: t }, 502);
      }
      const data = await pRes.json();
      const streams = (data?.audioStreams || []) as Array<any>;
      if (!streams.length) return json({ error: "no_audio_streams" }, 422);
      // choose highest bitrate
      streams.sort((a, b) => (Number(b.bitrate) || 0) - (Number(a.bitrate) || 0));
      audioUrl = streams[0]?.url || "";
    }

    if (!audioUrl) return json({ error: "no_audio_stream" }, 422);

    // 2) Call Lemonfox STT with resolved audio URL
    const LEMON_BASE = Deno.env.get("LEMONFOX_API_BASE") || "https://api.lemonfox.ai/v1";
    const LEMON_KEY = Deno.env.get("LEMONFOX_API_KEY") || "";
    if (!LEMON_KEY) {
      return json({ error: "stt_not_configured" }, 500);
    }

    const form = new FormData();
    form.append("file", audioUrl);
    form.append("language", "english");
    form.append("response_format", "json");

    const lf = await fetch(`${LEMON_BASE}/audio/transcriptions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${LEMON_KEY}` },
      body: form as any,
    });
    const lfBody = await lf.text();
    if (!lf.ok) {
      return json({ error: "stt_failed", status: lf.status, body: lfBody }, 502);
    }

    // Expect { text: "..." }
    try {
      const parsed = JSON.parse(lfBody);
      return json(parsed, 200);
    } catch {
      return json({ text: lfBody }, 200);
    }
  } catch (e) {
    return json({ error: "proxy_error", details: String(e?.message || e) }, 500);
  }
});
