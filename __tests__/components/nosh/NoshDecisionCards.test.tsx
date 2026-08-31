import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { CollectionActionCard } from '@/components/nosh/collection/CollectionActionCard';
import { RecipeActionPreviewCard } from '@/components/nosh/recipe/RecipeActionPreviewCard';
import type { RecipeGraph } from '@/types/recipeGraph';

jest.mock('@/lib/supabase', () => ({ supabase: {} }));
const mockRequestPageAccess = jest.fn().mockResolvedValue(true);
const mockRefreshSubscription = jest.fn().mockResolvedValue(null);
jest.mock('@/components/subscription/SubscriptionHost', () => ({
  useSubscriptionUi: () => ({ requestPageAccess: mockRequestPageAccess }),
}));
jest.mock('@/contexts/NoshSubscriptionContext', () => ({
  useNoshSubscription: () => ({
    access: {
      features: { designedPages: { remaining: 4 } },
    },
    refresh: mockRefreshSubscription,
  }),
}));

const recipe = { title: 'Tomato pasta', servings: 2 } as RecipeGraph;

describe('Nosh decision cards', () => {
  beforeEach(() => {
    mockRequestPageAccess.mockReset().mockResolvedValue(true);
    mockRefreshSubscription.mockClear();
  });
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

  it('preserves a recipe proposal when saving is blocked by the page allowance', async () => {
    mockRequestPageAccess.mockResolvedValueOnce(false);
    const onCommit = jest.fn();
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
        onResult={jest.fn()}
      />,
    );

    fireEvent.press(screen.getByRole('button', { name: 'Save this change to the current recipe' }));

    await waitFor(() => expect(mockRequestPageAccess).toHaveBeenCalledWith('agent_recipe_save'));
    expect(onCommit).not.toHaveBeenCalled();
    expect(screen.getByText('Make it for four')).toBeTruthy();
  });

  it('retries a server-authoritative page limit once with the same proposal and a fresh key', async () => {
    const proposal = {
      kind: 'scale-servings' as const,
      title: 'Make it for four',
      summary: 'Two servings to four',
      changes: ['Ingredient quantities recalculated'],
      original: recipe,
      proposed: { ...recipe, servings: 4 },
    };
    const onCommit = jest
      .fn()
      .mockRejectedValueOnce(new Error('generate-page-art failed: designed_page_limit_reached'))
      .mockResolvedValueOnce({ pageId: 'page-2' });
    const onResult = jest.fn();
    const screen = render(
      <RecipeActionPreviewCard
        proposal={proposal}
        onCommit={onCommit}
        onResult={onResult}
      />,
    );

    fireEvent.press(screen.getByRole('button', { name: 'Save this change to the current recipe' }));

    await waitFor(() => expect(onCommit).toHaveBeenCalledTimes(2));
    expect(mockRequestPageAccess).toHaveBeenNthCalledWith(1, 'agent_recipe_save');
    expect(mockRequestPageAccess).toHaveBeenNthCalledWith(2, 'agent_recipe_save', { refresh: true });
    expect(onCommit.mock.calls[0][0]).toBe(proposal);
    expect(onCommit.mock.calls[1][0]).toBe(proposal);
    expect(onCommit.mock.calls[0][1]).toBe('update');
    expect(onCommit.mock.calls[1][1]).toBe('update');
    expect(onCommit.mock.calls[0][2]).not.toBe(onCommit.mock.calls[1][2]);
    expect(onResult).toHaveBeenCalledWith(expect.objectContaining({
      accepted: true,
      mode: 'update',
      pageId: 'page-2',
    }));
    expect(mockRefreshSubscription).toHaveBeenCalledTimes(1);
  });

  it('keeps the proposal without retrying when forced access is dismissed or still limited', async () => {
    mockRequestPageAccess
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);
    const onCommit = jest
      .fn()
      .mockRejectedValueOnce(new Error('generate-page-art failed: designed_page_limit_reached'));
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
        onResult={jest.fn()}
      />,
    );

    fireEvent.press(screen.getByRole('button', { name: 'Save this change to the current recipe' }));

    await waitFor(() => expect(mockRequestPageAccess).toHaveBeenNthCalledWith(
      2,
      'agent_recipe_save',
      { refresh: true },
    ));
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Make it for four')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Save this change to the current recipe' }))
      .toBeEnabled();
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
