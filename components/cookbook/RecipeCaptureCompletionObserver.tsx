import { useEffect, useRef } from 'react';
import { router } from 'expo-router';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/hooks/useAuth';
import { useCookbooks } from '@/hooks/useCookbooks';
import { useRecipeCaptureFeed } from '@/hooks/useRecipeCaptures';
import type { RecipeCapture } from '@/utils/cookbook/captureLifecycle';

const READY_SIGNATURE = 'ready:ready';

function captureSignature(capture: RecipeCapture): string {
  return `${capture.status}:${capture.pageStatus ?? 'none'}`;
}

function captureTitle(capture: RecipeCapture): string {
  return capture.recipeGraph?.title?.trim() || 'Your recipe';
}

export function RecipeCaptureCompletionObserver() {
  const { user } = useAuth();
  const { cookbooks } = useCookbooks();
  const { captures, hasData, isLoading } = useRecipeCaptureFeed();
  const { showToast } = useToast();
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
  }, [captures, cookbooks, hasData, isLoading, showToast, user?.id]);

  return null;
}
