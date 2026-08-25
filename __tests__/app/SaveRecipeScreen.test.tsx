import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import SaveRecipeScreen from '@/app/(book)/save';

const mockReplace = jest.fn();
let mockParams: { captureId?: string } = {};

jest.mock('expo-router', () => ({
  router: { replace: (...args: unknown[]) => mockReplace(...args) },
  useLocalSearchParams: () => mockParams,
}));

jest.mock('expo-linear-gradient', () => {
  const mockReact = require('react');
  const { View } = require('react-native');
  return {
    LinearGradient: ({ children, ...props }: { children: React.ReactNode }) => (
      mockReact.createElement(View, props, children)
    ),
  };
});

jest.mock('@/components/nosh/capture/NoshCaptureWorkspace', () => {
  const mockReact = require('react');
  const { Text } = require('react-native');
  return {
    NoshCaptureWorkspace: ({
      activityVisible,
      onActivitySummaryChange,
    }: {
      activityVisible?: boolean;
      onActivitySummaryChange?: (summary: { pendingCount: number; attentionCount: number }) => void;
    }) => {
      mockReact.useEffect(() => {
        onActivitySummaryChange?.({ pendingCount: 2, attentionCount: 1 });
      }, [onActivitySummaryChange]);
      return mockReact.createElement(
        Text,
        null,
        activityVisible ? 'Activity workspace' : 'Composer workspace',
      );
    },
  };
});

describe('SaveRecipeScreen activity navigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockParams = {};
  });

  it('opens on the composer and reveals history from the header', () => {
    const screen = render(<SaveRecipeScreen />);

    expect(screen.getByText('Save a recipe')).toBeTruthy();
    expect(screen.getByText('Composer workspace')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', {
      name: '2 recipe items active, 1 needs attention',
    }));

    expect(screen.getByText('Recipe activity')).toBeTruthy();
    expect(screen.getByText('Activity workspace')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Save another recipe' })).toBeTruthy();
  });
});
