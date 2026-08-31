import type { RecipeGraph } from '@/types/recipeGraph';
import {
  proposeGraphPatch,
  proposeIngredientSubstitution,
  proposeServingScale,
} from '@/utils/cookbook/recipeActions';

function recipe(): RecipeGraph {
  return {
    id: 'recipe-1',
    title: 'Weeknight noodles',
    servings: 4,
    category: 'dinner',
    ingredientGroups: [{
      id: 'ingredients',
      ingredients: [
        { name: 'noodles', quantity: '2', unit: 'cups' },
        { name: 'butter', quantity: '1 1/2', unit: 'tbsp' },
      ],
    }],
    stepGroups: [{
      id: 'steps',
      steps: [{ id: 'step-1', text: 'Cook the noodles.' }],
    }],
    tags: [],
    provenance: { sourceType: 'manual', confidence: 1 },
    createdAt: '2026-08-21T00:00:00.000Z',
    updatedAt: '2026-08-21T00:00:00.000Z',
  };
}

describe('recipe action proposals', () => {
  it('scales a temporary proposal without changing the stored graph', () => {
    const original = recipe();
    const proposal = proposeServingScale(original, 2);

    expect(proposal.proposed.servings).toBe(2);
    expect(proposal.proposed.ingredientGroups[0].ingredients[0].quantity).toBe('1');
    expect(proposal.proposed.ingredientGroups[0].ingredients[1].quantity).toBe('3/4');
    expect(original.servings).toBe(4);
    expect(original.ingredientGroups[0].ingredients[0].quantity).toBe('2');
  });

  it('does not pretend a non-serving yield can be scaled by servings', () => {
    const loaf = { ...recipe(), servings: undefined, yieldText: '1 loaf' };

    expect(() => proposeServingScale(loaf, 2)).toThrow(
      'This recipe does not have a numeric serving count to scale from',
    );
  });

  it('previews a substitution without changing the original ingredient', () => {
    const original = recipe();
    const proposal = proposeIngredientSubstitution(original, {
      ingredientName: 'butter',
      substituteName: 'olive oil',
      substituteQuantity: '1',
      substituteUnit: 'tbsp',
      reason: 'Keeps the recipe dairy-free.',
    });

    expect(proposal.proposed.ingredientGroups[0].ingredients[1]).toMatchObject({
      name: 'olive oil',
      quantity: '1',
      unit: 'tbsp',
    });
    expect(original.ingredientGroups[0].ingredients[1].name).toBe('butter');
    expect(proposal.changes).toContain('Keeps the recipe dairy-free.');
  });

  it('rejects substitutions that do not match a saved ingredient', () => {
    expect(() => proposeIngredientSubstitution(recipe(), {
      ingredientName: 'shrimp',
      substituteName: 'tofu',
    })).toThrow('shrimp was not found');
  });

  it('applies valid patches to a cloned graph and rejects unknown paths', () => {
    const original = recipe();
    const proposal = proposeGraphPatch(original, [{
      path: '/stepGroups/0/steps/0/text',
      value: 'Cook the noodles until tender.',
    }]);

    expect(proposal.proposed.stepGroups[0].steps[0].text).toBe('Cook the noodles until tender.');
    expect(original.stepGroups[0].steps[0].text).toBe('Cook the noodles.');
    expect(() => proposeGraphPatch(original, [{ path: '/missing/value', value: 'x' }]))
      .toThrow('does not exist');
  });
});
