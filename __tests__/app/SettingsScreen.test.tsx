import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import SettingsScreen from '@/app/(book)/settings';

const mockReplace = jest.fn();
const mockSignOut = jest.fn();
const mockQueryClear = jest.fn();
const mockPurgeLocalUserData = jest.fn();
const mockLoadCookingPreferences = jest.fn();

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
jest.mock('@/utils/accountCleanup', () => ({
  purgeLocalUserData: (...args: unknown[]) => mockPurgeLocalUserData(...args),
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

describe('SettingsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSignOut.mockResolvedValue(undefined);
    mockPurgeLocalUserData.mockResolvedValue({ complete: true, failed: [] });
    mockLoadCookingPreferences.mockResolvedValue([
      {
        id: 'preference-1',
        key: 'measurement_system',
        value: 'metric',
        updatedAt: '2026-08-31T00:00:00.000Z',
      },
    ]);
  });

  it('shows purposeful user controls and branded Nosh entries', async () => {
    const screen = render(<SettingsScreen />);

    expect(screen.getByText('Email')).toBeTruthy();
    expect(screen.getByText('Cookbooks')).toBeTruthy();
    await screen.findByRole('button', { name: 'Cooking preferences, 1 saved' });
    expect(screen.getByRole('button', { name: 'AI data use, Allowed on this device' })).toBeTruthy();
    expect(screen.getAllByTestId('nosh-symbol', { includeHiddenElements: true })).toHaveLength(1);
    expect(screen.getByText('Nosh v1.2.3')).toBeTruthy();
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
