import { useEffect } from 'react';
import { router, useLocalSearchParams } from 'expo-router';

/** Compatibility redirect for links created by the retired review flow. */
export default function RecipeReviewScreen() {
  const { cookbookId, captureId } = useLocalSearchParams<{
    cookbookId: string;
    captureId?: string;
  }>();

  useEffect(() => {
    router.replace(captureId
      ? `/(book)/save?captureId=${encodeURIComponent(captureId)}`
      : `/(book)/${cookbookId}/add`);
  }, [captureId, cookbookId]);

  return null;
}
