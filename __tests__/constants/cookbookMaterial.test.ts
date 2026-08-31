import { NOSH_BOOK_MATERIAL, resolveNoshBookMaterialGeometry } from '@/constants/cookbookMaterial';

describe('canonical Nosh cookbook material', () => {
  it('keeps one clothbound material identity', () => {
    expect(NOSH_BOOK_MATERIAL.id).toBe('nosh-clothbound-v1');
    expect(NOSH_BOOK_MATERIAL.revision).toBe(1);
  });

  it('keeps the cover composition stable as recipe count changes', () => {
    const thin = resolveNoshBookMaterialGeometry(220, 1);
    const full = resolveNoshBookMaterialGeometry(220, 80);

    expect(full.hingeWidth).toBe(thin.hingeWidth);
    expect(full.boardCornerRadius).toBe(thin.boardCornerRadius);
    expect(full.pageBlockDepth).toBeGreaterThan(thin.pageBlockDepth);
  });

  it('scales bounded physical details with the rendered book', () => {
    const small = resolveNoshBookMaterialGeometry(140, 12);
    const large = resolveNoshBookMaterialGeometry(320, 12);

    expect(large.boardCornerRadius).toBeGreaterThan(small.boardCornerRadius);
    expect(large.pageBlockInset).toBeGreaterThanOrEqual(small.pageBlockInset);
    expect(large.pageBlockDepth).toBeGreaterThan(small.pageBlockDepth);
  });
});
