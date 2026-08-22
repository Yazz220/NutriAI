import {
  approvedPages,
  canTransitionCapture,
  isCaptureReadyToOpen,
  isCaptureProcessing,
  isCaptureStale,
  normalizeCaptureDestinationCookbookId,
  normalizeRecipeCaptureStatus,
  reconcileCapturePage,
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
    expect(isCaptureStale({ status: 'needs_attention', processingStartedAt: '2026-08-21T12:00:00.000Z' }, now)).toBe(false);
  });

  it('reconciles a published page without duplicating it', () => {
    const published = page('published', 1, 'approved');
    expect(reconcileCapturePage([page('first', 0, 'approved'), published], published))
      .toEqual([page('first', 0, 'approved'), published]);
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
