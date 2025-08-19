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
  if (!BASE) {
    throw new Error(
      'Speech-to-Text is not configured. Set EXPO_PUBLIC_STT_API_BASE (to your proxy or provider) in your .env to enable video/audio transcription.'
    );
  }
}

export async function transcribeFromUrl(url: string, options: TranscribeOptions = {}): Promise<TranscribeResponse> {
  ensureConfigured();
  const form = new FormData();
  // Lemonfox accepts a public URL string in the 'file' field
  form.append('file', url);
  if (options.language) form.append('language', options.language);
  if (options.response_format) form.append('response_format', options.response_format);

  // If no KEY, we assume BASE is a proxy function that accepts POST directly
  const endpoint = KEY ? `${BASE}/audio/transcriptions` : `${BASE}`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: KEY ? { Authorization: `Bearer ${KEY}` } : undefined,
    body: form as any,
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
  // For file uploads we require provider KEY (proxy does not support raw file uploads)
  if (!BASE) {
    throw new Error('Speech-to-Text is not configured. Set EXPO_PUBLIC_STT_API_BASE.');
  }
  if (!KEY) {
    throw new Error('Speech-to-Text upload not supported without provider key. Set EXPO_PUBLIC_STT_API_KEY to upload files.');
  }
  const form = new FormData();
  // React Native fetch supports { uri, name, type }. Cast to relax TS DOM types.
  (form as unknown as { append: (name: string, value: any) => void }).append('file', {
    uri,
    name: filename || 'audio.mp4',
    type: mime || 'application/octet-stream',
  });
  if (options.language) form.append('language', options.language);
  if (options.response_format) form.append('response_format', options.response_format);

  const res = await fetch(`${BASE}/audio/transcriptions`, {
    method: 'POST',
    headers: KEY ? { Authorization: `Bearer ${KEY}` } : undefined,
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
