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
  it('moves through the editorial story before offering cookbook actions', () => {
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

    expect(screen.getByText('Your recipes.\nYour story.')).toBeTruthy();
    expect(screen.getByTestId('onboarding-background-1')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('Beautifully\norganized.')).toBeTruthy();
    expect(screen.getByTestId('onboarding-background-2', { includeHiddenElements: true })).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('Make it yours.')).toBeTruthy();
    expect(
      screen.getByTestId('onboarding-kitchen-backdrop', { includeHiddenElements: true }),
    ).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Make my first cookbook' }));
    fireEvent.press(screen.getByRole('button', { name: 'Look inside a sample cookbook' }));
    fireEvent.press(screen.getByRole('button', { name: 'Skip welcome and open my cookbook shelf' }));

    expect(onCreateCookbook).toHaveBeenCalledTimes(1);
    expect(onPreviewSample).toHaveBeenCalledTimes(1);
    expect(onSkip).toHaveBeenCalledTimes(1);
  });

  it('tracks a horizontal swipe as the active page', () => {
    const screen = render(
      <FirstRunWelcome
        onCreateCookbook={jest.fn()}
        onPreviewSample={jest.fn()}
        onSkip={jest.fn()}
      />,
    );

    fireEvent(screen.getByTestId('onboarding-pager'), 'momentumScrollEnd', {
      nativeEvent: { contentOffset: { x: 750, y: 0 } },
    });

    expect(screen.getByText('Beautifully\norganized.')).toBeTruthy();
  });
});
