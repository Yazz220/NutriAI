import {
  approvedPages,
  canTransitionCapture,
  isCaptureReadyToOpen,
  isCaptureProcessing,
  isCaptureStale,
  markRecipeCaptureRetryQueued,
  normalizeCaptureDestinationCookbookId,
  normalizeRecipeCaptureStatus,
  reconcileCapturePage,
  getCapturePageSyncKey,
} from '@/utils/cookbook/captureLifecycle';
import type { CookbookPage } from '@/types/cookbook';

function page(id: string, sortOrder: number, lifecycleStatus: 'processing' | 'approved'): CookbookPage {
  return {
    id,
    cookbookId: 'book-1',
    recipeId: `recipe-${id}`,
    title: id,
    section: 'dinner',
    pageNumber: sortOrder + 1,
    sortOrder,
    lifecycleStatus,
  };
}

describe('recipe capture lifecycle', () => {
  it('has one processing state with only destination, success, and attention exits', () => {
    expect(canTransitionCapture('processing', 'needs_destination')).toBe(true);
    expect(canTransitionCapture('processing', 'ready')).toBe(true);
    expect(canTransitionCapture('processing', 'needs_attention')).toBe(true);
    expect(canTransitionCapture('needs_destination', 'processing')).toBe(true);
    expect(canTransitionCapture('needs_attention', 'processing')).toBe(true);
    expect(canTransitionCapture('ready', 'processing')).toBe(false);
  });

  it('polls and reclaims only stale processing work', () => {
    expect(isCaptureProcessing('processing')).toBe(true);
    expect(isCaptureProcessing('needs_attention')).toBe(false);
    const now = Date.parse('2026-08-21T12:15:00.000Z');
    expect(isCaptureStale({ status: 'processing', processingStartedAt: '2026-08-21T12:00:00.000Z' }, now)).toBe(true);
    expect(isCaptureStale({ status: 'processing', processingStartedAt: '2026-08-21T12:10:00.000Z' }, now)).toBe(false);
    expect(isCaptureStale({
      status: 'processing',
      processingStartedAt: undefined,
      updatedAt: '2026-08-21T12:00:00.000Z',
    }, now)).toBe(true);
    expect(isCaptureStale({
      status: 'processing',
      processingStartedAt: undefined,
      updatedAt: '2026-08-21T12:10:00.000Z',
    }, now)).toBe(false);
    expect(isCaptureStale({ status: 'needs_attention', processingStartedAt: '2026-08-21T12:00:00.000Z' }, now)).toBe(false);
  });

  it('keeps a timed-out retry visibly processing until polling reconciles the server result', () => {
    const queuedAt = '2026-09-01T00:00:00.000Z';
    const capture = {
      id: 'capture-1',
      userId: 'user-1',
      sourceType: 'audio' as const,
      sourcePayload: {},
      status: 'needs_attention' as const,
      extractionNotes: [],
      inferredFields: [],
      pageStatus: 'not_started' as const,
      failureCode: 'quality_failed',
      failureMessage: 'Try again.',
      failedStage: 'quality' as const,
      stageCheckpoints: {},
      idempotencyKey: 'request-1',
      processingAttempt: 1,
      createdAt: queuedAt,
      updatedAt: queuedAt,
    };

    expect(markRecipeCaptureRetryQueued(capture, queuedAt)).toMatchObject({
      status: 'processing',
      failureCode: undefined,
      failureMessage: undefined,
      failedStage: undefined,
      processingStartedAt: queuedAt,
    });
  });

  it('reconciles a published page without duplicating it', () => {
    const published = page('published', 1, 'approved');
    expect(reconcileCapturePage([page('first', 0, 'approved'), published], published))
      .toEqual([page('first', 0, 'approved'), published]);
  });

  it('does not refetch a page when polling only changes capture timestamps', () => {
    const capture = {
      id: 'capture-1',
      pageId: 'page-1',
      status: 'processing' as const,
      pageStatus: 'generating' as const,
      updatedAt: '2026-09-03T10:00:00.000Z',
    };

    expect(getCapturePageSyncKey(capture)).toBe(
      getCapturePageSyncKey({ ...capture, updatedAt: '2026-09-03T10:00:02.500Z' }),
    );
    expect(getCapturePageSyncKey({ ...capture, pageStatus: 'ready' })).not.toBe(
      getCapturePageSyncKey(capture),
    );
  });

  it('keeps processing pages out of the reader', () => {
    expect(approvedPages([page('approved', 0, 'approved'), page('processing', 1, 'processing')]))
      .toEqual([page('approved', 0, 'approved')]);
  });

  it('does not send the local demo cookbook id to the UUID-backed capture pipeline', () => {
    expect(normalizeCaptureDestinationCookbookId('demo-cookbook')).toBeUndefined();
    expect(normalizeCaptureDestinationCookbookId('87dbb66c-2f58-4c06-a859-522b44b118a3'))
      .toBe('87dbb66c-2f58-4c06-a859-522b44b118a3');
  });

  it('maps retired accepted and extraction states back to processing', () => {
    expect(normalizeRecipeCaptureStatus({ status: 'saved', pageStatus: 'not_started' }))
      .toBe('processing');
    expect(normalizeRecipeCaptureStatus({ status: 'reading', pageStatus: 'not_started' }))
      .toBe('processing');
  });

  it('requires a published page before presenting capture success', () => {
    const base = {
      status: 'ready' as const,
      destinationCookbookId: '87dbb66c-2f58-4c06-a859-522b44b118a3',
      pageId: 'e9ca5f4a-fad0-4ae4-bf26-d795fd008488',
      pageStatus: 'ready' as const,
    };

    expect(isCaptureReadyToOpen(base)).toBe(true);
    expect(isCaptureReadyToOpen({ ...base, pageId: undefined })).toBe(false);
    expect(isCaptureReadyToOpen({ ...base, pageStatus: 'generating' })).toBe(false);
    expect(isCaptureReadyToOpen({ ...base, status: 'saved' as never })).toBe(false);
  });
});
