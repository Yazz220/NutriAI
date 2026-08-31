const mockUpload = jest.fn();
const mockPrepareRecipeCaptureVideo = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    storage: {
      from: jest.fn(() => ({ upload: mockUpload })),
    },
  },
}));

jest.mock('@/utils/cookbook/recipeCaptureVideo', () => ({
  prepareRecipeCaptureVideo: (...args: unknown[]) => mockPrepareRecipeCaptureVideo(...args),
}));

import { uploadRecipeCaptureVideo } from '@/utils/cookbook/api';

describe('uploadRecipeCaptureVideo', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uploads a permissioned video to private capture storage', async () => {
    const bytes = Uint8Array.from([1, 2, 3]);
    const video = {
      uri: 'file:///family-pasta.mov',
      name: 'Family pasta.mov',
      mimeType: 'video/quicktime',
      size: 3,
    };
    mockPrepareRecipeCaptureVideo.mockResolvedValueOnce({
      bytes,
      fileName: video.name,
      fileExtension: 'mov',
      mimeType: 'video/mov',
      byteSize: 3,
    });
    mockUpload.mockResolvedValueOnce({ error: null });

    await expect(uploadRecipeCaptureVideo({
      userId: 'user-1',
      video,
      requestKey: 'request-1',
    })).resolves.toEqual({
      storagePath: 'user-1/request-1.mov',
      mimeType: 'video/mov',
      fileName: 'Family pasta.mov',
      byteSize: 3,
    });

    expect(mockPrepareRecipeCaptureVideo).toHaveBeenCalledWith(video);
    expect(mockUpload).toHaveBeenCalledWith(
      'user-1/request-1.mov',
      bytes,
      { contentType: 'video/mov', upsert: false },
    );
  });
});
