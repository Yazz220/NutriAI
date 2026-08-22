import {
  captureFailure,
  capturePageIdempotencyKey,
  capturePagePolicy,
} from '@/supabase/functions/_shared/capturePolicy';

describe('capture processing policy', () => {
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
    expect(captureFailure(new Error('Extraction unavailable'))).toEqual({
      status: 'needs_attention',
      failureCode: 'processing_failed',
      failureMessage: 'Extraction unavailable',
    });
  });
});
