import { useEffect, useRef } from 'react';
import { File } from 'expo-file-system';
import { useNetworkState } from 'expo-network';
import { useRouter } from 'expo-router';
import { useShareIntentContext } from 'expo-share-intent';
import { useNoshNativeShare } from '@/contexts/NoshNativeShareContext';
import { useAuth } from '@/hooks/useAuth';
import { useRecipeCaptures } from '@/hooks/useRecipeCaptures';
import { uploadRecipeCaptureImage } from '@/utils/cookbook/api';
import {
  getNativeShareRequestKey,
  nativeShareReadiness,
  normalizeNativeShareIntent,
} from '@/utils/cookbook/nativeShareAdapter';
import type { RecipeCaptureSource } from '@/utils/cookbook/captureLifecycle';
import type { RecipeSourceType } from '@/types/cookbook';

export function NativeShareIngestion() {
  const router = useRouter();
  const network = useNetworkState();
  const { session, user } = useAuth();
  const { hasShareIntent, shareIntent, resetShareIntent, error: nativeError } = useShareIntentContext();
  const { startCapture } = useRecipeCaptures();
  const { setReceipt, retryToken } = useNoshNativeShare();
  const processing = useRef(false);
  const failedAttempt = useRef<number | null>(null);

  useEffect(() => {
    if (nativeError) {
      setReceipt({ status: 'failed', message: 'Nosh could not read the shared item. Please share it again.' });
    }
  }, [nativeError, setReceipt]);

  useEffect(() => {
    if (!hasShareIntent || processing.current || failedAttempt.current === retryToken) return;
    const readiness = nativeShareReadiness({
      hasSession: Boolean(session && user),
      isConnected: network.isConnected,
      isInternetReachable: network.isInternetReachable,
    });
    if (readiness === 'waiting_for_sign_in' || !user) {
      setReceipt({ status: 'waiting_for_sign_in' });
      return;
    }
    if (readiness === 'offline') {
      setReceipt({
        status: 'failed',
        message: 'This share is still waiting on this device. Reconnect, then try saving again.',
      });
      router.replace('/(book)/share');
      return;
    }

    let cancelled = false;
    processing.current = true;
    const userId = user.id;

    async function saveShare() {
      let sourceType: RecipeSourceType | undefined;
      try {
        const normalized = normalizeNativeShareIntent(shareIntent);
        sourceType = normalized.type;
        setReceipt({ status: 'saving', sourceType });
        router.replace('/(book)/share');
        const requestKey = await getNativeShareRequestKey(normalized);
        let source: RecipeCaptureSource;

        if (normalized.type === 'image') {
          const imageBase64 = await new File(normalized.fileUri).base64();
          const upload = await uploadRecipeCaptureImage({
            userId,
            imageBase64,
            mimeType: normalized.mimeType,
            requestKey,
          });
          source = { type: 'image', ...upload, notes: normalized.notes };
        } else {
          source = { type: normalized.type, input: normalized.input };
        }

        const result = await startCapture({ source, idempotencyKey: requestKey });
        if (cancelled) return;
        resetShareIntent(true);
        failedAttempt.current = null;
        setReceipt({ status: 'saved', sourceType, captureId: result.capture.id });
      } catch (error) {
        if (cancelled) return;
        failedAttempt.current = retryToken;
        setReceipt({
          status: 'failed',
          sourceType,
          message: error instanceof Error ? error.message : 'Nosh could not save this shared recipe.',
        });
      } finally {
        processing.current = false;
      }
    }

    void saveShare();
    return () => { cancelled = true; };
  }, [
    hasShareIntent,
    network.isConnected,
    network.isInternetReachable,
    resetShareIntent,
    retryToken,
    router,
    session,
    setReceipt,
    shareIntent,
    startCapture,
    user,
  ]);

  return null;
}
