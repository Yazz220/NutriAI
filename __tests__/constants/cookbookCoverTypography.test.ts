import {
  normalizeCoverTitleColorId,
  normalizeCoverTitlePlacementId,
  resolveCoverTitleCenterRatio,
  resolveCoverTitleFoil,
} from '@/constants/cookbookCoverTypography';

describe('cookbook cover typography', () => {
  const automaticFoil = ['#111111', '#222222', '#333333'] as const;

  it('keeps automatic styling backward compatible', () => {
    expect(normalizeCoverTitleColorId(undefined)).toBe('auto');
    expect(normalizeCoverTitlePlacementId(undefined)).toBe('center');
    expect(resolveCoverTitleFoil('auto', automaticFoil)).toBe(automaticFoil);
  });

  it('resolves curated title colors and positions independently', () => {
    expect(resolveCoverTitleFoil('plum', automaticFoil)).toEqual([
      '#351E3D',
      '#65436F',
      '#B99FC0',
    ]);
    expect(resolveCoverTitleCenterRatio('upper')).toBeLessThan(
      resolveCoverTitleCenterRatio('lower'),
    );
  });
});
