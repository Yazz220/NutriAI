import {
  COOKBOOK_COVER_FINISHES,
  COOKBOOK_PAGE_STYLES,
  FIRST_BOOK_LOOKS,
  listCreationPageStyles,
  listFeaturedCookbookCoverFinishes,
  normalizeCookbookPageStyleId,
} from '@/constants/cookbookCustomization';
import {
  isRecipePageStyleId,
  RECIPE_PAGE_STYLE_PROFILES,
} from '../../supabase/functions/_shared/artGeneration';

describe('cookbook customization catalog', () => {
  it('keeps inline cover choices curated while retaining future catalog entries', () => {
    const featured = listFeaturedCookbookCoverFinishes();

    expect(featured).toHaveLength(4);
    expect(COOKBOOK_COVER_FINISHES.length).toBeGreaterThan(featured.length);
    expect(featured.map((option) => option.studioOrder)).toEqual([0, 1, 2, 3]);
    expect(new Set(COOKBOOK_COVER_FINISHES.map((option) => option.id)).size)
      .toBe(COOKBOOK_COVER_FINISHES.length);
  });

  it('keeps the client catalog and generation service aligned', () => {
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
  });

  it('preserves the previous cover-linked page style for existing books', () => {
    expect(normalizeCookbookPageStyleId(null, 'sage-linen')).toBe('sage-linen');
    expect(normalizeCookbookPageStyleId('studio-editorial', 'sage-linen'))
      .toBe('studio-editorial');
  });

  it('offers three coherent first-book presets backed by the active catalogs', () => {
    expect(FIRST_BOOK_LOOKS).toHaveLength(3);
    FIRST_BOOK_LOOKS.forEach((look) => {
      expect(COOKBOOK_COVER_FINISHES.some((cover) => cover.id === look.coverStyle)).toBe(true);
      expect(COOKBOOK_PAGE_STYLES[look.pageStyleId]).toBeTruthy();
    });
  });
});
