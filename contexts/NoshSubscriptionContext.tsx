import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState, Platform } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { CustomerInfo } from 'react-native-purchases';
import { useAuth } from '@/hooks/useAuth';
import type {
  SubscriptionAccessSnapshot,
  SubscriptionActionState,
  SubscriptionEntitlementStatus,
  SubscriptionOfferingsStatus,
  SubscriptionPackage,
  SubscriptionPackageId,
  SubscriptionPlanId,
} from '@/types/subscription';
import {
  fetchSubscriptionAccess,
  SUBSCRIPTION_ACCESS_QUERY_KEY,
  syncSubscriptionAccess,
} from '@/utils/subscriptions/api';
import { isEffectivePlusAccess } from '@/utils/subscriptions/access';
import {
  APPLE_SUBSCRIPTION_MANAGEMENT_URL,
  customerHasNoshPlus,
  RevenueCatPurchaseCancelledError,
  RevenueCatUnavailableError,
  revenueCatClient,
} from '@/utils/subscriptions/revenueCatClient';

export interface NoshSubscriptionContextValue {
  access: SubscriptionAccessSnapshot | null;
  tier: SubscriptionPlanId | null;
  entitlementStatus: SubscriptionEntitlementStatus;
  isPlus: boolean;
  isLoading: boolean;
  isRefreshing: boolean;
  isPurchasesAvailable: boolean;
  offerings: SubscriptionPackage[];
  offeringsStatus: SubscriptionOfferingsStatus;
  actionState: SubscriptionActionState;
  managementUrl: string | null;
  error: string | null;
  refresh: () => Promise<SubscriptionAccessSnapshot | null>;
  refreshOfferings: () => Promise<SubscriptionPackage[]>;
  sync: () => Promise<SubscriptionAccessSnapshot | null>;
  purchase: (packageId: SubscriptionPackageId) => Promise<SubscriptionAccessSnapshot | null>;
  restore: () => Promise<SubscriptionAccessSnapshot | null>;
  manage: () => Promise<boolean>;
}

const NoshSubscriptionContext = createContext<NoshSubscriptionContextValue | null>(null);

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof RevenueCatUnavailableError) return error.message;
  if (error instanceof Error && error.message.trim()) return error.message;
  return fallback;
}

export function NoshSubscriptionProvider({ children }: React.PropsWithChildren) {
  const { user, initializing } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();
  const activeUserId = useRef<string | undefined>(userId);
  const identityGeneration = useRef(0);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [offerings, setOfferings] = useState<SubscriptionPackage[]>([]);
  const [offeringsStatus, setOfferingsStatus] = useState<SubscriptionOfferingsStatus>('idle');
  const [actionState, setActionState] = useState<SubscriptionActionState>('idle');
  const [isPurchasesAvailable, setPurchasesAvailable] = useState(false);
  const [error, setError] = useState<string | null>(null);

  activeUserId.current = userId;

  const accessQuery = useQuery({
    queryKey: SUBSCRIPTION_ACCESS_QUERY_KEY(userId),
    enabled: Boolean(userId),
    queryFn: fetchSubscriptionAccess,
    staleTime: 60_000,
    retry: 1,
  });

  const setAccess = useCallback((access: SubscriptionAccessSnapshot) => {
    queryClient.setQueryData(SUBSCRIPTION_ACCESS_QUERY_KEY(activeUserId.current), access);
    return access;
  }, [queryClient]);

  const syncInternal = useCallback(async (
    expectedUserId: string,
    exposeActionState: boolean,
  ): Promise<SubscriptionAccessSnapshot | null> => {
    if (activeUserId.current !== expectedUserId) return null;
    if (exposeActionState) setActionState('syncing');
    try {
      const access = await syncSubscriptionAccess();
      if (activeUserId.current !== expectedUserId) return null;
      setError(null);
      return setAccess(access);
    } catch (syncError) {
      if (activeUserId.current === expectedUserId) {
        setError(errorMessage(syncError, 'Nosh could not refresh your plan right now.'));
      }
      return null;
    } finally {
      if (exposeActionState && activeUserId.current === expectedUserId) setActionState('idle');
    }
  }, [setAccess]);

  useEffect(() => {
    const generation = identityGeneration.current + 1;
    identityGeneration.current = generation;
    let removeCustomerInfoListener: (() => void) | undefined;
    let cancelled = false;

    setCustomerInfo(null);
    setOfferings([]);
    setActionState('idle');
    setError(null);
    setPurchasesAvailable(false);

    if (!userId) {
      setOfferingsStatus('idle');
      return () => {
        cancelled = true;
      };
    }

    setOfferingsStatus('loading');

    void (async () => {
      try {
        await revenueCatClient.identify(userId);
      } catch (identityError) {
        if (cancelled || generation !== identityGeneration.current) return;
        setPurchasesAvailable(false);
        setOfferingsStatus(identityError instanceof RevenueCatUnavailableError
          ? 'unavailable'
          : 'error');
        if (!(identityError instanceof RevenueCatUnavailableError)) {
          setError(errorMessage(identityError, 'Nosh Plus options could not be loaded.'));
        }
        return;
      }

      if (cancelled || generation !== identityGeneration.current) return;
      setPurchasesAvailable(true);

      try {
        removeCustomerInfoListener = revenueCatClient.addCustomerInfoListener(userId, (next) => {
          if (!cancelled && activeUserId.current === userId) {
            setCustomerInfo(next);
            // StoreKit renewals, billing recovery, refunds, and transfers can
            // arrive while Nosh is open. Re-verify them server-side before
            // changing authoritative access or usage.
            void syncInternal(userId, false);
          }
        });
        if (cancelled) {
          removeCustomerInfoListener();
          removeCustomerInfoListener = undefined;
          return;
        }

        const [nextCustomerInfo, nextPackages] = await Promise.all([
          revenueCatClient.getCustomerInfo(userId),
          revenueCatClient.getPackages(userId),
        ]);
        if (cancelled || generation !== identityGeneration.current) return;
        setCustomerInfo(nextCustomerInfo);
        setOfferings(nextPackages);
        setOfferingsStatus(nextPackages.length > 0 ? 'ready' : 'error');
        if (nextPackages.length === 0) {
          setError('Nosh Plus options could not be loaded. Please try again later.');
        }
      } catch (offeringsError) {
        if (cancelled || generation !== identityGeneration.current) return;
        // The native SDK is still configured, so Restore and Manage can remain
        // useful even when cached CustomerInfo or offerings cannot be loaded.
        setOfferingsStatus('error');
        setError(errorMessage(offeringsError, 'Nosh Plus options could not be loaded.'));
      }

      // Reconcile a reinstall or cross-device purchase. The server verifies
      // RevenueCat independently and remains authoritative for usage.
      void syncInternal(userId, false);
    })();

    return () => {
      cancelled = true;
      removeCustomerInfoListener?.();
    };
  }, [syncInternal, userId]);

  const refresh = useCallback(async (): Promise<SubscriptionAccessSnapshot | null> => {
    const expectedUserId = activeUserId.current;
    if (!expectedUserId) return null;

    if (isPurchasesAvailable) {
      void revenueCatClient.getCustomerInfo(expectedUserId)
        .then((next) => {
          if (activeUserId.current === expectedUserId) setCustomerInfo(next);
        })
        .catch(() => undefined);
    }

    const result = await accessQuery.refetch();
    return result.data ?? null;
  }, [accessQuery, isPurchasesAvailable]);

  const refreshOfferings = useCallback(async (): Promise<SubscriptionPackage[]> => {
    const expectedUserId = activeUserId.current;
    if (!expectedUserId) {
      throw new RevenueCatUnavailableError('A signed-in Nosh account is required for purchases.');
    }

    setOfferingsStatus('loading');
    setError(null);
    try {
      if (!isPurchasesAvailable) {
        await revenueCatClient.identify(expectedUserId);
        if (activeUserId.current !== expectedUserId) return [];
        setPurchasesAvailable(true);
      }
      const nextPackages = await revenueCatClient.getPackages(expectedUserId);
      if (activeUserId.current !== expectedUserId) return [];
      if (nextPackages.length === 0) {
        throw new Error('Nosh Plus options could not be loaded. Please try again later.');
      }
      setOfferings(nextPackages);
      setOfferingsStatus('ready');
      return nextPackages;
    } catch (offeringsError) {
      if (activeUserId.current === expectedUserId) {
        const unavailable = offeringsError instanceof RevenueCatUnavailableError;
        if (unavailable) setPurchasesAvailable(false);
        setOfferingsStatus(unavailable ? 'unavailable' : 'error');
        setError(errorMessage(offeringsError, 'Nosh Plus options could not be loaded.'));
      }
      throw offeringsError;
    }
  }, [isPurchasesAvailable]);

  const sync = useCallback(async (): Promise<SubscriptionAccessSnapshot | null> => {
    const expectedUserId = activeUserId.current;
    if (!expectedUserId) return null;
    return syncInternal(expectedUserId, true);
  }, [syncInternal]);

  const purchase = useCallback(async (
    packageId: SubscriptionPackageId,
  ): Promise<SubscriptionAccessSnapshot | null> => {
    const expectedUserId = activeUserId.current;
    if (!expectedUserId || !isPurchasesAvailable) {
      const unavailableError = new RevenueCatUnavailableError(
        expectedUserId
          ? 'Purchases are not available right now.'
          : 'A signed-in Nosh account is required for purchases.',
      );
      setError(unavailableError.message);
      throw unavailableError;
    }

    setActionState('purchasing');
    setError(null);
    try {
      const nextCustomerInfo = await revenueCatClient.purchase(expectedUserId, packageId);
      if (activeUserId.current !== expectedUserId) return null;
      setCustomerInfo(nextCustomerInfo);
      setActionState('syncing');
      if (!customerHasNoshPlus(nextCustomerInfo)) {
        const entitlementMessage = 'Your purchase completed, but Nosh Plus was not attached to it. Please contact Nosh support before trying again.';
        setError(entitlementMessage);
        throw new Error(entitlementMessage);
      }
      const access = await syncInternal(expectedUserId, false);
      if (!isEffectivePlusAccess(access)) {
        setError('Your purchase completed. Nosh is still updating your plan. Please try again in a moment.');
        return null;
      }
      return access;
    } catch (purchaseError) {
      // Keep cancellation distinct from a completed purchase whose server
      // reconciliation is still pending. Presentation should catch this typed
      // error silently; analytics can then classify the two outcomes safely.
      if (purchaseError instanceof RevenueCatPurchaseCancelledError) throw purchaseError;
      if (activeUserId.current === expectedUserId) {
        setError(errorMessage(purchaseError, 'Nosh could not complete the purchase.'));
      }
      throw purchaseError;
    } finally {
      if (activeUserId.current === expectedUserId) setActionState('idle');
    }
  }, [isPurchasesAvailable, syncInternal]);

  const restore = useCallback(async (): Promise<SubscriptionAccessSnapshot | null> => {
    const expectedUserId = activeUserId.current;
    if (!expectedUserId || !isPurchasesAvailable) {
      const unavailableError = new RevenueCatUnavailableError(
        expectedUserId
          ? 'Restore Purchases is not available right now.'
          : 'A signed-in Nosh account is required to restore purchases.',
      );
      setError(unavailableError.message);
      throw unavailableError;
    }

    setActionState('restoring');
    setError(null);
    try {
      const nextCustomerInfo = await revenueCatClient.restore(expectedUserId);
      if (activeUserId.current !== expectedUserId) return null;
      setCustomerInfo(nextCustomerInfo);
      const restoredPlus = customerHasNoshPlus(nextCustomerInfo);
      const access = await syncInternal(expectedUserId, false);
      if (restoredPlus && !isEffectivePlusAccess(access)) {
        const pendingMessage = 'Your Nosh Plus purchase was found, but Nosh could not update your plan yet. Please try again.';
        setError(pendingMessage);
        throw new Error(pendingMessage);
      }
      return access;
    } catch (restoreError) {
      if (activeUserId.current === expectedUserId) {
        setError(errorMessage(restoreError, 'Nosh could not restore purchases.'));
      }
      throw restoreError;
    } finally {
      if (activeUserId.current === expectedUserId) setActionState('idle');
    }
  }, [isPurchasesAvailable, syncInternal]);

  const manage = useCallback(async (): Promise<boolean> => {
    const expectedUserId = activeUserId.current;
    if (!expectedUserId) return false;
    try {
      const opened = await revenueCatClient.manage(expectedUserId, customerInfo);
      if (!opened) setError('Subscription management is not available right now.');
      return opened;
    } catch (manageError) {
      setError(errorMessage(manageError, 'Nosh could not open subscription management.'));
      return false;
    }
  }, [customerInfo]);

  useEffect(() => {
    if (!userId) return;
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refresh();
    });
    return () => subscription.remove();
  }, [refresh, userId]);

  const tier: SubscriptionPlanId | null = accessQuery.data?.planId ?? null;
  const value = useMemo<NoshSubscriptionContextValue>(() => ({
    access: accessQuery.data ?? null,
    tier,
    entitlementStatus: accessQuery.data?.entitlementStatus
      ?? 'unknown',
    isPlus: tier === 'plus',
    isLoading: initializing || (Boolean(userId) && accessQuery.isLoading),
    isRefreshing: accessQuery.isRefetching,
    isPurchasesAvailable,
    offerings,
    offeringsStatus,
    actionState,
    managementUrl: customerInfo?.managementURL
      ?? (Platform.OS === 'ios' ? APPLE_SUBSCRIPTION_MANAGEMENT_URL : null),
    error: error ?? (accessQuery.error
      ? errorMessage(accessQuery.error, 'Nosh could not check your plan right now.')
      : null),
    refresh,
    refreshOfferings,
    sync,
    purchase,
    restore,
    manage,
  }), [
    accessQuery.data,
    accessQuery.error,
    accessQuery.isLoading,
    accessQuery.isRefetching,
    actionState,
    customerInfo?.managementURL,
    error,
    initializing,
    isPurchasesAvailable,
    manage,
    offerings,
    offeringsStatus,
    purchase,
    refresh,
    refreshOfferings,
    restore,
    sync,
    tier,
    userId,
  ]);

  return (
    <NoshSubscriptionContext.Provider value={value}>
      {children}
    </NoshSubscriptionContext.Provider>
  );
}

export function useNoshSubscription(): NoshSubscriptionContextValue {
  const value = useContext(NoshSubscriptionContext);
  if (!value) throw new Error('useNoshSubscription must be used inside NoshSubscriptionProvider');
  return value;
}
