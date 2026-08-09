import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { StaleDataNotice } from '@/components/ui/StaleDataNotice';

describe('StaleDataNotice', () => {
  it('identifies saved cookbook data and refreshes on request', () => {
    const onRefresh = jest.fn();
    const screen = render(<StaleDataNotice subject="cookbook" onRefresh={onRefresh} />);

    expect(screen.getByText('Saved edition')).toBeTruthy();
    expect(screen.getByText('You’re viewing the last saved version of this book.')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Refresh cookbook' }));
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });
});
