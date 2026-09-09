import {
  cookbookRecipeNotes,
  toCanonicalCookbookRecipe,
} from '@/supabase/functions/_shared/canonicalRecipe';

describe('canonical cookbook recipe', () => {
  it('keeps cooking content while leaving extraction diagnostics on the capture', () => {
    const recipe = toCanonicalCookbookRecipe({
      title: 'Lemon Pasta',
      description: 'A bright weeknight pasta.',
      ingredientGroups: [{ id: 'default', ingredients: [{ name: 'lemon', quantity: '1' }] }],
      stepGroups: [{ id: 'default', steps: [{ id: 'step-1', text: 'Toss with the sauce.' }] }],
      notes: [
        'Reserve a little pasta water to loosen the sauce.',
        'The source did not explicitly state how much salt to use.',
        'Folio inferred the cooking time from the video.',
        'Nosh found no transcript in this legacy capture.',
      ],
      provenance: {
        sourceType: 'video',
        confidence: 0.72,
        extractionNotes: ['No transcript was available.'],
        qualityAssessment: { decision: 'publish_with_note' },
      },
      diagnostic: 'The image was slightly blurry.',
    });

    expect(recipe).toMatchObject({
      title: 'Lemon Pasta',
      description: 'A bright weeknight pasta.',
      notes: ['Reserve a little pasta water to loosen the sauce.'],
    });
    expect(recipe).not.toHaveProperty('provenance');
    expect(recipe).not.toHaveProperty('diagnostic');
  });

  it('drops source-analysis notes without treating ordinary cooking guidance as a warning', () => {
    expect(cookbookRecipeNotes([
      'Store leftovers in the refrigerator for up to three days.',
      'The amount was not specified in the source.',
      'The transcript was unclear.',
    ])).toEqual(['Store leftovers in the refrigerator for up to three days.']);
  });
});
