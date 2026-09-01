import {
  captureProgressSteps,
  getCapturePresentation,
  prioritizeCaptureActivity,
} from '@/utils/cookbook/capturePresentation';
import type { RecipeCapture } from '@/utils/cookbook/captureLifecycle';

function capture(overrides: Partial<RecipeCapture> = {}): RecipeCapture {
  return {
    id: 'capture-1',
    userId: 'user-1',
    sourceType: 'url',
    sourcePayload: { input: 'https://example.com/recipe' },
    status: 'processing',
    extractionNotes: [],
    inferredFields: [],
    pageStatus: 'not_started',
    stageCheckpoints: {},
    idempotencyKey: 'capture-request-123456',
    processingAttempt: 1,
    createdAt: '2026-08-23T10:00:00.000Z',
    updatedAt: '2026-08-23T10:00:00.000Z',
    ...overrides,
  };
}

describe('capture presentation', () => {
  it('explains the extraction and page-design phases separately', () => {
    expect(getCapturePresentation(capture())).toMatchObject({
      phase: 'reading',
      label: 'Reading recipe',
    });

    expect(getCapturePresentation(capture({
      recipeGraph: { title: 'Tomato Pasta' } as RecipeCapture['recipeGraph'],
      pageStatus: 'generating',
    }), 'Weeknight Favorites')).toMatchObject({
      phase: 'designing',
      label: 'Designing page',
      title: 'Creating your cookbook page',
      cookbookTitle: 'Weeknight Favorites',
    });
  });

  it('gives destination, failure, and ready states a clear next action', () => {
    expect(getCapturePresentation(capture({ status: 'needs_destination' }))).toMatchObject({
      phase: 'destination',
      label: 'Choose cookbook',
    });
    expect(getCapturePresentation(capture({
      status: 'needs_attention',
      failureMessage: 'The recipe source could not be read.',
    }))).toMatchObject({
      phase: 'attention',
      label: 'Try again',
      detail: 'The recipe source could not be read.',
      action: 'retry',
      actionLabel: 'Try again',
    });
    expect(getCapturePresentation(capture({
      status: 'ready',
      pageStatus: 'ready',
      pageId: 'page-1',
      destinationCookbookId: 'book-1',
    }), 'Family Table')).toMatchObject({
      phase: 'ready',
      label: 'Ready',
      detail: 'Added to Family Table',
    });
  });

  it('asks for a different source when recipe evidence is invalid', () => {
    expect(getCapturePresentation(capture({
      status: 'needs_attention',
      failureCode: 'not_a_recipe',
      failureMessage: 'Provider-specific wording that should not reach the user.',
    }))).toMatchObject({
      phase: 'attention',
      label: 'Check source',
      title: 'This does not look like a recipe',
      detail: 'This source does not appear to contain a recipe. Choose another link, image, video, audio file, or pasted recipe.',
      action: 'replace_source',
      actionLabel: 'Choose another source',
    });

    expect(getCapturePresentation(capture({
      status: 'needs_attention',
      failureCode: 'missing_instructions',
    }))).toMatchObject({
      title: 'Nosh needs a more complete source',
      detail: 'Nosh found ingredients but not enough cooking instructions. Choose a source that includes the method.',
      action: 'replace_source',
    });

    expect(getCapturePresentation(capture({
      status: 'needs_attention',
      failureCode: 'cropped_recipe_image',
    }))).toMatchObject({
      title: 'This recipe image is incomplete',
      detail: 'Part of this recipe is cut off. Choose an image that shows the full ingredient list and cooking method.',
      action: 'replace_source',
    });

    expect(getCapturePresentation(capture({
      status: 'needs_attention',
      failureCode: 'video_source_unsupported',
    }))).toMatchObject({
      title: 'Add the recipe another way',
      action: 'replace_source',
      actionLabel: 'Choose another source',
    });

    expect(getCapturePresentation(capture({
      status: 'needs_attention',
      failureCode: 'url_unavailable',
    }))).toMatchObject({
      title: 'Nosh could not open this recipe page',
      action: 'retry',
      actionLabel: 'Try link again',
    });

    expect(getCapturePresentation(capture({
      status: 'needs_attention',
      failureCode: 'url_access_restricted',
    }))).toMatchObject({
      title: 'This site blocked recipe access',
      action: 'replace_source',
      actionLabel: 'Choose another source',
    });

    expect(getCapturePresentation(capture({
      status: 'needs_attention',
      failureCode: 'video_unavailable',
    }))).toMatchObject({
      title: 'Nosh could not open this video',
      action: 'retry',
      actionLabel: 'Try video again',
    });

    expect(getCapturePresentation(capture({
      status: 'needs_attention',
      sourceType: 'audio',
      failureCode: 'audio_transcription_failed',
    }))).toMatchObject({
      title: 'Nosh could not transcribe this audio',
      action: 'retry',
      actionLabel: 'Try audio again',
    });

    expect(getCapturePresentation(capture({
      status: 'needs_attention',
      sourceType: 'audio',
      failureCode: 'audio_no_speech',
    }))).toMatchObject({
      title: 'Nosh could not hear a recipe',
      action: 'replace_source',
      actionLabel: 'Choose another source',
    });
  });

  it('routes semantic uncertainty to recipe correction instead of source replacement', () => {
    expect(getCapturePresentation(capture({
      status: 'needs_attention',
      failureCode: 'needs_recipe_correction',
      recipeGraph: {
        title: 'Sheet Pan Chicken',
        provenance: {
          qualityAssessment: {
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
              ingredientCount: 4,
              quantifiedIngredientCount: 4,
              stepCount: 1,
              hasYield: true,
              hasCookingTemperature: false,
              hasCookingDuration: true,
            },
          },
        },
      } as RecipeCapture['recipeGraph'],
    }))).toMatchObject({
      phase: 'attention',
      label: 'Check details',
      title: 'Check Sheet Pan Chicken',
      detail: 'The method uses an oven but does not include an oven temperature.',
      action: 'correct_recipe',
      actionLabel: 'Review recipe',
    });
  });

  it('does not expose database implementation details in retryable failures', () => {
    expect(getCapturePresentation(capture({
      status: 'needs_attention',
      failureMessage: 'new row for relation "cookbook_pages" violates check constraint "cookbook_pages_style_id_check"',
    }))).toMatchObject({
      phase: 'attention',
      detail: 'Nosh saved your recipe, but could not finish the page. Please try again.',
    });
  });

  it('explains which technical stage will resume without exposing provider details', () => {
    expect(getCapturePresentation(capture({
      status: 'needs_attention',
      failureCode: 'source_acquisition_failed',
      failureMessage: 'provider returned HTTP 500',
    }))).toMatchObject({
      title: 'Nosh could not read this social video',
      detail: 'The link is still saved. Try reading it again.',
      action: 'retry',
    });

    expect(getCapturePresentation(capture({
      status: 'needs_attention',
      failureCode: 'page_generation_failed',
      failureMessage: 'upstream model returned HTTP 502',
    }))).toMatchObject({
      title: 'Nosh could not finish the cookbook page',
      detail: 'The understood recipe is still saved. Try designing the page again.',
      action: 'retry',
    });

    expect(getCapturePresentation(capture({
      status: 'needs_attention',
      failureCode: 'publication_failed',
      failureMessage: 'database error',
    }))).toMatchObject({
      title: 'The page is ready but was not added',
      detail: 'Try adding the finished page to the cookbook again.',
      action: 'retry',
    });
  });

  it('shows concrete progress without implying an approval step', () => {
    expect(captureProgressSteps(capture())).toEqual([
      { label: 'Source saved', state: 'complete' },
      { label: 'Recipe understood', state: 'active' },
      { label: 'Page added to cookbook', state: 'upcoming' },
    ]);

    expect(captureProgressSteps(capture({
      recipeGraph: { title: 'Tomato Pasta' } as RecipeCapture['recipeGraph'],
      pageStatus: 'generating',
    }))).toEqual([
      { label: 'Source saved', state: 'complete' },
      { label: 'Recipe understood', state: 'complete' },
      { label: 'Page added to cookbook', state: 'active' },
    ]);
  });

  it('keeps active and actionable captures ahead of completed history', () => {
    const result = prioritizeCaptureActivity([
      capture({ id: 'ready', status: 'ready', pageStatus: 'ready', updatedAt: '2026-08-23T12:00:00.000Z' }),
      capture({ id: 'failed', status: 'needs_attention', updatedAt: '2026-08-21T12:00:00.000Z' }),
      capture({ id: 'working', status: 'processing', updatedAt: '2026-08-20T12:00:00.000Z' }),
    ]);

    expect(result.map((item) => item.id)).toEqual(['working', 'failed', 'ready']);
  });
});
