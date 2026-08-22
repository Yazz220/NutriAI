import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { router } from 'expo-router';
import AddPageScreen from '@/app/(book)/[cookbookId]/add';

jest.mock('expo-router', () => ({
  router: { replace: jest.fn() },
  useLocalSearchParams: () => ({ cookbookId: 'cookbook-1' }),
}));

jest.mock('@/hooks/useCookbook', () => ({
  useCookbook: () => ({ cookbook: { id: 'cookbook-1', title: 'Family Recipes' } }),
}));

jest.mock('@/components/nosh/capture/NoshCaptureWorkspace', () => {
  const ReactModule = require('react');
  const { Pressable, Text } = require('react-native');
  return {
    NoshCaptureWorkspace: ({ destinationCookbookId, onReady }: {
      destinationCookbookId: string;
      onReady: (cookbookId: string, pageId: string) => void;
    }) => ReactModule.createElement(
      Pressable,
      {
        accessibilityRole: 'button',
        accessibilityLabel: `Capture for ${destinationCookbookId}`,
        onPress: () => onReady(destinationCookbookId, 'page-1'),
      },
      ReactModule.createElement(Text, null, 'Capture workspace'),
    ),
  };
});

describe('AddPageScreen durable capture flow', () => {
  beforeEach(() => jest.clearAllMocks());

  it('uses the cookbook-scoped capture workspace and opens only after approval', () => {
    const screen = render(<AddPageScreen />);

    expect(screen.getByRole('button', { name: 'Capture for cookbook-1' })).toBeTruthy();
    expect(router.replace).not.toHaveBeenCalledWith(expect.stringContaining('pageId'));

    fireEvent.press(screen.getByRole('button', { name: 'Capture for cookbook-1' }));
    expect(router.replace).toHaveBeenCalledWith('/(book)/cookbook-1?pageId=page-1');
  });
});
