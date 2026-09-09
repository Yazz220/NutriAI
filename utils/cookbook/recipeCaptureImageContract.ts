export const RECIPE_CAPTURE_IMAGE_SOURCE_MAX_BYTES = 15 * 1024 * 1024;
export const RECIPE_CAPTURE_IMAGE_UPLOAD_MAX_BYTES = 8_000_000;
export const RECIPE_CAPTURE_IMAGE_PRIMARY_MAX_EDGE = 2400;

export interface ImageDimensions {
  width: number;
  height: number;
}

export function fitRecipeCaptureImage(
  dimensions: ImageDimensions,
  maxEdge = RECIPE_CAPTURE_IMAGE_PRIMARY_MAX_EDGE,
): ImageDimensions {
  const width = Math.max(1, Math.round(dimensions.width));
  const height = Math.max(1, Math.round(dimensions.height));
  const longestEdge = Math.max(width, height);
  if (longestEdge <= maxEdge) return { width, height };

  const scale = maxEdge / longestEdge;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export function assertRecipeCaptureSourceSize(size: number): void {
  if (!Number.isFinite(size) || size <= 0) {
    throw new Error('The selected image could not be read. Choose another image and try again.');
  }
  if (size > RECIPE_CAPTURE_IMAGE_SOURCE_MAX_BYTES) {
    throw new Error('This image is larger than 15 MB. Choose a smaller image and try again.');
  }
}

export function assertRecipeCaptureUploadSize(size: number): void {
  if (!Number.isFinite(size) || size <= 0 || size > RECIPE_CAPTURE_IMAGE_UPLOAD_MAX_BYTES) {
    throw new Error('Folio could not prepare this image for recipe reading. Choose a smaller image and try again.');
  }
}
