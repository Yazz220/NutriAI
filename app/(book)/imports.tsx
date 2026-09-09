import { useEffect } from 'react';
import { router, useLocalSearchParams } from 'expo-router';

/** Compatibility redirect for links created before capture recovery moved into the Composer. */
export default function RecipeImportsCompatibilityRoute() {
  const params = useLocalSearchParams<{ captureId?: string | string[] }>();
  const captureId = Array.isArray(params.captureId) ? params.captureId[0] : params.captureId;

  useEffect(() => {
    router.replace(captureId
      ? `/(book)/save?captureId=${encodeURIComponent(captureId)}`
      : '/(book)/save');
  }, [captureId]);

  return null;
}
