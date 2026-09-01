const mockUpload = jest.fn();
const mockRemove = jest.fn();
const mockPrepareRecipeCaptureImage = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    storage: {
      from: jest.fn(() => ({ upload: mockUpload, remove: mockRemove })),
    },
  },
}));

jest.mock('@/utils/cookbook/recipeCaptureImage', () => ({
  prepareRecipeCaptureImage: (...args: unknown[]) => mockPrepareRecipeCaptureImage(...args),
}));

import {
  removeRecipeCaptureStoragePaths,
  uploadRecipeCaptureImage,
  uploadRecipeCaptureImages,
} from '@/utils/cookbook/api';

describe('uploadRecipeCaptureImage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRemove.mockResolvedValue({ error: null });
  });

  it('uploads the canonical normalized image instead of the source file', async () => {
    const bytes = Uint8Array.from([1, 2, 3]);
    mockPrepareRecipeCaptureImage.mockResolvedValueOnce({
      bytes,
      mimeType: 'image/jpeg',
      width: 1800,
      height: 2400,
    });
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

    expect(mockPrepareRecipeCaptureImage).toHaveBeenCalledWith({
      userId: 'user-1',
      imageUri: 'file:///recipe.jpg',
      mimeType: 'image/jpeg',
      requestKey: 'request-1',
    });
    expect(mockUpload).toHaveBeenCalledWith(
      'user-1/request-1.jpg',
      bytes,
      { contentType: 'image/jpeg', upsert: false },
    );
  });

  it('does not upload when the source cannot be normalized safely', async () => {
    mockPrepareRecipeCaptureImage.mockRejectedValueOnce(
      new Error('This image is larger than 15 MB. Choose a smaller image and try again.'),
    );

    await expect(uploadRecipeCaptureImage({
      userId: 'user-1',
      imageUri: 'file:///large.png',
      mimeType: 'image/png',
      requestKey: 'request-2',
    })).rejects.toThrow('larger than 15 MB');

    expect(mockUpload).not.toHaveBeenCalled();
  });

  it('normalizes and uploads an ordered set with bounded storage paths', async () => {
    mockPrepareRecipeCaptureImage
      .mockResolvedValueOnce({
        bytes: Uint8Array.from([1]),
        mimeType: 'image/jpeg',
        width: 1200,
        height: 1600,
      })
      .mockResolvedValueOnce({
        bytes: Uint8Array.from([2]),
        mimeType: 'image/jpeg',
        width: 1200,
        height: 1600,
      });
    mockUpload.mockResolvedValue({ error: null });

    await expect(uploadRecipeCaptureImages({
      userId: 'user-1',
      requestKey: 'request-set',
      images: [
        { imageUri: 'file:///page-1.png', mimeType: 'image/png' },
        { imageUri: 'file:///page-2.png', mimeType: 'image/png' },
      ],
    })).resolves.toEqual({
      storagePath: 'user-1/request-set-1.jpg',
      mimeType: 'image/jpeg',
      additionalImagePaths: ['user-1/request-set-2.jpg'],
    });

    expect(mockUpload).toHaveBeenNthCalledWith(
      1,
      'user-1/request-set-1.jpg',
      Uint8Array.from([1]),
      { contentType: 'image/jpeg', upsert: false },
    );
    expect(mockUpload).toHaveBeenNthCalledWith(
      2,
      'user-1/request-set-2.jpg',
      Uint8Array.from([2]),
      { contentType: 'image/jpeg', upsert: false },
    );
  });

  it('removes each unique unclaimed upload after capture creation fails', async () => {
    await removeRecipeCaptureStoragePaths([
      'user-1/request-1.jpg',
      'user-1/request-2.jpg',
      'user-1/request-1.jpg',
    ]);

    expect(mockRemove).toHaveBeenCalledWith([
      'user-1/request-1.jpg',
      'user-1/request-2.jpg',
    ]);
  });
});
