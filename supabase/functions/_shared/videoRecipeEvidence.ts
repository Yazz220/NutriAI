import type { RecipeEvidenceFailureCode } from './recipeEvidence.ts';
import {
  captureCheckpoint,
  sourceStageVersion,
  VIDEO_TRANSCRIPTION_STAGE_VERSION,
} from './captureStages.ts';
import { MAX_AUDIO_TRANSCRIPT_CHARACTERS } from './audioTranscription.ts';
import { classifyVideoSourceUrl, socialVideoPlatformLabel } from './videoSource.ts';
import {
  inspectUploadedVideoRecipeSource,
  MAX_DIRECT_VIDEO_BYTES,
  MIN_VIDEO_BYTES,
  type VideoRecipeMimeType,
} from './videoUploadContract.ts';

export {
  inspectUploadedVideoRecipeSource,
  MAX_DIRECT_VIDEO_BYTES,
  MIN_VIDEO_BYTES,
} from './videoUploadContract.ts';

export const MAX_VIDEO_FRAMES = 8;
export const MAX_VIDEO_FRAME_BASE64_BYTES = 1_500_000;
export const MAX_VIDEO_FRAMES_TOTAL_BASE64_BYTES = 6_000_000;
export const MAX_VIDEO_TRANSCRIPT_CHARACTERS = MAX_AUDIO_TRANSCRIPT_CHARACTERS;

/**
 * Containers the configured speech-to-text provider can demux directly.
 * QuickTime (video/mov) is not a supported transcription input, so those
 * videos keep whole-video evidence only.
 */
export type VideoTranscriptionFormat = 'mp4' | 'webm' | 'mpeg';

export function videoTranscriptionFormat(
  mimeType: VideoRecipeMimeType | undefined,
): VideoTranscriptionFormat | null {
  if (mimeType === 'video/mp4') return 'mp4';
  if (mimeType === 'video/webm') return 'webm';
  if (mimeType === 'video/mpeg') return 'mpeg';
  return null;
}

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * A saved video transcript is reusable on retry only when both the source
 * artifact and the transcription adapter still match their versioned stage
 * contracts, mirroring the saved-audio-transcript rule.
 */
export function canReuseSavedVideoTranscript(
  capture: Parameters<typeof captureCheckpoint>[0],
  payload: JsonRecord,
): boolean {
  const transcription = isRecord(payload.transcription) ? payload.transcription : {};
  const sourceCheckpoint = captureCheckpoint(capture, 'source');
  const transcriptionCheckpoint = captureCheckpoint(capture, 'transcription');
  const sourceCompatible = sourceCheckpoint
    ? sourceCheckpoint.version === sourceStageVersion('video')
    : transcription.sourceAdapterVersion === sourceStageVersion('video');
  const transcriptionCompatible = transcriptionCheckpoint
    ? transcriptionCheckpoint.version === VIDEO_TRANSCRIPTION_STAGE_VERSION
    : transcription.transcriptionAdapterVersion === VIDEO_TRANSCRIPTION_STAGE_VERSION;
  return sourceCompatible && transcriptionCompatible;
}

const MAX_REDIRECTS = 5;
const VIDEO_FETCH_TIMEOUT_MS = 25_000;
type VideoFailureCode = Extract<
  RecipeEvidenceFailureCode,
  'video_source_unsupported' | 'video_permission_required' | 'video_unavailable' | 'video_too_large'
>;

export type ResolvedVideoRecipeEvidence = {
  ready: true;
  kind: 'direct_file' | 'owned_upload';
  canonicalUrl?: string;
  videoUrl: string;
  mimeType?: VideoRecipeMimeType;
  byteSize?: number;
  transcriptStatus: 'not_supplied' | 'supplied';
  adapterVersion: 'video-source-v2';
};

export type RejectedVideoRecipeEvidence = {
  ready: false;
  reasonCode: VideoFailureCode;
  diagnostic: string;
};

export type VideoRecipeEvidenceResolution =
  | ResolvedVideoRecipeEvidence
  | RejectedVideoRecipeEvidence;

type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;
type PublicUrlCheck = (url: URL) => Promise<void>;

function mimeTypeFromResponse(contentType: string | null, url: URL): ResolvedVideoRecipeEvidence['mimeType'] | null {
  const normalized = contentType?.split(';')[0]?.trim().toLowerCase();
  if (normalized === 'video/mp4' || normalized === 'video/mpeg' || normalized === 'video/webm') {
    return normalized;
  }
  if (normalized === 'video/mov' || normalized === 'video/quicktime') return 'video/mov';
  if (normalized === 'video/x-m4v') return 'video/mp4';
  if (normalized && normalized !== 'application/octet-stream') return null;

  const extension = url.pathname.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1];
  if (extension === 'mp4' || extension === 'm4v') return 'video/mp4';
  if (extension === 'mov') return 'video/mov';
  if (extension === 'mpeg' || extension === 'mpg') return 'video/mpeg';
  if (extension === 'webm') return 'video/webm';
  return null;
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

async function readLimitedBytes(response: Response, maxBytes: number): Promise<Uint8Array> {
  const reader = response.body?.getReader();
  if (!reader) {
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength > maxBytes) throw new Error('video_too_large');
    return bytes;
  }

  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new Error('video_too_large');
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

function parseHttpUrl(value: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error('Invalid video URL');
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Invalid video URL');
  }
  return parsed;
}

async function acquireDirectVideo(
  initialUrl: URL,
  options: {
    fetchImpl: FetchLike;
    checkPublicUrl: PublicUrlCheck;
  },
  redirectCount = 0,
): Promise<VideoRecipeEvidenceResolution> {
  if (redirectCount > MAX_REDIRECTS) {
    return { ready: false, reasonCode: 'video_unavailable', diagnostic: 'The video redirected too many times.' };
  }
  const classification = classifyVideoSourceUrl(initialUrl.toString());
  if (classification?.kind === 'platform_link') {
    return {
      ready: false,
      reasonCode: 'video_source_unsupported',
      diagnostic: `${socialVideoPlatformLabel(classification.platform)} media links are retained as source bookmarks and are not downloaded or processed at launch.`,
    };
  }
  await options.checkPublicUrl(initialUrl);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), VIDEO_FETCH_TIMEOUT_MS);
  try {
    const response = await options.fetchImpl(initialUrl, {
      method: 'GET',
      redirect: 'manual',
      signal: controller.signal,
      headers: { accept: 'video/mp4,video/mpeg,video/quicktime,video/webm;q=0.9,*/*;q=0.1' },
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location) {
        return { ready: false, reasonCode: 'video_unavailable', diagnostic: 'The video redirect had no destination.' };
      }
      await response.body?.cancel();
      const redirected = new URL(location, initialUrl);
      return acquireDirectVideo(redirected, options, redirectCount + 1);
    }

    if ([401, 403, 404, 410].includes(response.status)) {
      await response.body?.cancel();
      return {
        ready: false,
        reasonCode: 'video_unavailable',
        diagnostic: `The video host returned HTTP ${response.status}.`,
      };
    }
    if (!response.ok) {
      await response.body?.cancel();
      throw new Error(`Video host returned HTTP ${response.status}`);
    }

    const mimeType = mimeTypeFromResponse(response.headers.get('content-type'), initialUrl);
    if (!mimeType) {
      await response.body?.cancel();
      return {
        ready: false,
        reasonCode: 'video_source_unsupported',
        diagnostic: `The URL returned ${response.headers.get('content-type') ?? 'an unknown content type'}, not a supported video file.`,
      };
    }

    const contentLength = Number(response.headers.get('content-length') ?? 0);
    if (contentLength > MAX_DIRECT_VIDEO_BYTES) {
      await response.body?.cancel();
      return {
        ready: false,
        reasonCode: 'video_too_large',
        diagnostic: `The direct video is ${contentLength} bytes.`,
      };
    }

    let bytes: Uint8Array;
    try {
      bytes = await readLimitedBytes(response, MAX_DIRECT_VIDEO_BYTES);
    } catch (error) {
      if (error instanceof Error && error.message === 'video_too_large') {
        return {
          ready: false,
          reasonCode: 'video_too_large',
          diagnostic: 'The direct video exceeded the bounded download while streaming.',
        };
      }
      throw error;
    }

    const inspection = inspectUploadedVideoRecipeSource({
      byteSize: bytes.byteLength,
      mimeType,
      fileName: initialUrl.pathname,
      rightsConfirmed: true,
      headerBytes: bytes.subarray(0, 64),
    });
    if (!inspection.ready) return inspection;

    return {
      ready: true,
      kind: 'direct_file',
      canonicalUrl: initialUrl.toString(),
      videoUrl: `data:${inspection.mimeType};base64,${toBase64(bytes)}`,
      mimeType: inspection.mimeType,
      byteSize: inspection.byteSize,
      transcriptStatus: 'not_supplied',
      adapterVersion: 'video-source-v2',
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function resolveVideoRecipeEvidence(
  value: string,
  dependencies: {
    fetchImpl?: FetchLike;
    checkPublicUrl: PublicUrlCheck;
    rightsConfirmed?: boolean;
  },
): Promise<VideoRecipeEvidenceResolution> {
  const parsed = parseHttpUrl(value);
  const classification = classifyVideoSourceUrl(parsed.toString());
  if (classification?.kind === 'platform_link') {
    return {
      ready: false,
      reasonCode: 'video_source_unsupported',
      diagnostic: `${socialVideoPlatformLabel(classification.platform)} links are retained as source bookmarks and are not downloaded or processed at launch.`,
    };
  }

  if (dependencies.rightsConfirmed !== true) {
    return {
      ready: false,
      reasonCode: 'video_permission_required',
      diagnostic: 'Direct video processing requires the user to confirm ownership or permission.',
    };
  }

  return acquireDirectVideo(parsed, {
    fetchImpl: dependencies.fetchImpl ?? fetch,
    checkPublicUrl: dependencies.checkPublicUrl,
  });
}

export function resolveUploadedVideoRecipeEvidence(input: {
  bytes: Uint8Array;
  mimeType?: string | null;
  fileName?: string | null;
  rightsConfirmed?: boolean;
}): VideoRecipeEvidenceResolution {
  const inspection = inspectUploadedVideoRecipeSource({
    byteSize: input.bytes.byteLength,
    mimeType: input.mimeType,
    fileName: input.fileName,
    rightsConfirmed: input.rightsConfirmed,
    headerBytes: input.bytes.subarray(0, 64),
  });
  if (!inspection.ready) return inspection;
  return {
    ready: true,
    kind: 'owned_upload',
    videoUrl: `data:${inspection.mimeType};base64,${toBase64(input.bytes)}`,
    mimeType: inspection.mimeType,
    byteSize: inspection.byteSize,
    transcriptStatus: 'not_supplied',
    adapterVersion: 'video-source-v2',
  };
}

export function resolveUploadedVideoBase64RecipeEvidence(input: {
  base64: string;
  mimeType?: string | null;
  fileName?: string | null;
  rightsConfirmed?: boolean;
}): VideoRecipeEvidenceResolution {
  const paddingBytes = input.base64.endsWith('==') ? 2 : input.base64.endsWith('=') ? 1 : 0;
  const byteSize = Math.floor((input.base64.length * 3) / 4) - paddingBytes;
  let headerBytes: Uint8Array;
  try {
    const headerBinary = atob(input.base64.slice(0, 88));
    headerBytes = Uint8Array.from(headerBinary, (character) => character.charCodeAt(0));
  } catch {
    headerBytes = new Uint8Array();
  }
  const inspection = inspectUploadedVideoRecipeSource({
    byteSize,
    mimeType: input.mimeType,
    fileName: input.fileName,
    rightsConfirmed: input.rightsConfirmed,
    headerBytes,
  });
  if (!inspection.ready) return inspection;
  return {
    ready: true,
    kind: 'owned_upload',
    videoUrl: `data:${inspection.mimeType};base64,${input.base64}`,
    mimeType: inspection.mimeType,
    byteSize: inspection.byteSize,
    transcriptStatus: 'not_supplied',
    adapterVersion: 'video-source-v2',
  };
}

export interface VideoRecipeEvidencePromptOptions {
  notes?: string;
  transcript?: string;
  frameCount?: number;
  wholeVideoAttached?: boolean;
}

export function buildVideoRecipeEvidencePrompt(
  evidence: ResolvedVideoRecipeEvidence,
  options: VideoRecipeEvidencePromptOptions = {},
): string {
  const sourceDescription = evidence.kind === 'owned_upload'
    ? `a user-supplied ${evidence.mimeType ?? 'video'} file`
    : `a directly retrieved ${evidence.mimeType ?? 'video'} file`;
  const normalizedNotes = options.notes?.trim().slice(0, 2_000);
  const transcript = options.transcript?.trim().slice(0, MAX_VIDEO_TRANSCRIPT_CHARACTERS);
  const frameCount = Math.max(0, Math.floor(options.frameCount ?? 0));
  const wholeVideoAttached = options.wholeVideoAttached !== false;

  const sections: string[] = [`Extract the complete recipe from ${sourceDescription}.`];

  if (transcript) {
    sections.push(
      'NARRATION TRANSCRIPT (speech-to-text; it may contain recognition errors):\n'
        + `<UNTRUSTED_AUDIO_TRANSCRIPT>\n${transcript}\n</UNTRUSTED_AUDIO_TRANSCRIPT>`,
    );
  }
  if (frameCount > 0) {
    sections.push(
      `SAMPLED VIDEO FRAMES: ${frameCount} frames sampled from the video are attached as images.`
        + ' Read on-screen text, ingredient lists, quantities, temperatures, timers, and demonstrated cooking actions from them.',
    );
  }
  if (wholeVideoAttached) {
    sections.push(transcript
      ? 'COMPLETE VIDEO: the full video is also attached. Its narration is the same speech as the transcript above, so treat the transcript as the textual record of it and use the video for captions, on-screen text, and cooking actions.'
      : 'COMPLETE VIDEO: the full video is attached. Read narration, visible captions, on-screen text, ingredients, quantities, and cooking actions from the video itself.');
  } else if (transcript || frameCount > 0) {
    sections.push(
      'COMPLETE VIDEO: the whole video could not be attached for this extraction. Rely on the narration transcript and the sampled frames instead of assuming unseen content.',
    );
  }
  if (normalizedNotes) {
    sections.push(
      `The user included this untrusted recipe context:\n<UNTRUSTED_USER_NOTES>\n${normalizedNotes}\n</UNTRUSTED_USER_NOTES>`,
    );
  }

  sections.push(
    'Prefer explicit spoken or on-screen quantities over inference. When the transcript and the on-screen text disagree on a material quantity, use the more explicit reading and record the conflict in provenance.extractionNotes.',
  );
  sections.push(
    'If the combined evidence does not contain both a usable ingredient list and a cooking method, return insufficient_evidence instead of inventing details.',
  );
  return sections.join('\n\n');
}

export function degradedVideoEvidenceNote(input: {
  hasTranscript: boolean;
  frameCount: number;
}): string | null {
  if (input.hasTranscript && input.frameCount > 0) {
    return 'The whole-video pass failed, so Nosh extracted from the narration transcript and sampled frames.';
  }
  if (input.hasTranscript) {
    return 'The whole-video pass failed, so Nosh extracted from the narration transcript.';
  }
  if (input.frameCount > 0) {
    return 'The whole-video pass failed, so Nosh extracted from sampled frames.';
  }
  return null;
}

export function classifyVideoModelFailure(message: string): 'video_unavailable' | null {
  return /(?:video|youtube).*(?:private|unavailable|not found|could not (?:fetch|download|access)|failed to (?:fetch|download|access))|(?:private|unavailable|not found).*(?:video|youtube)/i.test(message)
    ? 'video_unavailable'
    : null;
}
