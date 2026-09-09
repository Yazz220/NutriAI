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

  it('preserves ingredient text, parsed amounts, instruction sections, and source yield', () => {
    const fallback = recipeJsonLdToDraft({
      '@type': 'Recipe',
      '@id': 'https://example.com/bread#recipe',
      name: 'Country loaf',
      recipeYield: '1 loaf',
      recipeIngredient: [
        '3 1/2 cups bread flour',
        '1 teaspoon fine sea salt',
        'water, as needed',
      ],
      recipeInstructions: [
        {
          '@type': 'HowToSection',
          name: 'Mix the dough',
          itemListElement: [
            { '@type': 'HowToStep', text: 'Combine the flour and salt.' },
          ],
        },
        {
          '@type': 'HowToSection',
          name: 'Bake',
          itemListElement: [
            { '@type': 'HowToStep', text: 'Bake until deeply browned.' },
          ],
        },
      ],
    }, 'https://example.com/shared', {
      canonicalUrl: 'https://example.com/bread',
      sourceTitle: 'Country loaf recipe',
      sourceLanguage: 'en',
      fetchedAt: '2026-08-30T01:00:00.000Z',
      sourceContentHash: 'sha256:test',
      candidateCount: 1,
      selectionReason: 'single_candidate',
    });

    expect(fallback?.servings).toBeUndefined();
    expect(fallback?.yieldText).toBe('1 loaf');
    expect(fallback?.ingredientGroups[0].ingredients).toEqual([
      expect.objectContaining({
        rawText: '3 1/2 cups bread flour',
        quantity: '3 1/2',
        unit: 'cups',
        name: 'bread flour',
      }),
      expect.objectContaining({
        rawText: '1 teaspoon fine sea salt',
        quantity: '1',
        unit: 'teaspoon',
        name: 'fine sea salt',
      }),
      expect.objectContaining({
        rawText: 'water, as needed',
        name: 'water',
        preparation: 'as needed',
      }),
    ]);
    expect(fallback?.stepGroups.map((group) => group.label)).toEqual(['Mix the dough', 'Bake']);
    expect(fallback?.provenance).toMatchObject({
      sourceUrl: 'https://example.com/shared',
      canonicalUrl: 'https://example.com/bread',
      sourceTitle: 'Country loaf recipe',
      sourceLanguage: 'en',
      parserId: 'schema-org-json-ld',
      parserVersion: 2,
      structuredDataId: 'https://example.com/bread#recipe',
      sourceContentHash: 'sha256:test',
    });
  });

  it('removes a publisher summary method when complete directions are also present', () => {
    const fallback = recipeJsonLdToDraft({
      '@type': 'Recipe',
      name: 'One-pan dinner',
      recipeIngredient: ['2 chicken thighs', '500 g potatoes'],
      recipeInstructions: [
        {
          '@type': 'HowToSection',
          name: 'Abbreviated Recipe',
          itemListElement: [
            { '@type': 'HowToStep', text: 'Season and roast everything.' },
          ],
        },
        {
          '@type': 'HowToSection',
          name: 'Full Recipe',
          itemListElement: [
            { '@type': 'HowToStep', text: 'Season the chicken and potatoes.' },
            { '@type': 'HowToStep', text: 'Roast until the chicken is cooked through.' },
          ],
        },
      ],
    }, sourceUrl);

    expect(fallback?.stepGroups).toEqual([{
      id: 'full-recipe',
      label: '',
      steps: [
        { id: 'step-2', text: 'Season the chicken and potatoes.' },
        { id: 'step-3', text: 'Roast until the chicken is cooked through.' },
      ],
    }]);
  });

  it('sets numeric servings only when the structured yield means servings', () => {
    const servingsRecipe = recipeJsonLdToDraft({
      '@type': 'Recipe',
      name: 'Soup',
      recipeYield: 'Serves 6',
      recipeIngredient: ['1 litre stock'],
      recipeInstructions: ['Simmer.'],
    }, sourceUrl);
    const cookiesRecipe = recipeJsonLdToDraft({
      '@type': 'Recipe',
      name: 'Cookies',
      recipeYield: 'Makes 24 cookies',
      recipeIngredient: ['2 cups flour'],
      recipeInstructions: ['Bake.'],
    }, sourceUrl);
    const rangeRecipe = recipeJsonLdToDraft({
      '@type': 'Recipe',
      name: 'Flexible stew',
      recipeYield: '6-8 servings',
      recipeIngredient: ['1 pot stew'],
      recipeInstructions: ['Simmer.'],
    }, sourceUrl);

    expect(servingsRecipe).toMatchObject({ servings: 6, yieldText: 'Serves 6' });
    expect(cookiesRecipe?.servings).toBeUndefined();
    expect(cookiesRecipe?.yieldText).toBe('Makes 24 cookies');
    expect(rangeRecipe?.servings).toBeUndefined();
    expect(rangeRecipe?.yieldText).toBe('6-8 servings');
  });

  it('keeps compact and dual-unit ingredient facts out of the ingredient name', () => {
    const fallback = recipeJsonLdToDraft({
      '@type': 'Recipe',
      name: 'Chicken Fajitas',
      recipeYield: '4 servings',
      recipeIngredient: [
        '1/4 cup / 65 ml lime juice',
        '1/4 cup / 65 ml orange juice ((Note 1 for subs))',
        '700g / 1.2 lb skinless chicken thighs or 2 large chicken breasts (, halved horizontally (Note 2))',
        '2 garlic cloves (, minced)',
        '3 capsicums / bell peppers (, deseeded and sliced (red, yellow or green))',
      ],
      recipeInstructions: ['Cook the fajitas.'],
    }, sourceUrl);

    expect(fallback?.ingredientGroups[0].ingredients).toEqual([
      expect.objectContaining({
        quantity: '1/4',
        unit: 'cup',
        name: 'lime juice',
        rawText: '1/4 cup / 65 ml lime juice',
      }),
      expect.objectContaining({
        quantity: '1/4',
        unit: 'cup',
        name: 'orange juice (Note 1 for subs)',
        rawText: '1/4 cup / 65 ml orange juice ((Note 1 for subs))',
      }),
      expect.objectContaining({
        quantity: '700',
        unit: 'g',
        name: 'skinless chicken thighs or 2 large chicken breasts',
        preparation: 'halved horizontally (Note 2)',
      }),
      expect.objectContaining({
        quantity: '2',
        name: 'garlic cloves',
        preparation: 'minced',
      }),
      expect.objectContaining({
        quantity: '3',
        name: 'capsicums / bell peppers',
        preparation: 'deseeded and sliced (red, yellow or green)',
      }),
    ]);
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
