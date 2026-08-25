import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { FirstRunWelcome } from '@/components/onboarding/FirstRunWelcome';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 47, right: 0, bottom: 34, left: 0 }),
}));

jest.mock('@/components/physical-book/PhysicalBook', () => {
  const ReactModule = require('react');
  const { Text } = require('react-native');
  return {
    PhysicalBook: ({ title }: { title: string }) => ReactModule.createElement(Text, null, title),
  };
});

describe('FirstRunWelcome', () => {
  it('offers create, sample, and skip paths without trapping the user', () => {
    const onCreateCookbook = jest.fn();
    const onPreviewSample = jest.fn();
    const onSkip = jest.fn();
    const screen = render(
      <FirstRunWelcome
        onCreateCookbook={onCreateCookbook}
        onPreviewSample={onPreviewSample}
        onSkip={onSkip}
      />,
    );

    fireEvent.press(screen.getByRole('button', { name: 'Make my first cookbook' }));
    fireEvent.press(screen.getByRole('button', { name: 'Look inside a sample cookbook' }));
    fireEvent.press(screen.getByRole('button', { name: 'Skip welcome and open my cookbook shelf' }));

    expect(onCreateCookbook).toHaveBeenCalledTimes(1);
    expect(onPreviewSample).toHaveBeenCalledTimes(1);
    expect(onSkip).toHaveBeenCalledTimes(1);
  });
});
