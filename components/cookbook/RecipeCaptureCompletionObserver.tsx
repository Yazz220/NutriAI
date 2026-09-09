import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { router, usePathname } from 'expo-router';
import { useToast } from '@/contexts/ToastContext';
import { useNoshConversation } from '@/contexts/NoshConversationContext';
import { useAuth } from '@/hooks/useAuth';
import { COOKBOOK_PAGES_QUERY_KEY } from '@/hooks/useCookbook';
import { useCookbooks } from '@/hooks/useCookbooks';
import { useRecipeCaptureFeed } from '@/hooks/useRecipeCaptures';
import type { CookbookPage } from '@/types/cookbook';
import { fetchPageById } from '@/utils/cookbook/api';
import { reconcileCapturePage, type RecipeCapture } from '@/utils/cookbook/captureLifecycle';

const READY_SIGNATURE = 'ready:ready';

function captureSignature(capture: RecipeCapture): string {
  return `${capture.status}:${capture.pageStatus ?? 'none'}`;
}

function captureTitle(capture: RecipeCapture): string {
  return capture.recipeGraph?.title?.trim() || 'Your recipe';
}

export function RecipeCaptureCompletionObserver() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { cookbooks } = useCookbooks();
  const { captures, hasData, isLoading } = useRecipeCaptureFeed();
  const { showToast } = useToast();
  const pathname = usePathname();
  const { visible: conversationVisible, interaction } = useNoshConversation();
  const normalizedPathname = pathname.replace(/\/+$/, '') || '/';
  const captureWorkspaceVisible = (
    normalizedPathname === '/save'
    || normalizedPathname.endsWith('/add')
    || (conversationVisible && interaction.task === 'capture')
  );
  const tracker = useRef<{
    userId?: string;
    initialized: boolean;
    signatures: Map<string, string>;
  }>({ initialized: false, signatures: new Map() });

  useEffect(() => {
    if (tracker.current.userId !== user?.id) {
      tracker.current = {
        userId: user?.id,
        initialized: false,
        signatures: new Map(),
      };
    }
    if (!user?.id || !hasData || isLoading) return;

    const nextSignatures = new Map(
      captures.map((capture) => [capture.id, captureSignature(capture)]),
    );
    if (!tracker.current.initialized) {
      tracker.current = {
        userId: user.id,
        initialized: true,
        signatures: nextSignatures,
      };
      return;
    }

    const completed = captures
      .filter((capture) => (
        captureSignature(capture) === READY_SIGNATURE
        && tracker.current.signatures.get(capture.id) !== READY_SIGNATURE
        && Boolean(capture.pageId)
      ))
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));

    tracker.current.signatures = nextSignatures;
    if (completed.length === 0) return;

    for (const capture of completed) {
      const destinationId = capture.destinationCookbookId;
      if (!destinationId) continue;
      const destinationPagesKey = COOKBOOK_PAGES_QUERY_KEY(destinationId);
      if (queryClient.getQueryData(destinationPagesKey) === undefined) continue;
      void fetchPageById(capture.pageId!).then((page) => {
        if (!page) return;
        queryClient.setQueryData<CookbookPage[]>(
          destinationPagesKey,
          (current) => current ? reconcileCapturePage(current, page) : current,
        );
      }).catch(() => undefined);
    }

    if (captureWorkspaceVisible) return;

    // Keep the notification quiet when several captures settle in one poll.
    // The newest page gets the direct action; every other page retains its New marker.
    const readyCapture = completed[0];
    const destination = cookbooks.find(
      (cookbook) => cookbook.id === readyCapture.destinationCookbookId,
    );
    const destinationName = destination?.title ?? 'your cookbook';
    const canOpenPage = Boolean(readyCapture.destinationCookbookId && readyCapture.pageId);

    showToast({
      type: 'success',
      message: `${captureTitle(readyCapture)} is ready in ${destinationName}.`,
      action: canOpenPage
        ? {
            label: 'Open page',
            onPress: () => router.push({
              pathname: '/(book)/[cookbookId]',
              params: {
                cookbookId: readyCapture.destinationCookbookId!,
                pageId: readyCapture.pageId!,
                returnTo: 'previous',
              },
            }),
          }
        : {
            label: 'View',
            onPress: () => router.push('/(book)/save'),
          },
    });
  }, [captureWorkspaceVisible, captures, cookbooks, hasData, isLoading, queryClient, showToast, user?.id]);

  return null;
}
