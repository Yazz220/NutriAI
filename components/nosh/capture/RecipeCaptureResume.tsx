import { useEffect, useRef } from 'react';
import { useRecipeCaptures } from '@/hooks/useRecipeCaptures';
import { isCaptureStale } from '@/utils/cookbook/captureLifecycle';
import { useAiDataConsent } from '@/contexts/AiDataConsentContext';

/** Keeps unfinished durable captures polling after a cold app launch. */
export function RecipeCaptureResume() {
  const { captures, retryCapture } = useRecipeCaptures();
  const { isGranted, isReady } = useAiDataConsent();
  const resumed = useRef(new Set<string>());

  useEffect(() => {
    if (!isReady || !isGranted) return;
    const staleReading = captures.filter((capture) => isCaptureStale(capture));
    for (const capture of staleReading) {
      const attemptKey = `${capture.id}:${capture.processingAttempt}`;
      if (resumed.current.has(attemptKey)) continue;
      resumed.current.add(attemptKey);
      void retryCapture(capture.id).catch(() => {});
    }
  }, [captures, isGranted, isReady, retryCapture]);

  return null;
}
