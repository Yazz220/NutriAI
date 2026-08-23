import createContextHook from '@nkzw/create-context-hook';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  createCookbook as createCookbookRow,
  deleteCookbook as deleteCookbookRow,
  listCookbooks,
  type CreateCookbookInput,
} from '@/utils/cookbook/api';
import { loadCachedShelf, saveCachedShelf } from '@/utils/cookbook/cache';
import { isStaleCachedData } from '@/utils/cookbook/cacheStatus';
import type { Cookbook } from '@/types/cookbook';
import { SAMPLE_COOKBOOK, shouldShowSampleCookbook } from '@/utils/cookbook/sampleCookbook';

export const SHELF_QUERY_KEY = (userId: string | undefined) => ['cookbook-shelf', userId];

export const [CookbooksProvider, useCookbooks] = createContextHook(() => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const shelfQuery = useQuery({
    queryKey: SHELF_QUERY_KEY(user?.id),
    enabled: !!user,
    queryFn: () => listCookbooks(user!.id),
  });

  // Hydrate from cache on mount, then keep cache in sync as Supabase responds.
  useEffect(() => {
    if (!user?.id) return;
    if (shelfQuery.data !== undefined) return;
    let cancelled = false;
    loadCachedShelf(user.id)
      .then((cached) => {
        if (cancelled || !cached) return;
        queryClient.setQueryData(SHELF_QUERY_KEY(user.id), cached.cookbooks);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [user?.id, queryClient, shelfQuery.data]);

  useEffect(() => {
    if (!user?.id || !shelfQuery.data) return;
    saveCachedShelf(user.id, shelfQuery.data).catch(() => {});
  }, [user?.id, shelfQuery.data]);

  const createMutation = useMutation({
    mutationFn: async (input: Omit<CreateCookbookInput, 'userId'>) => {
      if (!user) throw new Error('Not signed in');
      return createCookbookRow({ ...input, userId: user.id });
    },
    onSuccess: (cookbook) => {
      queryClient.setQueryData<Cookbook[]>(SHELF_QUERY_KEY(user?.id), (existing = []) => {
        const withoutDup = existing.filter((c) => c.id !== cookbook.id);
        return [cookbook, ...withoutDup];
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (cookbookId: string) => {
      await deleteCookbookRow(cookbookId);
      return cookbookId;
    },
    onSuccess: (cookbookId) => {
      queryClient.setQueryData<Cookbook[]>(SHELF_QUERY_KEY(user?.id), (existing = []) =>
        existing.filter((c) => c.id !== cookbookId),
      );
    },
  });

  const persistedCookbooks = shelfQuery.data ?? [];
  const cookbooks = shouldShowSampleCookbook()
    ? [SAMPLE_COOKBOOK, ...persistedCookbooks]
    : persistedCookbooks;
  const isShelfStale = isStaleCachedData(shelfQuery.error, shelfQuery.data);

  return {
    cookbooks,
    isLoading: shelfQuery.isLoading,
    isShelfStale,
    shelfError: shelfQuery.error,
    error: shelfQuery.error,
    refresh: () => queryClient.invalidateQueries({ queryKey: SHELF_QUERY_KEY(user?.id) }),
    createCookbook: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    deleteCookbook: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
});
