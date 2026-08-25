import React from 'react';
import { render } from '@testing-library/react-native';
import { Text } from '@/components/ui/Text';

describe('Text scaling', () => {
  it('keeps Dynamic Type enabled with a layout safety ceiling', () => {
    const screen = render(<Text>Readable text</Text>);
    const text = screen.getByText('Readable text');

    expect(text.props.allowFontScaling).not.toBe(false);
    expect(text.props.maxFontSizeMultiplier).toBe(2);
  });

  it('allows specialized surfaces to override the ceiling', () => {
    const screen = render(<Text maxFontSizeMultiplier={1.5}>Compact text</Text>);
    expect(screen.getByText('Compact text').props.maxFontSizeMultiplier).toBe(1.5);
  });
});
