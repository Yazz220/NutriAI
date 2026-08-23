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
