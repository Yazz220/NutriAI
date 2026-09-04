import { defineToolkit } from '@assistant-ui/react-native';
import React from 'react';
import { render, renderHook } from '@testing-library/react-native';
import { BrowseRecipeCollectionToolUI, useNoshToolkit } from '@/utils/cookbook/noshToolkit';
import type { RecipeCollectionBrowseResult } from '@/utils/cookbook/recipeCollection';

jest.mock('@assistant-ui/react-native', () => ({ defineToolkit: jest.fn(() => () => ({})) }));
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


describe('recipe proposal failures', () => {
  it.each(['scale_servings', 'substitute_ingredient', 'update_page_data'])(
    '%s resolves its pending tool when the recipe is unavailable', (name) => {
      renderHook(() => useNoshToolkit({ recipeGraph: null, onCommitRecipeAction: jest.fn() }));
      const definitions = (defineToolkit as jest.Mock).mock.calls.at(-1)[0];
      const addResult = jest.fn();
      const view = render(definitions[name].render({ args: {}, addResult }));
      expect(addResult).toHaveBeenCalledWith({ error: 'No recipe in focus' });
      expect(addResult).toHaveBeenCalledTimes(1);
      const newCallback = jest.fn();
      view.rerender(definitions[name].render({ args: {}, addResult: newCallback }));
      expect(newCallback).not.toHaveBeenCalled();
    },
  );
});
