import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  loadCookbookReaderPosition,
  resolveCookbookReaderPageId,
  saveCookbookReaderPosition,
  type CookbookReaderPosition,
  type CookbookReaderViewMode,
} from '@/utils/cookbook/readerPosition';

interface UseCookbookReaderPositionInput {
  userId?: string | null;
  cookbookId?: string | null;
  pageIds: string[];
  requestedPageId?: string;
}

interface HydratedPosition {
  identity: string | null;
  position: CookbookReaderPosition | null;
}

export function useCookbookReaderPosition({
  userId,
  cookbookId,
  pageIds,
  requestedPageId,
}: UseCookbookReaderPositionInput) {
  const identity = userId && cookbookId ? `${userId}:${cookbookId}` : null;
  const [hydrated, setHydrated] = useState<HydratedPosition>({
    identity: null,
    position: null,
  });

  useEffect(() => {
    if (!userId || !cookbookId || !identity) {
      setHydrated({ identity: null, position: null });
      return;
    }
    let cancelled = false;
    void loadCookbookReaderPosition(userId, cookbookId)
      .then((position) => {
        if (!cancelled) setHydrated({ identity, position });
      })
      .catch(() => {
        if (!cancelled) setHydrated({ identity, position: null });
      });
    return () => {
      cancelled = true;
    };
  }, [cookbookId, identity, userId]);

  const isReady = !identity || hydrated.identity === identity;
  const restoredPageId = useMemo(
    () => isReady ? resolveCookbookReaderPageId(hydrated.position, pageIds) : null,
    [hydrated.position, isReady, pageIds],
  );
  const requestedPageExists = Boolean(
    requestedPageId && (pageIds.length === 0 || pageIds.includes(requestedPageId)),
  );
  const pageId = requestedPageExists ? requestedPageId! : restoredPageId;
  const viewMode = requestedPageExists ? undefined : hydrated.position?.viewMode;

  const recordPage = useCallback(async (nextPageId: string, nextViewMode: CookbookReaderViewMode) => {
    if (!userId || !cookbookId) return;
    const pageIndex = pageIds.indexOf(nextPageId);
    if (pageIndex < 0) return;
    await saveCookbookReaderPosition(userId, cookbookId, nextPageId, pageIndex, nextViewMode);
  }, [cookbookId, pageIds, userId]);

  return { isReady, pageId, viewMode, recordPage };
}
