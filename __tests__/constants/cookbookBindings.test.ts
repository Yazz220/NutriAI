import {
  getLegacyCoverStyleForColor,
  normalizeCoverColorId,
  resolveCookbookBinding,
} from '@/constants/cookbookBindings';

describe('cookbook cover appearance', () => {
  it('combines each finish with the same curated color independently', () => {
    const cloth = resolveCookbookBinding({ finishId: 'fine-cloth', colorId: 'midnight' });
    const linen = resolveCookbookBinding({ finishId: 'natural-linen', colorId: 'midnight' });

    expect(cloth.cloth).toBe(linen.cloth);
    expect(cloth.foil).toEqual(linen.foil);
    expect(cloth.material).toBe('cloth');
    expect(linen.material).toBe('linen');
    expect(cloth.weavePattern).not.toEqual(linen.weavePattern);
  });

  it('maps legacy bundled styles onto the new color model', () => {
    expect(normalizeCoverColorId(null, 'terracotta-cloth')).toBe('clay');
    expect(normalizeCoverColorId(null, 'navy-leather')).toBe('midnight');
    expect(getLegacyCoverStyleForColor('umber')).toBe('umber-leather');
  });
});
