import type { RecipeEvidenceFailureCode } from './recipeEvidence.ts';
import {
  classifyVideoSourceUrl,
  type SocialVideoPlatform,
} from './videoSource.ts';
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
  transcriptStatus: 'not_supplied';
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

function platformLabel(platform: SocialVideoPlatform): string {
  if (platform === 'youtube') return 'YouTube';
  if (platform === 'tiktok') return 'TikTok';
  if (platform === 'instagram') return 'Instagram';
  if (platform === 'facebook') return 'Facebook';
  return 'Pinterest';
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
      diagnostic: `${platformLabel(classification.platform)} media links are retained as source bookmarks and are not downloaded or processed at launch.`,
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
      diagnostic: `${platformLabel(classification.platform)} links are retained as source bookmarks and are not downloaded or processed at launch.`,
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

export function buildVideoRecipeEvidencePrompt(
  evidence: ResolvedVideoRecipeEvidence,
  notes?: string,
): string {
  const sourceDescription = evidence.kind === 'owned_upload'
    ? `a user-supplied ${evidence.mimeType ?? 'video'} file`
    : `a directly retrieved ${evidence.mimeType ?? 'video'} file`;
  const normalizedNotes = notes?.trim().slice(0, 2_000);
  return [
    `Extract the complete recipe from ${sourceDescription}.`,
    normalizedNotes
      ? `The user included this untrusted recipe context:\n<UNTRUSTED_USER_NOTES>\n${normalizedNotes}\n</UNTRUSTED_USER_NOTES>`
      : null,
    'No separate transcript was supplied. Read narration, visible captions, on-screen text, ingredients, quantities, and cooking actions from the video itself.',
    'If narration or captions are inaccessible and the remaining evidence does not contain both a usable ingredient list and method, return insufficient_evidence instead of inventing details.',
  ].filter(Boolean).join('\n\n');
}

export function classifyVideoModelFailure(message: string): 'video_unavailable' | null {
  return /(?:video|youtube).*(?:private|unavailable|not found|could not (?:fetch|download|access)|failed to (?:fetch|download|access))|(?:private|unavailable|not found).*(?:video|youtube)/i.test(message)
    ? 'video_unavailable'
    : null;
}
