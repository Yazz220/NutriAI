import { File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat, type ImageRef } from 'expo-image-manipulator';
import {
  assertRecipeCaptureSourceSize,
  assertRecipeCaptureUploadSize,
  fitRecipeCaptureImage,
  RECIPE_CAPTURE_IMAGE_UPLOAD_MAX_BYTES,
} from '@/utils/cookbook/recipeCaptureImageContract';

const NORMALIZATION_ATTEMPTS = [
  { maxEdge: 2400, quality: 0.9 },
  { maxEdge: 2000, quality: 0.82 },
  { maxEdge: 1600, quality: 0.76 },
] as const;

function decodeBase64(value: string): Uint8Array {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const clean = value.replace(/^data:[^;]+;base64,/, '').replace(/\s/g, '').replace(/=+$/, '');
  const bytes: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (const character of clean) {
    const index = alphabet.indexOf(character);
    if (index < 0) throw new Error('The selected image could not be read. Choose another image and try again.');
    buffer = (buffer << 6) | index;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >> bits) & 0xff);
    }
  }
  return Uint8Array.from(bytes);
}

function sourceExtension(mimeType?: string): string {
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/webp') return 'webp';
  if (mimeType === 'image/heic' || mimeType === 'image/heif') return 'heic';
  return 'jpg';
}

function safeRequestKey(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 100) || 'image';
}

function cacheBase64Source(input: {
  imageBase64: string;
  mimeType?: string;
  requestKey: string;
}): string {
  const bytes = decodeBase64(input.imageBase64);
  assertRecipeCaptureSourceSize(bytes.byteLength);
  const file = new File(
    Paths.cache,
    `nosh-recipe-source-${safeRequestKey(input.requestKey)}.${sourceExtension(input.mimeType)}`,
  );
  file.create({ overwrite: true });
  file.write(bytes);
  return file.uri;
}

async function loadSourceImage(input: {
  imageUri?: string;
  imageBase64?: string;
  mimeType?: string;
  requestKey: string;
}): Promise<ImageRef> {
  let sourceUri: string;
  if (input.imageUri) {
    const sourceFile = new File(input.imageUri);
    assertRecipeCaptureSourceSize(sourceFile.size);
    sourceUri = input.imageUri;
  } else if (input.imageBase64) {
    sourceUri = cacheBase64Source({
      imageBase64: input.imageBase64,
      mimeType: input.mimeType,
      requestKey: input.requestKey,
    });
  } else {
    throw new Error('The selected image could not be read. Choose another image and try again.');
  }

  return ImageManipulator.manipulate(sourceUri).renderAsync();
}

async function renderAttempt(
  source: ImageRef,
  maxEdge: number,
  quality: number,
): Promise<{ bytes: Uint8Array; width: number; height: number }> {
  const target = fitRecipeCaptureImage(source, maxEdge);
  const context = ImageManipulator.manipulate(source);
  if (target.width !== source.width || target.height !== source.height) {
    context.resize(target);
  }
  const rendered = await context.renderAsync();
  const saved = await rendered.saveAsync({
    compress: quality,
    format: SaveFormat.JPEG,
  });
  return {
    bytes: await new File(saved.uri).bytes(),
    width: saved.width,
    height: saved.height,
  };
}

export async function prepareRecipeCaptureImage(input: {
  imageUri?: string;
  imageBase64?: string;
  mimeType?: string;
  requestKey: string;
}): Promise<{
  bytes: Uint8Array;
  mimeType: 'image/jpeg';
  width: number;
  height: number;
}> {
  const source = await loadSourceImage(input);

  for (const attempt of NORMALIZATION_ATTEMPTS) {
    const result = await renderAttempt(source, attempt.maxEdge, attempt.quality);
    if (result.bytes.byteLength <= RECIPE_CAPTURE_IMAGE_UPLOAD_MAX_BYTES) {
      assertRecipeCaptureUploadSize(result.bytes.byteLength);
      return { ...result, mimeType: 'image/jpeg' };
    }
  }

  assertRecipeCaptureUploadSize(RECIPE_CAPTURE_IMAGE_UPLOAD_MAX_BYTES + 1);
  throw new Error('Folio could not prepare this image for recipe reading.');
}
