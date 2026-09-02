import {
  assertCanonicalCookbookPageImage,
  isCanonicalCookbookPageGenerationPayload,
} from '../../../supabase/functions/_shared/cookbookPageGeometry';

function pngHeader(width: number, height: number): Uint8Array {
  const bytes = new Uint8Array(24);
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10], 0);
  bytes.set([0, 0, 0, 13, 73, 72, 68, 82], 8);
  new DataView(bytes.buffer).setUint32(16, width, false);
  new DataView(bytes.buffer).setUint32(20, height, false);
  return bytes;
}

describe('canonical generated cookbook page geometry', () => {
  it('accepts a physical 4:5 PNG and rejects the former 3:4 output', () => {
    expect(assertCanonicalCookbookPageImage(pngHeader(1600, 2000))).toEqual({
      width: 1600,
      height: 2000,
    });

    expect(() => assertCanonicalCookbookPageImage(pngHeader(1536, 2048))).toThrow(
      'canonical 4:5 geometry',
    );
  });

  it('only treats page versions recorded with the current geometry as reusable', () => {
    expect(isCanonicalCookbookPageGenerationPayload({
      kind: 'complete-recipe-page',
      generationContractVersion: 'complete-recipe-page-4x5-v4',
      geometryId: 'nosh-cookbook-4x5-v1',
      geometryRevision: 1,
      output: { aspectRatio: '4:5', resolution: '2K' },
    })).toBe(true);

    expect(isCanonicalCookbookPageGenerationPayload({
      kind: 'complete-recipe-page',
      generationContractVersion: 'complete-recipe-page-v1',
      output: { aspectRatio: '3:4', resolution: '2K' },
    })).toBe(false);
  });
});
