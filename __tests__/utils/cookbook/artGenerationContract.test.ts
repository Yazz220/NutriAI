import {
  buildOpenRouterImageRequest,
  buildRecipePagePrompt,
  stableCookbookSeed,
} from '../../../supabase/functions/_shared/artGeneration';

describe('complete recipe page generation contract', () => {
  const recipe = {
    title: 'Roasted Tomato Pasta',
    cuisine: 'Italian',
    servings: 4,
    ingredientGroups: [{
      label: 'Pasta',
      ingredients: [
        { name: 'tomatoes', quantity: '2', unit: 'cups' },
        { name: 'rigatoni', quantity: '12', unit: 'oz' },
        { name: 'basil' },
      ],
    }],
    stepGroups: [{ label: 'Method', steps: [{ text: 'Roast the tomatoes.' }] }],
  };

  it('asks for one flat, readable page containing exact recipe copy', () => {
    const { prompt, payload } = buildRecipePagePrompt(recipe, 'sage-linen');

    expect(prompt).toContain('one finished, flat, portrait cookbook page');
    expect(prompt).toContain('Typeset every supplied line exactly once');
    expect(prompt).toContain('Roasted Tomato Pasta');
    expect(prompt).toContain('2 cups tomatoes');
    expect(prompt).toContain('Roast the tomatoes.');
    expect(payload.kind).toBe('complete-recipe-page');
    expect(payload.recipe.ingredientGroups[0].lines).toEqual([
      '2 cups tomatoes',
      '12 oz rigatoni',
      'basil',
    ]);
  });

  it('locks the style revision and supplies visual anchors without borrowing their text', () => {
    const reference = 'https://example.test/sage-anchor.png';
    const { prompt, payload } = buildRecipePagePrompt(recipe, 'sage-linen', {
      styleRevision: 3,
      styleReferences: [reference],
    });

    expect(prompt).toContain('Locked cookbook identity, revision 3');
    expect(prompt).toContain('Never copy their recipe content');
    expect(payload.styleReferences).toEqual([reference]);
  });

  it('requests a portrait 3:4 page from Qwen Image 3 Pro', () => {
    const request = buildOpenRouterImageRequest(
      'qwen/qwen-image-3-pro',
      'Complete pasta page',
      stableCookbookSeed('9fc84d73-cab8-4f8e-840e-c871f91cbb65'),
      [],
    );

    expect(request).toMatchObject({
      model: 'qwen/qwen-image-3-pro',
      aspect_ratio: '3:4',
      resolution: '2K',
      n: 1,
    });
    expect(request).toHaveProperty('seed');
    expect(request).not.toHaveProperty('output_format');
  });

  it('supports a stable seed for tests without forcing one in production', () => {
    const cookbookId = '9fc84d73-cab8-4f8e-840e-c871f91cbb65';
    const productionRequest = buildOpenRouterImageRequest('qwen/qwen-image-3-pro', 'Complete pasta page');

    expect(stableCookbookSeed(cookbookId)).toBe(stableCookbookSeed(cookbookId));
    expect(stableCookbookSeed(cookbookId)).not.toBe(stableCookbookSeed('af5eff3e-a9e0-4884-925f-bdd03e824cc7'));
    expect(productionRequest).not.toHaveProperty('seed');
  });
});
