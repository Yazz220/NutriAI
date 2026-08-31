import {
  assertRecipeCaptureSourceSize,
  assertRecipeCaptureUploadSize,
  fitRecipeCaptureImage,
  RECIPE_CAPTURE_IMAGE_SOURCE_MAX_BYTES,
  RECIPE_CAPTURE_IMAGE_UPLOAD_MAX_BYTES,
} from '@/utils/cookbook/recipeCaptureImageContract';

describe('recipe capture image contract', () => {
  it('fits landscape and portrait images inside one 2400-pixel boundary', () => {
    expect(fitRecipeCaptureImage({ width: 4032, height: 3024 })).toEqual({
      width: 2400,
      height: 1800,
    });
    expect(fitRecipeCaptureImage({ width: 3024, height: 4032 })).toEqual({
      width: 1800,
      height: 2400,
    });
  });

  it('does not upscale a smaller image', () => {
    expect(fitRecipeCaptureImage({ width: 1200, height: 1600 })).toEqual({
      width: 1200,
      height: 1600,
    });
  });

  it('keeps source and extractor limits explicit and separate', () => {
    expect(() => assertRecipeCaptureSourceSize(RECIPE_CAPTURE_IMAGE_SOURCE_MAX_BYTES)).not.toThrow();
    expect(() => assertRecipeCaptureSourceSize(RECIPE_CAPTURE_IMAGE_SOURCE_MAX_BYTES + 1))
      .toThrow('larger than 15 MB');
    expect(() => assertRecipeCaptureUploadSize(RECIPE_CAPTURE_IMAGE_UPLOAD_MAX_BYTES)).not.toThrow();
    expect(() => assertRecipeCaptureUploadSize(RECIPE_CAPTURE_IMAGE_UPLOAD_MAX_BYTES + 1))
      .toThrow('could not prepare this image');
  });
});
