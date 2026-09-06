import {
  getSignedCookbookPageImageUrl,
  invalidateCookbookPageUrl,
  type CookbookPageImageVariant,
} from '@/utils/cookbook/privatePageUrls';
import { assertPageImageSession, getPageImageSession } from '@/utils/cookbook/pageImageSession';
import {
  clearPageImageFiles,
  downloadPageImageFile,
  findPageImageFile,
  PageImageDownloadError,
  removePageImageFile,
} from '@/utils/cookbook/pageImageStore';

const requests = new Map<string, Promise<string>>();
const purges = new Map<string, Promise<void>>();
let unavailableThumbnailRevision: number | undefined;
const stats = { localHits: 0, downloads: 0, downloadedBytes: 0, coalesced: 0, thumbnailFallbacks: 0 };

/** Contains counts only: no signed tokens, private URLs, or recipe content. */
export function getPageImageDeliveryStats() {
  return { ...stats };
}

function assetKey(path: string, variant: CookbookPageImageVariant): string {
  // Version the rendition, not the page's title, position, or mutable metadata.
  return `${variant === 'thumbnail' ? 'thumb-480x600-q72-v1' : 'original-v1'}:${path}`;
}

/** Shared by expo-image, Skia, sharing and PDF export. Disk precedes auth/network. */
export async function resolveStoredPageImage(
  path: string,
  variant: CookbookPageImageVariant = 'full',
): Promise<string> {
  const session = getPageImageSession();
  assertPageImageSession(session);
  const userId = session.userId!;
  if (!path.startsWith(`${userId}/`) || path.split('/').some((part) => part === '..' || part === '.')) {
    throw new Error('This cookbook page belongs to another account.');
  }
  const key = assetKey(path, variant);
  const requestKey = `${session.revision}:${key}`;
  const pending = requests.get(requestKey);
  if (pending) {
    stats.coalesced += 1;
    return pending;
  }
  const assertActive = () => {
    assertPageImageSession(session);
    if (purges.has(userId)) throw new Error('Local cookbook data is being removed.');
  };
  const request = (async () => {
    // A previous login's file move/cleanup must finish before the same user writes
    // this destination again. Coalescing within this session still happens above.
    const previousWriters = [...requests.entries()]
      .filter(([id]) => id.endsWith(`:${key}`))
      .map(([, promise]) => promise);
    await Promise.allSettled(previousWriters);
    assertActive();
    const local = await findPageImageFile(userId, key);
    assertActive();
    if (local) {
      stats.localHits += 1;
      return local;
    }
    if (variant === 'thumbnail') {
      // A viewed original also serves grids; never download a thumbnail of it again.
      const full = await findPageImageFile(userId, assetKey(path, 'full'));
      assertActive();
      if (full) {
        stats.localHits += 1;
        return full;
      }
      const fullPending = requests.get(`${session.revision}:${assetKey(path, 'full')}`);
      if (fullPending) {
        stats.coalesced += 1;
        return fullPending;
      }
      if (unavailableThumbnailRevision === session.revision) return resolveStoredPageImage(path, 'full');
    }
    try {
      for (let attempt = 0; ; attempt += 1) {
        const url = await getSignedCookbookPageImageUrl(path, variant);
        assertActive();
        try {
          const result = await downloadPageImageFile(userId, key, url, assertActive);
          stats.downloads += 1;
          stats.downloadedBytes += result.bytes;
          return result.uri;
        } catch (error) {
          if (attempt === 0 && error instanceof PageImageDownloadError && [401, 403].includes(error.status)) {
            invalidateCookbookPageUrl(path, variant);
            continue;
          }
          throw error;
        }
      }
    } catch (error) {
      assertActive();
      // Provider outages/rate limits must not trigger a much larger original download.
      const status =
        error instanceof PageImageDownloadError
          ? error.status
          : Number(
              (error as { status?: unknown; statusCode?: unknown })?.status ??
                (error as { statusCode?: unknown })?.statusCode,
            );
      const reason =
        error instanceof PageImageDownloadError
          ? error.reason
          : String((error as { message?: unknown })?.message ?? '');
      const transformUnavailable =
        [402, 501].includes(status) ||
        (status === 400 &&
          /transform.*(?:disabled|not enabled|unsupported|not supported|unavailable)|FeatureNotEnabled/i.test(reason));
      if (variant === 'thumbnail' && transformUnavailable) {
        unavailableThumbnailRevision = session.revision;
        stats.thumbnailFallbacks += 1;
        return resolveStoredPageImage(path, 'full');
      }
      throw error;
    }
  })();
  requests.set(requestKey, request);
  try {
    return await request;
  } finally {
    if (requests.get(requestKey) === request) requests.delete(requestKey);
  }
}

/** Explicit retry after a decode error; normal metadata refreshes never evict bytes. */
export async function removeStoredPageImage(
  path: string,
  variant: CookbookPageImageVariant,
  failedUri?: string,
): Promise<void> {
  const session = getPageImageSession();
  assertPageImageSession(session);
  const fullKey = assetKey(path, 'full');
  const usedOriginal =
    variant === 'thumbnail' && failedUri && (await findPageImageFile(session.userId!, fullKey)) === failedUri;
  await removePageImageFile(session.userId!, usedOriginal ? fullKey : assetKey(path, variant));
  invalidateCookbookPageUrl(path, variant);
}

export async function purgeStoredPageImages(userId: string): Promise<void> {
  const existing = purges.get(userId);
  if (existing) return existing;
  const purge = (async () => {
    // Pending writers see the purge boundary before publishing; wait before deleting.
    await Promise.allSettled([...requests.values()]);
    await clearPageImageFiles(userId);
  })();
  purges.set(userId, purge);
  try {
    await purge;
  } finally {
    purges.delete(userId);
  }
}
