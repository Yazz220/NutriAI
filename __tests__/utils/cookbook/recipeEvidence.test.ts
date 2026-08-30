import {
  isRecipeEvidenceFailureCode,
  normalizeRecipeEvidenceDecision,
  recipeEvidenceFeedback,
} from '@/supabase/functions/_shared/recipeEvidence';

describe('recipe evidence decision contract', () => {
  it('accepts a recipe only when the canonical graph is present', () => {
    expect(normalizeRecipeEvidenceDecision({
      outcome: 'recipe',
      reasonCode: 'none',
      diagnostic: 'Visible ingredient list and method.',
      recipeGraph: { title: 'Tomato Toast' },
    })).toEqual({
      outcome: 'recipe',
      reasonCode: 'none',
      diagnostic: 'Visible ingredient list and method.',
      recipeGraph: { title: 'Tomato Toast' },
    });

    expect(() => normalizeRecipeEvidenceDecision({
      outcome: 'recipe',
      reasonCode: 'none',
      diagnostic: '',
      recipeGraph: null,
    })).toThrow('Accepted recipe evidence must include a Recipe Graph');
  });

  it('represents wrong and blank files without inventing a recipe', () => {
    expect(normalizeRecipeEvidenceDecision({
      outcome: 'not_recipe',
      reasonCode: 'not_a_recipe',
      diagnostic: 'The image shows a landscape.',
      recipeGraph: null,
    })).toMatchObject({ outcome: 'not_recipe', reasonCode: 'not_a_recipe', recipeGraph: null });

    expect(normalizeRecipeEvidenceDecision({
      outcome: 'not_recipe',
      reasonCode: 'blank_or_empty_source',
      diagnostic: 'The image is uniformly black.',
      recipeGraph: null,
    })).toMatchObject({ outcome: 'not_recipe', reasonCode: 'blank_or_empty_source', recipeGraph: null });
  });

  it('keeps incomplete recipes distinct from non-recipes', () => {
    expect(normalizeRecipeEvidenceDecision({
      outcome: 'insufficient_evidence',
      reasonCode: 'missing_instructions',
      diagnostic: 'Ingredients are visible but no method is present.',
      recipeGraph: null,
    })).toMatchObject({ outcome: 'insufficient_evidence', reasonCode: 'missing_instructions' });

    expect(() => normalizeRecipeEvidenceDecision({
      outcome: 'not_recipe',
      reasonCode: 'missing_instructions',
      diagnostic: '',
      recipeGraph: null,
    })).toThrow('Non-recipe evidence returned an incompatible reason');
  });

  it('owns deterministic user feedback outside the model response', () => {
    expect(isRecipeEvidenceFailureCode('unreadable_source')).toBe(true);
    expect(isRecipeEvidenceFailureCode('none')).toBe(false);
    expect(recipeEvidenceFeedback('unreadable_source')).toBe(
      'Nosh could not read enough of this recipe. Choose a sharper, well-lit source with the full recipe visible.',
    );
  });

  it('distinguishes a blurry image from a visibly cropped recipe', () => {
    expect(normalizeRecipeEvidenceDecision({
      outcome: 'insufficient_evidence',
      reasonCode: 'blurry_or_low_resolution_image',
      diagnostic: 'The recipe text is present but illegible at this resolution.',
      recipeGraph: null,
    })).toMatchObject({ reasonCode: 'blurry_or_low_resolution_image' });

    expect(normalizeRecipeEvidenceDecision({
      outcome: 'insufficient_evidence',
      reasonCode: 'cropped_recipe_image',
      diagnostic: 'The method continues below the lower image edge.',
      recipeGraph: null,
    })).toMatchObject({ reasonCode: 'cropped_recipe_image' });

    expect(recipeEvidenceFeedback('cropped_recipe_image')).toBe(
      'Part of this recipe is cut off. Choose an image that shows the full ingredient list and cooking method.',
    );
  });

  it('keeps video acquisition failures separate from recipe-content failures', () => {
    for (const reasonCode of [
      'video_source_unsupported',
      'video_unavailable',
      'video_too_large',
    ] as const) {
      expect(normalizeRecipeEvidenceDecision({
        outcome: 'insufficient_evidence',
        reasonCode,
        diagnostic: 'The video adapter could not produce readable evidence.',
        recipeGraph: null,
      })).toMatchObject({ outcome: 'insufficient_evidence', reasonCode });
    }

    expect(recipeEvidenceFeedback('video_source_unsupported')).toContain('public YouTube links');
  });

  it('keeps audio acquisition and transcription failures deterministic', () => {
    for (const reasonCode of [
      'audio_source_unsupported',
      'audio_too_large',
      'audio_no_speech',
      'audio_transcription_failed',
    ] as const) {
      expect(normalizeRecipeEvidenceDecision({
        outcome: 'insufficient_evidence',
        reasonCode,
        diagnostic: 'The audio adapter could not produce a usable transcript.',
        recipeGraph: null,
      })).toMatchObject({ outcome: 'insufficient_evidence', reasonCode });
    }

    expect(recipeEvidenceFeedback('audio_source_unsupported')).toContain('MP3');
    expect(recipeEvidenceFeedback('audio_transcription_failed')).toContain('try again');
  });
});
