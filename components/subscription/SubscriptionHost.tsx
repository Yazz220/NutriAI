import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Linking } from 'react-native';
import * as Haptics from 'expo-haptics';
import { PRIVACY_POLICY_URL, TERMS_OF_USE_URL } from '@/constants/legal';
import { useToast } from '@/contexts/ToastContext';
import { useNoshSubscription } from '@/contexts/NoshSubscriptionContext';
import type { SubscriptionAccessSnapshot } from '@/types/subscription';
import { isEffectivePlusAccess } from '@/utils/subscriptions/access';
import { trackEvent } from '@/utils/analytics';
import { PageLimitSheet } from './PageLimitSheet';
import { SubscriptionAccessUnavailableSheet } from './SubscriptionAccessUnavailableSheet';
import { SubscriptionPaywallSheet } from './SubscriptionPaywallSheet';

export type PaywallReason =
  | 'settings'
  | 'page_capture'
  | 'cookbook_limit'
  | 'recipe_revision'
  | 'page_redesign'
  | 'agent_capture'
  | 'agent_recipe_save'
  | 'agent_artwork'
  | 'native_share';

interface SubscriptionUiValue {
  openPaywall: (reason: PaywallReason) => Promise<boolean>;
  requestPageAccess: (reason: PaywallReason, options?: AccessRequestOptions) => Promise<boolean>;
  requestCookbookAccess: (options?: AccessRequestOptions) => Promise<boolean>;
}

interface AccessRequestOptions {
  refresh?: boolean;
}

interface SubscriptionUiState extends SubscriptionUiValue {
  paywallReason: PaywallReason | null;
  limitVisible: boolean;
  accessUnavailable: boolean;
  settlePaywall: (entitled: boolean) => void;
  closeLimit: () => void;
  closeAccessUnavailable: () => void;
  retryAccess: () => Promise<void>;
}

const SubscriptionUiContext = createContext<SubscriptionUiState | null>(null);

export function SubscriptionUiProvider({ children }: { children: React.ReactNode }) {
  const subscription = useNoshSubscription();
  const [paywallReason, setPaywallReason] = useState<PaywallReason | null>(null);
  const [limitVisible, setLimitVisible] = useState(false);
  const [accessUnavailable, setAccessUnavailable] = useState(false);
  const pendingResolvers = useRef<Array<(entitled: boolean) => void>>([]);

  const settlePaywall = useCallback((entitled: boolean) => {
    const resolvers = pendingResolvers.current;
    pendingResolvers.current = [];
    setPaywallReason(null);
    resolvers.forEach((resolve) => resolve(entitled));
  }, []);

  const openPaywall = useCallback((reason: PaywallReason) => {
    if (isEffectivePlusAccess(subscription.access)) return Promise.resolve(true);
    setPaywallReason(reason);
    return new Promise<boolean>((resolve) => {
      pendingResolvers.current.push(resolve);
    });
  }, [subscription.access]);

  const requestPageAccess = useCallback(async (
    reason: PaywallReason,
    options?: AccessRequestOptions,
  ) => {
    const snapshot = options?.refresh
      ? await subscription.refresh()
      : subscription.access ?? await subscription.refresh();
    if (!snapshot) {
      setAccessUnavailable(true);
      return false;
    }
    const allowance = snapshot.features.designedPages;
    if ((allowance.remaining ?? 0) > 0) return true;
    trackEvent({
      type: 'page_or_cookbook_limit_encountered',
      data: { reason, tier: snapshot.planId },
    });
    if (isEffectivePlusAccess(snapshot)) {
      setLimitVisible(true);
      return false;
    }
    return openPaywall(reason);
  }, [openPaywall, subscription]);

  const requestCookbookAccess = useCallback(async (options?: AccessRequestOptions) => {
    const snapshot = options?.refresh
      ? await subscription.refresh()
      : subscription.access ?? await subscription.refresh();
    if (!snapshot) {
      setAccessUnavailable(true);
      return false;
    }
    const allowance = snapshot.features.cookbooks;
    if (isEffectivePlusAccess(snapshot) || allowance.limit === null) return true;
    if (allowance && (allowance.remaining ?? 0) > 0) return true;
    trackEvent({
      type: 'page_or_cookbook_limit_encountered',
      data: { reason: 'cookbook_limit', tier: snapshot.planId },
    });
    return openPaywall('cookbook_limit');
  }, [openPaywall, subscription]);

  const retryAccess = useCallback(async () => {
    const snapshot = await subscription.refresh();
    if (snapshot) setAccessUnavailable(false);
  }, [subscription]);

  const value = useMemo<SubscriptionUiState>(() => ({
    openPaywall,
    requestPageAccess,
    requestCookbookAccess,
    paywallReason,
    limitVisible,
    accessUnavailable,
    settlePaywall,
    closeLimit: () => setLimitVisible(false),
    closeAccessUnavailable: () => setAccessUnavailable(false),
    retryAccess,
  }), [
    accessUnavailable,
    limitVisible,
    openPaywall,
    paywallReason,
    requestCookbookAccess,
    requestPageAccess,
    retryAccess,
    settlePaywall,
  ]);

  useEffect(() => {
    if (!paywallReason || !isEffectivePlusAccess(subscription.access)) return;
    // Store callbacks and the server webhook can reconcile in either order.
    // Any authoritative Plus update should release the action waiting behind
    // an already-open paywall, even if the original sync response was lost.
    settlePaywall(true);
  }, [paywallReason, settlePaywall, subscription.access]);

  return (
    <SubscriptionUiContext.Provider value={value}>
      {children}
    </SubscriptionUiContext.Provider>
  );
}

export function SubscriptionHost() {
  const ui = useSubscriptionUiState();
  return (
    <SubscriptionHostContent
      paywallReason={ui.paywallReason}
      limitVisible={ui.limitVisible}
      accessUnavailable={ui.accessUnavailable}
      onClosePaywall={() => ui.settlePaywall(false)}
      onEntitled={() => ui.settlePaywall(true)}
      onCloseLimit={ui.closeLimit}
      onCloseAccessUnavailable={ui.closeAccessUnavailable}
      onRetryAccess={() => { void ui.retryAccess(); }}
    />
  );
}

function SubscriptionHostContent({
  paywallReason,
  limitVisible,
  accessUnavailable,
  onClosePaywall,
  onEntitled,
  onCloseLimit,
  onCloseAccessUnavailable,
  onRetryAccess,
}: {
  paywallReason: PaywallReason | null;
  limitVisible: boolean;
  accessUnavailable: boolean;
  onClosePaywall: () => void;
  onEntitled: () => void;
  onCloseLimit: () => void;
  onCloseAccessUnavailable: () => void;
  onRetryAccess: () => void;
}) {
  const subscription = useNoshSubscription();
  const { showToast } = useToast();
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (!paywallReason) return;
    trackEvent({ type: 'paywall_viewed', data: { reason: paywallReason } });
  }, [paywallReason]);

  const finishEntitlement = useCallback((snapshot: SubscriptionAccessSnapshot | null, restored: boolean) => {
    if (!isEffectivePlusAccess(snapshot)) {
      if (restored && snapshot) setActionError('No active Nosh Plus purchase was found for this Apple Account.');
      return;
    }
    setActionError(null);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    showToast({
      type: 'success',
      message: restored
        ? 'Nosh Plus restored.'
        : 'Welcome to Nosh Plus. Your next page is ready when you are.',
    });
    onEntitled();
  }, [onEntitled, showToast]);

  const purchase = useCallback(async (packageId: 'monthly' | 'annual') => {
    setActionError(null);
    const reason = paywallReason ?? 'settings';
    trackEvent({
      type: 'purchase_started',
      data: { billingPeriod: packageId, reason },
    });
    try {
      const snapshot = await subscription.purchase(packageId);
      // Returning means StoreKit completed. A null snapshot means only that
      // the authoritative server reconciliation is still pending.
      trackEvent({
        type: 'purchase_succeeded',
        data: { billingPeriod: packageId, reason },
      });
      finishEntitlement(snapshot, false);
    } catch (error) {
      if (error instanceof Error && error.name === 'RevenueCatPurchaseCancelledError') {
        trackEvent({
          type: 'purchase_cancelled',
          data: { billingPeriod: packageId, reason },
        });
        return;
      }
      trackEvent({
        type: 'purchase_failed',
        data: { billingPeriod: packageId, reason },
      });
      setActionError(error instanceof Error ? error.message : 'Nosh Plus could not be started. Please try again.');
    }
  }, [finishEntitlement, paywallReason, subscription]);

  const restore = useCallback(async () => {
    setActionError(null);
    const reason = paywallReason ?? 'settings';
    trackEvent({ type: 'restore_started', data: { reason } });
    try {
      const snapshot = await subscription.restore();
      if (isEffectivePlusAccess(snapshot)) {
        trackEvent({ type: 'restore_succeeded', data: { reason } });
      } else if (snapshot) {
        trackEvent({ type: 'restore_not_found', data: { reason } });
      } else {
        trackEvent({ type: 'restore_failed', data: { reason } });
      }
      finishEntitlement(snapshot, true);
    } catch (error) {
      trackEvent({ type: 'restore_failed', data: { reason } });
      setActionError(error instanceof Error ? error.message : 'Purchases could not be restored. Please try again.');
    }
  }, [finishEntitlement, paywallReason, subscription]);

  const manage = useCallback(async () => {
    setActionError(null);
    try {
      if (!await subscription.manage()) {
        trackEvent({ type: 'manage_subscription_failed', data: { reason: 'page_limit' } });
        setActionError('Subscription settings could not be opened. Please try again.');
      } else {
        trackEvent({ type: 'manage_subscription_opened', data: { reason: 'page_limit' } });
      }
    } catch (error) {
      trackEvent({ type: 'manage_subscription_failed', data: { reason: 'page_limit' } });
      setActionError(error instanceof Error ? error.message : 'Subscription settings could not be opened.');
    }
  }, [subscription]);

  const refreshOfferings = useCallback(async () => {
    setActionError(null);
    try {
      await subscription.refreshOfferings();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Nosh Plus options could not be loaded.');
    }
  }, [subscription]);

  const openLink = useCallback(async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      setActionError('This link could not be opened. Please try again when you are online.');
    }
  }, []);

  return (
    <>
      <SubscriptionPaywallSheet
        visible={paywallReason !== null}
        reason={paywallReason ?? 'settings'}
        packages={subscription.offerings}
        offeringsStatus={subscription.offeringsStatus}
        purchaseState={subscription.actionState}
        error={actionError ?? subscription.error}
        onClose={() => {
          if (paywallReason) {
            trackEvent({ type: 'paywall_dismissed', data: { reason: paywallReason } });
          }
          setActionError(null);
          onClosePaywall();
        }}
        onPurchase={(packageId) => { void purchase(packageId); }}
        onRestore={() => { void restore(); }}
        onRetryOfferings={() => { void refreshOfferings(); }}
        onOpenTerms={() => { void openLink(TERMS_OF_USE_URL); }}
        onOpenPrivacy={() => { void openLink(PRIVACY_POLICY_URL); }}
      />
      <PageLimitSheet
        visible={limitVisible}
        limit={subscription.access?.features.designedPages.limit ?? 20}
        resetAt={subscription.access?.features.designedPages.periodEnd ?? null}
        onClose={onCloseLimit}
        onManage={() => { void manage(); }}
      />
      <SubscriptionAccessUnavailableSheet
        visible={accessUnavailable}
        refreshing={subscription.isRefreshing}
        onClose={onCloseAccessUnavailable}
        onRetry={onRetryAccess}
      />
    </>
  );
}

export function useSubscriptionUi() {
  const context = useContext(SubscriptionUiContext);
  if (!context) throw new Error('useSubscriptionUi must be used within SubscriptionUiProvider');
  return {
    openPaywall: context.openPaywall,
    requestPageAccess: context.requestPageAccess,
    requestCookbookAccess: context.requestCookbookAccess,
  };
}

function useSubscriptionUiState() {
  const context = useContext(SubscriptionUiContext);
  if (!context) throw new Error('SubscriptionHost must be used within SubscriptionUiProvider');
  return context;
}
