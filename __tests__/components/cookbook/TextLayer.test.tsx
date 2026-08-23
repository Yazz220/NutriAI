import React from 'react';
import { render } from '@testing-library/react-native';
import { TextLayer } from '@/components/cookbook/typesetter/TextLayer';
import { getTypesetterLayoutConfig } from '@/constants/typesetterLayouts';
import { getTypesetterStyleConfig } from '@/constants/typesetterStyles';
import type { RecipeGraph } from '@/types/recipeGraph';

const recipeGraph: RecipeGraph = {
  id: 'graph-with-duplicate-group-ids',
  title: 'Layered Pasta',
  servings: 4,
  category: 'dinner',
  ingredientGroups: [
    { id: 'default', label: 'Sauce', ingredients: [{ name: 'tomatoes' }] },
    { id: 'default', label: 'Pasta', ingredients: [{ name: 'spaghetti' }] },
  ],
  stepGroups: [
    { id: 'default', label: 'Sauce', steps: [{ id: 'step-1', text: 'Cook the sauce.' }] },
    { id: 'default', label: 'Pasta', steps: [{ id: 'step-1', text: 'Boil the pasta.' }] },
  ],
  tags: [],
  provenance: { sourceType: 'image', confidence: 0.9 },
  createdAt: '2026-08-23T00:00:00.000Z',
  updatedAt: '2026-08-23T00:00:00.000Z',
};

describe('TextLayer', () => {
  it('renders legacy recipe graphs with duplicate group ids without duplicate React keys', () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    render(
      <TextLayer
        width={390}
        height={520}
        recipeGraph={recipeGraph}
        styleConfig={getTypesetterStyleConfig('vintage-garden')}
        layoutConfig={getTypesetterLayoutConfig('clean-cream')}
        contentStartY={120}
      />,
    );

    const duplicateKeyWarnings = errorSpy.mock.calls.filter(([message]) =>
      typeof message === 'string' && message.includes('same key'),
    );
    errorSpy.mockRestore();

    expect(duplicateKeyWarnings).toHaveLength(0);
  });
});
