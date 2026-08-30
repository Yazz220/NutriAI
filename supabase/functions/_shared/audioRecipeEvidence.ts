import type { RecipeEvidenceFailureCode } from './recipeEvidence.ts';

export const MAX_AUDIO_CAPTURE_BYTES = 6_000_000;

export const SUPPORTED_AUDIO_FORMATS = [
  'wav',
  'mp3',
  'aiff',
  'aac',
  'ogg',
  'flac',
  'm4a',
] as const;

export type AudioRecipeFormat = typeof SUPPORTED_AUDIO_FORMATS[number];

type AudioFailureCode = Extract<
  RecipeEvidenceFailureCode,
  'audio_source_unsupported' | 'audio_too_large'
>;

export type AudioRecipeSourceDecision =
  | {
      ready: true;
      format: AudioRecipeFormat;
      mimeType: string;
      byteSize: number;
      adapterVersion: 'audio-source-v1';
    }
  | {
      ready: false;
      reasonCode: AudioFailureCode;
      diagnostic: string;
    };

export type ResolvedAudioRecipeEvidence = Extract<AudioRecipeSourceDecision, { ready: true }> & {
  base64Audio: string;
};

const FORMAT_BY_MIME_TYPE: Readonly<Record<string, AudioRecipeFormat>> = {
  'audio/aac': 'aac',
  'audio/aiff': 'aiff',
  'audio/flac': 'flac',
  'audio/m4a': 'm4a',
  'audio/mp4': 'm4a',
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/ogg': 'ogg',
  'audio/wav': 'wav',
  'audio/wave': 'wav',
  'audio/x-aac': 'aac',
  'audio/x-aiff': 'aiff',
  'audio/x-flac': 'flac',
  'audio/x-m4a': 'm4a',
  'audio/x-wav': 'wav',
};

const MIME_TYPE_BY_FORMAT: Readonly<Record<AudioRecipeFormat, string>> = {
  wav: 'audio/wav',
  mp3: 'audio/mpeg',
  aiff: 'audio/aiff',
  aac: 'audio/aac',
  ogg: 'audio/ogg',
  flac: 'audio/flac',
  m4a: 'audio/mp4',
};

function normalizedMimeType(value?: string | null): string | null {
  const normalized = value?.split(';')[0]?.trim().toLowerCase();
  return normalized || null;
}

function formatFromName(fileName?: string | null): AudioRecipeFormat | null {
  const extension = fileName?.trim().toLowerCase().match(/\.([a-z0-9]+)$/)?.[1];
  if (!extension) return null;
  if (extension === 'wave') return 'wav';
  if (extension === 'aif' || extension === 'aifc') return 'aiff';
  return (SUPPORTED_AUDIO_FORMATS as readonly string[]).includes(extension)
    ? extension as AudioRecipeFormat
    : null;
}

export function inspectAudioRecipeSource(input: {
  byteSize: number;
  mimeType?: string | null;
  fileName?: string | null;
}): AudioRecipeSourceDecision {
  if (!Number.isFinite(input.byteSize) || input.byteSize <= 0) {
    return {
      ready: false,
      reasonCode: 'audio_source_unsupported',
      diagnostic: 'The selected audio file was empty or its size could not be read.',
    };
  }
  if (input.byteSize > MAX_AUDIO_CAPTURE_BYTES) {
    return {
      ready: false,
      reasonCode: 'audio_too_large',
      diagnostic: `The selected audio file is ${input.byteSize} bytes.`,
    };
  }

  const mimeType = normalizedMimeType(input.mimeType);
  const format = (mimeType ? FORMAT_BY_MIME_TYPE[mimeType] : null) ?? formatFromName(input.fileName);
  if (!format) {
    return {
      ready: false,
      reasonCode: 'audio_source_unsupported',
      diagnostic: `The selected file uses ${mimeType ?? 'an unknown audio format'}.`,
    };
  }

  return {
    ready: true,
    format,
    mimeType: MIME_TYPE_BY_FORMAT[format],
    byteSize: input.byteSize,
    adapterVersion: 'audio-source-v1',
  };
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

export function resolveAudioRecipeEvidence(input: {
  bytes: Uint8Array;
  mimeType?: string | null;
  fileName?: string | null;
}): ResolvedAudioRecipeEvidence | Exclude<AudioRecipeSourceDecision, { ready: true }> {
  const decision = inspectAudioRecipeSource({
    byteSize: input.bytes.byteLength,
    mimeType: input.mimeType,
    fileName: input.fileName,
  });
  if (!decision.ready) return decision;
  return { ...decision, base64Audio: toBase64(input.bytes) };
}
