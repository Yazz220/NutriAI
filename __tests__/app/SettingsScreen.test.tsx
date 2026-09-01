import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import SettingsScreen from '@/app/(book)/settings';

const mockReplace = jest.fn();
const mockSignOut = jest.fn();
const mockQueryClear = jest.fn();
const mockPurgeLocalUserData = jest.fn();
const mockLoadCookingPreferences = jest.fn();
const mockManageSubscription = jest.fn();
const mockTrackEvent = jest.fn();
let mockSubscriptionAccess: null | {
  planId: 'plus';
  entitlementStatus: 'active' | 'cancelled';
  willRenew: boolean;
} = null;

jest.mock('expo-router', () => ({ router: { replace: mockReplace } }));
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { version: '1.2.3', ios: { buildNumber: '9' } } },
}));
jest.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ clear: mockQueryClear }),
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 47, right: 0, bottom: 34, left: 0 }),
}));
jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'user-1', email: 'cook@nosh.app' },
    signOut: mockSignOut,
  }),
}));
jest.mock('@/hooks/useCookbooks', () => ({
  useCookbooks: () => ({ cookbooks: [{ id: 'book-1', title: 'Weeknight Table' }] }),
}));
jest.mock('@/contexts/AiDataConsentContext', () => ({
  useAiDataConsent: () => ({ isGranted: true, isReady: true, reviewConsent: jest.fn() }),
}));
jest.mock('@/contexts/NoshConversationContext', () => ({
  useNoshConversation: () => ({ open: jest.fn() }),
}));
jest.mock('@/contexts/NoshSubscriptionContext', () => ({
  useNoshSubscription: () => ({
    access: mockSubscriptionAccess,
    manage: mockManageSubscription,
  }),
}));
jest.mock('@/utils/accountCleanup', () => ({
  purgeLocalUserData: (...args: unknown[]) => mockPurgeLocalUserData(...args),
}));
jest.mock('@/utils/analytics', () => ({
  trackEvent: (...args: unknown[]) => mockTrackEvent(...args),
}));
jest.mock('@/utils/account', () => ({ deleteAccount: jest.fn() }));
jest.mock('@/utils/appleAuth', () => ({
  getAppleDeletionAuthorizationCode: jest.fn(),
  isAppleCancellation: jest.fn(() => false),
}));
jest.mock('@/utils/cookbook/cookingPreferences', () => ({
  loadCookingPreferences: (...args: unknown[]) => mockLoadCookingPreferences(...args),
  saveCookingPreference: jest.fn(),
}));
jest.mock('@/components/navigation/LibraryBackButton', () => ({
  LibraryBackButton: () => null,
}));
jest.mock('@/components/brand/NoshBrandAssets', () => {
  const mockReact = require('react');
  const { View: MockView } = require('react-native');
  return { NoshSymbol: () => mockReact.createElement(MockView, { testID: 'nosh-symbol' }) };
});
jest.mock('@/components/settings/CookingPreferencesSheet', () => ({
  CookingPreferencesSheet: () => null,
}));
jest.mock('@/components/subscription/SubscriptionPlanCard', () => {
  const mockReact = require('react');
  const { Text: MockText } = require('react-native');
  return { SubscriptionPlanCard: () => mockReact.createElement(MockText, null, 'Folio Free plan') };
});

describe('SettingsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSignOut.mockResolvedValue(undefined);
    mockPurgeLocalUserData.mockResolvedValue({ complete: true, failed: [] });
    mockManageSubscription.mockResolvedValue(true);
    mockSubscriptionAccess = null;
    mockLoadCookingPreferences.mockResolvedValue([
      {
        id: 'preference-1',
        key: 'measurement_system',
        value: 'metric',
        updatedAt: '2026-08-31T00:00:00.000Z',
      },
    ]);
  });

  it('shows purposeful user controls and branded Folio entries', async () => {
    const screen = render(<SettingsScreen />);

    expect(screen.getByText('Email')).toBeTruthy();
    expect(screen.getByText('Folio Free plan')).toBeTruthy();
    expect(screen.getByText('Cookbooks')).toBeTruthy();
    await screen.findByRole('button', { name: 'Cooking preferences, 1 saved' });
    expect(screen.getByRole('button', { name: 'AI data use, Allowed on this device' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Terms of use' })).toBeTruthy();
    expect(screen.getAllByTestId('nosh-symbol', { includeHiddenElements: true })).toHaveLength(1);
    expect(screen.getByText('Folio v1.2.3')).toBeTruthy();
  });

  it('warns active Plus members that account deletion does not cancel App Store billing', async () => {
    mockSubscriptionAccess = {
      planId: 'plus',
      entitlementStatus: 'cancelled',
      willRenew: false,
    };
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const screen = render(<SettingsScreen />);

    fireEvent.press(screen.getByRole('button', { name: 'Delete account' }));

    const [, message, buttons] = alert.mock.calls[0];
    expect(message).toContain('does not cancel or refund an App Store subscription');
    expect(buttons?.map((button) => button.text)).toEqual([
      'Cancel',
      'Manage subscription',
      'Delete account',
    ]);

    await act(async () => {
      buttons?.[1]?.onPress?.();
    });
    expect(mockManageSubscription).toHaveBeenCalledTimes(1);
    alert.mockRestore();
  });

  it('purges user-scoped device data before signing out', async () => {
    const screen = render(<SettingsScreen />);

    fireEvent.press(screen.getByRole('button', { name: 'Sign out' }));

    await waitFor(() => {
      expect(mockPurgeLocalUserData).toHaveBeenCalledWith({
        userId: 'user-1',
        cookbookIds: ['book-1'],
      });
      expect(mockQueryClear).toHaveBeenCalled();
      expect(mockSignOut).toHaveBeenCalled();
    });
  });
});
