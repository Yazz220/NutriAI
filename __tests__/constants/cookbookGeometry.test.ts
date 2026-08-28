import {
  COOKBOOK_GEOMETRY,
  resolveCookbookPageHeight,
  resolveCookbookSpreadHeight,
} from '@/constants/cookbookGeometry';

describe('canonical cookbook geometry', () => {
  it('defines one 4:5 page and its 8:5 spread', () => {
    expect(COOKBOOK_GEOMETRY.id).toBe('nosh-cookbook-4x5-v1');
    expect(COOKBOOK_GEOMETRY.page.aspectRatio).toBe(4 / 5);
    expect(COOKBOOK_GEOMETRY.spread.aspectRatio).toBe(8 / 5);
    expect(COOKBOOK_GEOMETRY.generation.aspectRatio).toBe('4:5');
  });

  it('derives page and spread height from the same contract', () => {
    expect(resolveCookbookPageHeight(320)).toBe(400);
    expect(resolveCookbookSpreadHeight(640)).toBe(400);
  });
});
