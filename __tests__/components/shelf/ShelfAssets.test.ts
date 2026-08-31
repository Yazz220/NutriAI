import path from 'path';
import sharp from 'sharp';

const SHELF_ASSETS = [
  'nosh-shelf-classic-v2.png',
  'nosh-shelf-board-v1.png',
  'nosh-shelf-carved-walnut-v1.png',
];

describe('shelf asset geometry', () => {
  it.each(SHELF_ASSETS)('%s starts at the canonical book-contact edge', async (fileName) => {
    const assetPath = path.join(process.cwd(), 'assets', 'brand', 'platform', fileName);
    const { data, info } = await sharp(assetPath).ensureAlpha().raw().toBuffer({
      resolveWithObject: true,
    });

    let firstVisibleRow = info.height;
    for (let y = 0; y < info.height; y += 1) {
      for (let x = 0; x < info.width; x += 1) {
        const alpha = data[(y * info.width + x) * 4 + 3];
        if (alpha > 16) {
          firstVisibleRow = y;
          break;
        }
      }
      if (firstVisibleRow !== info.height) break;
    }

    expect(firstVisibleRow).toBeLessThanOrEqual(1);
  });
});
