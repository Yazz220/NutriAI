import { useQueries, useQuery } from '@tanstack/react-query';
import { createContext, useContext, useMemo, useSyncExternalStore } from 'react';
import type { CookbookPage } from '@/types/cookbook';
import { getCookbookPageStoragePath, selectReaderImageWindow } from '@/utils/cookbook/pageImageDelivery';
import { type CookbookPageImageVariant } from '@/utils/cookbook/privatePageUrls';
import { resolveStoredPageImage } from '@/utils/cookbook/localPageImages';
import { getPageImageSession, subscribePageImageSession } from '@/utils/cookbook/pageImageSession';

const PAGE_IMAGE_QUERY_GC_TIME_MS = 24 * 60 * 60_000;
export const PageImageLoadingContext = createContext(true);

function imageUrlQuery(path: string, variant: CookbookPageImageVariant, revision: number, enabled = true) {
  return {
    queryKey: ['cookbook-page-image-file', revision, variant, path] as const,
    queryFn: () => resolveStoredPageImage(path, variant),
    enabled,
    staleTime: Infinity,
    // Check file existence on remount, including offline. Warm reads never sign or GET.
    refetchOnMount: 'always' as const,
    networkMode: 'always' as const,
    gcTime: PAGE_IMAGE_QUERY_GC_TIME_MS,
    retry: false as const,
  };
}

export function useCookbookPageImageUrl(storagePath: string, variant: CookbookPageImageVariant, enabled = true) {
  const surfaceVisible = useContext(PageImageLoadingContext);
  const session = useSyncExternalStore(subscribePageImageSession, getPageImageSession, getPageImageSession);
  return useQuery(imageUrlQuery(storagePath, variant, session.revision, enabled && surfaceVisible && !!session.userId));
}

/** Resolve only the active reader neighborhood; the rest retain cheap placeholders. */
export function useReaderPageImageUrls(
  pages: CookbookPage[],
  activePageId: string | null | undefined,
  enabled: boolean,
  radius = 2,
): ReadonlyMap<string, string> {
  const session = useSyncExternalStore(subscribePageImageSession, getPageImageSession, getPageImageSession);
  const windowPages = useMemo(
    () => (enabled ? selectReaderImageWindow(pages, activePageId, radius) : []),
    [activePageId, enabled, pages, radius],
  );
  const storedPages = useMemo(
    () =>
      windowPages.flatMap((page) => {
        const path = getCookbookPageStoragePath(page);
        return path ? [{ id: page.id, path }] : [];
      }),
    [windowPages],
  );
  const results = useQueries({
    queries: storedPages.map(({ path }) => imageUrlQuery(path, 'full', session.revision, !!session.userId)),
  });

  return useMemo(
    () =>
      new Map(
        storedPages.flatMap(({ id }, index) => {
          const url = results[index]?.data;
          return url ? [[id, url] as const] : [];
        }),
      ),
    [results, storedPages],
  );
}
