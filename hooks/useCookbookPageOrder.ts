import { useMutation, useQueryClient } from '@tanstack/react-query';
import { COOKBOOK_PAGES_QUERY_KEY } from '@/hooks/useCookbook';
import type { CookbookPage } from '@/types/cookbook';
import {
  createCollectionActionRequestKey,
  reorderCookbookPage,
} from '@/utils/cookbook/collectionActions';
import { applyCookbookPageOrder } from '@/utils/cookbook/pageOrder';

export function useCookbookPageOrder(cookbookId: string | null | undefined) {
  const queryClient = useQueryClient();
  const queryKey = COOKBOOK_PAGES_QUERY_KEY(cookbookId);

  const mutation = useMutation({
    mutationFn: async (input: { pageId: string; beforePageId?: string | null }) => {
      if (!cookbookId) throw new Error('A cookbook is required to reorder its pages.');
      return reorderCookbookPage({
        cookbookId,
        pageId: input.pageId,
        beforePageId: input.beforePageId,
        idempotencyKey: createCollectionActionRequestKey(),
      });
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey });
      const previousPages = queryClient.getQueryData<CookbookPage[]>(queryKey);
      if (!previousPages) return { previousPages };

      const withoutMovedPage = previousPages.filter((page) => page.id !== input.pageId);
      const beforeIndex = input.beforePageId
        ? withoutMovedPage.findIndex((page) => page.id === input.beforePageId)
        : withoutMovedPage.length;
      const movedPage = previousPages.find((page) => page.id === input.pageId);
      if (!movedPage || beforeIndex < 0) return { previousPages };

      const optimistic = [...withoutMovedPage];
      optimistic.splice(beforeIndex, 0, movedPage);
      queryClient.setQueryData(
        queryKey,
        applyCookbookPageOrder(optimistic, optimistic.map((page) => page.id)),
      );
      return { previousPages };
    },
    onError: (_error, _input, context) => {
      if (context?.previousPages) queryClient.setQueryData(queryKey, context.previousPages);
    },
    onSuccess: (result) => {
      queryClient.setQueryData<CookbookPage[]>(queryKey, (current = []) =>
        applyCookbookPageOrder(current, result.orderedPageIds),
      );
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });

  return {
    movePage: mutation.mutateAsync,
    isReordering: mutation.isPending,
    error: mutation.error,
  };
}
