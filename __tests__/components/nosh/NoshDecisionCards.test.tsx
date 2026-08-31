import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { CollectionActionCard } from '@/components/nosh/collection/CollectionActionCard';
import { RecipeActionPreviewCard } from '@/components/nosh/recipe/RecipeActionPreviewCard';
import type { RecipeGraph } from '@/types/recipeGraph';

jest.mock('@/lib/supabase', () => ({ supabase: {} }));

const recipe = { title: 'Tomato pasta', servings: 2 } as RecipeGraph;

describe('Nosh decision cards', () => {
  it('keeps recipe changes reversible until the user chooses an action', () => {
    const onCommit = jest.fn();
    const onResult = jest.fn();
    const screen = render(
      <RecipeActionPreviewCard
        proposal={{
          kind: 'scale-servings',
          title: 'Make it for four',
          summary: 'Two servings to four',
          changes: ['Ingredient quantities recalculated'],
          original: recipe,
          proposed: { ...recipe, servings: 4 },
        }}
        onCommit={onCommit}
        onResult={onResult}
      />,
    );

    expect(screen.getByRole('button', { name: 'Use this recipe change for this cooking session' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Save this change to the current recipe' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Save this change as a new recipe version' })).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Cancel this recipe change' }));
    expect(onCommit).not.toHaveBeenCalled();
    expect(onResult).toHaveBeenCalledWith({ accepted: false, mode: 'cancelled' });
  });

  it('offers retry and cancellation when a collection preview fails', async () => {
    const onPreview = jest
      .fn()
      .mockRejectedValueOnce(new Error('Preview unavailable'))
      .mockResolvedValueOnce({
        recipeTitle: 'Tomato pasta',
        sourceCookbook: { id: 'source', title: 'Weeknights' },
        destinationCookbook: { id: 'destination', title: 'Favorites' },
      });
    const onResult = jest.fn();
    const screen = render(
      <CollectionActionCard
        action="copy"
        pageId="page-1"
        destinationCookbookId="destination"
        onPreview={onPreview}
        onCommit={jest.fn()}
        onResult={onResult}
      />,
    );

    expect(await screen.findByText('Preview unavailable')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Try loading the collection change again' }));

    await waitFor(() => expect(onPreview).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('Weeknights')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Cancel collection change' }));
    expect(onResult).toHaveBeenCalledWith({ cancelled: true });
  });
});
