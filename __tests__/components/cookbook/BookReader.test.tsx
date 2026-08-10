import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { BookReader } from '@/components/cookbook/BookReader';
import { SAMPLE_COOKBOOK, SAMPLE_COOKBOOK_PAGES } from '@/utils/cookbook/sampleCookbook';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn() },
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 47, right: 0, bottom: 34, left: 0 }),
}));

jest.mock('@/components/cookbook/AddPageSheet', () => ({ AddPageSheet: () => null }));
jest.mock('@/components/cookbook/NoshAssistantButton', () => ({ NoshAssistantButton: () => null }));

jest.mock('@/components/cookbook/Cookbook3DScene', () => {
  const ReactModule = require('react');
  const { Pressable, Text } = require('react-native');
  return {
    Cookbook3DScene: ({
      pages,
      onOpenRecipe,
    }: {
      pages: unknown[];
      onOpenRecipe: (page: unknown) => void;
    }) =>
      ReactModule.createElement(
        Pressable,
        {
          accessibilityRole: 'button',
          accessibilityLabel: 'Open focused recipe',
          onPress: () => onOpenRecipe(pages[0]),
        },
        ReactModule.createElement(Text, null, 'Recipe spread'),
      ),
  };
});

describe('BookReader focused recipe', () => {
  it('keeps clear return controls available and returns to the open cookbook', () => {
    const screen = render(
      <BookReader
        cookbook={SAMPLE_COOKBOOK}
        pages={SAMPLE_COOKBOOK_PAGES}
        initialPageId={SAMPLE_COOKBOOK_PAGES[0].id}
        onSelectPage={jest.fn()}
        onShare={jest.fn()}
      />,
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
