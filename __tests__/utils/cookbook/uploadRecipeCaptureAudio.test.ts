const mockUpload = jest.fn();
const mockPrepareRecipeCaptureAudio = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    storage: {
      from: jest.fn(() => ({ upload: mockUpload })),
    },
  },
}));

jest.mock('@/utils/cookbook/recipeCaptureAudio', () => ({
  prepareRecipeCaptureAudio: (...args: unknown[]) => mockPrepareRecipeCaptureAudio(...args),
}));

import { uploadRecipeCaptureAudio } from '@/utils/cookbook/api';

describe('uploadRecipeCaptureAudio', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uploads a validated existing audio file to private capture storage', async () => {
    const bytes = Uint8Array.from([1, 2, 3]);
    const audio = {
      uri: 'file:///family-soup.m4a',
      name: 'Family soup.m4a',
      mimeType: 'audio/mp4',
      size: 3,
    };
    mockPrepareRecipeCaptureAudio.mockResolvedValueOnce({
      bytes,
      fileName: audio.name,
      format: 'm4a',
      mimeType: 'audio/mp4',
      byteSize: 3,
    });
    mockUpload.mockResolvedValueOnce({ error: null });

    await expect(uploadRecipeCaptureAudio({
      userId: 'user-1',
      audio,
      requestKey: 'request-1',
    })).resolves.toEqual({
      storagePath: 'user-1/request-1.m4a',
      mimeType: 'audio/mp4',
      fileName: 'Family soup.m4a',
      byteSize: 3,
    });

    expect(mockPrepareRecipeCaptureAudio).toHaveBeenCalledWith(audio);
    expect(mockUpload).toHaveBeenCalledWith(
      'user-1/request-1.m4a',
      bytes,
      { contentType: 'audio/mp4', upsert: false },
    );
  });
});
