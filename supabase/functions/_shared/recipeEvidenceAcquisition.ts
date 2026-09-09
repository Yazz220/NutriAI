import type { RecipeEvidenceFailureCode } from './recipeEvidence.ts';
import {
  EXTERNAL_SOCIAL_VIDEO_PLATFORMS,
  socialVideoPlatformSupportsExternalAcquisition,
  type ExternalSocialVideoPlatform,
  type SocialVideoPlatform,
} from './videoSource.ts';
import { RECIPE_EVIDENCE_ACQUISITION_STAGE_VERSION } from './captureStages.ts';

export { RECIPE_EVIDENCE_ACQUISITION_STAGE_VERSION };
export const SOCIAL_VIDEO_EVIDENCE_BUNDLE_VERSION = 'social-video-evidence-v1';

export {
  EXTERNAL_SOCIAL_VIDEO_PLATFORMS,
  socialVideoPlatformSupportsExternalAcquisition,
};
export type { ExternalSocialVideoPlatform };

type JsonRecord = Record<string, unknown>;

export interface AcquiredVideoObservation {
  text: string;
  timestamp?: string;
}

export interface AcquiredVideoEvidenceBundle {
  version: typeof SOCIAL_VIDEO_EVIDENCE_BUNDLE_VERSION;
  source: {
    kind: 'social_video';
    platform: ExternalSocialVideoPlatform;
    canonicalUrl: string;
  };
  metadata: {
    title?: string;
    description?: string;
    creator?: string;
    durationSeconds?: number;
    publishedAt?: string;
  };
  observations: {
    visibleText: AcquiredVideoObservation[];
    spokenRecipeDetails: AcquiredVideoObservation[];
    ingredients: string[];
    actions: AcquiredVideoObservation[];
    timingsAndTemperatures: string[];
    conflicts: string[];
  };
}

export interface ExternalVideoAcquisitionState {
  provider: string;
  adapterVersion: string;
  jobId: string;
  platform: ExternalSocialVideoPlatform;
  canonicalUrl: string;
  startedAt: string;
  pollCount: number;
  metadata?: AcquiredVideoEvidenceBundle['metadata'];
}

export type ExternalVideoAcquisitionResult =
  | { status: 'pending'; state: ExternalVideoAcquisitionState }
  | { status: 'ready'; evidence: AcquiredVideoEvidenceBundle; state: ExternalVideoAcquisitionState }
  | {
      status: 'unavailable';
      reasonCode: Extract<RecipeEvidenceFailureCode, 'video_source_unsupported' | 'video_unavailable'>;
      diagnostic: string;
    };

export interface ExternalVideoEvidenceAdapter {
  readonly id: string;
  readonly version: string;
  supports(platform: SocialVideoPlatform): platform is ExternalSocialVideoPlatform;
  start(input: {
    platform: ExternalSocialVideoPlatform;
    canonicalUrl: string;
  }): Promise<ExternalVideoAcquisitionResult>;
  poll(state: ExternalVideoAcquisitionState): Promise<ExternalVideoAcquisitionResult>;
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function boundedString(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.replace(/\0/g, '').trim().slice(0, maxLength);
  return normalized || undefined;
}

function boundedStrings(value: unknown, maxItems: number, maxLength: number): string[] {
  if (!Array.isArray(value)) return [];
  const result: string[] = [];
  for (const candidate of value.slice(0, maxItems)) {
    const normalized = boundedString(candidate, maxLength);
    if (normalized) result.push(normalized);
  }
  return result;
}

function boundedObservations(value: unknown): AcquiredVideoObservation[] {
  if (!Array.isArray(value)) return [];
  const result: AcquiredVideoObservation[] = [];
  for (const candidate of value.slice(0, 80)) {
    const item = isRecord(candidate) ? candidate : null;
    const text = boundedString(item?.text, 1_000);
    if (!text) continue;
    const timestamp = boundedString(item?.timestamp, 32);
    result.push({ text, ...(timestamp ? { timestamp } : {}) });
  }
  return result;
}

export function normalizeAcquiredVideoEvidenceBundle(value: unknown): AcquiredVideoEvidenceBundle {
  if (!isRecord(value) || !isRecord(value.source)) {
    throw new Error('External video acquisition returned invalid evidence');
  }
  const platform = value.source.platform;
  if (typeof platform !== 'string' || !socialVideoPlatformSupportsExternalAcquisition(platform as SocialVideoPlatform)) {
    throw new Error('External video acquisition returned an unsupported platform');
  }
  const canonicalUrl = boundedString(value.source.canonicalUrl, 2_048);
  if (!canonicalUrl) throw new Error('External video acquisition returned no source URL');
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(canonicalUrl);
  } catch {
    throw new Error('External video acquisition returned an invalid source URL');
  }
  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    throw new Error('External video acquisition returned an invalid source URL');
  }

  const metadata = isRecord(value.metadata) ? value.metadata : {};
  const observations = isRecord(value.observations) ? value.observations : {};
  const duration = typeof metadata.durationSeconds === 'number'
    && Number.isFinite(metadata.durationSeconds)
    && metadata.durationSeconds >= 0
    ? Math.round(metadata.durationSeconds)
    : undefined;
  const normalized: AcquiredVideoEvidenceBundle = {
    version: SOCIAL_VIDEO_EVIDENCE_BUNDLE_VERSION,
    source: {
      kind: 'social_video',
      platform: platform as ExternalSocialVideoPlatform,
      canonicalUrl: parsedUrl.toString(),
    },
    metadata: {
      ...(boundedString(metadata.title, 300) ? { title: boundedString(metadata.title, 300) } : {}),
      ...(boundedString(metadata.description, 6_000)
        ? { description: boundedString(metadata.description, 6_000) }
        : {}),
      ...(boundedString(metadata.creator, 200) ? { creator: boundedString(metadata.creator, 200) } : {}),
      ...(duration !== undefined ? { durationSeconds: duration } : {}),
      ...(boundedString(metadata.publishedAt, 80)
        ? { publishedAt: boundedString(metadata.publishedAt, 80) }
        : {}),
    },
    observations: {
      visibleText: boundedObservations(observations.visibleText),
      spokenRecipeDetails: boundedObservations(observations.spokenRecipeDetails),
      ingredients: boundedStrings(observations.ingredients, 120, 500),
      actions: boundedObservations(observations.actions),
      timingsAndTemperatures: boundedStrings(observations.timingsAndTemperatures, 80, 500),
      conflicts: boundedStrings(observations.conflicts, 40, 1_000),
    },
  };

  if (JSON.stringify(normalized).length > 50_000) {
    throw new Error('External video acquisition returned too much evidence');
  }
  return normalized;
}

export function buildAcquiredVideoEvidencePrompt(evidence: AcquiredVideoEvidenceBundle): string {
  return [
    `Extract one complete recipe from the acquired ${evidence.source.platform} video evidence below.`,
    'The acquisition adapter reports bounded observations, not a canonical recipe. Use only details present in these sections, reconcile duplicate observations, and do not fill missing material quantities, temperatures, or cooking steps.',
    `<UNTRUSTED_SOCIAL_METADATA>\n${JSON.stringify(evidence.metadata)}\n</UNTRUSTED_SOCIAL_METADATA>`,
    `<UNTRUSTED_VIDEO_OBSERVATIONS>\n${JSON.stringify(evidence.observations)}\n</UNTRUSTED_VIDEO_OBSERVATIONS>`,
    'Spoken recipe details are concise claims heard in the video, not a word-for-word transcript. If the combined evidence lacks a usable ingredient list or cooking method, return insufficient_evidence instead of inventing details.',
  ].join('\n\n');
}
