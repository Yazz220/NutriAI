export const COOKBOOK_PAGE_BUCKET = 'cookbook-pages';
export const COOKBOOK_PAGE_URL_TTL_SECONDS = 60 * 60;
const COOKBOOK_PAGE_URL_REFRESH_BUFFER_MS = 5 * 60_000;

export type CookbookPageImageVariant = 'full' | 'thumbnail';

interface CachedSignedUrl {
  expiresAt: number;
  url: string;
}

const signedUrlCache = new Map<string, CachedSignedUrl>();
const signedUrlRequests = new Map<string, Promise<string>>();

export interface StoredPageImage {
  image_url?: string | null;
  storage_path?: string | null;
}

function signedUrlCacheKey(path: string, variant: CookbookPageImageVariant): string {
  return `${variant}:${path}`;
}

/** Test and sign-out boundary. Ordinary page reads should keep this cache warm. */
export function clearCookbookPageUrlCache(): void {
  signedUrlCache.clear();
  signedUrlRequests.clear();
}

/**
 * Resolves an immutable private Storage object without making the expiring URL
 * its identity. Concurrent readers share a request and subsequent reads reuse
 * the same URL until shortly before it expires.
 */
export async function getSignedCookbookPageImageUrl(
  path: string,
  variant: CookbookPageImageVariant = 'full',
): Promise<string> {
  const cacheKey = signedUrlCacheKey(path, variant);
  const cached = signedUrlCache.get(cacheKey);
  if (cached && cached.expiresAt - COOKBOOK_PAGE_URL_REFRESH_BUFFER_MS > Date.now()) {
    return cached.url;
  }

  const pending = signedUrlRequests.get(cacheKey);
  if (pending) return pending;

  const request = (async () => {
    // Keep the storage client behind the async delivery boundary. Pure page
    // metadata and render modules must not initialize network configuration.
    const { supabase } = require('@/lib/supabase') as typeof import('@/lib/supabase');
    const storage = supabase.storage.from(COOKBOOK_PAGE_BUCKET);
    const result = variant === 'thumbnail'
      ? await storage.createSignedUrl(path, COOKBOOK_PAGE_URL_TTL_SECONDS, {
          transform: {
            width: 480,
            height: 600,
            resize: 'contain',
            quality: 72,
          },
        })
      : await storage.createSignedUrl(path, COOKBOOK_PAGE_URL_TTL_SECONDS);

    if (result.error) throw result.error;
    if (!result.data?.signedUrl) {
      throw new Error('Could not authorize access to a cookbook page image.');
    }

    signedUrlCache.set(cacheKey, {
      url: result.data.signedUrl,
      expiresAt: Date.now() + COOKBOOK_PAGE_URL_TTL_SECONDS * 1000,
    });
    return result.data.signedUrl;
  })();

  signedUrlRequests.set(cacheKey, request);
  try {
    return await request;
  } finally {
    signedUrlRequests.delete(cacheKey);
  }
}

/** Replaces durable Storage paths with short-lived URLs for the signed-in user. */
export async function signStoredPageImages<T extends StoredPageImage>(rows: T[]): Promise<T[]> {
  return Promise.all(rows.map(async (row) => (
    row.storage_path
      ? { ...row, image_url: await getSignedCookbookPageImageUrl(row.storage_path, 'full') }
      : row
  )));
}
