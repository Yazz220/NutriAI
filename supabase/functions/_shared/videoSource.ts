export type SocialVideoPlatform = 'youtube' | 'tiktok' | 'instagram' | 'facebook' | 'pinterest';
export type DirectVideoFormat = 'mp4' | 'mov' | 'mpeg' | 'webm';

export const EXTERNAL_SOCIAL_VIDEO_PLATFORMS = [
  'youtube',
  'tiktok',
  'instagram',
  'facebook',
] as const satisfies readonly SocialVideoPlatform[];

export type ExternalSocialVideoPlatform = typeof EXTERNAL_SOCIAL_VIDEO_PLATFORMS[number];

export type VideoSourceUrlClassification =
  | {
      kind: 'platform_link';
      platform: SocialVideoPlatform;
      canonicalUrl: string;
    }
  | {
      kind: 'direct_file';
      format: DirectVideoFormat;
      canonicalUrl: string;
    }
  | {
      kind: 'other';
      canonicalUrl: string;
    };

function normalizedHost(hostname: string): string {
  return hostname.toLowerCase().replace(/^www\./, '').replace(/^m\./, '');
}

function hostMatches(hostname: string, expected: string): boolean {
  return hostname === expected || hostname.endsWith(`.${expected}`);
}

function platformForHost(host: string): SocialVideoPlatform | null {
  if (
    host === 'youtu.be'
    || hostMatches(host, 'youtube.com')
    || hostMatches(host, 'youtube-nocookie.com')
    || hostMatches(host, 'googlevideo.com')
    || hostMatches(host, 'ytimg.com')
  ) return 'youtube';
  if (
    hostMatches(host, 'tiktok.com')
    || hostMatches(host, 'tiktokcdn.com')
    || hostMatches(host, 'tiktokv.com')
    || hostMatches(host, 'byteoversea.com')
    || hostMatches(host, 'ibytedtos.com')
    || hostMatches(host, 'muscdn.com')
    || hostMatches(host, 'musical.ly')
  ) return 'tiktok';
  if (hostMatches(host, 'instagram.com') || hostMatches(host, 'cdninstagram.com')) return 'instagram';
  if (host === 'fb.watch' || hostMatches(host, 'facebook.com') || hostMatches(host, 'fbcdn.net')) return 'facebook';
  if (hostMatches(host, 'pinterest.com') || host === 'pin.it' || hostMatches(host, 'pinimg.com')) return 'pinterest';
  return null;
}

function directVideoFormat(pathname: string): DirectVideoFormat | null {
  const extension = pathname.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1];
  if (extension === 'mp4' || extension === 'm4v') return 'mp4';
  if (extension === 'mov') return 'mov';
  if (extension === 'mpeg' || extension === 'mpg') return 'mpeg';
  if (extension === 'webm') return 'webm';
  return null;
}

function youtubeCanonicalUrl(url: URL): string {
  const host = normalizedHost(url.hostname);
  let candidate: string | null = null;
  if (host === 'youtu.be') {
    candidate = url.pathname.split('/').filter(Boolean)[0] ?? null;
  } else if (hostMatches(host, 'youtube.com') || hostMatches(host, 'youtube-nocookie.com')) {
    candidate = url.pathname === '/watch'
      ? url.searchParams.get('v')
      : url.pathname.match(/^\/(?:embed|shorts|live)\/([^/?#]+)/)?.[1] ?? null;
  }
  return candidate && /^[A-Za-z0-9_-]{11}$/.test(candidate)
    ? `https://www.youtube.com/watch?v=${candidate}`
    : url.toString();
}

export function classifyVideoSourceUrl(value: string): VideoSourceUrlClassification | null {
  let parsed: URL;
  try {
    parsed = new URL(value.trim());
  } catch {
    return null;
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;

  const host = normalizedHost(parsed.hostname);
  const platform = platformForHost(host);
  if (platform === 'youtube') {
    return {
      kind: 'platform_link',
      platform: 'youtube',
      canonicalUrl: youtubeCanonicalUrl(parsed),
    };
  }
  if (platform === 'tiktok') {
    return { kind: 'platform_link', platform: 'tiktok', canonicalUrl: parsed.toString() };
  }
  if (platform === 'instagram') {
    return { kind: 'platform_link', platform: 'instagram', canonicalUrl: parsed.toString() };
  }
  if (platform === 'facebook') {
    return { kind: 'platform_link', platform: 'facebook', canonicalUrl: parsed.toString() };
  }
  if (platform === 'pinterest') {
    return { kind: 'platform_link', platform: 'pinterest', canonicalUrl: parsed.toString() };
  }

  const format = directVideoFormat(parsed.pathname);
  if (format) {
    return { kind: 'direct_file', format, canonicalUrl: parsed.toString() };
  }
  return { kind: 'other', canonicalUrl: parsed.toString() };
}

export function isRecognizedVideoSourceUrl(value: string): boolean {
  const classification = classifyVideoSourceUrl(value);
  return classification?.kind === 'platform_link' || classification?.kind === 'direct_file';
}

export function socialVideoPlatformSupportsExternalAcquisition(
  platform: SocialVideoPlatform,
): platform is ExternalSocialVideoPlatform {
  return (EXTERNAL_SOCIAL_VIDEO_PLATFORMS as readonly string[]).includes(platform);
}

export function socialVideoPlatformLabel(platform: SocialVideoPlatform): string {
  if (platform === 'youtube') return 'YouTube';
  if (platform === 'tiktok') return 'TikTok';
  if (platform === 'instagram') return 'Instagram';
  if (platform === 'facebook') return 'Facebook';
  return 'Pinterest';
}
