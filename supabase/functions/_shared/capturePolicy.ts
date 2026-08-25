export type CapturePageResult = 'not_started' | 'generating' | 'ready' | 'failed';

export type ReusableCaptureExtraction = {
  recipeGraph: Record<string, unknown>;
  confidence: number;
  extractionNotes: unknown[];
  inferredFields: unknown[];
};

export function reusableCaptureExtraction(
  capture: Record<string, unknown>,
): ReusableCaptureExtraction | null {
  const recipeGraph = capture.recipe_graph;
  if (typeof recipeGraph !== 'object' || recipeGraph === null || Array.isArray(recipeGraph)) {
    return null;
  }

  return {
    recipeGraph: recipeGraph as Record<string, unknown>,
    confidence: typeof capture.confidence === 'number' ? capture.confidence : 0,
    extractionNotes: Array.isArray(capture.extraction_notes) ? capture.extraction_notes : [],
    inferredFields: Array.isArray(capture.inferred_fields) ? capture.inferred_fields : [],
  };
}

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
