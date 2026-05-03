import createContextHook from '@nkzw/create-context-hook';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { fetchCookbookPages, fetchCreditBalance, getOrCreateCookbook } from '@/utils/cookbook/api';
import { loadCachedCookbook, saveCachedCookbook } from '@/utils/cookbook/cache';
import type { CookbookPage, CookbookTheme } from '@/types/cookbook';

export const DEFAULT_THEME: CookbookTheme = {
  name: 'Warm handwritten',
  prompt: 'warm handwritten family cookbook, cream paper, soft watercolor food illustration',
};

export const [CookbookProvider, useCookbook] = createContextHook(() => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);

  const cookbookQuery = useQuery({
    queryKey: ['cookbook', user?.id],
    enabled: !!user,
    queryFn: () => getOrCreateCookbook(user!.id, DEFAULT_THEME),
  });

  const pagesQuery = useQuery({
    queryKey: ['cookbook-pages', cookbookQuery.data?.id],
    enabled: !!cookbookQuery.data?.id,
    queryFn: () => fetchCookbookPages(cookbookQuery.data!.id),
  });

  const creditsQuery = useQuery({
    queryKey: ['credits', user?.id],
    enabled: !!user,
    queryFn: fetchCreditBalance,
  });

  useEffect(() => {
    if (cookbookQuery.data && pagesQuery.data) {
      saveCachedCookbook({ cookbook: cookbookQuery.data, pages: pagesQuery.data }, user?.id).catch(() => {});
    }
  }, [cookbookQuery.data, pagesQuery.data, user?.id]);

  useEffect(() => {
    if (!pagesQuery.data?.length) {
      if (selectedPageId) setSelectedPageId(null);
      return;
    }

    const selectedStillExists = pagesQuery.data.some((page) => page.id === selectedPageId);
    if (!selectedPageId || !selectedStillExists) {
      setSelectedPageId(pagesQuery.data[0].id);
    }
  }, [pagesQuery.data, selectedPageId]);

  useEffect(() => {
    setSelectedPageId(null);
  }, [user?.id]);

  const selectedPage = useMemo<CookbookPage | null>(() => {
    return pagesQuery.data?.find((page) => page.id === selectedPageId) ?? pagesQuery.data?.[0] ?? null;
  }, [pagesQuery.data, selectedPageId]);

  const refresh = useMutation({
    mutationFn: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['cookbook', user?.id] }),
        queryClient.invalidateQueries({ queryKey: ['cookbook-pages', cookbookQuery.data?.id] }),
        queryClient.invalidateQueries({ queryKey: ['credits', user?.id] }),
      ]);
    },
  });

  function upsertPage(page: CookbookPage) {
    queryClient.setQueryData<CookbookPage[]>(['cookbook-pages', page.cookbookId], (existing = []) => {
      const withoutPage = existing.filter((candidate) => candidate.id !== page.id);
      return [...withoutPage, page].sort((a, b) => {
        if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
        return a.pageNumber - b.pageNumber;
      });
    });
    setSelectedPageId(page.id);
  }

  return {
    cookbook: cookbookQuery.data ?? null,
    pages: pagesQuery.data ?? [],
    selectedPage,
    selectedPageId,
    setSelectedPageId,
    creditBalance: creditsQuery.data?.balance ?? 0,
    isLoading: cookbookQuery.isLoading || pagesQuery.isLoading,
    error: cookbookQuery.error ?? pagesQuery.error ?? creditsQuery.error,
    refresh: refresh.mutateAsync,
    upsertPage,
    loadCachedCookbook: () => loadCachedCookbook(user?.id),
  };
});
