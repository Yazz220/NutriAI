import { useEffect, useRef } from 'react';
import { useNetworkState } from 'expo-network';
import { useRouter } from 'expo-router';
import { useShareIntentContext } from 'expo-share-intent';
import { useNoshNativeShare } from '@/contexts/NoshNativeShareContext';
import { useAiDataConsent } from '@/contexts/AiDataConsentContext';
import { useNoshSubscription } from '@/contexts/NoshSubscriptionContext';
import { useSubscriptionUi } from '@/components/subscription/SubscriptionHost';
import { useAuth } from '@/hooks/useAuth';
import { useRecipeCaptures } from '@/hooks/useRecipeCaptures';
import { uploadRecipeCaptureImage, uploadRecipeCaptureVideo } from '@/utils/cookbook/api';
import {
  getNativeShareRequestKey,
  nativeShareNeedsVideoPermission,
  nativeShareReadiness,
  normalizeNativeShareIntent,
} from '@/utils/cookbook/nativeShareAdapter';
import type { RecipeCaptureSource } from '@/utils/cookbook/captureLifecycle';
import type { RecipeSourceType } from '@/types/cookbook';
import { isEffectivePlusAccess } from '@/utils/subscriptions/access';

export function NativeShareIngestion() {
  const router = useRouter();
  const network = useNetworkState();
  const { session, user } = useAuth();
  const { hasShareIntent, shareIntent, resetShareIntent, error: nativeError } = useShareIntentContext();
  const { startCapture } = useRecipeCaptures();
  const { setReceipt, retryToken, videoPermissionToken } = useNoshNativeShare();
  const { requestConsent } = useAiDataConsent();
  const { refresh: refreshSubscription } = useNoshSubscription();
  const { requestPageAccess } = useSubscriptionUi();
  const processing = useRef(false);
  const failedAttempt = useRef<number | null>(null);
  const usedVideoPermissionToken = useRef(0);

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
        if (
          nativeShareNeedsVideoPermission(normalized)
          && videoPermissionToken <= usedVideoPermissionToken.current
        ) {
          setReceipt({ status: 'needs_video_permission', sourceType: 'video' });
          router.replace('/(book)/share');
          return;
        }
        if (nativeShareNeedsVideoPermission(normalized)) {
          usedVideoPermissionToken.current = videoPermissionToken;
        }
        if (!await requestPageAccess('native_share')) {
          failedAttempt.current = retryToken;
          const latestAccess = await refreshSubscription().catch(() => null);
          const resetAt = latestAccess?.features.designedPages.periodEnd;
          setReceipt({
            status: 'failed',
            sourceType,
            message: isEffectivePlusAccess(latestAccess)
              ? `This shared recipe is still waiting. Your page allowance${resetAt ? ` refreshes ${formatShareResetDate(resetAt)}` : ' will refresh with your next plan period'}.`
              : latestAccess?.planId === 'free'
                ? 'This shared recipe is still waiting. Upgrade to Nosh Plus when you are ready to create another page.'
                : 'This shared recipe is still waiting. Nosh could not check your plan, so reconnect and try saving again.',
          });
          router.replace('/(book)/share');
          return;
        }
        if (!await requestConsent()) {
          setReceipt({
            status: 'failed',
            message: 'Allow AI processing before Nosh reads this shared recipe.',
          });
          router.replace('/(book)/share');
          return;
        }
        setReceipt({ status: 'saving', sourceType });
        router.replace('/(book)/share');
        const requestKey = await getNativeShareRequestKey(normalized);
        let source: RecipeCaptureSource;

        if (normalized.type === 'image') {
          const upload = await uploadRecipeCaptureImage({
            userId,
            imageUri: normalized.fileUri,
            mimeType: normalized.mimeType,
            requestKey,
          });
          source = { type: 'image', ...upload, notes: normalized.notes };
        } else if (normalized.type === 'video' && 'video' in normalized) {
          const upload = await uploadRecipeCaptureVideo({
            userId,
            video: normalized.video,
            requestKey,
          });
          source = {
            type: 'video',
            ...upload,
            rightsConfirmed: true,
            notes: normalized.notes,
          };
        } else if (normalized.type === 'video') {
          source = {
            type: 'video',
            input: normalized.input,
            rightsConfirmed: nativeShareNeedsVideoPermission(normalized),
          };
        } else {
          source = { type: normalized.type, input: normalized.input };
        }

        const result = await startCapture({ source, idempotencyKey: requestKey });
        if (cancelled) return;
        void refreshSubscription();
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
    requestPageAccess,
    requestConsent,
    refreshSubscription,
    retryToken,
    router,
    session,
    setReceipt,
    shareIntent,
    startCapture,
    user,
    videoPermissionToken,
  ]);

  return null;
}

function formatShareResetDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'soon';
  return new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'long' }).format(date);
}
