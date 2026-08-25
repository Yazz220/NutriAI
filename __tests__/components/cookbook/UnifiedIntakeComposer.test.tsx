import React from 'react';
import { TextInput } from 'react-native';
import { render } from '@testing-library/react-native';
import { UnifiedIntakeComposer } from '@/components/cookbook/UnifiedIntakeComposer';

describe('UnifiedIntakeComposer accessibility layout', () => {
  it('keeps large recipe text inside a scrollable fixed-height input', () => {
    const screen = render(
      <UnifiedIntakeComposer
        input="A long recipe"
        imageBase64={null}
        onInputChange={jest.fn()}
        onImageBase64Change={jest.fn()}
        onSubmit={jest.fn()}
      />,
    );

    const input = screen.UNSAFE_getByType(TextInput);
    expect(input.props.multiline).toBe(true);
    expect(input.props.scrollEnabled).toBe(true);
    expect(input.props.maxFontSizeMultiplier).toBe(2);
    expect(input.props.style).toEqual(expect.objectContaining({ height: 88 }));
  });

  it('keeps image upload inside the composer and leaves one standalone action', () => {
    const screen = render(
      <UnifiedIntakeComposer
        input=""
        imageBase64={null}
        onInputChange={jest.fn()}
        onImageBase64Change={jest.fn()}
        onSubmit={jest.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Attach image or screenshot' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Create recipe page' })).toBeTruthy();
    expect(screen.queryByText('Attach photo')).toBeNull();
  });
});
