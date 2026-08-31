import React from 'react';
import { render } from '@testing-library/react-native';
import { Text } from 'react-native';
import { NoshToolActivity } from '@/components/nosh/conversation/NoshToolActivity';

describe('NoshToolActivity', () => {
  it('announces a running action without presenting a card', () => {
    const screen = render(
      <NoshToolActivity
        icon={<Text>search</Text>}
        label="Searching your cookbooks"
        detail="pasta"
        running
      />,
    );

    expect(screen.getByRole('progressbar', { name: 'Searching your cookbooks. pasta' })).toBeTruthy();
  });

  it('presents a completed action as quiet status text', () => {
    const screen = render(
      <NoshToolActivity
        icon={<Text>book</Text>}
        label="Recipe opened"
        detail="Lemon pasta"
      />,
    );

    expect(screen.getByRole('text', { name: 'Recipe opened. Lemon pasta' })).toBeTruthy();
    expect(screen.queryByRole('progressbar')).toBeNull();
  });

  it('announces tool failures as errors', () => {
    const screen = render(
      <NoshToolActivity
        icon={<Text>book</Text>}
        label="Could not open that recipe"
        error
      />,
    );

    expect(screen.getByRole('alert', { name: 'Could not open that recipe' })).toBeTruthy();
  });
});
