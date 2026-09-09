import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { RecipeRevisionSheet } from '@/components/cookbook/RecipeRevisionSheet';
import { ArtworkActionCard } from '@/components/nosh/recipe/ArtworkActionCard';
import type { CookbookPage, GeneratedRecipePage } from '@/types/cookbook';
import type { RecipeGraph } from '@/types/recipeGraph';

const mockRequestPageAccess = jest.fn().mockResolvedValue(true);
const mockRefreshSubscription = jest.fn().mockResolvedValue(null);

jest.mock('@/components/subscription/SubscriptionHost', () => ({
  useSubscriptionUi: () => ({ requestPageAccess: mockRequestPageAccess }),
}));
jest.mock('@/contexts/NoshSubscriptionContext', () => ({
  useNoshSubscription: () => ({
    access: { features: { designedPages: { remaining: 4 } } },
    refresh: mockRefreshSubscription,
  }),
}));

const graph: RecipeGraph = {
  id: 'recipe-1',
  title: 'Tomato pasta',
  servings: 2,
  category: 'dinner',
  ingredientGroups: [{
    id: 'main',
    ingredients: [{ name: 'tomatoes', quantity: '2' }],
  }],
  stepGroups: [{
    id: 'main',
    steps: [{ id: 'step-1', text: 'Simmer the sauce.' }],
  }],
  tags: [],
  createdAt: '2026-08-31T12:00:00.000Z',
  updatedAt: '2026-08-31T12:00:00.000Z',
};

const page: CookbookPage = {
  id: 'page-1',
  cookbookId: 'book-1',
  recipeId: graph.id,
  title: graph.title,
  section: 'dinner',
  pageNumber: 1,
  sortOrder: 0,
  recipeGraph: graph,
};

const candidate: GeneratedRecipePage = {
  id: 'version-2',
  pageId: page.id,
  imageUrl: 'https://example.com/page.png',
  styleId: 'illustrated',
  styleRevision: 1,
  generationPrompt: 'Warm illustrated page',
  model: 'test-model',
  status: 'ready',
  creditCost: 0,
  createdAt: '2026-08-31T12:00:00.000Z',
};

describe('designed-page server race recovery', () => {
  beforeEach(() => {
    mockRequestPageAccess.mockReset().mockResolvedValue(true);
    mockRefreshSubscription.mockClear();
  });

  it('retries a recipe redesign once with the preserved direction and a fresh key', async () => {
    const onGenerate = jest
      .fn()
      .mockRejectedValueOnce(new Error('generate-page-art failed: designed_page_limit_reached'))
      .mockResolvedValueOnce(candidate);
    const screen = render(
      <RecipeRevisionSheet
        visible
        mode="design"
        page={page}
        onClose={jest.fn()}
        onGenerate={onGenerate}
        onUse={jest.fn()}
      />,
    );

    fireEvent.changeText(await screen.findByLabelText('Design direction'), 'Less illustration');
    fireEvent.press(screen.getByRole('button', { name: 'Create page preview' }));

    await waitFor(() => expect(onGenerate).toHaveBeenCalledTimes(2));
    expect(mockRequestPageAccess).toHaveBeenNthCalledWith(1, 'page_redesign');
    expect(mockRequestPageAccess).toHaveBeenNthCalledWith(2, 'page_redesign', { refresh: true });
    expect(onGenerate.mock.calls[0][1]).toEqual(onGenerate.mock.calls[1][1]);
    expect(onGenerate.mock.calls[0][2]).toBe('Less illustration');
    expect(onGenerate.mock.calls[1][2]).toBe('Less illustration');
    expect(onGenerate.mock.calls[0][3]).not.toBe(onGenerate.mock.calls[1][3]);
    expect(await screen.findByRole('button', { name: 'Use new page' })).toBeTruthy();
    expect(mockRefreshSubscription).toHaveBeenCalledTimes(1);
  });

  it('keeps recipe redesign direction without retrying when access remains blocked', async () => {
    mockRequestPageAccess
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);
    const onGenerate = jest
      .fn()
      .mockRejectedValueOnce(new Error('generate-page-art failed: designed_page_limit_reached'));
    const screen = render(
      <RecipeRevisionSheet
        visible
        mode="design"
        page={page}
        onClose={jest.fn()}
        onGenerate={onGenerate}
        onUse={jest.fn()}
      />,
    );

    fireEvent.changeText(await screen.findByLabelText('Design direction'), 'Keep the pencil border');
    fireEvent.press(screen.getByRole('button', { name: 'Create page preview' }));

    await waitFor(() => expect(mockRequestPageAccess).toHaveBeenNthCalledWith(
      2,
      'page_redesign',
      { refresh: true },
    ));
    expect(onGenerate).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText('Design direction').props.value).toBe('Keep the pencil border');
    expect(screen.getByRole('button', { name: 'Create page preview' })).toBeEnabled();
  });

  it('retries agent artwork once with the preserved instruction and a fresh key', async () => {
    const onGenerate = jest
      .fn()
      .mockRejectedValueOnce(new Error('generate-page-art failed: designed_page_limit_reached'))
      .mockResolvedValueOnce(candidate);
    const screen = render(
      <ArtworkActionCard
        instruction="Warm botanical border"
        hasCurrentArtwork
        onGenerate={onGenerate}
        onSelect={jest.fn()}
        onResult={jest.fn()}
      />,
    );

    fireEvent.press(screen.getByRole('button', { name: 'Generate recipe page' }));

    await waitFor(() => expect(onGenerate).toHaveBeenCalledTimes(2));
    expect(mockRequestPageAccess).toHaveBeenNthCalledWith(1, 'agent_artwork');
    expect(mockRequestPageAccess).toHaveBeenNthCalledWith(2, 'agent_artwork', { refresh: true });
    expect(onGenerate.mock.calls[0][0]).toBe('Warm botanical border');
    expect(onGenerate.mock.calls[1][0]).toBe('Warm botanical border');
    expect(onGenerate.mock.calls[0][1]).not.toBe(onGenerate.mock.calls[1][1]);
    expect(await screen.findByRole('button', { name: 'Use new recipe page' })).toBeTruthy();
    expect(mockRefreshSubscription).toHaveBeenCalledTimes(1);
  });

  it('keeps agent artwork direction without retrying when access remains blocked', async () => {
    mockRequestPageAccess
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);
    const onGenerate = jest
      .fn()
      .mockRejectedValueOnce(new Error('generate-page-art failed: designed_page_limit_reached'));
    const screen = render(
      <ArtworkActionCard
        instruction="Warm botanical border"
        hasCurrentArtwork
        onGenerate={onGenerate}
        onSelect={jest.fn()}
        onResult={jest.fn()}
      />,
    );

    fireEvent.press(screen.getByRole('button', { name: 'Generate recipe page' }));

    await waitFor(() => expect(mockRequestPageAccess).toHaveBeenNthCalledWith(
      2,
      'agent_artwork',
      { refresh: true },
    ));
    expect(onGenerate).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Warm botanical border')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Generate recipe page' })).toBeEnabled();
  });
});
