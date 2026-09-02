import {
  buildOpenRouterImageRequest,
  buildRecipePagePrompt,
  stableCookbookSeed,
} from '../../../supabase/functions/_shared/artGeneration';
import { resolveRecipePageStyleVersion } from '@/constants/recipePageStyles';

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
    expect(prompt).toContain('canvas edges are the physical page edges');
    expect(prompt).toContain('Do not place a smaller page inside the canvas');
    expect(prompt).toContain('Typeset every supplied line exactly once');
    expect(prompt).toContain('Roasted Tomato Pasta');
    expect(prompt).toContain('2 cups tomatoes');
    expect(prompt).toContain('Roast the tomatoes.');
    expect(payload.kind).toBe('complete-recipe-page');
    expect(payload.generationContractVersion).toBe('complete-recipe-page-4x5-v4');
    expect(payload.pageInstructions.length).toBeLessThan(1000);
    expect(payload.recipe.ingredientGroups[0].lines).toEqual([
      '2 cups tomatoes',
      '12 oz rigatoni',
      'basil',
    ]);
  });

  it('locks the style revision and supplies visual anchors without borrowing their text', () => {
    const reference = 'https://example.test/editorial-anchor.png';
    const { prompt, payload } = buildRecipePagePrompt(recipe, 'editorial', {
      styleRevision: 2,
      styleReferences: [reference],
    });

    expect(prompt).toContain('Locked cookbook identity editorial, immutable revision 2');
    expect(prompt).toContain('Never copy their recipe content');
    expect(payload.styleReferences).toEqual([reference]);
  });

  it('rejects an unknown revision instead of silently changing a shipped style', () => {
    expect(() => buildRecipePagePrompt(recipe, 'illustrated', { styleRevision: 99 }))
      .toThrow('Unsupported recipe page style version illustrated@99');
  });

  it('requests the canonical portrait 4:5 page from Qwen Image 3 Pro', () => {
    const request = buildOpenRouterImageRequest(
      'qwen/qwen-image-3-pro',
      'Complete pasta page',
      stableCookbookSeed('9fc84d73-cab8-4f8e-840e-c871f91cbb65'),
      [],
    );

    expect(request).toMatchObject({
      model: 'qwen/qwen-image-3-pro',
      aspect_ratio: '4:5',
      resolution: '2K',
      n: 1,
    });
    expect(request).toHaveProperty('seed');
    expect(request).not.toHaveProperty('output_format');
  });

  it('records the geometry revision with every page prompt', () => {
    const { payload } = buildRecipePagePrompt(recipe, 'illustrated');

    expect(payload.geometryId).toBe('nosh-cookbook-4x5-v1');
    expect(payload.geometryRevision).toBe(1);
    expect(payload.output.aspectRatio).toBe('4:5');
  });

  it('prints the source yield without relabeling it as people-servings', () => {
    const { payload } = buildRecipePagePrompt({
      ...recipe,
      servings: undefined,
      yieldText: 'Makes 1 loaf',
    }, 'illustrated');

    expect(payload.recipe.metadata).toContain('Makes 1 loaf');
    expect(payload.recipe.metadata).not.toContain('Serves 1');
  });

  it('keeps extraction commentary out of the finished cookbook page', () => {
    const { prompt, payload } = buildRecipePagePrompt({
      ...recipe,
      notes: [
        'Serve with grated Parmesan.',
        'The source did not explicitly state the simmering time.',
        'Folio inferred the temperature from the image.',
      ],
    }, 'illustrated');

    expect(payload.recipe.notes).toEqual(['Serve with grated Parmesan.']);
    expect(prompt).toContain('Serve with grated Parmesan.');
    expect(prompt).not.toContain('did not explicitly state');
    expect(prompt).not.toContain('Folio inferred');
    expect(prompt).toContain('Never print extraction analysis');
  });

  it('keeps blog prose and duplicate abbreviated methods off the finished page', () => {
    const { prompt, payload } = buildRecipePagePrompt({
      ...recipe,
      description: 'A long publisher introduction about why this dish is fabulous, what to serve with it, and the story behind the recipe.',
      stepGroups: [
        {
          label: 'ABBREVIATED RECIPE:',
          steps: [{ text: 'Roast the tomatoes, then toss everything together.' }],
        },
        {
          label: 'FULL RECIPE:',
          steps: [
            { text: 'Roast the tomatoes.' },
            { text: 'Toss with the rigatoni and basil.' },
          ],
        },
      ],
    }, 'bold');

    expect(payload.recipe.description).toBeUndefined();
    expect(payload.recipe.stepGroups).toEqual([{
      label: undefined,
      steps: [
        '1. Roast the tomatoes.',
        '2. Toss with the rigatoni and basil.',
      ],
    }]);
    expect(prompt).not.toContain('publisher introduction');
    expect(prompt).not.toContain('ABBREVIATED RECIPE');
    expect(prompt).not.toContain('FULL RECIPE');
  });

  it('supports a stable seed for tests without forcing one in production', () => {
    const cookbookId = '9fc84d73-cab8-4f8e-840e-c871f91cbb65';
    const productionRequest = buildOpenRouterImageRequest('qwen/qwen-image-3-pro', 'Complete pasta page');

    expect(stableCookbookSeed(cookbookId)).toBe(stableCookbookSeed(cookbookId));
    expect(stableCookbookSeed(cookbookId)).not.toBe(stableCookbookSeed('af5eff3e-a9e0-4884-925f-bdd03e824cc7'));
    expect(productionRequest).not.toHaveProperty('seed');
  });

  it.each([
    ['studio', 1, 'natural daylight food photography'],
    ['editorial', 2, 'cinematic close-cropped food photography'],
    ['illustrated', 2, 'absolutely no photography'],
    ['heritage', 2, 'wood engraving or copperplate'],
    ['journal', 1, 'instant-film food photograph'],
    ['bold', 1, 'screenprint or risograph'],
  ])('gives %s a distinctive polished visual contract', (styleId, revision, signature) => {
    const profile = resolveRecipePageStyleVersion(styleId as never, revision);
    const { prompt, payload } = buildRecipePagePrompt(recipe, styleId, { styleRevision: revision });

    expect(profile?.imagery).toContain(signature);
    expect(prompt).toContain(profile?.paper);
    expect(prompt).toContain(profile?.typography);
    expect(payload.styleId).toBe(styleId);
  });

  it('adapts composition to recipe density without changing page geometry', () => {
    const { payload } = buildRecipePagePrompt(recipe, 'studio', { styleRevision: 1 });

    expect(payload.density).toBe('sparse');
    expect(payload.styleDescriptor).toContain('Composition for sparse recipe density');
    expect(payload.output.aspectRatio).toBe('4:5');
  });
});
