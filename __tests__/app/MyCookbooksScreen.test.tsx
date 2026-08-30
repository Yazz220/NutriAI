import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import MyCookbooksScreen from '@/app/(book)/index';

const mockDeleteCookbook = jest.fn();
const mockUpdateCookbookTitle = jest.fn();
let mockCookbooks: Array<{ id: string; title: string; pageCount: number }> = [];

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));
jest.mock('@/hooks/useCookbooks', () => ({
  useCookbooks: () => ({
    cookbooks: mockCookbooks,
    isLoading: false,
    isShelfStale: false,
    shelfError: null,
    refresh: jest.fn(),
    deleteCookbook: mockDeleteCookbook,
    updateCookbookTitle: mockUpdateCookbookTitle,
  }),
}));
jest.mock('@/contexts/NoshNativeShareContext', () => ({
  useNoshNativeShare: () => ({ receipt: { status: 'idle' } }),
}));
jest.mock('@/components/shelf/ShelfScene', () => {
  const mockReact = require('react');
  const { Pressable: MockPressable, Text: MockText } = require('react-native');
  return {
    ShelfScene: (props: {
      cookbooks: Array<{ id: string; title: string }>;
      onOpenCookbookActions: (cookbook: { id: string; title: string }) => void;
      onContextAction: (cookbook: { id: string; title: string }, actionId: string) => void;
    }) => {
      const cookbook = props.cookbooks[0];
      return mockReact.createElement(
        mockReact.Fragment,
        null,
        mockReact.createElement(
          MockPressable,
          { accessibilityRole: 'button', accessibilityLabel: 'Create a new cookbook' },
          mockReact.createElement(MockText, null, 'Shelf'),
        ),
        cookbook
          ? mockReact.createElement(
              MockPressable,
              {
                accessibilityRole: 'button',
                accessibilityLabel: `Actions for ${cookbook.title}`,
                onPress: () => props.onOpenCookbookActions(cookbook),
              },
              mockReact.createElement(MockText, null, 'Actions'),
            )
          : null,
        cookbook
          ? mockReact.createElement(
              MockPressable,
              {
                accessibilityRole: 'button',
                accessibilityLabel: `Delete ${cookbook.title} from shelf menu`,
                onPress: () => props.onContextAction(cookbook, 'delete_cookbook'),
              },
              mockReact.createElement(MockText, null, 'Delete'),
            )
          : null,
      );
    },
  };
});
jest.mock('@/components/cookbook/NoshAssistantChat', () => {
  const mockReact = require('react');
  const { Pressable: MockPressable } = require('react-native');
  return {
    NoshShelfChatButton: () =>
      mockReact.createElement(MockPressable, {
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
  beforeEach(() => {
    mockCookbooks = [];
    mockDeleteCookbook.mockReset().mockResolvedValue(undefined);
    mockUpdateCookbookTitle.mockReset().mockResolvedValue(undefined);
  });

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

  it('opens cookbook management from the shelf and saves a new title', async () => {
    mockCookbooks = [{ id: 'book-1', title: 'Weeknight Table', pageCount: 6 }];
    const screen = render(<MyCookbooksScreen />);

    fireEvent.press(await screen.findByRole('button', { name: 'Actions for Weeknight Table' }));
    fireEvent.changeText(screen.getByLabelText('Book name'), 'Weeknight Favorites');
    fireEvent.press(screen.getByRole('button', { name: 'Save cookbook name' }));

    await waitFor(() => {
      expect(mockUpdateCookbookTitle).toHaveBeenCalledWith({
        cookbookId: 'book-1',
        title: 'Weeknight Favorites',
      });
    });
  });

  it('keeps shelf deletion behind native destructive confirmation', async () => {
    mockCookbooks = [{ id: 'book-1', title: 'Weeknight Table', pageCount: 6 }];
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const screen = render(<MyCookbooksScreen />);

    fireEvent.press(await screen.findByRole('button', { name: 'Delete Weeknight Table from shelf menu' }));
    const confirmationButtons = alert.mock.calls[0]?.[2];
    const deleteButton = confirmationButtons?.find((button) => button.style === 'destructive');
    await act(async () => {
      deleteButton?.onPress?.();
    });

    expect(alert).toHaveBeenCalledWith(
      'Delete cookbook?',
      expect.stringContaining('Weeknight Table'),
      expect.any(Array),
    );
    expect(mockDeleteCookbook).toHaveBeenCalledWith('book-1');
    alert.mockRestore();
  });
});
