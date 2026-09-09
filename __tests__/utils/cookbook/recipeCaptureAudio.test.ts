const mockFile = jest.fn();

jest.mock('expo-file-system', () => ({
  File: function MockFile(...args: unknown[]) {
    return mockFile(...args);
  },
}));

import { Platform } from 'react-native';
import { prepareRecipeCaptureAudio } from '@/utils/cookbook/recipeCaptureAudio';

describe('prepareRecipeCaptureAudio', () => {
  const originalPlatform = Platform.OS;

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: originalPlatform });
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('reads a browser file URL without constructing an unsupported Expo File', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'web' });
    const sourceBytes = Uint8Array.from([82, 73, 70, 70]);
    jest.spyOn(global, 'fetch').mockResolvedValueOnce(new Response(sourceBytes));

    await expect(prepareRecipeCaptureAudio({
      uri: 'blob:http://localhost/clear-stew',
      name: 'clear-stew.wav',
      mimeType: 'audio/wav',
      size: sourceBytes.byteLength,
    })).resolves.toEqual({
      bytes: sourceBytes,
      fileName: 'clear-stew.wav',
      format: 'wav',
      mimeType: 'audio/wav',
      byteSize: sourceBytes.byteLength,
    });

    expect(mockFile).not.toHaveBeenCalled();
  });

  it('uses the Folio name when a browser audio file cannot be read', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'web' });
    jest.spyOn(global, 'fetch').mockResolvedValueOnce(new Response(null, { status: 404 }));

    await expect(prepareRecipeCaptureAudio({
      uri: 'blob:http://localhost/missing-stew',
      name: 'missing-stew.wav',
      mimeType: 'audio/wav',
    })).rejects.toThrow('Folio could not read this audio file. Choose another recording.');
  });
});
