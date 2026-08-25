import React from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';
import { Sheet } from '@/components/ui/Sheet';

describe('Sheet accessibility', () => {
  it('marks visible sheet content as the active accessibility modal', () => {
    const screen = render(
      <Sheet visible onClose={jest.fn()}>
        <Text>Sheet content</Text>
      </Sheet>,
    );

    const backdrop = screen.getByTestId('sheet-accessibility-modal');
    expect(backdrop?.props.accessibilityViewIsModal).toBe(true);
    expect(backdrop?.props.importantForAccessibility).toBe('yes');
  });
});
