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
    NoshCaptureWorkspace: ({
      destinationCookbookId,
      activityVisible,
      onActivitySummaryChange,
    }: {
      destinationCookbookId: string;
      activityVisible?: boolean;
      onActivitySummaryChange?: (summary: { pendingCount: number; attentionCount: number }) => void;
    }) => {
      ReactModule.useEffect(() => {
        onActivitySummaryChange?.({ pendingCount: 2, attentionCount: 1 });
      }, [onActivitySummaryChange]);
      return ReactModule.createElement(
        Text,
        {
          accessibilityLabel: `Capture for ${destinationCookbookId}`,
          accessibilityHint: activityVisible ? 'Activity visible' : 'Composer only',
        },
        activityVisible ? 'Activity workspace' : 'Composer workspace',
      );
    },
  };
});

describe('AddPageScreen durable capture flow', () => {
  beforeEach(() => jest.clearAllMocks());

  it('keeps cookbook capture and activity on separate views', () => {
    const screen = render(<AddPageScreen />);

    expect(screen.getByLabelText('Capture for cookbook-1').props.accessibilityHint).toBe('Composer only');
    expect(screen.getByText('Save a recipe')).toBeTruthy();
    expect(screen.getByText('Composer workspace')).toBeTruthy();
    expect(screen.getByText('1 page needs attention')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', {
      name: '2 recipe items active, 1 needs attention',
    }));

    expect(screen.getByText('Recipe activity')).toBeTruthy();
    expect(screen.getByText('Activity workspace')).toBeTruthy();
    expect(router.replace).not.toHaveBeenCalled();

    fireEvent.press(screen.getByLabelText('Back to save a recipe'));
    expect(screen.getByText('Composer workspace')).toBeTruthy();
    expect(router.replace).not.toHaveBeenCalled();

    fireEvent.press(screen.getByLabelText('Back to cookbook'));
    expect(router.replace).toHaveBeenCalledWith('/(book)/cookbook-1');
  });
});
