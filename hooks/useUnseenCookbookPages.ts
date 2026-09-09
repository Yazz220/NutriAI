import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CookbookPage } from '@/types/cookbook';
import { markCookbookPageSeen, observeReadyCookbookPages } from '@/utils/cookbook/unseenPages';

interface UseUnseenCookbookPagesInput {
  userId?: string | null;
  cookbookId?: string | null;
  pages: CookbookPage[];
  enabled?: boolean;
}

export function useUnseenCookbookPages({ userId, cookbookId, pages, enabled = true }: UseUnseenCookbookPagesInput) {
  const [unseenPageIds, setUnseenPageIds] = useState<ReadonlySet<string>>(new Set());
  const [isReady, setIsReady] = useState(false);
  const dismissedThisSession = useRef(new Set<string>());
  const readyPageIds = useMemo(
    () => pages.filter((page) => page.lifecycleStatus !== 'processing').map((page) => page.id),
    [pages],
  );

  useEffect(() => {
    dismissedThisSession.current = new Set();
    setUnseenPageIds(new Set());
    setIsReady(false);
  }, [cookbookId, userId]);

  useEffect(() => {
    if (!enabled || !userId || !cookbookId) return;
    let cancelled = false;

    void observeReadyCookbookPages(userId, cookbookId, readyPageIds)
      .then((pageIds) => {
        if (cancelled) return;
        const dismissed = dismissedThisSession.current;
        setUnseenPageIds(new Set(pageIds.filter((pageId) => !dismissed.has(pageId))));
        setIsReady(true);
      })
      .catch(() => {
        if (!cancelled) setIsReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, [cookbookId, enabled, readyPageIds, userId]);

  const markPageSeen = useCallback(
    async (pageId: string) => {
      if (!userId || !cookbookId) return;
      dismissedThisSession.current.add(pageId);
      setUnseenPageIds((current) => {
        if (!current.has(pageId)) return current;
        const next = new Set(current);
        next.delete(pageId);
        return next;
      });
      await markCookbookPageSeen(userId, cookbookId, pageId);
    },
    [cookbookId, userId],
  );

  return { unseenPageIds, markPageSeen, isReady };
}
