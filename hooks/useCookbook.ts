import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { fetchCookbookPages, getCookbook } from '@/utils/cookbook/api';
import { loadCachedPages, saveCachedPages } from '@/utils/cookbook/cache';
import type { Cookbook, CookbookPage } from '@/types/cookbook';

export const COOKBOOK_QUERY_KEY = (id?: string | null) => ['cookbook', id];
export const COOKBOOK_PAGES_QUERY_KEY = (id?: string | null) => ['cookbook-pages', id];

export interface UseCookbookResult {
  cookbook: Cookbook | null;
  pages: CookbookPage[];
  selectedPage: CookbookPage | null;
  selectedPageId: string | null;
  setSelectedPageId: (id: string | null) => void;
  isLoading: boolean;
  error: unknown;
  refresh: () => Promise<void>;
  upsertPage: (page: CookbookPage) => void;
}

export function useCookbook(cookbookId: string | null | undefined): UseCookbookResult {
  const queryClient = useQueryClient();
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);

  const cookbookQuery = useQuery({
    queryKey: COOKBOOK_QUERY_KEY(cookbookId),
    enabled: !!cookbookId,
    queryFn: () => getCookbook(cookbookId!),
  });

  const pagesQuery = useQuery({
    queryKey: COOKBOOK_PAGES_QUERY_KEY(cookbookId),
    enabled: !!cookbookId,
    queryFn: () => fetchCookbookPages(cookbookId!),
  });

  // Hydrate pages from cache before network responds.
  useEffect(() => {
    if (!cookbookId) return;
    if (pagesQuery.data !== undefined) return;
    let cancelled = false;
    loadCachedPages(cookbookId)
      .then((cached) => {
        if (cancelled || !cached) return;
        queryClient.setQueryData(COOKBOOK_PAGES_QUERY_KEY(cookbookId), cached);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [cookbookId, queryClient, pagesQuery.data]);

  useEffect(() => {
    if (!cookbookId || !pagesQuery.data) return;
    saveCachedPages(cookbookId, pagesQuery.data).catch(() => {});
  }, [cookbookId, pagesQuery.data]);

  const effectivePages = useMemo<CookbookPage[]>(() => {
    return pagesQuery.data ?? [];
  }, [pagesQuery.data]);

  const effectiveCookbook = useMemo<Cookbook | null>(() => {
    return cookbookQuery.data ?? null;
  }, [cookbookQuery.data]);

  // Keep selectedPageId in sync with the active book's pages.
  useEffect(() => {
    if (!effectivePages.length) {
      if (selectedPageId) setSelectedPageId(null);
      return;
    }
    const stillExists = effectivePages.some((page) => page.id === selectedPageId);
    if (!selectedPageId || !stillExists) {
      setSelectedPageId(effectivePages[0].id);
    }
  }, [effectivePages, selectedPageId]);

  // Reset selection whenever the active book changes.
  useEffect(() => {
    setSelectedPageId(null);
  }, [cookbookId]);

  const selectedPage = useMemo<CookbookPage | null>(() => {
    return effectivePages.find((page) => page.id === selectedPageId) ?? effectivePages[0] ?? null;
  }, [effectivePages, selectedPageId]);

  const refreshMutation = useMutation({
    mutationFn: async () => {
      if (!cookbookId) return;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: COOKBOOK_QUERY_KEY(cookbookId) }),
        queryClient.invalidateQueries({ queryKey: COOKBOOK_PAGES_QUERY_KEY(cookbookId) }),
      ]);
    },
  });

  function upsertPage(page: CookbookPage) {
    queryClient.setQueryData<CookbookPage[]>(COOKBOOK_PAGES_QUERY_KEY(page.cookbookId), (existing = []) => {
      const withoutPage = existing.filter((candidate) => candidate.id !== page.id);
      return [...withoutPage, page].sort((a, b) => {
        if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
        return a.pageNumber - b.pageNumber;
      });
    });
    setSelectedPageId(page.id);
  }

  return {
    cookbook: effectiveCookbook,
    pages: effectivePages,
    selectedPage,
    selectedPageId,
    setSelectedPageId,
    isLoading: cookbookQuery.isLoading || pagesQuery.isLoading,
    error: cookbookQuery.error ?? pagesQuery.error,
    refresh: refreshMutation.mutateAsync,
    upsertPage,
  };
}
