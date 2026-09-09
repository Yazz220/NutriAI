import {
  normalizeRecipeEvidenceDecision,
  recipeEvidenceFeedback,
  type RecipeEvidenceFailureCode,
} from './recipeEvidence.ts';
import type { RecipeQualityAssessment } from './recipeQuality.ts';
import {
  captureCheckpoint,
  normalizedGraphCanResume,
  RECIPE_GRAPH_NORMALIZATION_STAGE_VERSION,
  type CaptureCheckpointName,
} from './captureStages.ts';

export type CapturePageResult = 'not_started' | 'generating' | 'ready' | 'failed';

export type CaptureEvidencePolicyResult =
  | { accepted: true; recipeGraph: Record<string, unknown>; legacy: boolean }
  | {
      accepted: false;
      failureCode: RecipeEvidenceFailureCode;
      failureMessage: string;
      outcome: 'not_recipe' | 'insufficient_evidence';
      diagnostic: string;
    };

export function captureEvidencePolicy(
  extraction: Record<string, unknown>,
): CaptureEvidencePolicyResult {
  if ('outcome' in extraction) {
    const decision = normalizeRecipeEvidenceDecision(extraction);
    if (decision.outcome === 'recipe') {
      return { accepted: true, recipeGraph: decision.recipeGraph, legacy: false };
    }
    return {
      accepted: false,
      failureCode: decision.reasonCode,
      failureMessage: recipeEvidenceFeedback(decision.reasonCode),
      outcome: decision.outcome,
      diagnostic: decision.diagnostic,
    };
  }

  const recipeGraph = extraction.recipeGraph;
  if (typeof recipeGraph === 'object' && recipeGraph !== null && !Array.isArray(recipeGraph)) {
    return { accepted: true, recipeGraph: recipeGraph as Record<string, unknown>, legacy: true };
  }
  throw new Error('Folio could not read this recipe');
}

export type CaptureQualityPolicyResult =
  | { accepted: true }
  | {
      accepted: false;
      failureCode: 'needs_recipe_correction';
      failureMessage: string;
      issueCount: number;
    };

export function captureQualityPolicy(
  assessment: RecipeQualityAssessment,
): CaptureQualityPolicyResult {
  if (assessment.decision !== 'needs_correction') return { accepted: true };
  const openIssues = assessment.issues.filter((issue) => (
    issue.severity === 'blocking' && !issue.confirmed
  ));
  return {
    accepted: false,
    failureCode: 'needs_recipe_correction',
    failureMessage: openIssues[0]?.message ?? 'Check the recipe details before Folio creates the page.',
    issueCount: openIssues.length,
  };
}

export type ReusableCaptureExtraction = {
  recipeGraph: Record<string, unknown>;
  confidence: number;
  extractionNotes: unknown[];
  inferredFields: unknown[];
  reuseReason: 'compatible_normalization' | 'legacy_normalization' | 'page_already_created';
};

export function reusableCaptureExtraction(
  capture: Record<string, unknown>,
): ReusableCaptureExtraction | null {
  const recipeGraph = capture.recipe_graph;
  if (typeof recipeGraph !== 'object' || recipeGraph === null || Array.isArray(recipeGraph)) {
    return null;
  }
  if (!normalizedGraphCanResume(capture)) return null;

  const normalizationVersion = captureCheckpoint(capture, 'normalization')?.version;
  const reuseReason = typeof capture.pending_page_id === 'string'
    ? 'page_already_created'
    : normalizationVersion === RECIPE_GRAPH_NORMALIZATION_STAGE_VERSION
      ? 'compatible_normalization'
      : 'legacy_normalization';

  return {
    recipeGraph: recipeGraph as Record<string, unknown>,
    confidence: typeof capture.confidence === 'number' ? capture.confidence : 0,
    extractionNotes: Array.isArray(capture.extraction_notes) ? capture.extraction_notes : [],
    inferredFields: Array.isArray(capture.inferred_fields) ? capture.inferred_fields : [],
    reuseReason,
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
      pageWarning: 'Folio could not finish this recipe page. Try again.',
    };
  }
  return { pageStatus: 'generating', pageWarning: null };
}

export type CaptureFailureStage = CaptureCheckpointName | 'destination';

const FAILURE_CODE_BY_STAGE = {
  source: 'source_read_failed',
  acquisition: 'source_acquisition_failed',
  transcription: 'audio_transcription_failed',
  extraction: 'extraction_failed',
  normalization: 'extraction_failed',
  quality: 'quality_assessment_failed',
  destination: 'destination_unavailable',
  page_generation: 'page_generation_failed',
  publication: 'publication_failed',
} as const satisfies Record<CaptureFailureStage, string>;

const FAILURE_MESSAGE_BY_STAGE = {
  source: 'Folio could not read the saved recipe source. Try again.',
  acquisition: 'Folio could not read this social video right now. The link is saved, so you can try again.',
  transcription: 'Folio could not transcribe this audio. Try again.',
  extraction: 'Folio could not understand this recipe right now. Try again.',
  normalization: 'Folio could not structure this recipe right now. Try again.',
  quality: 'Folio could not verify the recipe details right now. Try again.',
  destination: 'Folio could not open the selected cookbook. Choose it again or try another cookbook.',
  page_generation: 'Folio understood the recipe, but could not finish its cookbook page. Try again.',
  publication: 'Folio finished the page, but could not add it to the cookbook. Try again.',
} as const satisfies Record<CaptureFailureStage, string>;

export function captureFailure(message: unknown, stage: CaptureFailureStage = 'extraction'): {
  status: 'needs_attention';
  failureCode: typeof FAILURE_CODE_BY_STAGE[CaptureFailureStage] | 'designed_page_limit_reached';
  failureMessage: string;
  failedStage: CaptureFailureStage;
  diagnostic: string;
} {
  const diagnostic = message instanceof Error
    ? message.message
    : String(message ?? 'Recipe capture failed');
  if (diagnostic === 'designed_page_limit_reached') {
    return {
      status: 'needs_attention',
      failureCode: 'designed_page_limit_reached',
      failureMessage: 'You have used all of your designed pages for now.',
      failedStage: 'page_generation',
      diagnostic,
    };
  }

  return {
    status: 'needs_attention',
    failureCode: FAILURE_CODE_BY_STAGE[stage],
    failureMessage: FAILURE_MESSAGE_BY_STAGE[stage],
    failedStage: stage,
    diagnostic,
  };
}
