import {
  DEFAULT_CREATION_PAGE_STYLE_ID,
  COOKBOOK_COVER_COLORS,
  COOKBOOK_PAGE_STYLES,
  listCookbookCoverColors,
  listCreationPageStyles,
  normalizeCookbookPageStyleId,
} from '@/constants/cookbookCustomization';
import {
  isRecipePageStyleId,
  RECIPE_PAGE_STYLE_PROFILES,
} from '../../supabase/functions/_shared/artGeneration';

describe('cookbook customization catalog', () => {
  it('offers one ordered palette of cover colors', () => {
    const colors = listCookbookCoverColors();

    expect(colors.map((option) => option.name)).toEqual([
      'Sage',
      'Clay',
      'Midnight',
      'Alabaster',
      'Charcoal',
      'Umber',
    ]);
    expect(new Set(COOKBOOK_COVER_COLORS.map((option) => option.id)).size)
      .toBe(COOKBOOK_COVER_COLORS.length);
  });

  it('keeps the three selectable page identities aligned with generation', () => {
    const pageStyles = listCreationPageStyles();

    expect(pageStyles.map((style) => style.id)).toEqual([
      'illustrated',
      'studio-editorial',
      'heritage',
    ]);
    pageStyles.forEach((style) => {
      expect(isRecipePageStyleId(style.id)).toBe(true);
      expect(RECIPE_PAGE_STYLE_PROFILES[style.id].revision).toBe(style.revision);
      expect(style.modelDescription.length).toBeGreaterThan(40);
      expect(style.samples.brownies).toBeTruthy();
      expect(style.samples.cookies).toBeTruthy();
    });
    expect(Object.keys(COOKBOOK_PAGE_STYLES)).toHaveLength(3);
    expect(DEFAULT_CREATION_PAGE_STYLE_ID).toBe('illustrated');
  });

  it('preserves the previous cover-linked page style for existing books', () => {
    expect(normalizeCookbookPageStyleId(null, 'sage-linen')).toBe('sage-linen');
    expect(normalizeCookbookPageStyleId('studio-editorial', 'sage-linen'))
      .toBe('studio-editorial');
  });

});
