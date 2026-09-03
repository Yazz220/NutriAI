import {
  MAX_AUDIO_TRANSCRIPT_CHARACTERS,
  readTranscriptionUsage,
  type TranscriptionUsage,
} from './audioTranscription.ts';
import type { VideoRecipeMimeType } from './videoUploadContract.ts';

export type VideoTranscriptionResult =
  | {
      ready: true;
      transcript: string;
      model: string;
      provider: 'openrouter';
      usage?: TranscriptionUsage;
      adapterVersion: 'video-transcription-openrouter-v1';
    }
  | {
      ready: false;
      reasonCode: 'audio_no_speech' | 'audio_too_large' | 'audio_transcription_failed';
      diagnostic: string;
    };

type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

function safeFileName(fileName: string | undefined, mimeType: VideoRecipeMimeType): string {
  const suppliedName = fileName?.split(/[\\/]/).pop()?.trim();
  if (suppliedName) return suppliedName.slice(0, 180);
  if (mimeType === 'video/mov') return 'recipe.mov';
  if (mimeType === 'video/mpeg') return 'recipe.mpeg';
  if (mimeType === 'video/webm') return 'recipe.webm';
  return 'recipe.mp4';
}

/**
 * Sends an inspected video file to Folio's replaceable direct-media STT
 * adapter. OpenRouter's multipart transcription endpoint accepts bounded media
 * files without duplicating a large video as base64 in the Edge Function.
 */
export async function transcribeVideoRecipeEvidence(
  evidence: {
    bytes: Uint8Array;
    mimeType: VideoRecipeMimeType;
    fileName?: string;
  },
  options: {
    apiBase: string;
    apiKey: string;
    model: string;
    fetchImpl?: FetchLike;
    timeoutMs?: number;
  },
): Promise<VideoTranscriptionResult> {
  if (!options.apiKey || !options.model) {
    return {
      ready: false,
      reasonCode: 'audio_transcription_failed',
      diagnostic: 'The video transcription provider is not configured.',
    };
  }

  const form = new FormData();
  form.append('model', options.model);
  form.append('response_format', 'json');
  form.append('temperature', '0');
  const fileBuffer = new ArrayBuffer(evidence.bytes.byteLength);
  new Uint8Array(fileBuffer).set(evidence.bytes);
  form.append(
    'file',
    new Blob([fileBuffer], { type: evidence.mimeType }),
    safeFileName(evidence.fileName, evidence.mimeType),
  );

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 120_000);
  try {
    let response: Response;
    try {
      response = await (options.fetchImpl ?? fetch)(
        `${options.apiBase.replace(/\/$/, '')}/audio/transcriptions`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${options.apiKey}`,
            'HTTP-Referer': 'https://nosh.app',
            'X-Title': 'Folio Cookbook',
          },
          body: form,
          signal: controller.signal,
        },
      );
    } catch (error) {
      return {
        ready: false,
        reasonCode: 'audio_transcription_failed',
        diagnostic: error instanceof Error
          ? `The video transcription request failed: ${error.message}`
          : 'The video transcription request failed.',
      };
    }

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const providerMessage = typeof data?.error?.message === 'string'
        ? data.error.message
        : typeof data?.error === 'string'
          ? data.error
          : `HTTP ${response.status}`;
      return {
        ready: false,
        reasonCode: 'audio_transcription_failed',
        diagnostic: `The video transcription provider returned ${providerMessage}.`,
      };
    }

    const transcript = typeof data?.text === 'string' ? data.text.trim() : '';
    if (!transcript) {
      return {
        ready: false,
        reasonCode: 'audio_no_speech',
        diagnostic: 'The video transcription provider returned no spoken text.',
      };
    }
    if (transcript.length > MAX_AUDIO_TRANSCRIPT_CHARACTERS) {
      return {
        ready: false,
        reasonCode: 'audio_too_large',
        diagnostic: `The video transcript is ${transcript.length} characters.`,
      };
    }

    return {
      ready: true,
      transcript,
      model: options.model,
      provider: 'openrouter',
      usage: readTranscriptionUsage(data?.usage),
      adapterVersion: 'video-transcription-openrouter-v1',
    };
  } finally {
    clearTimeout(timeout);
  }
}
