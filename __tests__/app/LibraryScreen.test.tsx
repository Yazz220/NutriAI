import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import LibraryScreen from '@/app/(book)/library';
import { CookbookLimitReachedError } from '@/utils/cookbook/api';

const mockReplace = jest.fn();
const mockBack = jest.fn();
const mockCreateCookbook = jest.fn();
const mockUpdateCookbookAppearance = jest.fn();
const mockRequestCookbookAccess = jest.fn();
const mockRefreshSubscription = jest.fn().mockResolvedValue(null);
let mockParams: Record<string, string> = {};
let mockCookbooks: Array<Record<string, unknown>> = [];

jest.mock('expo-router', () => ({
  router: {
    back: (...args: unknown[]) => mockBack(...args),
    canGoBack: () => true,
    push: jest.fn(),
    replace: (...args: unknown[]) => mockReplace(...args),
  },
  useLocalSearchParams: () => mockParams,
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 47, right: 0, bottom: 34, left: 0 }),
}));
jest.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'user-1' } }) }));
jest.mock('@/hooks/useCookbooks', () => ({
  useCookbooks: () => ({
    cookbooks: mockCookbooks,
    isLoading: false,
    createCookbook: mockCreateCookbook,
    updateCookbookAppearance: mockUpdateCookbookAppearance,
  }),
}));
jest.mock('@/hooks/useRecipeCaptures', () => ({
  useRecipeCaptures: () => ({ prepareDestination: jest.fn() }),
}));
jest.mock('@/hooks/useShelfAppearance', () => ({
  useShelfAppearance: () => ({
    scene: { shelfStyleId: 'light-oak', wallpaperStyleId: 'linen' },
    setShelfStyleId: jest.fn(),
    setWallpaperStyleId: jest.fn(),
  }),
}));
jest.mock('@/components/subscription/SubscriptionHost', () => ({
  useSubscriptionUi: () => ({ requestCookbookAccess: mockRequestCookbookAccess }),
}));
jest.mock('@/contexts/NoshSubscriptionContext', () => ({
  useNoshSubscription: () => ({ refresh: mockRefreshSubscription }),
}));
jest.mock('@/utils/cookbook/api', () => {
  class MockCookbookLimitReachedError extends Error {
    readonly code = 'cookbook_limit_reached';
  }
  return { CookbookLimitReachedError: MockCookbookLimitReachedError };
});
jest.mock('@/utils/cookbook/firstRunOnboarding', () => ({
  recordFirstCookbookCreated: jest.fn(),
}));
jest.mock('@/utils/analytics', () => ({ trackEvent: jest.fn() }));
jest.mock('@/components/brand/NoshBrandAssets', () => {
  const mockReact = require('react');
  const { View } = require('react-native');
  return { FolioHorizontalLockup: () => mockReact.createElement(View) };
});
jest.mock('@/components/create/CreationStudio', () => {
  const mockReact = require('react');
  const { Pressable, Text } = require('react-native');
  return {
    CreationStudio: ({ mode, initialDetails, onCreateBook, onSaveBook }: {
      mode?: string;
      initialDetails?: { title: string };
      onCreateBook?: (details: {
        title: string;
        coverFinishId: string;
        coverColorId: string;
        coverTitleColorId: string;
        coverTitlePlacementId: string;
        pageStyleId: string;
      }) => Promise<void | boolean>;
      onSaveBook?: (details: {
        title: string;
        coverFinishId: string;
        coverColorId: string;
        coverTitleColorId: string;
        coverTitlePlacementId: string;
        pageStyleId: string;
      }) => Promise<void | boolean>;
    }) => mockReact.createElement(
      Pressable,
      {
        accessibilityRole: 'button',
        accessibilityLabel: mode === 'edit' ? `Edit ${initialDetails?.title}` : 'Create test cookbook',
        onPress: () => (mode === 'edit' ? onSaveBook : onCreateBook)?.({
          title: mode === 'edit' ? 'Weeknight Favorites' : 'Weeknight Table',
          coverFinishId: 'fine-cloth',
          coverColorId: mode === 'edit' ? 'clay' : 'sage',
          coverTitleColorId: 'gilt',
          coverTitlePlacementId: 'lower',
          pageStyleId: 'botanical-sketchbook',
        }),
      },
      mockReact.createElement(Text, null, 'Create'),
    ),
  };
});

describe('Library subscription enforcement', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockParams = {};
    mockCookbooks = [];
    mockRefreshSubscription.mockResolvedValue(null);
    mockUpdateCookbookAppearance.mockResolvedValue(undefined);
  });

  it('rechecks the plan and keeps the studio intact when the server reports a cookbook race', async () => {
    mockRequestCookbookAccess
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);
    mockCreateCookbook.mockRejectedValueOnce(new CookbookLimitReachedError());
    const screen = render(<LibraryScreen />);

    fireEvent.press(screen.getByRole('button', { name: 'Create test cookbook' }));

    await waitFor(() => {
      expect(mockRequestCookbookAccess).toHaveBeenNthCalledWith(1);
      expect(mockRequestCookbookAccess).toHaveBeenNthCalledWith(2, { refresh: true });
    });
    expect(mockCreateCookbook).toHaveBeenCalledTimes(1);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('retries cookbook creation once after an entitlement succeeds', async () => {
    mockRequestCookbookAccess.mockResolvedValue(true);
    mockCreateCookbook
      .mockRejectedValueOnce(new CookbookLimitReachedError())
      .mockResolvedValueOnce({ id: 'book-2' });
    const screen = render(<LibraryScreen />);

    fireEvent.press(screen.getByRole('button', { name: 'Create test cookbook' }));

    await waitFor(() => {
      expect(mockCreateCookbook).toHaveBeenCalledTimes(2);
      expect(mockReplace).toHaveBeenCalledWith('/(book)/book-2');
    });
    expect(mockRefreshSubscription).toHaveBeenCalledTimes(1);
  });

  it('edits an existing cookbook without running creation access checks', async () => {
    mockParams = { cookbookId: 'book-1' };
    mockCookbooks = [{
      id: 'book-1',
      title: 'Weeknight Table',
      coverFinishId: 'natural-linen',
      coverColorId: 'sage',
      coverTitleColorId: 'ivory',
      coverTitlePlacementId: 'center',
      pageStyleId: 'studio',
    }];
    const screen = render(<LibraryScreen />);

    fireEvent.press(screen.getByRole('button', { name: 'Edit Weeknight Table' }));

    await waitFor(() => {
      expect(mockUpdateCookbookAppearance).toHaveBeenCalledWith({
        cookbookId: 'book-1',
        details: {
          title: 'Weeknight Favorites',
          coverFinishId: 'fine-cloth',
          coverColorId: 'clay',
          coverTitleColorId: 'gilt',
          coverTitlePlacementId: 'lower',
        },
      });
      expect(mockBack).toHaveBeenCalledTimes(1);
    });
    expect(mockRequestCookbookAccess).not.toHaveBeenCalled();
  });
});
