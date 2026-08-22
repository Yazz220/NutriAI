export type CapturePageResult = 'not_started' | 'generating' | 'ready' | 'failed';

export function capturePageIdempotencyKey(captureId: string, attempt: number): string {
  return `capture-page:${captureId}:${Math.max(1, attempt)}`;
}

export function capturePagePolicy(
  hasDestination: boolean,
  result?: 'ready' | 'failed',
): { pageStatus: CapturePageResult; pageWarning: string | null } {
  if (!hasDestination) {
    return { pageStatus: 'not_started', pageWarning: null };
  }
  if (result === 'ready') return { pageStatus: 'ready', pageWarning: null };
  if (result === 'failed') {
    return {
      pageStatus: 'failed',
      pageWarning: 'Nosh could not finish this recipe page. Try again.',
    };
  }
  return { pageStatus: 'generating', pageWarning: null };
}

export function captureFailure(message: unknown): {
  status: 'needs_attention';
  failureCode: 'processing_failed';
  failureMessage: string;
} {
  return {
    status: 'needs_attention',
    failureCode: 'processing_failed',
    failureMessage: message instanceof Error ? message.message : 'Recipe capture failed',
  };
}
