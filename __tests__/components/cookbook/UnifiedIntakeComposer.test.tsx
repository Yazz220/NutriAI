import React from 'react';
import { TextInput } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import {
  buildIntakePayload,
  UnifiedIntakeComposer,
} from '@/components/cookbook/UnifiedIntakeComposer';
import { MAX_RECIPE_TEXT_CHARACTERS } from '@/supabase/functions/_shared/recipeEvidence';

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
  it('uses the same video URL classification as native share ingestion', () => {
    expect(buildIntakePayload(
      'https://www.instagram.com/reel/recipe',
      null,
    )).toEqual({
      type: 'video',
      input: 'https://www.instagram.com/reel/recipe',
      rightsConfirmed: false,
    });
    expect(buildIntakePayload('https://example.com/recipe', null))
      .toEqual({ type: 'url', input: 'https://example.com/recipe' });
  });

  it('submits a supported social-video link without an extra confirmation step', async () => {
    const onSubmit = jest.fn();
    const screen = render(
      <UnifiedIntakeComposer
        input="https://www.tiktok.com/@cook/video/1234567890"
        imageBase64={null}
        onInputChange={jest.fn()}
        onImageBase64Change={jest.fn()}
        onSubmit={onSubmit}
      />,
    );

    expect(screen.queryByText('TikTok video recipe')).toBeNull();
    fireEvent.press(screen.getByRole('button', { name: 'Create recipe page' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({
      type: 'video',
      input: 'https://www.tiktok.com/@cook/video/1234567890',
      rightsConfirmed: false,
    }));
  });

  it('submits a pasted recipe page without an intermediate prompt', async () => {
    const onSubmit = jest.fn();
    const screen = render(
      <UnifiedIntakeComposer
        input="https://example.com/recipes/roast-chicken"
        imageBase64={null}
        onInputChange={jest.fn()}
        onImageBase64Change={jest.fn()}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.press(screen.getByRole('button', { name: 'Create recipe page' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({
      type: 'url',
      input: 'https://example.com/recipes/roast-chicken',
    }));
  });

  it('attempts every pasted social-video link before showing recovery', async () => {
    const onSubmit = jest.fn();
    const screen = render(
      <UnifiedIntakeComposer
        input="https://www.pinterest.com/pin/1234567890"
        imageBase64={null}
        onInputChange={jest.fn()}
        onImageBase64Change={jest.fn()}
        onSubmit={onSubmit}
      />,
    );

    expect(screen.queryByText('Pinterest video recipe')).toBeNull();
    fireEvent.press(screen.getByRole('button', { name: 'Create recipe page' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({
      type: 'video',
      input: 'https://www.pinterest.com/pin/1234567890',
      rightsConfirmed: false,
    }));
  });

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
    expect(input.props.maxLength).toBe(MAX_RECIPE_TEXT_CHARACTERS);
    expect(input.props.style).toEqual(expect.objectContaining({ height: 104 }));
  });

  it('keeps oversized text local and explains how to recover', async () => {
    const onSubmit = jest.fn();
    const screen = render(
      <UnifiedIntakeComposer
        input={'A'.repeat(MAX_RECIPE_TEXT_CHARACTERS + 1)}
        imageBase64={null}
        onInputChange={jest.fn()}
        onImageBase64Change={jest.fn()}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.press(screen.getByRole('button', { name: 'Create recipe page' }));

    expect(await screen.findByText('Recipe text is too long')).toBeTruthy();
    expect(screen.getByText('Paste one recipe at a time, then try again.')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
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

    expect(screen.getByRole('button', { name: 'Attach photo or video' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Create recipe page' })).toBeTruthy();
    expect(screen.getByText('Media')).toBeTruthy();
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
    const onSourceChange = jest.fn();

    const screen = render(
      <UnifiedIntakeComposer
        input=""
        imageBase64={null}
        onInputChange={jest.fn()}
        onImageBase64Change={jest.fn()}
        onImageUriChange={onImageUriChange}
        onAudioAttachmentChange={onAudioAttachmentChange}
        onSourceChange={onSourceChange}
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
    expect(onSourceChange).toHaveBeenCalledTimes(1);
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

    fireEvent.press(screen.getByRole('button', { name: 'Attach photo or video' }));

    await waitFor(() => {
      expect(onImageUriChange).toHaveBeenCalledWith('file:///recipe.jpg', 'image/jpeg');
    });
    expect(mockLaunchImageLibraryAsync).toHaveBeenCalledWith(expect.objectContaining({
      base64: false,
      mediaTypes: ['images', 'videos'],
      allowsMultipleSelection: true,
      selectionLimit: 4,
    }));
  });

  it('keeps up to four selected screenshots in their picker order', async () => {
    mockLaunchImageLibraryAsync.mockResolvedValueOnce({
      canceled: false,
      assets: [
        { uri: 'file:///page-1.png', mimeType: 'image/png' },
        { uri: 'file:///page-2.png', mimeType: 'image/png' },
        { uri: 'file:///page-3.jpg', mimeType: 'image/jpeg' },
      ],
    });
    const onImageUriChange = jest.fn();
    const onAdditionalImagesChange = jest.fn();
    const screen = render(
      <UnifiedIntakeComposer
        input=""
        imageBase64={null}
        onInputChange={jest.fn()}
        onImageBase64Change={jest.fn()}
        onImageUriChange={onImageUriChange}
        onAdditionalImagesChange={onAdditionalImagesChange}
        onSubmit={jest.fn()}
      />,
    );

    fireEvent.press(screen.getByRole('button', { name: 'Attach photo or video' }));

    await waitFor(() => expect(onImageUriChange).toHaveBeenCalledWith(
      'file:///page-1.png',
      'image/png',
    ));
    expect(onAdditionalImagesChange).toHaveBeenCalledWith([
      { uri: 'file:///page-2.png', mimeType: 'image/png' },
      { uri: 'file:///page-3.jpg', mimeType: 'image/jpeg' },
    ]);
    expect(buildIntakePayload(
      '',
      null,
      'file:///page-1.png',
      'image/png',
      null,
      null,
      [
        { uri: 'file:///page-2.png', mimeType: 'image/png' },
        { uri: 'file:///page-3.jpg', mimeType: 'image/jpeg' },
      ],
    )).toEqual({
      type: 'image',
      imageUri: 'file:///page-1.png',
      mimeType: 'image/png',
      additionalImages: [
        { uri: 'file:///page-2.png', mimeType: 'image/png' },
        { uri: 'file:///page-3.jpg', mimeType: 'image/jpeg' },
      ],
    });
  });

  it('rejects a mixed photo and video selection without replacing the current source', async () => {
    mockLaunchImageLibraryAsync.mockResolvedValueOnce({
      canceled: false,
      assets: [
        { uri: 'file:///page-1.png', type: 'image', mimeType: 'image/png' },
        { uri: 'file:///recipe.mp4', type: 'video', mimeType: 'video/mp4' },
      ],
    });
    const onImageUriChange = jest.fn();
    const onAdditionalImagesChange = jest.fn();
    const onVideoAttachmentChange = jest.fn();
    const screen = render(
      <UnifiedIntakeComposer
        input=""
        imageBase64={null}
        onInputChange={jest.fn()}
        onImageBase64Change={jest.fn()}
        onImageUriChange={onImageUriChange}
        onAdditionalImagesChange={onAdditionalImagesChange}
        onVideoAttachmentChange={onVideoAttachmentChange}
        onSubmit={jest.fn()}
      />,
    );

    fireEvent.press(screen.getByRole('button', { name: 'Attach photo or video' }));

    expect(await screen.findByText('Choose one video, or up to four recipe photos.')).toBeTruthy();
    expect(onImageUriChange).not.toHaveBeenCalled();
    expect(onAdditionalImagesChange).not.toHaveBeenCalled();
    expect(onVideoAttachmentChange).not.toHaveBeenCalled();
  });

  it('attaches a selected video as a file-backed capture source', async () => {
    mockLaunchImageLibraryAsync.mockResolvedValueOnce({
      canceled: false,
      assets: [{
        uri: 'file:///recipe.mov',
        type: 'video',
        fileName: 'Family pasta.mov',
        fileSize: 4096,
        mimeType: 'video/quicktime',
      }],
    });
    const onVideoAttachmentChange = jest.fn();
    const onImageUriChange = jest.fn();

    const screen = render(
      <UnifiedIntakeComposer
        input=""
        imageBase64={null}
        onInputChange={jest.fn()}
        onImageBase64Change={jest.fn()}
        onImageUriChange={onImageUriChange}
        onVideoAttachmentChange={onVideoAttachmentChange}
        onSubmit={jest.fn()}
      />,
    );

    fireEvent.press(screen.getByRole('button', { name: 'Attach photo or video' }));

    await waitFor(() => {
      expect(onVideoAttachmentChange).toHaveBeenCalledWith({
        uri: 'file:///recipe.mov',
        name: 'Family pasta.mov',
        mimeType: 'video/quicktime',
        size: 4096,
        duration: null,
      });
    });
    expect(onImageUriChange).toHaveBeenCalledWith(null, null);
  });

  it('rejects a video that exceeds MAX_DIRECT_VIDEO_BYTES before attaching', async () => {
    mockLaunchImageLibraryAsync.mockResolvedValueOnce({
      canceled: false,
      assets: [{
        uri: 'file:///huge-recipe.mp4',
        type: 'video',
        fileName: 'huge-recipe.mp4',
        fileSize: 25_000_000,
        mimeType: 'video/mp4',
      }],
    });
    const onVideoAttachmentChange = jest.fn();

    const screen = render(
      <UnifiedIntakeComposer
        input=""
        imageBase64={null}
        onInputChange={jest.fn()}
        onImageBase64Change={jest.fn()}
        onVideoAttachmentChange={onVideoAttachmentChange}
        onSubmit={jest.fn()}
      />,
    );

    fireEvent.press(screen.getByRole('button', { name: 'Attach photo or video' }));

    expect(await screen.findByText('This video is larger than 20 MB. Choose a shorter or smaller clip.')).toBeTruthy();
    expect(onVideoAttachmentChange).not.toHaveBeenCalled();
  });

  it('rejects an audio recording that exceeds MAX_AUDIO_CAPTURE_BYTES before attaching', async () => {
    mockGetDocumentAsync.mockResolvedValueOnce({
      canceled: false,
      assets: [{
        uri: 'file:///huge-voice-note.m4a',
        name: 'huge-voice-note.m4a',
        size: 8_000_000,
        mimeType: 'audio/m4a',
      }],
    });
    const onAudioAttachmentChange = jest.fn();

    const screen = render(
      <UnifiedIntakeComposer
        input=""
        imageBase64={null}
        onInputChange={jest.fn()}
        onImageBase64Change={jest.fn()}
        onAudioAttachmentChange={onAudioAttachmentChange}
        onSubmit={jest.fn()}
      />,
    );

    fireEvent.press(screen.getByRole('button', { name: 'Attach audio file' }));

    expect(await screen.findByText('This audio file is larger than 6 MB. Choose a shorter recording.')).toBeTruthy();
    expect(onAudioAttachmentChange).not.toHaveBeenCalled();
  });
});
