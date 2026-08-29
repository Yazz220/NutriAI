import React from 'react';
import { TextInput } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { UnifiedIntakeComposer } from '@/components/cookbook/UnifiedIntakeComposer';

const mockLaunchImageLibraryAsync = jest.fn();

jest.mock('expo-image-picker', () => ({
  PermissionStatus: { GRANTED: 'granted' },
  requestMediaLibraryPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  launchImageLibraryAsync: (...args: unknown[]) => mockLaunchImageLibraryAsync(...args),
}));

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
    expect(screen.getByText('Turn a recipe into a page')).toBeTruthy();
    expect(screen.getByText('Paste a link or recipe text, or attach a photo.')).toBeTruthy();
    expect(screen.queryByText('Attach photo')).toBeNull();
  });

  it('submits a picked photo by file URI without building a base64 copy', async () => {
    mockLaunchImageLibraryAsync.mockResolvedValueOnce({
      canceled: false,
      assets: [{
        uri: 'file:///recipe.jpg',
        mimeType: 'image/jpeg',
        base64: 'should-not-be-used',
      }],
    });
    const onSubmit = jest.fn();
    const onImageUriChange = jest.fn();

    const screen = render(
      <UnifiedIntakeComposer
        input=""
        imageBase64={null}
        imageUri={null}
        imageMimeType={null}
        onInputChange={jest.fn()}
        onImageBase64Change={jest.fn()}
        onImageUriChange={onImageUriChange}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.press(screen.getByRole('button', { name: 'Attach image or screenshot' }));

    await waitFor(() => {
      expect(onImageUriChange).toHaveBeenCalledWith('file:///recipe.jpg', 'image/jpeg');
    });
    expect(mockLaunchImageLibraryAsync).toHaveBeenCalledWith(expect.objectContaining({
      base64: false,
    }));
  });
});
