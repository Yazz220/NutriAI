import type { RecipeEvidenceFailureCode } from './recipeEvidence.ts';

const MAX_REDIRECTS = 5;
const VIDEO_FETCH_TIMEOUT_MS = 25_000;
export const MAX_DIRECT_VIDEO_BYTES = 20_000_000;

const UNSUPPORTED_SOCIAL_HOSTS = [
  'facebook.com',
  'fb.watch',
  'instagram.com',
  'pinterest.com',
  'tiktok.com',
] as const;

type VideoFailureCode = Extract<
  RecipeEvidenceFailureCode,
  'video_source_unsupported' | 'video_unavailable' | 'video_too_large'
>;

export type ResolvedVideoRecipeEvidence = {
  ready: true;
  kind: 'youtube' | 'direct_file';
  canonicalUrl: string;
  videoUrl: string;
  mimeType?: 'video/mp4' | 'video/mpeg' | 'video/mov' | 'video/webm';
  byteSize?: number;
  transcriptStatus: 'not_supplied';
  adapterVersion: 'video-source-v1';
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

function normalizedHost(hostname: string): string {
  return hostname.toLowerCase().replace(/^www\./, '').replace(/^m\./, '');
}

function hostMatches(hostname: string, expected: string): boolean {
  return hostname === expected || hostname.endsWith(`.${expected}`);
}

function youtubeVideoId(url: URL): string | null {
  const host = normalizedHost(url.hostname);
  let candidate: string | null = null;
  if (host === 'youtu.be') {
    candidate = url.pathname.split('/').filter(Boolean)[0] ?? null;
  } else if (hostMatches(host, 'youtube.com')) {
    candidate = url.pathname === '/watch'
      ? url.searchParams.get('v')
      : url.pathname.match(/^\/(?:embed|shorts|live)\/([^/?#]+)/)?.[1] ?? null;
  }
  return candidate && /^[A-Za-z0-9_-]{11}$/.test(candidate) ? candidate : null;
}

function isUnsupportedSocialHost(hostname: string): boolean {
  const host = normalizedHost(hostname);
  return UNSUPPORTED_SOCIAL_HOSTS.some((expected) => hostMatches(host, expected));
}

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

    return {
      ready: true,
      kind: 'direct_file',
      canonicalUrl: initialUrl.toString(),
      videoUrl: `data:${mimeType};base64,${toBase64(bytes)}`,
      mimeType,
      byteSize: bytes.byteLength,
      transcriptStatus: 'not_supplied',
      adapterVersion: 'video-source-v1',
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
  },
): Promise<VideoRecipeEvidenceResolution> {
  const parsed = parseHttpUrl(value);
  const videoId = youtubeVideoId(parsed);
  if (videoId) {
    await dependencies.checkPublicUrl(parsed);
    const canonicalUrl = `https://www.youtube.com/watch?v=${videoId}`;
    return {
      ready: true,
      kind: 'youtube',
      canonicalUrl,
      videoUrl: canonicalUrl,
      transcriptStatus: 'not_supplied',
      adapterVersion: 'video-source-v1',
    };
  }

  if (isUnsupportedSocialHost(parsed.hostname)) {
    return {
      ready: false,
      reasonCode: 'video_source_unsupported',
      diagnostic: `A ${normalizedHost(parsed.hostname)} page is not a directly retrievable video source.`,
    };
  }

  return acquireDirectVideo(parsed, {
    fetchImpl: dependencies.fetchImpl ?? fetch,
    checkPublicUrl: dependencies.checkPublicUrl,
  });
}

export function buildVideoRecipeEvidencePrompt(evidence: ResolvedVideoRecipeEvidence): string {
  const sourceDescription = evidence.kind === 'youtube'
    ? 'a public YouTube video'
    : `a directly retrieved ${evidence.mimeType ?? 'video'} file`;
  return [
    `Extract the complete recipe from ${sourceDescription}.`,
    'No separate transcript was supplied. Read narration, visible captions, on-screen text, ingredients, quantities, and cooking actions from the video itself.',
    'If narration or captions are inaccessible and the remaining evidence does not contain both a usable ingredient list and method, return insufficient_evidence instead of inventing details.',
  ].join('\n\n');
}

export function classifyVideoModelFailure(message: string): 'video_unavailable' | null {
  return /(?:video|youtube).*(?:private|unavailable|not found|could not (?:fetch|download|access)|failed to (?:fetch|download|access))|(?:private|unavailable|not found).*(?:video|youtube)/i.test(message)
    ? 'video_unavailable'
    : null;
}
