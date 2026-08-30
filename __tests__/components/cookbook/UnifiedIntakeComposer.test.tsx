import React from 'react';
import { TextInput } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { UnifiedIntakeComposer } from '@/components/cookbook/UnifiedIntakeComposer';

const mockLaunchImageLibraryAsync = jest.fn();
const mockGetDocumentAsync = jest.fn();

jest.mock('expo-document-picker', () => ({
  getDocumentAsync: (...args: unknown[]) => mockGetDocumentAsync(...args),
}));

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
    expect(input.props.style).toEqual(expect.objectContaining({ height: 104 }));
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
    expect(screen.getByText('Photo')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Attach audio file' })).toBeTruthy();
    expect(screen.getByText('Audio')).toBeTruthy();
    expect(screen.queryByText('Turn a recipe into a page')).toBeNull();
    expect(screen.queryByText('Paste a link or recipe text, or attach a photo.')).toBeNull();

    const input = screen.UNSAFE_getByType(TextInput);
    expect(input.props.accessibilityLabel).toBe('Recipe source');
    expect(input.props.placeholder).toBe('Paste a link, recipe, or notes…');
  });

  it('attaches an existing audio file without requesting microphone access', async () => {
    mockGetDocumentAsync.mockResolvedValueOnce({
      canceled: false,
      assets: [{
        uri: 'file:///recipe.m4a',
        name: 'Family soup.m4a',
        mimeType: 'audio/mp4',
        size: 2048,
      }],
    });
    const onAudioAttachmentChange = jest.fn();
    const onImageUriChange = jest.fn();

    const screen = render(
      <UnifiedIntakeComposer
        input=""
        imageBase64={null}
        onInputChange={jest.fn()}
        onImageBase64Change={jest.fn()}
        onImageUriChange={onImageUriChange}
        onAudioAttachmentChange={onAudioAttachmentChange}
        onSubmit={jest.fn()}
      />,
    );

    fireEvent.press(screen.getByRole('button', { name: 'Attach audio file' }));

    await waitFor(() => {
      expect(onAudioAttachmentChange).toHaveBeenCalledWith({
        uri: 'file:///recipe.m4a',
        name: 'Family soup.m4a',
        mimeType: 'audio/mp4',
        size: 2048,
      });
    });
    expect(onImageUriChange).toHaveBeenCalledWith(null, null);
    expect(mockGetDocumentAsync).toHaveBeenCalledWith({
      type: 'audio/*',
      multiple: false,
      copyToCacheDirectory: true,
    });
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
