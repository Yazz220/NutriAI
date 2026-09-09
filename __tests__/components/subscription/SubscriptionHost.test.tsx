import React from 'react';
import { Pressable, Text as NativeText } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import {
  SubscriptionHost,
  SubscriptionUiProvider,
  useSubscriptionUi,
} from '@/components/subscription/SubscriptionHost';
import type { SubscriptionAccessSnapshot } from '@/types/subscription';

const mockTrackEvent = jest.fn();
const mockPurchase = jest.fn();
const mockRestore = jest.fn();
const mockManage = jest.fn();
const mockRefresh = jest.fn();
let mockAccess: SubscriptionAccessSnapshot;

jest.mock('@/utils/analytics', () => ({
  trackEvent: (...args: unknown[]) => mockTrackEvent(...args),
}));
jest.mock('@/contexts/NoshSubscriptionContext', () => ({
  useNoshSubscription: () => ({
    access: mockAccess,
    offerings: [],
    offeringsStatus: 'ready',
    actionState: 'idle',
    error: null,
    isRefreshing: false,
    refresh: mockRefresh,
    purchase: mockPurchase,
    restore: mockRestore,
    manage: mockManage,
  }),
}));
jest.mock('@/contexts/ToastContext', () => ({
  useToast: () => ({ showToast: jest.fn() }),
}));
jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn().mockResolvedValue(undefined),
  NotificationFeedbackType: { Success: 'success' },
}));
jest.mock('@/components/subscription/SubscriptionPaywallSheet', () => {
  const mockReact = require('react');
  const { Pressable: MockPressable, Text: MockText, View } = require('react-native');
  return {
    SubscriptionPaywallSheet: ({ visible, onClose, onPurchase }: {
      visible: boolean;
      onClose: () => void;
      onPurchase: (period: 'annual') => void;
    }) => visible ? mockReact.createElement(
      View,
      null,
      mockReact.createElement(
        MockPressable,
        { accessibilityRole: 'button', accessibilityLabel: 'Dismiss paywall', onPress: onClose },
        mockReact.createElement(MockText, null, 'Dismiss paywall'),
      ),
      mockReact.createElement(
        MockPressable,
        { accessibilityRole: 'button', accessibilityLabel: 'Buy annual', onPress: () => onPurchase('annual') },
        mockReact.createElement(MockText, null, 'Buy annual'),
      ),
    ) : null,
  };
});
jest.mock('@/components/subscription/PageLimitSheet', () => ({ PageLimitSheet: () => null }));
jest.mock('@/components/subscription/SubscriptionAccessUnavailableSheet', () => ({
  SubscriptionAccessUnavailableSheet: () => null,
}));

function freeAccess(): SubscriptionAccessSnapshot {
  return {
    planId: 'free',
    planName: 'Folio Free',
    entitlementStatus: 'free',
    productId: null,
    environment: null,
    periodType: null,
    currentPeriodStartedAt: null,
    currentPeriodEndsAt: null,
    expiresAt: null,
    willRenew: false,
    features: {
      cookbooks: { limit: 2, used: 2, remaining: 0 },
      designedPages: {
        limit: 5,
        used: 5,
        remaining: 0,
        reserved: 0,
        periodStart: null,
        periodEnd: null,
      },
    },
  };
}

function plusAccess(): SubscriptionAccessSnapshot {
  return {
    ...freeAccess(),
    planId: 'plus',
    planName: 'Folio Plus',
    entitlementStatus: 'active',
    productId: 'nosh_plus_annual',
    periodType: 'annual',
    willRenew: true,
    features: {
      cookbooks: { limit: null, used: 2, remaining: null },
      designedPages: {
        limit: 20,
        used: 0,
        remaining: 20,
        reserved: 0,
        periodStart: '2026-08-31T00:00:00.000Z',
        periodEnd: '2026-09-30T00:00:00.000Z',
      },
    },
  };
}

function PageRequest() {
  const { requestPageAccess } = useSubscriptionUi();
  const [result, setResult] = React.useState('idle');
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Request page"
        onPress={() => {
          void requestPageAccess('page_capture').then((allowed) => setResult(allowed ? 'allowed' : 'blocked'));
        }}
      >
        <NativeText>Request page</NativeText>
      </Pressable>
      <NativeText>{result}</NativeText>
    </>
  );
}

function HostTree() {
  return (
    <SubscriptionUiProvider>
      <PageRequest />
      <SubscriptionHost />
    </SubscriptionUiProvider>
  );
}

function renderHost() {
  return render(<HostTree />);
}

describe('SubscriptionHost analytics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAccess = freeAccess();
    mockRefresh.mockResolvedValue(mockAccess);
    mockManage.mockResolvedValue(true);
  });

  it('records one limit, paywall view, and explicit dismissal without private content', async () => {
    const screen = renderHost();
    fireEvent.press(screen.getByRole('button', { name: 'Request page' }));
    const dismiss = await screen.findByRole('button', { name: 'Dismiss paywall' });
    await act(async () => { fireEvent.press(dismiss); });

    expect(mockTrackEvent).toHaveBeenCalledWith({
      type: 'page_or_cookbook_limit_encountered',
      data: { reason: 'page_capture', tier: 'free' },
    });
    expect(mockTrackEvent).toHaveBeenCalledWith({
      type: 'paywall_viewed',
      data: { reason: 'page_capture' },
    });
    expect(mockTrackEvent).toHaveBeenCalledWith({
      type: 'paywall_dismissed',
      data: { reason: 'page_capture' },
    });
  });

  it('records purchase outcome with period and reason, never a raw price', async () => {
    mockPurchase.mockResolvedValueOnce(plusAccess());
    const screen = renderHost();
    fireEvent.press(screen.getByRole('button', { name: 'Request page' }));
    const buy = await screen.findByRole('button', { name: 'Buy annual' });
    await act(async () => { fireEvent.press(buy); });

    await waitFor(() => expect(mockTrackEvent).toHaveBeenCalledWith({
      type: 'purchase_succeeded',
      data: { billingPeriod: 'annual', reason: 'page_capture' },
    }));
    expect(mockTrackEvent).toHaveBeenCalledWith({
      type: 'purchase_started',
      data: { billingPeriod: 'annual', reason: 'page_capture' },
    });
    expect(JSON.stringify(mockTrackEvent.mock.calls)).not.toContain('price');
  });

  it('records a StoreKit cancellation without treating it as a purchase failure', async () => {
    const cancellation = new Error('The purchase was cancelled.');
    cancellation.name = 'RevenueCatPurchaseCancelledError';
    mockPurchase.mockRejectedValueOnce(cancellation);
    const screen = renderHost();
    fireEvent.press(screen.getByRole('button', { name: 'Request page' }));
    const buy = await screen.findByRole('button', { name: 'Buy annual' });
    await act(async () => { fireEvent.press(buy); });

    expect(mockTrackEvent).toHaveBeenCalledWith({
      type: 'purchase_cancelled',
      data: { billingPeriod: 'annual', reason: 'page_capture' },
    });
    expect(mockTrackEvent).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'purchase_failed' }));
    expect(screen.getByRole('button', { name: 'Dismiss paywall' })).toBeTruthy();
  });

  it('resumes a blocked action when an authoritative Plus update arrives later', async () => {
    const screen = renderHost();
    fireEvent.press(screen.getByRole('button', { name: 'Request page' }));
    expect(await screen.findByRole('button', { name: 'Dismiss paywall' })).toBeTruthy();

    mockAccess = plusAccess();
    mockRefresh.mockResolvedValue(mockAccess);
    screen.rerender(<HostTree />);

    expect(await screen.findByText('allowed')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Dismiss paywall' })).toBeNull();
  });
});
