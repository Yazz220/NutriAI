// The browser cache uses the same immutable identity as native files. No signed
// tokens are persisted. Blob URLs are shared by DOM images and Three textures.
export class PageImageDownloadError extends Error {
  constructor(
    public readonly status: number,
    public readonly reason = '',
  ) {
    super(`Could not download the cookbook page (${status}).`);
  }
}

const objectUrls = new Map<string, string>();
function cacheName(userId: string): string {
  return `folio-page-images-v1:${process.env.EXPO_PUBLIC_SUPABASE_URL}:${userId}`;
}
function cacheKey(userId: string, key: string): string {
  return `${window.location.origin}/folio-local-pages/${encodeURIComponent(cacheName(userId))}/${encodeURIComponent(key)}`;
}
async function imageCache(userId: string): Promise<Cache | null> {
  try {
    return typeof caches === 'undefined' ? null : await caches.open(cacheName(userId));
  } catch {
    return null;
  }
}
function expose(key: string, blob: Blob): string {
  const existing = objectUrls.get(key);
  if (existing) return existing;
  const uri = URL.createObjectURL(blob);
  objectUrls.set(key, uri);
  return uri;
}

export async function findPageImageFile(userId: string, key: string): Promise<string | null> {
  const identity = cacheKey(userId, key);
  const existing = objectUrls.get(identity);
  if (existing) return existing;
  const response = await (await imageCache(userId))?.match(identity);
  if (!response) return null;
  return expose(identity, await response.blob());
}

export async function downloadPageImageFile(
  userId: string,
  key: string,
  url: string,
  assertActive: () => void,
): Promise<{ uri: string; bytes: number }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  try {
    assertActive();
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'image/webp,image/png,image/jpeg' },
    });
    if (response.status !== 200) {
      // Storage returns small JSON error responses. Do not persist them as images.
      const reason = (await response.text()).slice(0, 4096);
      throw new PageImageDownloadError(response.status, reason);
    }
    const blob = await response.blob();
    if (!blob.size || !blob.type.startsWith('image/')) throw new Error('The cookbook page download was incomplete.');
    assertActive();
    const identity = cacheKey(userId, key);
    const cache = await imageCache(userId);
    // Quota/private-browsing restrictions still allow session-local reuse.
    await cache?.put(identity, new Response(blob)).catch(() => undefined);
    try {
      assertActive();
    } catch (error) {
      await cache?.delete(identity);
      throw error;
    }
    return { uri: expose(identity, blob), bytes: blob.size };
  } finally {
    clearTimeout(timer);
  }
}

export async function removePageImageFile(userId: string, key: string): Promise<void> {
  const identity = cacheKey(userId, key);
  const uri = objectUrls.get(identity);
  if (uri) URL.revokeObjectURL(uri);
  objectUrls.delete(identity);
  await (await imageCache(userId))?.delete(identity);
}

export async function clearPageImageFiles(userId: string): Promise<void> {
  const prefix = `${window.location.origin}/folio-local-pages/${encodeURIComponent(cacheName(userId))}/`;
  for (const [key, uri] of objectUrls) {
    if (!key.startsWith(prefix)) continue;
    URL.revokeObjectURL(uri);
    objectUrls.delete(key);
  }
  if (typeof caches !== 'undefined') await caches.delete(cacheName(userId));
}
