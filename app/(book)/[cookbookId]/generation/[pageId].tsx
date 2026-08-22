import { useEffect } from 'react';
import { router, useLocalSearchParams } from 'expo-router';

/** Compatibility redirect for result links created by the retired flow. */
export default function PageAddedScreen() {
  const { cookbookId, pageId } = useLocalSearchParams<{
    cookbookId: string;
    pageId?: string | string[];
  }>();
  const normalizedPageId = Array.isArray(pageId) ? pageId[0] : pageId;

  useEffect(() => {
    router.replace(normalizedPageId && normalizedPageId !== 'temp'
      ? `/(book)/${cookbookId}?pageId=${encodeURIComponent(normalizedPageId)}`
      : `/(book)/${cookbookId}`);
  }, [cookbookId, normalizedPageId]);

  return null;
}
