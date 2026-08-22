import { getCookbookPageTurnImageSource } from '@/utils/cookbook/pageImage';
import type { CookbookPage } from '@/types/cookbook';

const basePage: CookbookPage = {
  id: 'page-1',
  cookbookId: 'cookbook-1',
  recipeId: 'recipe-1',
  title: 'Tomato Toast',
  section: 'breakfast',
  pageNumber: 1,
  sortOrder: 0,
};

describe('getCookbookPageTurnImageSource', () => {
  it('never substitutes isolated hero art for a typeset page texture', () => {
    const page: CookbookPage = {
      ...basePage,
      imageUrl: 'https://example.com/isolated-art.png',
      recipeGraph: {
        id: 'graph-1',
        title: 'Tomato Toast',
        servings: 2,
        category: 'breakfast',
        ingredientGroups: [],
        stepGroups: [],
        tags: [],
        provenance: { sourceType: 'text', confidence: 1 },
        createdAt: '2026-08-20T00:00:00.000Z',
        updatedAt: '2026-08-20T00:00:00.000Z',
      },
    };

    expect(getCookbookPageTurnImageSource(page)).toBeNull();
    expect(getCookbookPageTurnImageSource(page, 'file:///captured-page.png')).toBe(
      'file:///captured-page.png',
    );
  });

  it('keeps the existing full-page image for legacy pages', () => {
    expect(
      getCookbookPageTurnImageSource({
        ...basePage,
        imageUrl: 'https://example.com/legacy-full-page.png',
      }),
    ).toBe('https://example.com/legacy-full-page.png');
  });
});
