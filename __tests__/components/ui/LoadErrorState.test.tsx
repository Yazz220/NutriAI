import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { LoadErrorState } from '@/components/ui/LoadErrorState';

describe('LoadErrorState', () => {
  it('explains the failure and retries on request', () => {
    const onRetry = jest.fn();
    const screen = render(
      <LoadErrorState
        title="Could not open your cookbooks"
        message="Your cookbooks are still safe. Check your connection and try again."
        onRetry={onRetry}
      />,
    );

    expect(screen.getByText('Could not open your cookbooks')).toBeTruthy();
    expect(screen.getByText('Your cookbooks are still safe. Check your connection and try again.')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
