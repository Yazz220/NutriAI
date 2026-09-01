import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { COOKBOOK_PAGES_QUERY_KEY } from '@/hooks/useCookbook';
import type { CookbookPage } from '@/types/cookbook';
import {
  correctRecipeCapture,
  fetchPageById,
  listRecipeCaptures,
  prepareRecipeCaptureDestination,
  retryRecipeCapture,
  startRecipeCapture,
} from '@/utils/cookbook/api';
import type { RecipeGraphDraft } from '@/types/recipeGraph';
import {
  loadCachedCaptures,
  saveCachedCaptures,
} from '@/utils/cookbook/cache';
import {
  isCaptureProcessing,
  markRecipeCaptureRetryQueued,
  reconcileCapturePage,
  type RecipeCapture,
  type RecipeCaptureSource,
} from '@/utils/cookbook/captureLifecycle';
import { isStaleCachedData } from '@/utils/cookbook/cacheStatus';

export const RECIPE_CAPTURES_QUERY_KEY = (userId?: string | null) => ['recipe-captures', userId];

export function useRecipeCaptures() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = RECIPE_CAPTURES_QUERY_KEY(user?.id);
  const query = useQuery({
    queryKey,
    enabled: Boolean(user?.id),
    queryFn: () => listRecipeCaptures(user!.id),
    refetchInterval: (state) => {
      const captures = state.state.data ?? [];
      return captures.some((capture) =>
        isCaptureProcessing(capture.status) || capture.pageStatus === 'generating'
      ) ? 2_500 : false;
    },
  });

  useEffect(() => {
    if (!user?.id || query.data !== undefined) return;
    let cancelled = false;
    void loadCachedCaptures(user.id).then((cached) => {
      if (!cancelled && cached) queryClient.setQueryData(queryKey, cached.captures);
    });
    return () => { cancelled = true; };
  }, [query.data, queryClient, queryKey, user?.id]);

  useEffect(() => {
    if (!user?.id || !query.data) return;
    void saveCachedCaptures(user.id, query.data);
  }, [query.data, user?.id]);

  useEffect(() => {
    const placedCaptures = (query.data ?? []).filter((capture) => capture.pageId);
    for (const capture of placedCaptures) {
      void fetchPageById(capture.pageId!).then((page) => {
        if (!page) return;
        queryClient.setQueryData<CookbookPage[]>(
          COOKBOOK_PAGES_QUERY_KEY(page.cookbookId),
          (current = []) => reconcileCapturePage(current, page),
        );
      }).catch(() => {});
    }
  }, [query.data, queryClient]);

  function mergeResult(result: { capture: RecipeCapture; pendingPage?: CookbookPage }) {
    queryClient.setQueryData<RecipeCapture[]>(queryKey, (current = []) => [
      result.capture,
      ...current.filter((capture) => capture.id !== result.capture.id),
    ]);
    if (result.pendingPage) {
      queryClient.setQueryData<CookbookPage[]>(
        COOKBOOK_PAGES_QUERY_KEY(result.pendingPage.cookbookId),
        (current = []) => reconcileCapturePage(current, result.pendingPage),
      );
    }
  }

  const startMutation = useMutation({
    mutationFn: (input: {
      source: RecipeCaptureSource;
      destinationCookbookId?: string;
      idempotencyKey: string;
    }) => startRecipeCapture(input),
    onSuccess: mergeResult,
  });

  const retryMutation = useMutation({
    mutationFn: retryRecipeCapture,
    onMutate: (captureId) => {
      queryClient.setQueryData<RecipeCapture[]>(queryKey, (current = []) => current.map((capture) => (
        capture.id === captureId ? markRecipeCaptureRetryQueued(capture) : capture
      )));
    },
    onSuccess: mergeResult,
    onError: () => {
      void queryClient.invalidateQueries({ queryKey });
    },
  });

  const correctionMutation = useMutation({
    mutationFn: (input: { captureId: string; recipeGraph: RecipeGraphDraft }) =>
      correctRecipeCapture(input.captureId, input.recipeGraph),
    onSuccess: mergeResult,
  });

  const destinationMutation = useMutation({
    mutationFn: (input: { captureId: string; destinationCookbookId: string }) =>
      prepareRecipeCaptureDestination(input.captureId, input.destinationCookbookId),
    onSuccess: mergeResult,
  });

  return {
    captures: query.data ?? [],
    isLoading: query.isLoading,
    isStale: isStaleCachedData(query.error, query.data),
    error: query.error,
    refresh: query.refetch,
    startCapture: startMutation.mutateAsync,
    retryCapture: retryMutation.mutateAsync,
    correctCapture: correctionMutation.mutateAsync,
    prepareDestination: destinationMutation.mutateAsync,
    isStarting: startMutation.isPending,
    isRetrying: retryMutation.isPending,
    isCorrecting: correctionMutation.isPending,
    isPreparingDestination: destinationMutation.isPending,
  };
}
