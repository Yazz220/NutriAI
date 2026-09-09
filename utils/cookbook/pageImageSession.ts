import { clearCookbookPageUrlCache } from '@/utils/cookbook/privatePageUrls';

let session = { userId: null as string | null, revision: 0 };
const listeners = new Set<() => void>();

export const getPageImageSession = () => session;
export function subscribePageImageSession(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** One auth observer owns this boundary; token refreshes do not invalidate files. */
export function setPageImageUser(userId: string | null): void {
  if (session.userId === userId) return;
  session = { userId, revision: session.revision + 1 };
  clearCookbookPageUrlCache();
  listeners.forEach((listener) => listener());
}

export function assertPageImageSession(expected: ReturnType<typeof getPageImageSession>): void {
  if (!expected.userId || expected !== session) {
    throw new Error('Sign in again to open this cookbook page.');
  }
}
