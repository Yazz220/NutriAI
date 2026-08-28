const mockUpload = jest.fn();
const mockBytes = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    storage: {
      from: jest.fn(() => ({ upload: mockUpload })),
    },
  },
}));

jest.mock('expo-file-system', () => ({
  File: jest.fn().mockImplementation(() => ({ bytes: mockBytes })),
}));

import { File } from 'expo-file-system';
import { uploadRecipeCaptureImage } from '@/utils/cookbook/api';

describe('uploadRecipeCaptureImage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uploads native file bytes without converting the photo to base64', async () => {
    const bytes = Uint8Array.from([1, 2, 3]);
    mockBytes.mockResolvedValueOnce(bytes);
    mockUpload.mockResolvedValueOnce({ error: null });

    await expect(uploadRecipeCaptureImage({
      userId: 'user-1',
      imageUri: 'file:///recipe.jpg',
      mimeType: 'image/jpeg',
      requestKey: 'request-1',
    })).resolves.toEqual({
      storagePath: 'user-1/request-1.jpg',
      mimeType: 'image/jpeg',
    });

    expect(File).toHaveBeenCalledWith('file:///recipe.jpg');
    expect(mockBytes).toHaveBeenCalledTimes(1);
    expect(mockUpload).toHaveBeenCalledWith(
      'user-1/request-1.jpg',
      bytes,
      { contentType: 'image/jpeg', upsert: false },
    );
  });
});
