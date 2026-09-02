import {
  DEFAULT_CREATION_PAGE_STYLE_ID,
  COOKBOOK_COVER_COLORS,
  COOKBOOK_COVER_FINISHES,
  COOKBOOK_PAGE_STYLES,
  listCookbookCoverColors,
  listCookbookCoverFinishes,
  listCreationPageStyles,
  normalizeCookbookPageStyleId,
} from '@/constants/cookbookCustomization';
import {
  isRecipePageStyleId,
  resolveRecipePageStyleVersion,
} from '@/constants/recipePageStyles';

describe('cookbook customization catalog', () => {
  it('offers four ordered finishes without changing book construction', () => {
    const finishes = listCookbookCoverFinishes();

    expect(finishes.map((option) => option.id)).toEqual([
      'fine-cloth',
      'natural-linen',
      'pressed-paper',
      'soft-grain',
    ]);
    expect(Object.keys(COOKBOOK_COVER_FINISHES)).toHaveLength(4);
  });

  it('offers one ordered palette of cover colors', () => {
    const colors = listCookbookCoverColors();

    expect(colors.map((option) => option.name)).toEqual([
      'Sage',
      'Clay',
      'Ochre',
      'Midnight',
      'Alabaster',
      'Plum',
      'Ink',
    ]);
    expect(new Set(Object.values(COOKBOOK_COVER_COLORS).map((option) => option.id)).size)
      .toBe(Object.keys(COOKBOOK_COVER_COLORS).length);
  });

  it('keeps the six selectable page identities aligned with generation', () => {
    const pageStyles = listCreationPageStyles();

    expect(pageStyles.map((style) => style.id)).toEqual([
      'studio',
      'editorial',
      'illustrated',
      'heritage',
      'journal',
      'bold',
    ]);
    pageStyles.forEach((style) => {
      expect(isRecipePageStyleId(style.id)).toBe(true);
      expect(resolveRecipePageStyleVersion(style.id, style.revision)?.status).toBe('active');
      expect(style.modelDescription.length).toBeGreaterThan(40);
      expect(style.samples.brownies).toBeTruthy();
      expect(style.samples.cookies).toBeTruthy();
    });
    expect(Object.keys(COOKBOOK_PAGE_STYLES)).toHaveLength(6);
    expect(DEFAULT_CREATION_PAGE_STYLE_ID).toBe('studio');
  });

  it('preserves the previous cover-linked page style for existing books', () => {
    expect(normalizeCookbookPageStyleId(null, 'sage-linen')).toBe('sage-linen');
    expect(normalizeCookbookPageStyleId('studio-editorial', 'sage-linen'))
      .toBe('studio-editorial');
  });

});
