// Minimal Speech-to-Text client used by ImportRecipeModal.
// If STT is not configured via env, we fail gracefully with a helpful message.

export type TranscribeOptions = {
  language?: string;
  response_format?: 'json' | 'text';
};

export type TranscribeResponse = {
  text: string;
};

const BASE = process.env.EXPO_PUBLIC_STT_API_BASE;
const KEY = process.env.EXPO_PUBLIC_STT_API_KEY;

function ensureConfigured() {
  if (!BASE || !KEY) {
    throw new Error(
      'Speech-to-Text is not configured. Set EXPO_PUBLIC_STT_API_BASE and EXPO_PUBLIC_STT_API_KEY in your .env to enable video/audio transcription.'
    );
  }
}

export async function transcribeFromUrl(url: string, options: TranscribeOptions = {}): Promise<TranscribeResponse> {
  ensureConfigured();
  const res = await fetch(`${BASE}/transcribe/url`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${KEY}`,
    },
    body: JSON.stringify({ url, ...options }),
  });
  if (!res.ok) {
    const msg = await safeText(res);
    throw new Error(msg || `STT request failed (${res.status})`);
  }
  const data = await safeJson(res);
  return { text: data?.text ?? '' };
}

export async function transcribeFromUri(
  uri: string,
  filename: string,
  mime: string,
  options: TranscribeOptions = {}
): Promise<TranscribeResponse> {
  ensureConfigured();
  const form = new FormData();
  // React Native fetch supports { uri, name, type }
  form.append('file', {
    // @ts-ignore - RN FormData file shape
    uri,
    name: filename || 'audio.mp4',
    type: mime || 'application/octet-stream',
  });
  if (options.language) form.append('language', options.language);
  if (options.response_format) form.append('response_format', options.response_format);

  const res = await fetch(`${BASE}/transcribe/file`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${KEY}`,
    },
    body: form as any,
  });
  if (!res.ok) {
    const msg = await safeText(res);
    throw new Error(msg || `STT upload failed (${res.status})`);
  }
  const data = await safeJson(res);
  return { text: data?.text ?? '' };
}

async function safeJson(res: Response): Promise<any> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

async function safeText(res: Response): Promise<string | null> {
  try {
    return await res.text();
  } catch {
    return null;
  }
}
