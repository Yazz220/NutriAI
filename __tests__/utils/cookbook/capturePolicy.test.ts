import {
  captureEvidencePolicy,
  captureFailure,
  capturePageIdempotencyKey,
  capturePagePolicy,
  captureQualityPolicy,
  reusableCaptureExtraction,
} from '@/supabase/functions/_shared/capturePolicy';
import type { RecipeQualityAssessment } from '@/supabase/functions/_shared/recipeQuality';
import { RECIPE_GRAPH_NORMALIZATION_STAGE_VERSION } from '@/supabase/functions/_shared/captureStages';

describe('capture processing policy', () => {
  it('allows page creation only for accepted recipe evidence', () => {
    expect(captureEvidencePolicy({
      outcome: 'recipe',
      reasonCode: 'none',
      diagnostic: 'Ingredients and method are present.',
      recipeGraph: { title: 'Tomato Toast' },
    })).toEqual({
      accepted: true,
      recipeGraph: { title: 'Tomato Toast' },
      legacy: false,
    });
  });

  it('turns rejected evidence into a stable non-retryable source failure', () => {
    expect(captureEvidencePolicy({
      outcome: 'not_recipe',
      reasonCode: 'blank_or_empty_source',
      diagnostic: 'The image is uniformly black.',
      recipeGraph: null,
    })).toEqual({
      accepted: false,
      failureCode: 'blank_or_empty_source',
      failureMessage: 'This source appears blank or contains too little visible information. Choose a clearer source.',
      outcome: 'not_recipe',
      diagnostic: 'The image is uniformly black.',
    });
  });

  it('preserves video adapter failures without exposing provider errors', () => {
    expect(captureEvidencePolicy({
      outcome: 'insufficient_evidence',
      reasonCode: 'video_source_unsupported',
      diagnostic: 'The URL returned a social HTML page.',
      recipeGraph: null,
    })).toEqual({
      accepted: false,
      failureCode: 'video_source_unsupported',
      failureMessage: 'Nosh can currently read public YouTube links and direct MP4, MOV, MPEG, or WebM files. For other social videos, share screenshots or paste the recipe text.',
      outcome: 'insufficient_evidence',
      diagnostic: 'The URL returned a social HTML page.',
    });
  });

  it('temporarily accepts the old successful extractor shape during deployment', () => {
    expect(captureEvidencePolicy({ recipeGraph: { title: 'Legacy response' } })).toEqual({
      accepted: true,
      recipeGraph: { title: 'Legacy response' },
      legacy: true,
    });
  });

  it('pauses before page creation when semantic checks need user confirmation', () => {
    const assessment: RecipeQualityAssessment = {
      version: 1,
      decision: 'needs_correction',
      issues: [{
        key: 'missing_baking_temperature:stepGroups.0.steps.0.text',
        code: 'missing_baking_temperature',
        severity: 'blocking',
        message: 'The method uses an oven but does not include an oven temperature.',
        fieldPaths: ['stepGroups.0.steps.0.text'],
        confirmed: false,
      }],
      metrics: {
        ingredientCount: 3,
        quantifiedIngredientCount: 3,
        stepCount: 1,
        hasYield: true,
        hasCookingTemperature: false,
        hasCookingDuration: true,
      },
    };

    expect(captureQualityPolicy(assessment)).toEqual({
      accepted: false,
      failureCode: 'needs_recipe_correction',
      failureMessage: 'The method uses an oven but does not include an oven temperature.',
      issueCount: 1,
    });
  });

  it('allows warnings to continue into page generation', () => {
    const assessment: RecipeQualityAssessment = {
      version: 1,
      decision: 'publish_with_note',
      issues: [{
        key: 'missing_cooking_duration:stepGroups.0.steps.0.text',
        code: 'missing_cooking_duration',
        severity: 'warning',
        message: 'The method does not include a cooking duration.',
        fieldPaths: ['stepGroups.0.steps.0.text'],
        confirmed: false,
      }],
      metrics: {
        ingredientCount: 3,
        quantifiedIngredientCount: 3,
        stepCount: 1,
        hasYield: false,
        hasCookingTemperature: false,
        hasCookingDuration: false,
      },
    };

    expect(captureQualityPolicy(assessment)).toEqual({ accepted: true });
  });

  it('gives each retry attempt its own stable complete-page request key', () => {
    expect(capturePageIdempotencyKey('capture-1', 1)).toBe('capture-page:capture-1:1');
    expect(capturePageIdempotencyKey('capture-1', 2)).toBe('capture-page:capture-1:2');
  });

  it('waits for a destination before starting the page', () => {
    expect(capturePagePolicy(false)).toEqual({
      pageStatus: 'not_started',
      pageWarning: null,
    });
  });

  it('publishes only a ready complete page and makes failure retryable', () => {
    expect(capturePagePolicy(true, 'ready')).toEqual({ pageStatus: 'ready', pageWarning: null });
    expect(capturePagePolicy(true, 'failed')).toEqual({
      pageStatus: 'failed',
      pageWarning: 'Nosh could not finish this recipe page. Try again.',
    });
  });

  it('sends extraction and page failures to one needs-attention state', () => {
    expect(captureFailure(new Error('Provider timeout'), 'extraction')).toEqual({
      status: 'needs_attention',
      failureCode: 'extraction_failed',
      failureMessage: 'Nosh could not understand this recipe right now. Try again.',
      failedStage: 'extraction',
      diagnostic: 'Provider timeout',
    });
  });

  it('reuses a saved RecipeGraph when retrying a downstream page failure', () => {
    expect(reusableCaptureExtraction({
      recipe_graph: { title: 'Tomato Toast' },
      confidence: 0.92,
      extraction_notes: ['Normalized servings'],
      inferred_fields: ['category'],
    })).toEqual({
      recipeGraph: { title: 'Tomato Toast' },
      confidence: 0.92,
      extractionNotes: ['Normalized servings'],
      inferredFields: ['category'],
      reuseReason: 'legacy_normalization',
    });
  });

  it('reuses a graph only when its normalization contract is compatible', () => {
    const capture = {
      recipe_graph: { title: 'Tomato Toast' },
      stage_checkpoints: {
        normalization: {
          version: RECIPE_GRAPH_NORMALIZATION_STAGE_VERSION,
          completedAt: '2026-08-30T12:00:00.000Z',
        },
      },
    };
    expect(reusableCaptureExtraction(capture)?.reuseReason).toBe('compatible_normalization');
    expect(reusableCaptureExtraction({
      ...capture,
      stage_checkpoints: { normalization: { version: 'recipe-graph-normalization-v99' } },
    })).toBeNull();
  });

  it('keeps the graph bound to an existing page even after the normalization contract changes', () => {
    expect(reusableCaptureExtraction({
      recipe_graph: { title: 'Tomato Toast' },
      pending_page_id: 'page-1',
      stage_checkpoints: { normalization: { version: 'recipe-graph-normalization-v0' } },
    })?.reuseReason).toBe('page_already_created');
  });

  it('extracts again when a failed capture has no saved RecipeGraph', () => {
    expect(reusableCaptureExtraction({ recipe_graph: null })).toBeNull();
  });
});
