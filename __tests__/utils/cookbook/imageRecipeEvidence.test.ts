import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  buildImageRecipeEvidencePrompt,
  ImageRecipeEvidenceError,
  inspectImageRecipeEvidence,
} from '@/supabase/functions/_shared/imageRecipeEvidence';

const fixtureDirectory = resolve(
  __dirname,
  '..',
  '..',
  '..',
  'supabase/functions/extract-recipe/evals/fixtures/images',
);

function toBase64(bytes: number[]): string {
  return Buffer.from(bytes).toString('base64');
}

function pngHeader(width: number, height: number): string {
  const bytes = Buffer.alloc(24);
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(bytes, 0);
  Buffer.from('IHDR').copy(bytes, 12);
  bytes.writeUInt32BE(width, 16);
  bytes.writeUInt32BE(height, 20);
  return bytes.toString('base64');
}

function jpegWithDimensions(width: number, height: number): string {
  return toBase64([
    0xff, 0xd8,
    0xff, 0xc0, 0x00, 0x11, 0x08,
    (height >> 8) & 0xff, height & 0xff,
    (width >> 8) & 0xff, width & 0xff,
    0x03, 0x01, 0x11, 0x00, 0x02, 0x11, 0x00, 0x03, 0x11, 0x00,
    0xff, 0xd9,
  ]);
}

describe('image recipe evidence prompt', () => {
  it('preserves user notes as evidence alongside the image', () => {
    const prompt = buildImageRecipeEvidencePrompt('This is the second half; use 180°C.');

    expect(prompt).toContain('Read all visible text');
    expect(prompt).toContain('This is the second half; use 180°C.');
    expect(prompt).toContain('Do not invent details');
    expect(prompt).toContain('<UNTRUSTED_USER_NOTES>');
  });

  it('does not add an empty note section', () => {
    expect(buildImageRecipeEvidencePrompt('   ')).not.toContain('UNTRUSTED_USER_NOTES');
  });

  it('tells the extractor how to distinguish blank, unreadable, and cropped images', () => {
    const prompt = buildImageRecipeEvidencePrompt();

    expect(prompt).toContain('uniformly dark or light image');
    expect(prompt).toContain('Use blurry_or_low_resolution_image or unreadable_source instead of guessing');
    expect(prompt).toContain('Image dimensions and portrait framing alone do not prove cropping');
  });

  it('reads real container dimensions and trusts the signature over a declared MIME type', () => {
    expect(inspectImageRecipeEvidence(pngHeader(1200, 1500), 'image/jpeg')).toMatchObject({
      mimeType: 'image/png',
      declaredMimeType: 'image/jpeg',
      width: 1200,
      height: 1500,
      minimumEdge: 1200,
      aspectRatio: 0.8,
      dimensionHint: 'sufficient_dimensions',
    });
  });

  it('reads dimensions from the normalized JPEG format used by mobile capture', () => {
    expect(inspectImageRecipeEvidence(jpegWithDimensions(1800, 2400), 'image/jpeg')).toMatchObject({
      mimeType: 'image/jpeg',
      width: 1800,
      height: 2400,
      aspectRatio: 0.75,
    });
  });

  it('rejects corrupt image bytes before model extraction', () => {
    expect(() => inspectImageRecipeEvidence(toBase64([1, 2, 3, 4]), 'image/png'))
      .toThrow(ImageRecipeEvidenceError);
    expect(() => inspectImageRecipeEvidence(toBase64([1, 2, 3, 4]), 'image/png'))
      .toThrow('not a readable JPEG, PNG, WebP, or GIF');
  });

  it('rejects impossible container dimensions before a provider decodes the image', () => {
    expect(() => inspectImageRecipeEvidence(pngHeader(50_000, 50_000), 'image/png'))
      .toThrow('dimensions are outside the supported reading boundary');
  });

  it('rejects implausibly tiny images without treating normal dimensions as proof of readability', () => {
    expect(() => inspectImageRecipeEvidence(pngHeader(16, 16), 'image/png'))
      .toThrow('dimensions are too small');

    expect(inspectImageRecipeEvidence(pngHeader(720, 900), 'image/png')).toMatchObject({
      dimensionHint: 'sufficient_dimensions',
    });
  });

  it('leaves semantic blankness and cropping decisions to the visual extractor', () => {
    const blackImage = readFileSync(resolve(fixtureDirectory, 'black.png')).toString('base64');
    const croppedImage = readFileSync(resolve(fixtureDirectory, 'cropped-recipe.png')).toString('base64');

    expect(inspectImageRecipeEvidence(blackImage, 'image/png')).toMatchObject({
      width: 1200,
      height: 1500,
    });
    expect(inspectImageRecipeEvidence(croppedImage, 'image/png')).toMatchObject({
      width: 1200,
      height: 900,
    });
  });
});
