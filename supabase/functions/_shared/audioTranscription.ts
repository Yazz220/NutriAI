import type { ResolvedAudioRecipeEvidence } from './audioRecipeEvidence.ts';

export type AudioTranscriptionResult =
  | {
      ready: true;
      transcript: string;
      model: string;
      adapterVersion: 'audio-transcription-v1';
    }
  | {
      ready: false;
      reasonCode: 'audio_no_speech' | 'audio_too_large' | 'audio_transcription_failed';
      diagnostic: string;
    };

type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

export const MAX_AUDIO_TRANSCRIPT_CHARACTERS = 40_000;

export async function transcribeAudioRecipeEvidence(
  evidence: ResolvedAudioRecipeEvidence,
  options: {
    apiBase: string;
    apiKey: string;
    model: string;
    fetchImpl?: FetchLike;
    timeoutMs?: number;
  },
): Promise<AudioTranscriptionResult> {
  if (!options.apiKey || !options.model) {
    return {
      ready: false,
      reasonCode: 'audio_transcription_failed',
      diagnostic: 'The audio transcription provider is not configured.',
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 90_000);
  try {
    let response: Response;
    try {
      response = await (options.fetchImpl ?? fetch)(
        `${options.apiBase.replace(/\/$/, '')}/audio/transcriptions`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${options.apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://nosh.app',
            'X-Title': 'Folio Cookbook',
          },
          body: JSON.stringify({
            model: options.model,
            input_audio: {
              data: evidence.base64Audio,
              format: evidence.format,
            },
          }),
          signal: controller.signal,
        },
      );
    } catch (error) {
      return {
        ready: false,
        reasonCode: 'audio_transcription_failed',
        diagnostic: error instanceof Error
          ? `The transcription request failed: ${error.message}`
          : 'The transcription request failed.',
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
        diagnostic: `The transcription provider returned ${providerMessage}.`,
      };
    }

    const transcript = typeof data?.text === 'string' ? data.text.trim() : '';
    if (!transcript) {
      return {
        ready: false,
        reasonCode: 'audio_no_speech',
        diagnostic: 'The transcription provider returned no spoken text.',
      };
    }
    if (transcript.length > MAX_AUDIO_TRANSCRIPT_CHARACTERS) {
      return {
        ready: false,
        reasonCode: 'audio_too_large',
        diagnostic: `The audio transcript is ${transcript.length} characters.`,
      };
    }

    return {
      ready: true,
      transcript,
      model: options.model,
      adapterVersion: 'audio-transcription-v1',
    };
  } finally {
    clearTimeout(timeout);
  }
}
