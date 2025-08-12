// Speech-to-Text client for Lemonfox (OpenAI-compatible audio transcriptions)
// Uses Expo public env vars for local dev. In production, prefer a proxy.

import * as FileSystem from 'expo-file-system';

const STT_API_BASE = process.env.EXPO_PUBLIC_STT_API_BASE || 'https://api.lemonfox.ai/v1';
const STT_API_KEY = process.env.EXPO_PUBLIC_STT_API_KEY;

// Masked runtime config log (no secrets)
try {
  // eslint-disable-next-line no-console
  console.log('[STT] config', {
    hasKey: Boolean(STT_API_KEY),
    base: STT_API_BASE?.replace(/:\/\//, '://'),
  });
} catch {}

export type SttOptions = {
  language?: string; // e.g., 'english'
  response_format?: 'json' | 'text' | 'srt' | 'vtt';
  speaker_labels?: boolean;
  prompt?: string;
  translate?: boolean;
  timestamp_granularities?: string[];
};

export async function transcribeFromUri(uri: string, filename: string = 'audio.mp4', mime: string = 'video/mp4', opts: SttOptions = {}) {
  if (!STT_API_KEY) throw new Error('Missing EXPO_PUBLIC_STT_API_KEY for STT provider');

  // React Native FormData supports { uri, name, type }
  const form: any = new FormData();
  form.append('file', { uri, name: filename, type: mime } as any);
  if (opts.language) form.append('language', opts.language);
  form.append('response_format', opts.response_format || 'json');
  if (opts.speaker_labels != null) form.append('speaker_labels', String(opts.speaker_labels));
  if (opts.prompt) form.append('prompt', opts.prompt);
  if (opts.translate != null) form.append('translate', String(opts.translate));
  if (opts.timestamp_granularities && opts.timestamp_granularities.length) {
    // Lemonfox expects array param name with []
    for (const g of opts.timestamp_granularities) form.append('timestamp_granularities[]', g);
  }

  const url = `${STT_API_BASE.replace(/\/$/, '')}/audio/transcriptions`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${STT_API_KEY}` },
    body: form,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`STT request failed (${res.status}): ${text}`);
  }
  const json = await res.json();
  const text: string = json?.text || '';
  return { text, raw: json };
}

export async function transcribeFromUrl(fileUrl: string, opts: SttOptions = {}) {
  if (!STT_API_KEY) throw new Error('Missing EXPO_PUBLIC_STT_API_KEY for STT provider');
  const form: any = new FormData();
  form.append('file', fileUrl);
  if (opts.language) form.append('language', opts.language);
  form.append('response_format', opts.response_format || 'json');
  if (opts.speaker_labels != null) form.append('speaker_labels', String(opts.speaker_labels));
  if (opts.prompt) form.append('prompt', opts.prompt);
  if (opts.translate != null) form.append('translate', String(opts.translate));
  if (opts.timestamp_granularities && opts.timestamp_granularities.length) {
    for (const g of opts.timestamp_granularities) form.append('timestamp_granularities[]', g);
  }
  const url = `${STT_API_BASE.replace(/\/$/, '')}/audio/transcriptions`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${STT_API_KEY}` },
    body: form,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`STT request failed (${res.status}): ${text}`);
  }
  const json = await res.json();
  const text: string = json?.text || '';
  return { text, raw: json };
}
