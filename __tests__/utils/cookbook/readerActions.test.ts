import { getRecipeSourceUrl } from '@/utils/cookbook/readerActions';
import type { CookbookPage } from '@/types/cookbook';

function pageWithSources(graphUrl?: string, legacyUrl?: string): CookbookPage {
  return {
    id: 'page-1',
    cookbookId: 'cookbook-1',
    recipeId: 'recipe-1',
    title: 'Tomato Toast',
    section: 'breakfast',
    pageNumber: 1,
    sortOrder: 0,
    recipeGraph: graphUrl
      ? {
          id: 'graph-1',
          title: 'Tomato Toast',
          servings: 2,
          category: 'breakfast',
          ingredientGroups: [],
          stepGroups: [],
          tags: [],
          provenance: { sourceType: 'url', sourceUrl: graphUrl, confidence: 1 },
          createdAt: '2026-08-25T00:00:00.000Z',
          updatedAt: '2026-08-25T00:00:00.000Z',
        }
      : undefined,
    recipe: legacyUrl
      ? {
          id: 'recipe-1',
          title: 'Tomato Toast',
          ingredients: [],
          steps: [],
          sourceType: 'url',
          sourceUrl: legacyUrl,
          tags: [],
          category: 'breakfast',
        }
      : undefined,
  };
}

describe('reader recipe actions', () => {
  it('prefers canonical RecipeGraph provenance', () => {
    const page = pageWithSources('https://www.tiktok.com/@cook/video/1', 'https://example.com/legacy');
    expect(getRecipeSourceUrl(page)).toBe('https://www.tiktok.com/@cook/video/1');
  });

  it('falls back to the legacy recipe source URL', () => {
    expect(getRecipeSourceUrl(pageWithSources(undefined, 'https://example.com/recipe'))).toBe(
      'https://example.com/recipe',
    );
  });

  it('does not expose missing or unsafe source schemes', () => {
    expect(getRecipeSourceUrl(pageWithSources())).toBeNull();
    expect(getRecipeSourceUrl(pageWithSources('javascript:alert(1)'))).toBeNull();
  });
});
