import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  NoshSubscriptionProvider,
  useNoshSubscription,
} from '@/contexts/NoshSubscriptionContext';
import type { SubscriptionAccessSnapshot, SubscriptionPackage } from '@/types/subscription';
import { useAuth } from '@/hooks/useAuth';
import {
  fetchSubscriptionAccess,
  syncSubscriptionAccess,
} from '@/utils/subscriptions/api';
import {
  RevenueCatUnavailableError,
  revenueCatClient,
} from '@/utils/subscriptions/revenueCatClient';

jest.mock('@/hooks/useAuth', () => ({ useAuth: jest.fn() }));
jest.mock('@/utils/subscriptions/api', () => ({
  SUBSCRIPTION_ACCESS_QUERY_KEY: (userId: string | undefined) => [
    'subscription-access',
    userId,
  ],
  fetchSubscriptionAccess: jest.fn(),
  syncSubscriptionAccess: jest.fn(),
}));
jest.mock('@/utils/subscriptions/revenueCatClient', () => {
  class RevenueCatUnavailableError extends Error {
    constructor(message = 'Purchases are not available in this build.') {
      super(message);
      this.name = 'RevenueCatUnavailableError';
    }
  }
  class RevenueCatPurchaseCancelledError extends Error {
    constructor() {
      super('The purchase was cancelled.');
      this.name = 'RevenueCatPurchaseCancelledError';
    }
  }
  return {
    APPLE_SUBSCRIPTION_MANAGEMENT_URL: 'https://apps.apple.com/account/subscriptions',
    RevenueCatUnavailableError,
    RevenueCatPurchaseCancelledError,
    customerHasNoshPlus: (info: { hasPlus?: boolean } | null) => info?.hasPlus === true,
    revenueCatClient: {
      addCustomerInfoListener: jest.fn(() => jest.fn()),
      getCustomerInfo: jest.fn(),
      getPackages: jest.fn(),
      identify: jest.fn(),
      manage: jest.fn(),
      purchase: jest.fn(),
      restore: jest.fn(),
    },
  };
});

const USER_ID = '11111111-1111-4111-8111-111111111111';
const FREE_ACCESS: SubscriptionAccessSnapshot = {
  planId: 'free',
  planName: 'Nosh Free',
  entitlementStatus: 'free',
  productId: null,
  environment: null,
  periodType: null,
  currentPeriodStartedAt: null,
  currentPeriodEndsAt: null,
  expiresAt: null,
  willRenew: false,
  features: {
    cookbooks: { limit: 2, used: 0, remaining: 2 },
    designedPages: {
      limit: 5,
      used: 0,
      reserved: 0,
      remaining: 5,
      periodStart: null,
      periodEnd: null,
    },
  },
};
const PLUS_ACCESS: SubscriptionAccessSnapshot = {
  ...FREE_ACCESS,
  planId: 'plus',
  planName: 'Nosh Plus',
  entitlementStatus: 'active',
  productId: 'com.yaz12.nosh.plus.monthly',
  environment: 'sandbox',
  periodType: 'monthly',
  currentPeriodStartedAt: '2026-09-01T00:00:00.000Z',
  currentPeriodEndsAt: '2026-10-01T00:00:00.000Z',
  expiresAt: '2026-10-01T00:00:00.000Z',
  willRenew: true,
};
const MONTHLY_PACKAGE: SubscriptionPackage = {
  id: 'monthly',
  identifier: '$rc_monthly',
  productIdentifier: 'com.yaz12.nosh.plus.monthly',
  title: 'Nosh Plus Monthly',
  description: 'Nosh Plus',
  localizedPrice: '$9.99',
  localizedPricePerMonth: '$9.99',
  price: 9.99,
  currencyCode: 'USD',
  billingPeriod: 'P1M',
  introOffer: null,
};

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockFetchAccess = fetchSubscriptionAccess as jest.MockedFunction<typeof fetchSubscriptionAccess>;
const mockSyncAccess = syncSubscriptionAccess as jest.MockedFunction<typeof syncSubscriptionAccess>;
const mockRevenueCat = revenueCatClient as jest.Mocked<typeof revenueCatClient>;

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  return function Wrapper({ children }: React.PropsWithChildren) {
    return (
      <QueryClientProvider client={queryClient}>
        <NoshSubscriptionProvider>{children}</NoshSubscriptionProvider>
      </QueryClientProvider>
    );
  };
}

describe('NoshSubscriptionProvider outcomes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({
      initializing: false,
      session: null,
      user: { id: USER_ID },
      signOut: jest.fn(),
    } as unknown as ReturnType<typeof useAuth>);
    mockFetchAccess.mockResolvedValue(FREE_ACCESS);
    mockSyncAccess.mockResolvedValue(FREE_ACCESS);
    mockRevenueCat.getCustomerInfo.mockResolvedValue({ hasPlus: false } as never);
    mockRevenueCat.getPackages.mockResolvedValue([MONTHLY_PACKAGE]);
    mockRevenueCat.identify.mockResolvedValue(undefined);
  });

  it('throws a typed unavailable outcome before StoreKit for purchase and restore', async () => {
    mockRevenueCat.identify.mockRejectedValue(new RevenueCatUnavailableError());
    const { result } = renderHook(() => useNoshSubscription(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.offeringsStatus).toBe('unavailable'));

    await act(async () => {
      await expect(result.current.purchase('monthly'))
        .rejects.toBeInstanceOf(RevenueCatUnavailableError);
      await expect(result.current.restore())
        .rejects.toBeInstanceOf(RevenueCatUnavailableError);
    });
    expect(result.current.actionState).toBe('idle');
    expect(mockRevenueCat.purchase).not.toHaveBeenCalled();
    expect(mockRevenueCat.restore).not.toHaveBeenCalled();
  });

  it('transitions purchasing to syncing and always returns to idle', async () => {
    const { result } = renderHook(() => useNoshSubscription(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isPurchasesAvailable).toBe(true));
    await waitFor(() => expect(mockSyncAccess).toHaveBeenCalled());

    let finishStore!: (value: unknown) => void;
    const storeResult = new Promise((resolve) => { finishStore = resolve; });
    mockRevenueCat.purchase.mockReturnValue(storeResult as never);
    let finishSync!: (value: SubscriptionAccessSnapshot) => void;
    mockSyncAccess.mockReturnValue(new Promise((resolve) => { finishSync = resolve; }));

    let purchaseResult!: Promise<SubscriptionAccessSnapshot | null>;
    act(() => {
      purchaseResult = result.current.purchase('monthly');
    });
    await waitFor(() => expect(result.current.actionState).toBe('purchasing'));

    await act(async () => {
      finishStore({ hasPlus: true });
      await Promise.resolve();
    });
    await waitFor(() => expect(result.current.actionState).toBe('syncing'));

    await act(async () => {
      finishSync(PLUS_ACCESS);
      await expect(purchaseResult).resolves.toEqual(PLUS_ACCESS);
    });
    expect(result.current.actionState).toBe('idle');
    expect(result.current.access).toEqual(PLUS_ACCESS);
  });

  it('keeps a locally confirmed purchase pending when the server still returns Free', async () => {
    const { result } = renderHook(() => useNoshSubscription(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isPurchasesAvailable).toBe(true));
    await waitFor(() => expect(mockSyncAccess).toHaveBeenCalled());
    mockRevenueCat.purchase.mockResolvedValue({ hasPlus: true } as never);
    mockSyncAccess.mockResolvedValue(FREE_ACCESS);

    await act(async () => {
      await expect(result.current.purchase('monthly')).resolves.toBeNull();
    });
    expect(result.current.actionState).toBe('idle');
    expect(result.current.access).toEqual(FREE_ACCESS);
    expect(result.current.error).toContain('purchase completed');
    expect(result.current.error).toContain('still updating');
  });

  it('never classifies a found restore as not found when the server still returns Free', async () => {
    const { result } = renderHook(() => useNoshSubscription(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isPurchasesAvailable).toBe(true));
    await waitFor(() => expect(mockSyncAccess).toHaveBeenCalled());
    mockRevenueCat.restore.mockResolvedValue({ hasPlus: true } as never);
    mockSyncAccess.mockResolvedValue(FREE_ACCESS);

    await act(async () => {
      await expect(result.current.restore()).rejects.toThrow(
        'purchase was found, but Nosh could not update your plan yet',
      );
    });
    expect(result.current.actionState).toBe('idle');
    expect(result.current.error).toContain('purchase was found');
  });

  it('surfaces a support error when StoreKit returns without the configured entitlement', async () => {
    const { result } = renderHook(() => useNoshSubscription(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isPurchasesAvailable).toBe(true));
    await waitFor(() => expect(mockSyncAccess).toHaveBeenCalled());
    mockSyncAccess.mockClear();
    mockRevenueCat.purchase.mockResolvedValue({ hasPlus: false } as never);

    await act(async () => {
      await expect(result.current.purchase('monthly')).rejects.toThrow(
        'Nosh Plus was not attached',
      );
    });
    expect(result.current.actionState).toBe('idle');
    expect(result.current.error).toContain('contact Nosh support');
    expect(mockSyncAccess).not.toHaveBeenCalled();
  });
});
