import React from 'react';
import { render } from '@testing-library/react-native';
import { BrowseRecipeCollectionToolUI } from '@/utils/cookbook/noshToolkit';
import type { RecipeCollectionBrowseResult } from '@/utils/cookbook/recipeCollection';

jest.mock('@assistant-ui/react-native', () => ({ defineToolkit: () => () => ({}) }));
jest.mock('@/lib/supabase', () => ({ supabase: {} }));
jest.mock('@/components/nosh/recipe/RecipeActionPreviewCard', () => ({ RecipeActionPreviewCard: () => null }));
jest.mock('@/components/nosh/recipe/ArtworkActionCard', () => ({ ArtworkActionCard: () => null }));
jest.mock('@/components/nosh/collection/CollectionActionCard', () => ({ CollectionActionCard: () => null }));

describe('BrowseRecipeCollectionToolUI', () => {
  it('keeps completed cookbook results visible in the conversation', () => {
    const screen = render(
      <BrowseRecipeCollectionToolUI
        args={{ ingredientsAny: ['chicken'], maxTotalMinutes: 30 }}
        status={{ type: 'complete' }}
        result={{
          recipes: [
            {
              pageId: 'page-fajitas',
              cookbookId: 'book-dinner',
              cookbookTitle: 'Dinner',
              title: 'Chicken Fajitas',
              tags: [],
              ingredientPreview: ['chicken', 'bell pepper'],
              updatedAt: '2026-09-03T00:00:00.000Z',
              score: 1,
              totalTimeMinutes: 30,
              dietaryTags: [],
              matchReason: 'ingredients',
            },
          ],
          totalCount: 1,
        }}
      />,
    );

    expect(screen.getByText('Searched your cookbooks')).toBeTruthy();
    expect(screen.getByText('Chicken Fajitas')).toBeTruthy();
    expect(screen.getByText(/Dinner.*30 min/)).toBeTruthy();
  });

  it('does not render an undefined recipe count when browsing fails', () => {
    const screen = render(
      <BrowseRecipeCollectionToolUI
        args={{}}
        status={{ type: 'incomplete' }}
        result={{ error: 'Database function is unavailable' } as unknown as RecipeCollectionBrowseResult}
        isError
      />,
    );

    expect(screen.queryByText(/undefined matching recipes/i)).toBeNull();
    expect(screen.getByRole('alert', {
      name: 'Could not browse your cookbooks. Your saved recipes',
    })).toBeTruthy();
  });
});
