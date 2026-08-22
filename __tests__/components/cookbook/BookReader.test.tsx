import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import { BookReader } from '@/components/cookbook/BookReader';
import { NoshConversationProvider } from '@/contexts/NoshConversationContext';
import { SAMPLE_COOKBOOK, SAMPLE_COOKBOOK_PAGES } from '@/utils/cookbook/sampleCookbook';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), dismissTo: jest.fn() },
  useFocusEffect: (cb: () => void) => cb(),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 47, right: 0, bottom: 34, left: 0 }),
}));

jest.mock('@/components/cookbook/NoshAssistantChat', () => ({
  NoshAssistantChatButton: () => null,
}));

jest.mock('@/components/cookbook/Cookbook3DScene', () => {
  const ReactModule = require('react');
  const { Pressable, Text } = require('react-native');
  return {
    Cookbook3DScene: ({
      isOpen,
      onOpen,
      pages,
      onOpenRecipe,
    }: {
      isOpen: boolean;
      onOpen: () => void;
      pages: unknown[];
      onOpenRecipe: (page: unknown) => void;
    }) =>
      ReactModule.createElement(
        ReactModule.Fragment,
        null,
        ReactModule.createElement(
          Pressable,
          {
            accessibilityRole: 'button',
            accessibilityLabel: 'Open cookbook cover',
            onPress: onOpen,
          },
          ReactModule.createElement(Text, null, isOpen ? 'Cookbook open' : 'Cookbook closed'),
        ),
        ReactModule.createElement(
          Pressable,
          {
            accessibilityRole: 'button',
            accessibilityLabel: 'Open focused recipe',
            onPress: () => onOpenRecipe(pages[0]),
          },
          ReactModule.createElement(Text, null, 'Recipe spread'),
        ),
      ),
  };
});

describe('BookReader cover entry', () => {
  it('shows the closed cover briefly, then opens it once on shelf entry', () => {
    jest.useFakeTimers();
    const screen = render(
      <NoshConversationProvider>
        <BookReader
          cookbook={SAMPLE_COOKBOOK}
          pages={SAMPLE_COOKBOOK_PAGES}
          onSelectPage={jest.fn()}
          onShare={jest.fn()}
        />
      </NoshConversationProvider>,
    );

    expect(screen.getByText('Cookbook closed')).toBeTruthy();
    act(() => jest.runAllTimers());
    expect(screen.getByText('Cookbook open')).toBeTruthy();
    jest.useRealTimers();
  });

  it('returns to the existing shelf screen instead of replacing it', () => {
    const { router } = require('expo-router');
    const screen = render(
      <NoshConversationProvider>
        <BookReader
          cookbook={SAMPLE_COOKBOOK}
          pages={SAMPLE_COOKBOOK_PAGES}
          onSelectPage={jest.fn()}
          onShare={jest.fn()}
        />
      </NoshConversationProvider>,
    );

    fireEvent.press(screen.getByRole('button', { name: 'Back to my collection' }));
    expect(router.dismissTo).toHaveBeenCalledWith('/(book)');
  });
});

describe('BookReader focused recipe', () => {
  it('keeps clear return controls available and returns to the open cookbook', () => {
    const screen = render(
      <NoshConversationProvider>
        <BookReader
          cookbook={SAMPLE_COOKBOOK}
          pages={SAMPLE_COOKBOOK_PAGES}
          initialPageId={SAMPLE_COOKBOOK_PAGES[0].id}
          onSelectPage={jest.fn()}
          onShare={jest.fn()}
        />
      </NoshConversationProvider>,
    );

    fireEvent.press(screen.getByRole('button', { name: 'Open focused recipe' }));

    expect(screen.getByRole('button', { name: 'Return to open cookbook' })).toBeTruthy();
    const bottomReturn = screen.getByRole('button', { name: 'Back to open cookbook' });
    expect(bottomReturn).toBeTruthy();

    fireEvent.press(bottomReturn);
    expect(screen.queryByRole('button', { name: 'Back to open cookbook' })).toBeNull();
    expect(screen.getByText('Recipe spread')).toBeTruthy();
  });
});
