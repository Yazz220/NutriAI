import React from 'react';
import { render } from '@testing-library/react-native';
import {
  buildRecipePageAccessibilityLabel,
  PageCanvas,
  resolveFocusedPageWidth,
} from '@/components/cookbook/PageCanvas';
import type { CookbookPage } from '@/types/cookbook';
import type { RecipeGraph } from '@/types/recipeGraph';

const recipeGraph: RecipeGraph = {
  id: 'recipe-1',
  title: 'Tomato Pasta',
  description: 'A quick weeknight pasta.',
  servings: 4,
  prepTimeMinutes: 15,
  cookTimeMinutes: 60,
  category: 'dinner',
  ingredientGroups: [{
    id: 'main',
    ingredients: [{
      name: 'tomatoes',
      quantity: '2',
      unit: 'cups',
      preparation: 'chopped',
    }],
  }],
  stepGroups: [{
    id: 'method',
    steps: [{ id: 'step-1', heading: 'Simmer', text: 'Cook until glossy.' }],
  }],
  notes: ['Taste before serving.'],
  tags: [],
  provenance: { sourceType: 'url', confidence: 1 },
  createdAt: '2026-08-25T00:00:00.000Z',
  updatedAt: '2026-08-25T00:00:00.000Z',
};

const page: CookbookPage = {
  id: 'page-1',
  cookbookId: 'book-1',
  recipeId: 'recipe-1',
  title: 'Tomato Pasta',
  section: 'dinner',
  pageNumber: 1,
  sortOrder: 0,
  recipeGraph,
  pageImage: {
    id: 'image-1',
    pageId: 'page-1',
    imageUrl: 'https://example.com/tomato-pasta.png',
    styleId: 'illustrated',
    styleRevision: 1,
    generationPrompt: 'test',
    model: 'test',
    status: 'ready',
    creditCost: 0,
    createdAt: '2026-08-25T00:00:00.000Z',
  },
};

describe('PageCanvas accessibility', () => {
  it('uses available height on larger screens while preserving phone margins', () => {
    expect(resolveFocusedPageWidth(390, 844)).toBeLessThanOrEqual(358);
    expect(resolveFocusedPageWidth(768, 1024)).toBeGreaterThan(430);
    expect(resolveFocusedPageWidth(1920, 1080)).toBeLessThanOrEqual(560);
  });

  it('exposes canonical recipe content behind a generated image page', () => {
    const label = buildRecipePageAccessibilityLabel(page);

    expect(label).toContain('Tomato Pasta.');
    expect(label).toContain('Serves 4.');
    expect(label).toContain('Prep time 15 minutes.');
    expect(label).toContain('Cook time 1 hour.');
    expect(label).toContain('2 cups tomatoes, chopped.');
    expect(label).toContain('Step 1. Simmer. Cook until glossy.');
    expect(label).toContain('Notes. Taste before serving.');

    const screen = render(<PageCanvas page={page} />);
    expect(screen.getByLabelText(label).props.accessibilityRole).toBe('image');
  });

  it('gives image-only sample pages a useful fallback label', () => {
    const samplePage = { ...page, recipeGraph: undefined, pageImage: undefined, imageAsset: 1 };
    expect(buildRecipePageAccessibilityLabel(samplePage)).toBe(
      'Tomato Pasta. Designed cookbook page.',
    );
  });

  it('keeps a generated page in its artwork-loading state instead of rendering legacy text', () => {
    const awaitingArtwork = {
      ...page,
      selectedVersionId: 'image-1',
      pageImage: undefined,
    };

    const screen = render(<PageCanvas page={awaitingArtwork} />);

    expect(screen.getByText('Page artwork is being prepared.')).toBeTruthy();
  });
});
