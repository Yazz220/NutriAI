export const CAPTURE_CHECKPOINT_NAMES = [
  'source',
  'acquisition',
  'transcription',
  'extraction',
  'normalization',
  'quality',
  'page_generation',
  'publication',
] as const;

export type CaptureCheckpointName = typeof CAPTURE_CHECKPOINT_NAMES[number];

export const LEGACY_CAPTURE_STAGE_VERSION = 'legacy-unversioned';

export const CAPTURE_SOURCE_STAGE_VERSIONS = {
  url: 'url-source-v1',
  text: 'text-source-v1',
  image: 'image-source-v1',
  video: 'video-source-v2',
  audio: 'audio-source-v1',
} as const;

export const AUDIO_TRANSCRIPTION_STAGE_VERSION = 'audio-transcription-v1';
export const VIDEO_TRANSCRIPTION_STAGE_VERSION = 'video-transcription-v2';
export const RECIPE_EVIDENCE_ACQUISITION_STAGE_VERSION = 'recipe-evidence-acquisition-v1';
export const RECIPE_EXTRACTION_STAGE_VERSION = 'recipe-extraction-v3';
export const RECIPE_GRAPH_NORMALIZATION_STAGE_VERSION = 'recipe-graph-normalization-v2';
export const RECIPE_PAGE_GENERATION_STAGE_VERSION = 'complete-recipe-page-4x5-v4';
export const RECIPE_CAPTURE_PUBLICATION_STAGE_VERSION = 'recipe-capture-publication-v1';

export type CaptureSourceType = keyof typeof CAPTURE_SOURCE_STAGE_VERSIONS;

export interface CaptureStageCheckpoint extends Record<string, unknown> {
  version: string;
  completedAt?: string;
}

export type CaptureStageCheckpoints = Partial<Record<CaptureCheckpointName, CaptureStageCheckpoint>>;

type CaptureRowLike = {
  stage_checkpoints?: unknown;
  pending_page_id?: unknown;
};

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

export function captureStageCheckpoints(value: unknown): CaptureStageCheckpoints {
  const checkpoints = record(value);
  if (!checkpoints) return {};

  return CAPTURE_CHECKPOINT_NAMES.reduce<CaptureStageCheckpoints>((result, stage) => {
    const checkpoint = record(checkpoints[stage]);
    if (typeof checkpoint?.version === 'string' && checkpoint.version.trim()) {
      result[stage] = checkpoint as CaptureStageCheckpoint;
    }
    return result;
  }, {});
}

export function captureCheckpoint(
  capture: CaptureRowLike,
  stage: CaptureCheckpointName,
): CaptureStageCheckpoint | null {
  return captureStageCheckpoints(capture.stage_checkpoints)[stage] ?? null;
}

export function captureCheckpointIsCompatible(
  capture: CaptureRowLike,
  stage: CaptureCheckpointName,
  expectedVersion: string,
  options: { allowLegacy?: boolean } = {},
): boolean {
  const version = captureCheckpoint(capture, stage)?.version;
  return version === expectedVersion
    || (options.allowLegacy === true && (
      version === LEGACY_CAPTURE_STAGE_VERSION || version === undefined
    ));
}

export function recipeQualityStageVersion(assessmentVersion: number): string {
  return `recipe-quality-v${assessmentVersion}`;
}

export function sourceStageVersion(sourceType: unknown): string {
  return typeof sourceType === 'string' && sourceType in CAPTURE_SOURCE_STAGE_VERSIONS
    ? CAPTURE_SOURCE_STAGE_VERSIONS[sourceType as CaptureSourceType]
    : LEGACY_CAPTURE_STAGE_VERSION;
}

export function normalizedGraphCanResume(capture: CaptureRowLike): boolean {
  if (typeof capture.pending_page_id === 'string') return true;
  return captureCheckpointIsCompatible(
    capture,
    'normalization',
    RECIPE_GRAPH_NORMALIZATION_STAGE_VERSION,
    { allowLegacy: true },
  );
}
