import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import MyCookbooksScreen from '@/app/(book)/index';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));
jest.mock('@/hooks/useCookbooks', () => ({
  useCookbooks: () => ({
    cookbooks: [],
    isLoading: false,
    isShelfStale: false,
    shelfError: null,
    refresh: jest.fn(),
  }),
}));
jest.mock('@/contexts/NoshNativeShareContext', () => ({
  useNoshNativeShare: () => ({ receipt: { status: 'idle' } }),
}));
jest.mock('@/components/shelf/ShelfScene', () => {
  const mockReact = require('react');
  const { Pressable: MockPressable, Text: MockText } = require('react-native');
  return {
    ShelfScene: () => mockReact.createElement(
      MockPressable,
      { accessibilityRole: 'button', accessibilityLabel: 'Create a new cookbook' },
      mockReact.createElement(MockText, null, 'Empty shelf'),
    ),
  };
});
jest.mock('@/components/cookbook/NoshAssistantChat', () => {
  const mockReact = require('react');
  const { Pressable: MockPressable } = require('react-native');
  return {
    NoshShelfChatButton: () => mockReact.createElement(MockPressable, {
      accessibilityRole: 'button',
      accessibilityLabel: 'Ask Nosh about your cookbooks',
    }),
  };
});
jest.mock('@/components/physical-book/PhysicalBook', () => ({
  PhysicalBook: () => null,
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 47, right: 0, bottom: 34, left: 0 }),
}));

describe('MyCookbooksScreen first-run accessibility', () => {
  it('hides every shelf control while the modal welcome is present', async () => {
    const screen = render(<MyCookbooksScreen />);

    await screen.findByTestId('first-run-welcome');
    const shelf = screen.getByTestId('cookbook-shelf-content', { includeHiddenElements: true });

    await waitFor(() => {
      expect(shelf.props.pointerEvents).toBe('none');
      expect(shelf.props.accessibilityElementsHidden).toBe(true);
      expect(shelf.props.importantForAccessibility).toBe('no-hide-descendants');
      expect(screen.queryByRole('button', { name: 'Create a new cookbook' })).toBeNull();
      expect(screen.queryByRole('button', { name: 'Ask Nosh about your cookbooks' })).toBeNull();
      expect(screen.queryByRole('button', { name: 'Save a recipe with Nosh' })).toBeNull();
    });
  });
});
