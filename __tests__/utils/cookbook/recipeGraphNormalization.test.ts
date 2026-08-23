import {
  normalizeRecipeGraphDraft,
  recipeJsonLdToDraft,
  validateNormalizedRecipeGraph,
} from '../../../supabase/functions/_shared/recipeGraphNormalization';

describe('recipe graph normalization', () => {
  const sourceUrl = 'https://therecipecritic.com/very-berry-cheesecake-salad/';
  const jsonLd = {
    '@type': 'Recipe',
    name: 'Very Berry Cheesecake Salad',
    recipeYield: '6 servings',
    recipeCategory: ['Dessert', 'Salad'],
    recipeIngredient: [
      '8 ounces cream cheese, softened',
      '1/2 cup sugar',
    ],
    recipeInstructions: [
      { '@type': 'HowToStep', text: 'Beat the cream cheese and sugar until smooth.' },
      { '@type': 'HowToStep', text: 'Fold in the berries and chill.' },
    ],
  };

  it('preserves JSON-LD instructions when the model omits stepGroups', () => {
    const fallback = recipeJsonLdToDraft(jsonLd, sourceUrl);
    const normalized = normalizeRecipeGraphDraft({
      title: 'Very Berry Cheesecake Salad',
      servings: 6,
      category: 'desserts',
      ingredientGroups: fallback?.ingredientGroups,
      tags: ['berries'],
      provenance: { sourceType: 'url', confidence: 0.94 },
    }, fallback, 'url', sourceUrl);

    expect(normalized.stepGroups[0].steps).toHaveLength(2);
    expect(normalized.stepGroups[0].steps[0]).toMatchObject({
      id: 'step-1',
      text: 'Beat the cream cheese and sugar until smooth.',
    });
    expect(() => validateNormalizedRecipeGraph(normalized)).not.toThrow();
  });

  it('repairs common top-level ingredients and instructions aliases', () => {
    const normalized = normalizeRecipeGraphDraft({
      title: 'Toast',
      servings: 1,
      category: 'breakfast',
      ingredients: ['2 slices bread'],
      instructions: ['Toast the bread.'],
      provenance: { confidence: 0.8 },
    }, null, 'text');

    expect(normalized.ingredientGroups[0].ingredients).toEqual([{ name: '2 slices bread' }]);
    expect(normalized.stepGroups[0].steps).toEqual([{ id: 'step-1', text: 'Toast the bread.' }]);
    expect(() => validateNormalizedRecipeGraph(normalized)).not.toThrow();
  });

  it('repairs duplicate model-generated group and step ids', () => {
    const normalized = normalizeRecipeGraphDraft({
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
    }, null, 'image');

    expect(new Set(normalized.ingredientGroups.map((group) => group.id)).size)
      .toBe(normalized.ingredientGroups.length);
    expect(new Set(normalized.stepGroups.map((group) => group.id)).size)
      .toBe(normalized.stepGroups.length);
    const stepIds = normalized.stepGroups.flatMap((group) =>
      Array.isArray(group.steps)
        ? group.steps.map((step) => (step as { id?: unknown }).id)
        : [],
    );
    expect(new Set(stepIds).size).toBe(stepIds.length);
  });
});
