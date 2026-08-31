const mockFile = jest.fn();
const mockManipulate = jest.fn();
const mockSourceRender = jest.fn();
const mockOutputRender = jest.fn();
const mockResize = jest.fn();
const mockSave = jest.fn();
const mockOutputBytes = jest.fn();

jest.mock('expo-file-system', () => ({
  File: function MockFile(...args: unknown[]) {
    return mockFile(...args);
  },
  Paths: { cache: { uri: 'file:///cache/' } },
}));

jest.mock('expo-image-manipulator', () => ({
  ImageManipulator: {
    manipulate: (...args: unknown[]) => mockManipulate(...args),
  },
  SaveFormat: { JPEG: 'jpeg' },
}));

import { prepareRecipeCaptureImage } from '@/utils/cookbook/recipeCaptureImage';
import {
  RECIPE_CAPTURE_IMAGE_SOURCE_MAX_BYTES,
  RECIPE_CAPTURE_IMAGE_UPLOAD_MAX_BYTES,
} from '@/utils/cookbook/recipeCaptureImageContract';

describe('prepareRecipeCaptureImage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const sourceRef = { width: 4032, height: 3024 };
    const savedRef = { saveAsync: mockSave };
    const outputContext = { resize: mockResize, renderAsync: mockOutputRender };
    mockResize.mockReturnValue(outputContext);
    mockSourceRender.mockResolvedValue(sourceRef);
    mockOutputRender.mockResolvedValue(savedRef);
    mockSave.mockResolvedValue({ uri: 'file:///normalized.jpg', width: 2400, height: 1800 });
    mockManipulate.mockImplementation((source: unknown) => (
      typeof source === 'string'
        ? { renderAsync: mockSourceRender }
        : outputContext
    ));
    mockFile.mockImplementation((uri: unknown) => (
      uri === 'file:///normalized.jpg'
        ? { bytes: mockOutputBytes }
        : { uri, size: 4_000_000 }
    ));
  });

  it('retries with a smaller boundary only when the first readable JPEG remains too large', async () => {
    mockOutputBytes
      .mockResolvedValueOnce(new Uint8Array(RECIPE_CAPTURE_IMAGE_UPLOAD_MAX_BYTES + 1))
      .mockResolvedValueOnce(Uint8Array.from([1, 2, 3]));

    await expect(prepareRecipeCaptureImage({
      imageUri: 'file:///recipe.png',
      mimeType: 'image/png',
      requestKey: 'request-1',
    })).resolves.toMatchObject({
      bytes: Uint8Array.from([1, 2, 3]),
      mimeType: 'image/jpeg',
    });

    expect(mockResize).toHaveBeenNthCalledWith(1, { width: 2400, height: 1800 });
    expect(mockResize).toHaveBeenNthCalledWith(2, { width: 2000, height: 1500 });
    expect(mockSave).toHaveBeenNthCalledWith(1, { compress: 0.9, format: 'jpeg' });
    expect(mockSave).toHaveBeenNthCalledWith(2, { compress: 0.82, format: 'jpeg' });
  });

  it('rejects an oversized source before decoding it into the image pipeline', async () => {
    mockFile.mockReturnValueOnce({
      uri: 'file:///too-large.png',
      size: RECIPE_CAPTURE_IMAGE_SOURCE_MAX_BYTES + 1,
    });

    await expect(prepareRecipeCaptureImage({
      imageUri: 'file:///too-large.png',
      requestKey: 'request-2',
    })).rejects.toThrow('larger than 15 MB');

    expect(mockManipulate).not.toHaveBeenCalled();
  });
});
