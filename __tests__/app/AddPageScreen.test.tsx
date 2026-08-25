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
  const { Text } = require('react-native');
  return {
    NoshCaptureWorkspace: ({ destinationCookbookId, activityVisible }: {
      destinationCookbookId: string;
      activityVisible?: boolean;
    }) => ReactModule.createElement(
      Text,
      {
        accessibilityLabel: `Capture for ${destinationCookbookId}`,
        accessibilityHint: activityVisible ? 'Activity visible' : 'Composer only',
      },
      ReactModule.createElement(Text, null, 'Capture workspace'),
    ),
  };
});

describe('AddPageScreen durable capture flow', () => {
  beforeEach(() => jest.clearAllMocks());

  it('uses the cookbook-scoped capture workspace without a blocking approval callback', () => {
    const screen = render(<AddPageScreen />);

    expect(screen.getByLabelText('Capture for cookbook-1').props.accessibilityHint).toBe('Composer only');
    expect(router.replace).not.toHaveBeenCalled();

    fireEvent.press(screen.getByLabelText('Back to cookbook'));
    expect(router.replace).toHaveBeenCalledWith('/(book)/cookbook-1');
  });
});
