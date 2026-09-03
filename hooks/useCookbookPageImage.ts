import { useQueries, useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import type { CookbookPage } from '@/types/cookbook';
import {
  getCookbookPageStoragePath,
  selectReaderImageWindow,
} from '@/utils/cookbook/pageImageDelivery';
import {
  getSignedCookbookPageImageUrl,
  type CookbookPageImageVariant,
} from '@/utils/cookbook/privatePageUrls';

const SIGNED_URL_STALE_TIME_MS = 50 * 60_000;
const SIGNED_URL_GC_TIME_MS = 24 * 60 * 60_000;

function imageUrlQuery(path: string, variant: CookbookPageImageVariant, enabled = true) {
  return {
    queryKey: ['cookbook-page-image-url', variant, path] as const,
    queryFn: () => getSignedCookbookPageImageUrl(path, variant),
    enabled,
    staleTime: SIGNED_URL_STALE_TIME_MS,
    gcTime: SIGNED_URL_GC_TIME_MS,
    retry: 1,
  };
}

export function useCookbookPageImageUrl(
  storagePath: string,
  variant: CookbookPageImageVariant,
  enabled = true,
) {
  return useQuery(imageUrlQuery(storagePath, variant, enabled));
}

/** Resolve only the active reader neighborhood; the rest retain cheap placeholders. */
export function useReaderPageImageUrls(
  pages: CookbookPage[],
  activePageId: string | null | undefined,
  enabled: boolean,
  radius = 2,
): ReadonlyMap<string, string> {
  const windowPages = useMemo(
    () => enabled ? selectReaderImageWindow(pages, activePageId, radius) : [],
    [activePageId, enabled, pages, radius],
  );
  const storedPages = useMemo(
    () => windowPages.flatMap((page) => {
      const path = getCookbookPageStoragePath(page);
      return path ? [{ id: page.id, path }] : [];
    }),
    [windowPages],
  );
  const results = useQueries({
    queries: storedPages.map(({ path }) => imageUrlQuery(path, 'full')),
  });

  return useMemo(() => new Map(
    storedPages.flatMap(({ id }, index) => {
      const url = results[index]?.data;
      return url ? [[id, url] as const] : [];
    }),
  ), [results, storedPages]);
}
