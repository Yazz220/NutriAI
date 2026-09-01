import React from 'react';
import { render } from '@testing-library/react-native';
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
    NoshCaptureWorkspace: () => mockReact.createElement(Text, null, 'Composer workspace'),
  };
});

describe('SaveRecipeScreen composer workspace', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockParams = {};
  });

  it('keeps unfinished work inside the composer workspace', () => {
    const screen = render(<SaveRecipeScreen />);

    expect(screen.getByText('Save a recipe')).toBeTruthy();
    expect(screen.getByText('Composer workspace')).toBeTruthy();
    expect(screen.queryByText(/needs attention/)).toBeNull();
    expect(screen.queryByText('Recipe activity')).toBeNull();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
