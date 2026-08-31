import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { SubscriptionPlanCard } from '@/components/subscription/SubscriptionPlanCard';
import type { SubscriptionAccessSnapshot } from '@/types/subscription';

const mockOpenPaywall = jest.fn();
const mockManage = jest.fn().mockResolvedValue(true);
const mockRestore = jest.fn();
const mockRefresh = jest.fn();
let mockAccess: SubscriptionAccessSnapshot | null = null;

jest.mock('@/components/subscription/SubscriptionHost', () => ({
  useSubscriptionUi: () => ({ openPaywall: mockOpenPaywall }),
}));
jest.mock('@/contexts/NoshSubscriptionContext', () => ({
  useNoshSubscription: () => ({
    access: mockAccess,
    isLoading: false,
    isRefreshing: false,
    error: null,
    manage: mockManage,
    restore: mockRestore,
    refresh: mockRefresh,
  }),
}));
jest.mock('@/contexts/ToastContext', () => ({
  useToast: () => ({ showToast: jest.fn() }),
}));
jest.mock('@/components/brand/NoshBrandAssets', () => {
  const mockReact = require('react');
  const { View } = require('react-native');
  return { NoshSymbol: () => mockReact.createElement(View, { testID: 'nosh-symbol' }) };
});

function access(overrides: Partial<SubscriptionAccessSnapshot> = {}): SubscriptionAccessSnapshot {
  return {
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
      cookbooks: { limit: 2, used: 1, remaining: 1 },
      designedPages: {
        limit: 5,
        used: 2,
        remaining: 3,
        reserved: 0,
        periodStart: null,
        periodEnd: null,
      },
    },
    ...overrides,
  };
}

describe('SubscriptionPlanCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockManage.mockResolvedValue(true);
  });

  it('keeps cancelled subscribers on Plus through their paid expiration date', () => {
    mockAccess = access({
      planId: 'plus',
      planName: 'Nosh Plus',
      entitlementStatus: 'cancelled',
      expiresAt: '2026-09-30T12:00:00.000Z',
      currentPeriodEndsAt: '2026-09-30T12:00:00.000Z',
      features: {
        cookbooks: { limit: null, used: 4, remaining: null },
        designedPages: {
          limit: 20,
          used: 8,
          remaining: 12,
          reserved: 0,
          periodStart: '2026-08-31T00:00:00.000Z',
          periodEnd: '2026-09-30T00:00:00.000Z',
        },
      },
    });

    const screen = render(<SubscriptionPlanCard />);

    expect(screen.getByText('Nosh Plus')).toBeTruthy();
    expect(screen.getByText('Unlimited cookbooks')).toBeTruthy();
    expect(screen.getByText(/^Ends /)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Manage subscription' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Upgrade to Nosh Plus' })).toBeNull();
  });

  it('offers one clear upgrade from Free without threatening existing recipes', () => {
    mockAccess = access();
    const screen = render(<SubscriptionPlanCard />);

    expect(screen.getByText('3 page creations left')).toBeTruthy();
    expect(screen.getByText('1 of 2 cookbooks used')).toBeTruthy();
    expect(screen.getByText('Every recipe and page you already created stays in your cookbooks.')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Upgrade to Nosh Plus' }));
    expect(mockOpenPaywall).toHaveBeenCalledWith('settings');
  });
});
