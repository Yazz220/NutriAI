import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { TypesetterPage } from '@/components/cookbook/typesetter/TypesetterPage';
import type { RecipeGraph } from '@/types/recipeGraph';

jest.mock('@/components/cookbook/typesetter/ArtLayer', () => ({
  ArtLayer: ({ width, height }: { width: number; height: number }) => {
    const { Text } = require('react-native') as typeof import('react-native');
    return <Text testID="art-layer-size">{`${width}x${height}`}</Text>;
  },
}));

jest.mock('@/components/cookbook/typesetter/TextLayer', () => ({
  TextLayer: ({ width, height }: { width: number; height: number }) => {
    const { Text } = require('react-native') as typeof import('react-native');
    return <Text testID="text-layer-size">{`${width}x${height}`}</Text>;
  },
}));

const recipeGraph: RecipeGraph = {
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
};

describe('TypesetterPage', () => {
  it('uses the measured cookbook leaf size in book mode', () => {
    const onRenderReady = jest.fn();
    const view = render(
      <TypesetterPage
        recipeGraph={recipeGraph}
        styleId="vintage-garden"
        templateId="clean-cream"
        bookMode
        onRenderReady={onRenderReady}
      />,
    );

    expect(view.queryByTestId('art-layer-size')).toBeNull();

    fireEvent(view.getByTestId('typesetter-page'), 'layout', {
      nativeEvent: { layout: { width: 252, height: 344, x: 0, y: 0 } },
    });

    expect(view.getByTestId('art-layer-size')).toHaveTextContent('252x344');
    expect(view.getByTestId('text-layer-size')).toHaveTextContent('252x344');
    expect(onRenderReady).toHaveBeenCalledTimes(1);
  });

  it('makes the text-first page capturable before remote art has loaded', () => {
    const onRenderReady = jest.fn();
    const view = render(
      <TypesetterPage
        recipeGraph={recipeGraph}
        artAsset={{
          id: 'art-1',
          pageId: 'page-1',
          artUrl: 'https://example.com/pending-art.png',
          styleId: 'vintage-garden',
          artPrompt: 'A tomato illustration',
          model: 'test-model',
          status: 'generating',
          creditCost: 0,
          createdAt: '2026-08-20T00:00:00.000Z',
        }}
        styleId="vintage-garden"
        templateId="clean-cream"
        bookMode
        onRenderReady={onRenderReady}
      />,
    );

    fireEvent(view.getByTestId('typesetter-page'), 'layout', {
      nativeEvent: { layout: { width: 252, height: 344, x: 0, y: 0 } },
    });

    expect(onRenderReady).toHaveBeenCalledTimes(1);
  });
});
