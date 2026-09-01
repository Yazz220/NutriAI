import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { verifyAuth } from '../_shared/auth.ts';
import { corsResponse, jsonError, jsonResponse } from '../_shared/cors.ts';
import { errorResponse } from '../_shared/error.ts';
import { logError, logInfo } from '../_shared/log.ts';
import {
  capturePageIdempotencyKey,
  capturePagePolicy,
  captureEvidencePolicy,
  captureFailure,
  captureQualityPolicy,
  reusableCaptureExtraction,
  type CaptureFailureStage,
} from '../_shared/capturePolicy.ts';
import {
  assessRecipeQuality,
  confirmRecipeQualityIssues,
  RECIPE_QUALITY_ASSESSMENT_VERSION,
  readRecipeQualityAssessment,
  withRecipeQualityAssessment,
} from '../_shared/recipeQuality.ts';
import {
  normalizeRecipeGraphDraft,
  validateNormalizedRecipeGraph,
} from '../_shared/recipeGraphNormalization.ts';
import { selectRecipeLayoutStrategy } from '../_shared/recipeLayout.ts';
import { resolveAudioRecipeEvidence } from '../_shared/audioRecipeEvidence.ts';
import { transcribeAudioRecipeEvidence } from '../_shared/audioTranscription.ts';
import {
  canReuseSavedVideoTranscript,
  inspectUploadedVideoRecipeSource,
  MAX_VIDEO_FRAMES,
  videoTranscriptionFormat,
} from '../_shared/videoRecipeEvidence.ts';
import {
  recipeTextSourceIsTooLarge,
  recipeEvidenceFeedback,
  type RecipeEvidenceFailureCode,
} from '../_shared/recipeEvidence.ts';
import {
  AUDIO_TRANSCRIPTION_STAGE_VERSION,
  captureCheckpoint,
  captureCheckpointIsCompatible,
  LEGACY_CAPTURE_STAGE_VERSION,
  recipeQualityStageVersion,
  RECIPE_CAPTURE_PUBLICATION_STAGE_VERSION,
  RECIPE_EVIDENCE_ACQUISITION_STAGE_VERSION,
  RECIPE_GRAPH_NORMALIZATION_STAGE_VERSION,
  RECIPE_PAGE_GENERATION_STAGE_VERSION,
  sourceStageVersion,
  VIDEO_TRANSCRIPTION_STAGE_VERSION,
  type CaptureCheckpointName,
} from '../_shared/captureStages.ts';
import { isCanonicalCookbookPageGenerationPayload } from '../_shared/cookbookPageGeometry.ts';
import { toCanonicalCookbookRecipe } from '../_shared/canonicalRecipe.ts';
import {
  normalizeAcquiredVideoEvidenceBundle,
  socialVideoPlatformSupportsExternalAcquisition,
  type ExternalVideoAcquisitionResult,
  type ExternalVideoAcquisitionState,
  type ExternalVideoEvidenceAdapter,
} from '../_shared/recipeEvidenceAcquisition.ts';
import {
  createSupadataVideoEvidenceAdapter,
  SupadataVideoEvidenceError,
} from '../_shared/supadataVideoEvidence.ts';
import {
  classifyVideoSourceUrl,
  socialVideoPlatformLabel,
  type SocialVideoPlatform,
} from '../_shared/videoSource.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || '';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const CAPTURE_BUCKET = 'recipe-captures';
const MAX_CAPTURE_IMAGE_COUNT = 4;
const MAX_CAPTURE_IMAGE_TOTAL_BYTES = 16_000_000;
const AI_API_KEY = Deno.env.get('AI_API_KEY') || '';
const AI_API_BASE = Deno.env.get('AI_API_BASE') || 'https://openrouter.ai/api/v1';
const AUDIO_TRANSCRIPTION_API_KEY = Deno.env.get('AUDIO_TRANSCRIPTION_API_KEY') || AI_API_KEY;
const AUDIO_TRANSCRIPTION_API_BASE = Deno.env.get('AUDIO_TRANSCRIPTION_API_BASE') || AI_API_BASE;
const AUDIO_TRANSCRIPTION_MODEL = Deno.env.get('AUDIO_TRANSCRIPTION_MODEL') || 'openai/whisper-large-v3';
const SOCIAL_VIDEO_ACQUISITION_PROVIDER = (Deno.env.get('SOCIAL_VIDEO_ACQUISITION_PROVIDER') || 'guided')
  .trim()
  .toLowerCase();
const SUPADATA_API_KEY = Deno.env.get('SUPADATA_API_KEY') || '';
const SUPADATA_API_BASE = Deno.env.get('SUPADATA_API_BASE') || 'https://api.supadata.ai/v1';
const SUPADATA_ENABLED_PLATFORMS = new Set(
  (Deno.env.get('SUPADATA_ENABLED_PLATFORMS') || 'youtube,tiktok,instagram,facebook')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean),
);
const EXTERNAL_ACQUISITION_POLL_INTERVAL_MS = 1_500;
const EXTERNAL_ACQUISITION_POLL_WINDOW_MS = 45_000;
const EXTERNAL_ACQUISITION_MAX_AGE_MS = 8 * 60_000;

declare const EdgeRuntime: { waitUntil(promise: Promise<unknown>): void };
type JsonRecord = Record<string, unknown>;
type SupabaseClient = any;

class CaptureProcessingError extends Error {
  constructor(
    readonly stage: CaptureFailureStage,
    message: string,
  ) {
    super(message);
    this.name = 'CaptureProcessingError';
  }
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

/**
 * Uploaded capture artifacts always live under the owning user's prefix.
 * Rejecting foreign prefixes keeps a crafted source payload from reading
 * another user's private storage through the service-role client.
 */
function isOwnedCaptureStoragePath(storagePath: string, userId: string): boolean {
  return storagePath.startsWith(`${userId}/`);
}

// Raw frame bound that stays below the extractor's 1.5 MB base64 frame limit.
const MAX_VIDEO_FRAME_SOURCE_BYTES = 1_125_000;

function publicCapture(row: JsonRecord): JsonRecord {
  return {
    id: row.id,
    userId: row.user_id,
    destinationCookbookId: row.destination_cookbook_id ?? undefined,
    sourceType: row.source_type,
    sourcePayload: row.source_payload ?? {},
    sourceStoragePath: row.source_storage_path ?? undefined,
    status: row.status,
    recipeGraph: row.recipe_graph ?? undefined,
    confidence: row.confidence == null ? undefined : Number(row.confidence),
    extractionNotes: row.extraction_notes ?? [],
    inferredFields: row.inferred_fields ?? [],
    pageId: row.pending_page_id ?? undefined,
    pageStatus: row.art_status,
    pageWarning: row.art_warning ?? undefined,
    failureCode: row.failure_code ?? undefined,
    failureMessage: row.failure_message ?? undefined,
    failedStage: row.failed_stage ?? undefined,
    stageCheckpoints: row.stage_checkpoints ?? {},
    idempotencyKey: row.idempotency_key,
    processingAttempt: row.processing_attempt,
    processingStartedAt: row.processing_started_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function publicPage(row: JsonRecord): JsonRecord {
  const recipe = isRecord(row.recipes) ? row.recipes : {};
  const recipeGraph = isRecord(row.recipe_graph) ? row.recipe_graph : {};
  return {
    id: row.id,
    cookbookId: row.cookbook_id,
    recipeId: row.recipe_id,
    title: recipe.title ?? recipeGraph.title ?? 'Untitled Recipe',
    section: row.section,
    pageNumber: row.page_number,
    sortOrder: row.sort_order,
    recipeGraph: row.recipe_graph,
    styleId: row.style_id,
    templateId: row.template_id,
    lifecycleStatus: row.lifecycle_status,
    captureId: row.capture_id,
  };
}

async function callFunction(
  name: string,
  authHeader: string,
  payload: JsonRecord,
): Promise<{ response: Response; data: JsonRecord }> {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: 'POST',
    headers: {
      Authorization: authHeader,
      apikey: SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  return { response, data: isRecord(data) ? data : {} };
}

type PreparedExtractionSource =
  | { status: 'ready'; payload: JsonRecord }
  | { status: 'continue'; stage: Extract<CaptureFailureStage, 'acquisition' | 'transcription'> }
  | {
      status: 'rejected';
      reasonCode: RecipeEvidenceFailureCode;
      diagnostic: string;
      failedStage: Extract<CaptureFailureStage, 'source' | 'acquisition' | 'transcription'>;
    };

function wait(durationMs: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, durationMs));
}

function configuredExternalVideoAdapter(platform: SocialVideoPlatform): ExternalVideoEvidenceAdapter | null {
  if (
    SOCIAL_VIDEO_ACQUISITION_PROVIDER === 'guided'
    || !socialVideoPlatformSupportsExternalAcquisition(platform)
    || !SUPADATA_ENABLED_PLATFORMS.has(platform)
  ) return null;
  if (SOCIAL_VIDEO_ACQUISITION_PROVIDER !== 'supadata') {
    throw new CaptureProcessingError('acquisition', 'The social video acquisition provider is not supported');
  }
  if (!SUPADATA_API_KEY.trim()) {
    throw new CaptureProcessingError('acquisition', 'Social video acquisition is enabled but SUPADATA_API_KEY is missing');
  }
  return createSupadataVideoEvidenceAdapter({
    apiKey: SUPADATA_API_KEY,
    apiBase: SUPADATA_API_BASE,
  });
}

function savedExternalAcquisitionState(value: unknown): ExternalVideoAcquisitionState | null {
  if (!isRecord(value)) return null;
  if (
    typeof value.provider !== 'string'
    || typeof value.adapterVersion !== 'string'
    || typeof value.jobId !== 'string'
    || typeof value.platform !== 'string'
    || !socialVideoPlatformSupportsExternalAcquisition(value.platform as SocialVideoPlatform)
    || typeof value.canonicalUrl !== 'string'
    || typeof value.startedAt !== 'string'
  ) return null;
  return {
    provider: value.provider,
    adapterVersion: value.adapterVersion,
    jobId: value.jobId,
    platform: value.platform as ExternalVideoAcquisitionState['platform'],
    canonicalUrl: value.canonicalUrl,
    startedAt: value.startedAt,
    pollCount: typeof value.pollCount === 'number' ? Math.max(0, Math.floor(value.pollCount)) : 0,
    ...(isRecord(value.metadata) ? { metadata: value.metadata } : {}),
  };
}

async function saveAcquisitionResult(
  admin: SupabaseClient,
  capture: JsonRecord,
  result: ExternalVideoAcquisitionResult,
): Promise<void> {
  await recordCaptureCheckpoint(
    admin,
    String(capture.user_id),
    String(capture.id),
    'acquisition',
    RECIPE_EVIDENCE_ACQUISITION_STAGE_VERSION,
    result.status === 'ready'
      ? {
          status: 'ready',
          provider: result.state.provider,
          adapterVersion: result.state.adapterVersion,
          jobId: result.state.jobId,
          pollCount: result.state.pollCount,
          evidence: result.evidence,
        }
      : result.status === 'pending'
        ? { status: 'pending', ...result.state }
        : {
            status: 'failed',
            reasonCode: result.reasonCode,
            diagnostic: result.diagnostic.slice(0, 500),
          },
  );
}

async function prepareSocialVideoSource(
  admin: SupabaseClient,
  capture: JsonRecord,
  platform: SocialVideoPlatform,
  canonicalUrl: string,
): Promise<PreparedExtractionSource> {
  const adapter = configuredExternalVideoAdapter(platform);
  if (!adapter || !adapter.supports(platform)) {
    return {
      status: 'rejected',
      reasonCode: 'video_source_unsupported',
      diagnostic: `${socialVideoPlatformLabel(platform)} is not enabled for hosted video acquisition.`,
      failedStage: 'acquisition',
    };
  }

  const checkpoint = captureCheckpoint(capture, 'acquisition');
  if (
    checkpoint?.version === RECIPE_EVIDENCE_ACQUISITION_STAGE_VERSION
    && checkpoint.status === 'ready'
    && checkpoint.provider === adapter.id
    && checkpoint.adapterVersion === adapter.version
  ) {
    const evidence = normalizeAcquiredVideoEvidenceBundle(checkpoint.evidence);
    return { status: 'ready', payload: { type: 'video', acquiredVideoEvidence: evidence } };
  }

  try {
    let result: ExternalVideoAcquisitionResult;
    const savedState = checkpoint?.version === RECIPE_EVIDENCE_ACQUISITION_STAGE_VERSION
      && checkpoint.status === 'pending'
      ? savedExternalAcquisitionState(checkpoint)
      : null;
    if (savedState && savedState.provider === adapter.id && savedState.adapterVersion === adapter.version) {
      result = { status: 'pending', state: savedState };
    } else {
      result = await adapter.start({ platform, canonicalUrl });
      await saveAcquisitionResult(admin, capture, result);
    }

    const pollDeadline = Date.now() + EXTERNAL_ACQUISITION_POLL_WINDOW_MS;
    while (result.status === 'pending' && Date.now() < pollDeadline) {
      const startedAt = new Date(result.state.startedAt).getTime();
      if (!Number.isFinite(startedAt) || Date.now() - startedAt > EXTERNAL_ACQUISITION_MAX_AGE_MS) {
        await recordCaptureCheckpoint(
          admin,
          String(capture.user_id),
          String(capture.id),
          'acquisition',
          RECIPE_EVIDENCE_ACQUISITION_STAGE_VERSION,
          {
            status: 'failed',
            provider: result.state.provider,
            adapterVersion: result.state.adapterVersion,
            jobId: result.state.jobId,
            diagnostic: 'Social video acquisition timed out',
          },
        );
        throw new CaptureProcessingError('acquisition', 'Social video acquisition timed out');
      }
      await wait(EXTERNAL_ACQUISITION_POLL_INTERVAL_MS);
      result = await adapter.poll(result.state);
    }

    await saveAcquisitionResult(admin, capture, result);
    // Provider polling can consume most of an Edge invocation's wall-clock
    // budget. Resume from the durable checkpoint so extraction always starts
    // in a fresh invocation and never loses a completed acquisition job.
    if (result.status === 'pending' || result.status === 'ready') {
      return { status: 'continue', stage: 'acquisition' };
    }
    if (result.status === 'unavailable') {
      return {
        status: 'rejected',
        reasonCode: result.reasonCode,
        diagnostic: result.diagnostic,
        failedStage: 'acquisition',
      };
    }
    throw new CaptureProcessingError('acquisition', 'Social video acquisition returned an invalid status');
  } catch (error) {
    if (error instanceof CaptureProcessingError) throw error;
    const diagnostic = error instanceof Error ? error.message : 'Social video acquisition failed';
    await recordCaptureCheckpoint(
      admin,
      String(capture.user_id),
      String(capture.id),
      'acquisition',
      RECIPE_EVIDENCE_ACQUISITION_STAGE_VERSION,
      {
        status: 'failed',
        provider: adapter.id,
        adapterVersion: adapter.version,
        diagnostic: diagnostic.slice(0, 500),
      },
    );
    if (error instanceof SupadataVideoEvidenceError) {
      throw new CaptureProcessingError('acquisition', error.message);
    }
    throw new CaptureProcessingError('acquisition', diagnostic);
  }
}

async function readSource(admin: SupabaseClient, capture: JsonRecord): Promise<PreparedExtractionSource> {
  const sourceType = String(capture.source_type);
  const payload = isRecord(capture.source_payload) ? capture.source_payload : {};
  const storagePath = capture.source_storage_path;
  const isStoredVideo = sourceType === 'video' && typeof storagePath === 'string';
  if (sourceType === 'url' || sourceType === 'text' || (sourceType === 'video' && !isStoredVideo)) {
    const input = payload.input;
    if (typeof input !== 'string' || input.trim().length === 0) {
      throw new CaptureProcessingError('source', 'The saved recipe source is empty');
    }
    const videoClassification = sourceType === 'url' || sourceType === 'video'
      ? classifyVideoSourceUrl(input)
      : null;
    await recordCaptureCheckpoint(
      admin,
      String(capture.user_id),
      String(capture.id),
      'source',
      sourceStageVersion(sourceType),
      videoClassification?.kind === 'platform_link'
        ? {
            sourceType,
            sourceKind: 'platform_link',
            platform: videoClassification.platform,
          }
        : sourceType === 'video'
        ? {
            sourceType,
            sourceKind: 'url',
            rightsConfirmed: payload.rightsConfirmed === true,
          }
        : { sourceType },
    );
    if (videoClassification?.kind === 'platform_link') {
      return prepareSocialVideoSource(
        admin,
        capture,
        videoClassification.platform,
        videoClassification.canonicalUrl,
      );
    }
    return {
      status: 'ready',
      payload: sourceType === 'video'
        ? {
            type: 'video',
            videoUrl: input,
            videoRightsConfirmed: payload.rightsConfirmed === true,
          }
        : { type: sourceType, input },
    };
  }

  if (typeof storagePath !== 'string') {
    throw new CaptureProcessingError('source', 'The saved recipe attachment is missing');
  }
  if (!isOwnedCaptureStoragePath(storagePath, String(capture.user_id))) {
    throw new CaptureProcessingError('source', 'The saved recipe attachment is unavailable');
  }
  const { data, error } = await admin.storage.from(CAPTURE_BUCKET).download(storagePath);
  if (error || !data) {
    throw new CaptureProcessingError('source', error?.message ?? 'Could not read the saved recipe attachment');
  }
  const bytes = new Uint8Array(await data.arrayBuffer());
  if (sourceType === 'image') {
    const additionalImagePaths = Array.isArray(payload.additionalImagePaths)
      ? payload.additionalImagePaths.filter((candidate): candidate is string =>
        typeof candidate === 'string' && isOwnedCaptureStoragePath(candidate, String(capture.user_id)))
        .slice(0, MAX_CAPTURE_IMAGE_COUNT - 1)
      : [];
    const images = [{
      bytes,
      mimeType: typeof payload.mimeType === 'string' ? payload.mimeType : data.type,
    }];
    for (const imagePath of additionalImagePaths) {
      const { data: imageData, error: imageError } = await admin.storage
        .from(CAPTURE_BUCKET)
        .download(imagePath);
      if (imageError || !imageData) {
        throw new CaptureProcessingError('source', imageError?.message ?? 'Could not read every saved recipe image');
      }
      images.push({
        bytes: new Uint8Array(await imageData.arrayBuffer()),
        mimeType: imageData.type || 'image/jpeg',
      });
    }
    const totalByteSize = images.reduce((total, image) => total + image.bytes.byteLength, 0);
    if (totalByteSize > MAX_CAPTURE_IMAGE_TOTAL_BYTES) {
      throw new CaptureProcessingError('source', 'The combined recipe images are too large to read safely');
    }
    await recordCaptureCheckpoint(
      admin,
      String(capture.user_id),
      String(capture.id),
      'source',
      sourceStageVersion(sourceType),
      {
        sourceType,
        byteSize: totalByteSize,
        imageCount: images.length,
        mimeType: typeof payload.mimeType === 'string' ? payload.mimeType : data.type,
      },
    );
    return {
      status: 'ready',
      payload: {
        type: 'image',
        images: images.map((image) => ({
          imageBase64: toBase64(image.bytes),
          imageMimeType: image.mimeType || 'image/jpeg',
        })),
        input: typeof payload.notes === 'string' ? payload.notes : undefined,
      },
    };
  }

  if (sourceType === 'video') {
    const inspection = inspectUploadedVideoRecipeSource({
      byteSize: bytes.byteLength,
      mimeType: typeof payload.mimeType === 'string' ? payload.mimeType : data.type,
      fileName: typeof payload.fileName === 'string' ? payload.fileName : storagePath,
      rightsConfirmed: payload.rightsConfirmed === true,
      headerBytes: bytes.subarray(0, 64),
    });
    if (!inspection.ready) return { status: 'rejected', ...inspection, failedStage: 'source' };

    // Sampled frames are supplementary evidence. Skip any frame that is
    // missing, oversized, not a JPEG, or stored outside this user's prefix.
    const ownedPrefix = `${String(capture.user_id)}/`;
    const framePaths = Array.isArray(payload.framePaths)
      ? payload.framePaths.filter((candidate): candidate is string =>
        typeof candidate === 'string' && candidate.startsWith(ownedPrefix))
      : [];
    const videoFrames: Array<{ base64: string; mimeType: 'image/jpeg' }> = [];
    for (const framePath of framePaths.slice(0, MAX_VIDEO_FRAMES)) {
      const { data: frameData, error: frameError } = await admin.storage
        .from(CAPTURE_BUCKET)
        .download(framePath);
      if (frameError || !frameData) continue;
      const frameBytes = new Uint8Array(await frameData.arrayBuffer());
      if (frameBytes.byteLength === 0 || frameBytes.byteLength > MAX_VIDEO_FRAME_SOURCE_BYTES) continue;
      if (frameBytes[0] !== 0xff || frameBytes[1] !== 0xd8 || frameBytes[2] !== 0xff) continue;
      videoFrames.push({ base64: toBase64(frameBytes), mimeType: 'image/jpeg' });
    }

    await recordCaptureCheckpoint(
      admin,
      String(capture.user_id),
      String(capture.id),
      'source',
      inspection.adapterVersion,
      {
        sourceType,
        sourceKind: 'owned_upload',
        byteSize: inspection.byteSize,
        mimeType: inspection.mimeType,
        frameCount: videoFrames.length,
      },
    );

    // Narration transcript: reuse a compatible saved transcript, otherwise
    // attempt one through the speech-to-text adapter. A video without a
    // transcript still proceeds on whole-video evidence, so transcription
    // problems degrade instead of failing the capture.
    let videoTranscript: string | undefined;
    const savedTranscript = typeof payload.transcript === 'string' ? payload.transcript.trim() : '';
    if (savedTranscript && canReuseSavedVideoTranscript(capture, payload)) {
      await recordCaptureCheckpoint(
        admin,
        String(capture.user_id),
        String(capture.id),
        'transcription',
        VIDEO_TRANSCRIPTION_STAGE_VERSION,
        isRecord(payload.transcription) ? payload.transcription : { recoveredLegacyMetadata: true },
      );
      videoTranscript = savedTranscript;
      logInfo('Recipe capture reused saved video transcript', {
        captureId: capture.id,
        transcriptCharacters: savedTranscript.length,
      });
    } else {
      const transcriptionFormat = videoTranscriptionFormat(inspection.mimeType);
      if (!transcriptionFormat) {
        logInfo('Recipe capture video container is not transcribable; continuing with whole-video evidence', {
          captureId: capture.id,
          mimeType: inspection.mimeType,
        });
      } else {
        const transcription = await transcribeAudioRecipeEvidence(
          { base64Audio: toBase64(bytes), format: transcriptionFormat },
          {
            apiBase: AUDIO_TRANSCRIPTION_API_BASE,
            apiKey: AUDIO_TRANSCRIPTION_API_KEY,
            model: AUDIO_TRANSCRIPTION_MODEL,
          },
        );
        if (transcription.ready) {
          const transcriptionMetadata = {
            model: transcription.model,
            sourceAdapterVersion: inspection.adapterVersion,
            transcriptionAdapterVersion: VIDEO_TRANSCRIPTION_STAGE_VERSION,
            speechToTextAdapterVersion: transcription.adapterVersion,
            format: transcriptionFormat,
            byteSize: inspection.byteSize,
            transcribedAt: new Date().toISOString(),
          };
          const { error: transcriptSaveError } = await admin.schema('nutriai').from('recipe_captures').update({
            source_payload: {
              ...payload,
              transcript: transcription.transcript,
              transcription: transcriptionMetadata,
            },
          }).eq('id', capture.id).eq('user_id', capture.user_id);
          if (transcriptSaveError) {
            logInfo('Recipe capture saved the video transcript for this attempt only', {
              captureId: capture.id,
              error: transcriptSaveError.message,
            });
          } else {
            await recordCaptureCheckpoint(
              admin,
              String(capture.user_id),
              String(capture.id),
              'transcription',
              VIDEO_TRANSCRIPTION_STAGE_VERSION,
              transcriptionMetadata,
            );
          }
          videoTranscript = transcription.transcript;
          logInfo('Recipe capture video audio transcribed', {
            captureId: capture.id,
            byteSize: inspection.byteSize,
            format: transcriptionFormat,
            transcriptCharacters: transcription.transcript.length,
            transcriptionModel: transcription.model,
          });
        } else {
          logInfo('Recipe capture video transcription unavailable; continuing with whole-video evidence', {
            captureId: capture.id,
            reasonCode: transcription.reasonCode,
            diagnostic: transcription.diagnostic,
          });
        }
      }
    }

    return {
      status: 'ready',
      payload: {
        type: 'video',
        videoBase64: toBase64(bytes),
        videoMimeType: inspection.mimeType,
        videoFileName: typeof payload.fileName === 'string' ? payload.fileName : storagePath,
        videoRightsConfirmed: true,
        notes: typeof payload.notes === 'string' ? payload.notes : undefined,
        ...(videoTranscript ? { videoTranscript } : {}),
        ...(videoFrames.length > 0 ? { videoFrames } : {}),
      },
    };
  }

  if (sourceType === 'audio') {
    const savedTranscript = typeof payload.transcript === 'string' ? payload.transcript.trim() : '';
    const evidence = resolveAudioRecipeEvidence({
      bytes,
      mimeType: typeof payload.mimeType === 'string' ? payload.mimeType : data.type,
      fileName: typeof payload.fileName === 'string' ? payload.fileName : storagePath,
    });
    if (!evidence.ready) return { status: 'rejected', ...evidence, failedStage: 'source' };

    await recordCaptureCheckpoint(
      admin,
      String(capture.user_id),
      String(capture.id),
      'source',
      evidence.adapterVersion,
      {
        sourceType,
        byteSize: evidence.byteSize,
        format: evidence.format,
        mimeType: evidence.mimeType,
      },
    );

    if (savedTranscript && canReuseSavedAudioTranscript(capture, payload)) {
      await recordCaptureCheckpoint(
        admin,
        String(capture.user_id),
        String(capture.id),
        'transcription',
        AUDIO_TRANSCRIPTION_STAGE_VERSION,
        isRecord(payload.transcription) ? payload.transcription : { recoveredLegacyMetadata: true },
      );
      logInfo('Recipe capture reused saved audio transcript', {
        captureId: capture.id,
        transcriptCharacters: savedTranscript.length,
      });
      return {
        status: 'ready',
        payload: {
          type: 'audio',
          input: savedTranscript,
          notes: typeof payload.notes === 'string' ? payload.notes : undefined,
        },
      };
    }

    const transcription = await transcribeAudioRecipeEvidence(evidence, {
      apiBase: AUDIO_TRANSCRIPTION_API_BASE,
      apiKey: AUDIO_TRANSCRIPTION_API_KEY,
      model: AUDIO_TRANSCRIPTION_MODEL,
    });
    if (!transcription.ready) {
      return { status: 'rejected', ...transcription, failedStage: 'transcription' };
    }

    const transcriptionMetadata = {
      model: transcription.model,
      sourceAdapterVersion: evidence.adapterVersion,
      transcriptionAdapterVersion: transcription.adapterVersion,
      format: evidence.format,
      byteSize: evidence.byteSize,
      transcribedAt: new Date().toISOString(),
    };
    const { error: transcriptSaveError } = await admin.schema('nutriai').from('recipe_captures').update({
      source_payload: {
        ...payload,
        transcript: transcription.transcript,
        transcription: transcriptionMetadata,
      },
    }).eq('id', capture.id).eq('user_id', capture.user_id);
    if (transcriptSaveError) {
      throw new CaptureProcessingError('transcription', transcriptSaveError.message);
    }
    await recordCaptureCheckpoint(
      admin,
      String(capture.user_id),
      String(capture.id),
      'transcription',
      transcription.adapterVersion,
      transcriptionMetadata,
    );

    logInfo('Recipe capture audio transcribed', {
      captureId: capture.id,
      byteSize: evidence.byteSize,
      format: evidence.format,
      transcriptCharacters: transcription.transcript.length,
      sourceAdapterVersion: evidence.adapterVersion,
      transcriptionAdapterVersion: transcription.adapterVersion,
      transcriptionModel: transcription.model,
    });
    return {
      status: 'continue',
      stage: 'transcription',
    };
  }

  throw new CaptureProcessingError('source', 'Unsupported saved recipe source');
}

async function recordCaptureCheckpoint(
  admin: SupabaseClient,
  userId: string,
  captureId: string,
  stage: CaptureCheckpointName,
  version: string,
  metadata: JsonRecord = {},
): Promise<void> {
  const { error } = await admin.schema('nutriai').rpc('record_recipe_capture_checkpoint', {
    p_user_id: userId,
    p_capture_id: captureId,
    p_stage: stage,
    p_version: version,
    p_metadata: metadata,
  });
  if (error) throw new CaptureProcessingError(stage, error.message);
}

function extractionStageVersion(data: JsonRecord, stage: 'extraction' | 'normalization'): string {
  const versions = isRecord(data.stageVersions) ? data.stageVersions : {};
  return typeof versions[stage] === 'string'
    ? String(versions[stage])
    : LEGACY_CAPTURE_STAGE_VERSION;
}

function extractionStageMetadata(data: JsonRecord, stage: 'extraction' | 'normalization'): JsonRecord {
  const metadata = isRecord(data.stageMetadata) ? data.stageMetadata : {};
  return isRecord(metadata[stage]) ? metadata[stage] as JsonRecord : { rollingDeployment: true };
}

function canReuseSavedAudioTranscript(capture: JsonRecord, payload: JsonRecord): boolean {
  const transcription = isRecord(payload.transcription) ? payload.transcription : {};
  const sourceCheckpoint = captureCheckpoint(capture, 'source');
  const transcriptionCheckpoint = captureCheckpoint(capture, 'transcription');
  const sourceCompatible = sourceCheckpoint
    ? sourceCheckpoint.version === sourceStageVersion('audio')
    : transcription.sourceAdapterVersion === sourceStageVersion('audio');
  const transcriptionCompatible = transcriptionCheckpoint
    ? transcriptionCheckpoint.version === AUDIO_TRANSCRIPTION_STAGE_VERSION
    : transcription.transcriptionAdapterVersion === AUDIO_TRANSCRIPTION_STAGE_VERSION;
  return sourceCompatible && transcriptionCompatible;
}

async function readyCapturePageGenerationVersion(
  admin: SupabaseClient,
  pageId: string,
): Promise<string | null> {
  const { data: page, error: pageError } = await admin
    .schema('nutriai')
    .from('cookbook_pages')
    .select('selected_version_id')
    .eq('id', pageId)
    .maybeSingle();
  if (pageError) throw new CaptureProcessingError('publication', pageError.message);
  if (!page?.selected_version_id) return null;

  const { data: version, error: versionError } = await admin
    .schema('nutriai')
    .from('page_versions')
    .select('status, prompt_payload')
    .eq('id', page.selected_version_id)
    .eq('page_id', pageId)
    .maybeSingle();
  if (versionError) throw new CaptureProcessingError('publication', versionError.message);
  if (version?.status !== 'ready') return null;

  const promptPayload = isRecord(version.prompt_payload) ? version.prompt_payload : {};
  return isCanonicalCookbookPageGenerationPayload(promptPayload)
    ? RECIPE_PAGE_GENERATION_STAGE_VERSION
    : null;
}

async function publishCapturePage(
  admin: SupabaseClient,
  userId: string,
  pageId: string,
  pageGenerationVersion: string,
): Promise<void> {
  const { error } = await admin.schema('nutriai').rpc('finalize_recipe_capture_page', {
    p_user_id: userId,
    p_page_id: pageId,
    p_page_generation_version: pageGenerationVersion,
    p_publication_version: RECIPE_CAPTURE_PUBLICATION_STAGE_VERSION,
  });
  if (error) throw new CaptureProcessingError('publication', error.message);
}

async function processCapture(
  admin: SupabaseClient,
  userId: string,
  captureId: string,
  authHeader: string,
): Promise<void> {
  const { data: claim, error: claimError } = await admin
    .schema('nutriai')
    .rpc('claim_recipe_capture', { p_user_id: userId, p_capture_id: captureId });
  if (claimError) throw new Error(claimError.message);
  if (!isRecord(claim) || claim.claimed !== true || !isRecord(claim.capture)) {
    logInfo('Recipe capture delivery deduplicated', { captureId });
    return;
  }
  const capture = claim.capture;
  const processingStartedAt = Date.now();
  let activeStage: CaptureFailureStage = 'source';

  try {
    const savedExtraction = reusableCaptureExtraction(capture);
    let recipeGraph: JsonRecord;
    let confidence: number;
    let extractionNotes: unknown[];
    let inferredFields: unknown[];

    if (savedExtraction) {
      ({ recipeGraph, confidence, extractionNotes, inferredFields } = savedExtraction);
      logInfo('Recipe capture retry reused saved extraction', {
        captureId,
        reuseReason: savedExtraction.reuseReason,
        normalizationVersion: captureCheckpoint(capture, 'normalization')?.version,
      });
    } else {
      activeStage = 'source';
      const preparedSource = await readSource(admin, capture);
      if (preparedSource.status === 'rejected') {
        const failureMessage = recipeEvidenceFeedback(preparedSource.reasonCode);
        const { error: failureError } = await admin.schema('nutriai').rpc('fail_recipe_capture', {
          p_user_id: userId,
          p_capture_id: captureId,
          p_failure_code: preparedSource.reasonCode,
          p_failure_message: failureMessage,
          p_failed_stage: preparedSource.failedStage,
        });
        if (failureError) throw new Error(failureError.message);
        logInfo('Recipe capture source needs attention', {
          captureId,
          reasonCode: preparedSource.reasonCode,
          diagnostic: preparedSource.diagnostic,
          durationMs: Date.now() - processingStartedAt,
        });
        return;
      }
      if (preparedSource.status === 'continue') {
        activeStage = preparedSource.stage;
        const { error: releaseError } = await admin.schema('nutriai').from('recipe_captures').update({
          processing_started_at: null,
        }).eq('id', captureId).eq('user_id', userId).eq('status', 'processing');
        if (releaseError) throw new Error(releaseError.message);
        const continuation = await callFunction('capture-recipe', authHeader, { captureId });
        if (!continuation.response.ok && continuation.response.status !== 202) {
          throw new CaptureProcessingError(preparedSource.stage, 'Nosh could not continue this recipe capture');
        }
        logInfo('Recipe capture continued after a checkpointed stage', {
          captureId,
          stage: preparedSource.stage,
          durationMs: Date.now() - processingStartedAt,
        });
        return;
      }
      activeStage = 'extraction';
      const extraction = await callFunction('extract-recipe', authHeader, preparedSource.payload);
      if (!extraction.response.ok) {
        throw new Error(typeof extraction.data.error === 'string' ? extraction.data.error : 'Nosh could not read this recipe');
      }

      await recordCaptureCheckpoint(
        admin,
        userId,
        captureId,
        'extraction',
        extractionStageVersion(extraction.data, 'extraction'),
        extractionStageMetadata(extraction.data, 'extraction'),
      );

      // During rolling deployments, captureEvidencePolicy accepts the previous
      // success shape but requires the evidence envelope for every rejection.
      const evidence = captureEvidencePolicy(extraction.data);
      if (!evidence.accepted) {
        const { error: failureError } = await admin.schema('nutriai').rpc('fail_recipe_capture', {
          p_user_id: userId,
          p_capture_id: captureId,
          p_failure_code: evidence.failureCode,
          p_failure_message: evidence.failureMessage,
          p_failed_stage: 'extraction',
        });
        if (failureError) throw new Error(failureError.message);
        logInfo('Recipe capture needs a different source', {
          captureId,
          outcome: evidence.outcome,
          reasonCode: evidence.failureCode,
          diagnostic: evidence.diagnostic,
          sourceType: capture.source_type,
          durationMs: Date.now() - processingStartedAt,
        });
        return;
      }
      recipeGraph = evidence.recipeGraph;

      confidence = typeof extraction.data.confidence === 'number' ? extraction.data.confidence : 0;
      extractionNotes = Array.isArray(extraction.data.extractionNotes) ? extraction.data.extractionNotes : [];
      inferredFields = Array.isArray(extraction.data.inferredFields) ? extraction.data.inferredFields : [];

      activeStage = 'normalization';
      const { error: graphSaveError } = await admin.schema('nutriai').from('recipe_captures').update({
        recipe_graph: recipeGraph,
        confidence,
        extraction_notes: extractionNotes,
        inferred_fields: inferredFields,
      }).eq('id', captureId).eq('user_id', userId);
      if (graphSaveError) throw new Error(graphSaveError.message);
      await recordCaptureCheckpoint(
        admin,
        userId,
        captureId,
        'normalization',
        extractionStageVersion(extraction.data, 'normalization'),
        extractionStageMetadata(extraction.data, 'normalization'),
      );
    }

    activeStage = 'quality';
    const expectedQualityVersion = recipeQualityStageVersion(RECIPE_QUALITY_ASSESSMENT_VERSION);
    const savedQualityAssessment = readRecipeQualityAssessment(recipeGraph);
    const reuseSavedQuality = Boolean(savedQualityAssessment) && captureCheckpointIsCompatible(
      capture,
      'quality',
      expectedQualityVersion,
    );
    const qualityAssessment = reuseSavedQuality
      ? savedQualityAssessment!
      : assessRecipeQuality(recipeGraph);
    if (!reuseSavedQuality) {
      recipeGraph = withRecipeQualityAssessment(recipeGraph, qualityAssessment);
      const { error: qualitySaveError } = await admin.schema('nutriai').from('recipe_captures').update({
        recipe_graph: recipeGraph,
        confidence,
        extraction_notes: extractionNotes,
        inferred_fields: inferredFields,
      }).eq('id', captureId).eq('user_id', userId);
      if (qualitySaveError) throw new Error(qualitySaveError.message);
      await recordCaptureCheckpoint(
        admin,
        userId,
        captureId,
        'quality',
        expectedQualityVersion,
        {
          decision: qualityAssessment.decision,
          issueCodes: qualityAssessment.issues.map((issue) => issue.code),
        },
      );
    } else {
      logInfo('Recipe capture retry reused saved quality assessment', {
        captureId,
        qualityVersion: expectedQualityVersion,
      });
    }

    const qualityPolicy = captureQualityPolicy(qualityAssessment);
    if (!qualityPolicy.accepted) {
      const { error: qualityFailureError } = await admin.schema('nutriai').rpc('fail_recipe_capture', {
        p_user_id: userId,
        p_capture_id: captureId,
        p_failure_code: qualityPolicy.failureCode,
        p_failure_message: qualityPolicy.failureMessage,
        p_failed_stage: 'quality',
      });
      if (qualityFailureError) throw new Error(qualityFailureError.message);
      logInfo('Recipe capture needs field confirmation', {
        captureId,
        issueCount: qualityPolicy.issueCount,
        issueCodes: qualityAssessment.issues
          .filter((issue) => issue.severity === 'blocking' && !issue.confirmed)
          .map((issue) => issue.code),
        sourceType: capture.source_type,
        durationMs: Date.now() - processingStartedAt,
      });
      return;
    }

    let { pageStatus, pageWarning } = capturePagePolicy(false);
    let pendingPageId: string | undefined;
    const destinationCookbookId = capture.destination_cookbook_id;

    if (typeof destinationCookbookId === 'string') {
      activeStage = 'destination';
      const { data: cookbook, error: cookbookError } = await admin
        .schema('nutriai')
        .from('cookbooks')
        .select('cover_style, page_style_id, style_revision, page_style_references')
        .eq('id', destinationCookbookId)
        .eq('user_id', userId)
        .single();
      if (cookbookError || !cookbook) throw new Error('The destination cookbook is unavailable');
      const styleId = cookbook.page_style_id ?? cookbook.cover_style ?? 'handwritten';
      const styleRevision = Number(cookbook.style_revision ?? 1);
      const styleReferences = Array.isArray(cookbook.page_style_references)
        ? cookbook.page_style_references.filter((value: unknown): value is string => typeof value === 'string')
        : [];
      const canonicalRecipe = toCanonicalCookbookRecipe(recipeGraph);
      const templateId = selectRecipeLayoutStrategy(canonicalRecipe);
      activeStage = 'page_generation';
      const { data: pageId, error: pageError } = await admin.schema('nutriai').rpc(
        'create_capture_page',
        {
          p_user_id: userId,
          p_capture_id: captureId,
          p_recipe_graph: canonicalRecipe,
          p_style_id: styleId,
          p_style_revision: styleRevision,
          p_template_id: templateId,
        },
      );
      if (pageError || typeof pageId !== 'string') throw new Error(pageError?.message ?? 'Could not prepare the recipe page');
      pendingPageId = pageId;
      ({ pageStatus, pageWarning } = capturePagePolicy(true));

      const existingPageGenerationVersion = await readyCapturePageGenerationVersion(admin, pageId);
      if (existingPageGenerationVersion) {
        activeStage = 'publication';
        await publishCapturePage(admin, userId, pageId, existingPageGenerationVersion);
        ({ pageStatus, pageWarning } = capturePagePolicy(true, 'ready'));
        logInfo('Recipe capture retry published an existing generated page', {
          captureId,
          pageId,
          pageGenerationVersion: existingPageGenerationVersion,
        });
      } else {
        activeStage = 'page_generation';
        const pageGeneration = await callFunction('generate-page-art', authHeader, {
          cookbookId: destinationCookbookId,
          pageId,
          recipeGraph: canonicalRecipe,
          styleId,
          styleRevision,
          styleReferences,
          idempotencyKey: capturePageIdempotencyKey(captureId, Number(capture.processing_attempt ?? 1)),
        });
        if (pageGeneration.response.ok && isRecord(pageGeneration.data.pageImage)) {
          ({ pageStatus, pageWarning } = capturePagePolicy(true, 'ready'));
        } else if (pageGeneration.response.status === 202 && typeof pageGeneration.data.requestId === 'string') {
          ({ pageStatus, pageWarning } = capturePagePolicy(true));
        } else {
          if (pageGeneration.data.code === 'designed_page_limit_reached') {
            throw new CaptureProcessingError('page_generation', 'designed_page_limit_reached');
          }
          throw new Error(typeof pageGeneration.data.error === 'string'
            ? pageGeneration.data.error
            : 'Nosh could not generate this recipe page');
        }
      }
    }

    activeStage = 'publication';
    const { error: completeError } = await admin.schema('nutriai').rpc('complete_recipe_capture', {
      p_user_id: userId,
      p_capture_id: captureId,
      p_recipe_graph: recipeGraph,
      p_confidence: confidence,
      p_extraction_notes: extractionNotes,
      p_inferred_fields: inferredFields,
      p_art_status: pageStatus,
      p_art_warning: pageWarning,
    });
    if (completeError) throw new Error(completeError.message);
    logInfo(destinationCookbookId ? 'Recipe capture page is being produced' : 'Recipe capture needs a destination', {
      captureId,
      pendingPageId,
      pageStatus,
      sourceType: capture.source_type,
      durationMs: Date.now() - processingStartedAt,
    });
  } catch (error) {
    const failedStage = error instanceof CaptureProcessingError ? error.stage : activeStage;
    const failure = captureFailure(error, failedStage);
    const message = failure.failureMessage;
    await admin.schema('nutriai').rpc('fail_recipe_capture', {
      p_user_id: userId,
      p_capture_id: captureId,
      p_failure_code: failure.failureCode,
      p_failure_message: message,
      p_failed_stage: failure.failedStage,
    });
    logError('Recipe capture processing failed', {
      captureId,
      error: failure.diagnostic,
      failureCode: failure.failureCode,
      failedStage: failure.failedStage,
      sourceType: capture.source_type,
      durationMs: Date.now() - processingStartedAt,
    });
  }
}

async function prepareCaptureDestination(
  admin: SupabaseClient,
  userClient: SupabaseClient,
  userId: string,
  captureId: string,
  destinationCookbookId: string,
  authHeader: string,
): Promise<void> {
  const preparationStartedAt = Date.now();
  let activeStage: CaptureFailureStage = 'destination';
  try {
    const { data: capture, error: destinationError } = await userClient
      .schema('nutriai')
      .rpc('set_recipe_capture_destination', {
        p_capture_id: captureId,
        p_destination_cookbook_id: destinationCookbookId,
      });
    if (destinationError || !isRecord(capture) || !isRecord(capture.recipe_graph)) {
      throw new Error(destinationError?.message ?? 'This recipe is not ready to prepare');
    }

    const { data: cookbook, error: cookbookError } = await admin
      .schema('nutriai')
      .from('cookbooks')
      .select('cover_style, page_style_id, style_revision, page_style_references')
      .eq('id', destinationCookbookId)
      .eq('user_id', userId)
      .single();
    if (cookbookError || !cookbook) throw new Error('The destination cookbook is unavailable');

    const styleId = cookbook.page_style_id ?? cookbook.cover_style ?? 'handwritten';
    const styleRevision = Number(cookbook.style_revision ?? 1);
    const styleReferences = Array.isArray(cookbook.page_style_references)
      ? cookbook.page_style_references.filter((value: unknown): value is string => typeof value === 'string')
      : [];
    const canonicalRecipe = toCanonicalCookbookRecipe(capture.recipe_graph);
    const templateId = selectRecipeLayoutStrategy(canonicalRecipe);
    activeStage = 'page_generation';
    const { data: pageId, error: pageError } = await admin.schema('nutriai').rpc(
      'create_capture_page',
      {
        p_user_id: userId,
        p_capture_id: captureId,
        p_recipe_graph: canonicalRecipe,
        p_style_id: styleId,
        p_style_revision: styleRevision,
        p_template_id: templateId,
      },
    );
    if (pageError || typeof pageId !== 'string') {
      throw new Error(pageError?.message ?? 'Could not prepare the recipe page');
    }

    const existingPageGenerationVersion = await readyCapturePageGenerationVersion(admin, pageId);
    if (existingPageGenerationVersion) {
      activeStage = 'publication';
      await publishCapturePage(admin, userId, pageId, existingPageGenerationVersion);
    } else {
      activeStage = 'page_generation';
      const pageGeneration = await callFunction('generate-page-art', authHeader, {
        cookbookId: destinationCookbookId,
        pageId,
        recipeGraph: canonicalRecipe,
        styleId,
        styleRevision,
        styleReferences,
        idempotencyKey: capturePageIdempotencyKey(captureId, Number(capture.processing_attempt ?? 1)),
      });
      if (!pageGeneration.response.ok && pageGeneration.response.status !== 202) {
        if (pageGeneration.data.code === 'designed_page_limit_reached') {
          throw new CaptureProcessingError('page_generation', 'designed_page_limit_reached');
        }
        throw new Error(typeof pageGeneration.data.error === 'string'
          ? pageGeneration.data.error
          : 'Nosh could not generate this recipe page');
      }
    }
    logInfo('Recipe capture destination selected and page production started', {
      captureId,
      destinationCookbookId,
      pageId,
      durationMs: Date.now() - preparationStartedAt,
    });
  } catch (error) {
    const failedStage = error instanceof CaptureProcessingError ? error.stage : activeStage;
    const failure = captureFailure(error, failedStage);
    await admin.schema('nutriai').rpc('fail_recipe_capture', {
      p_user_id: userId,
      p_capture_id: captureId,
      p_failure_code: failure.failureCode,
      p_failure_message: failure.failureMessage,
      p_failed_stage: failure.failedStage,
    });
    logError('Recipe capture destination preparation failed', {
      captureId,
      error: failure.diagnostic,
      failureCode: failure.failureCode,
      failedStage: failure.failedStage,
      durationMs: Date.now() - preparationStartedAt,
    });
  }
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return corsResponse(req);
  const { user, error: authError } = await verifyAuth(req);
  if (authError) return authError;
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_KEY) {
    return jsonError('Capture processing is not configured', 500, req);
  }

  try {
    const body = await req.json().catch(() => null);
    if (!isRecord(body)) return jsonError('Invalid JSON body', 400, req);
    const authHeader = req.headers.get('Authorization')!;
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    let capture: JsonRecord;

    if (typeof body.captureId === 'string') {
      const { data, error } = await admin.schema('nutriai').from('recipe_captures')
        .select('*').eq('id', body.captureId).eq('user_id', user!.id).single();
      if (error || !data) return jsonError('Recipe capture not found', 404, req);
      capture = data;

      if (isRecord(body.correctedRecipeGraph)) {
        if (capture.status !== 'needs_attention' || capture.failure_code !== 'needs_recipe_correction') {
          return jsonError('This recipe is not waiting for corrected details', 409, req);
        }
        const currentGraph = isRecord(capture.recipe_graph) ? capture.recipe_graph : null;
        const currentAssessment = readRecipeQualityAssessment(currentGraph);
        if (!currentGraph || !currentAssessment) {
          return jsonError('The saved recipe details are unavailable', 409, req);
        }
        const currentProvenance = isRecord(currentGraph.provenance) ? currentGraph.provenance : {};
        const sourceUrl = typeof currentProvenance.sourceUrl === 'string'
          ? currentProvenance.sourceUrl
          : undefined;
        const correctedDraft = normalizeRecipeGraphDraft(
          {
            ...body.correctedRecipeGraph,
            provenance: currentProvenance,
          },
          null,
          String(capture.source_type),
          sourceUrl,
        );
        validateNormalizedRecipeGraph(correctedDraft);
        const reviewedIssueKeys = currentAssessment.issues
          .filter((issue) => issue.severity === 'blocking' && !issue.confirmed)
          .map((issue) => issue.key);
        const confirmedGraph = confirmRecipeQualityIssues(correctedDraft, reviewedIssueKeys);
        const correctedAssessment = assessRecipeQuality(confirmedGraph);
        const correctedQualityPolicy = captureQualityPolicy(correctedAssessment);
        if (!correctedQualityPolicy.accepted) {
          return jsonError(correctedQualityPolicy.failureMessage, 400, req);
        }
        const correctedGraph = withRecipeQualityAssessment(confirmedGraph, correctedAssessment);
        const { data: correctedCapture, error: correctionError } = await admin
          .schema('nutriai')
          .from('recipe_captures')
          .update({ recipe_graph: correctedGraph })
          .eq('id', body.captureId)
          .eq('user_id', user!.id)
          .select('*')
          .single();
        if (correctionError || !correctedCapture) {
          return jsonError(correctionError?.message ?? 'Could not save the corrected recipe', 400, req);
        }
        await recordCaptureCheckpoint(
          admin,
          user!.id,
          body.captureId,
          'normalization',
          RECIPE_GRAPH_NORMALIZATION_STAGE_VERSION,
          { path: 'user_correction' },
        );
        await recordCaptureCheckpoint(
          admin,
          user!.id,
          body.captureId,
          'quality',
          recipeQualityStageVersion(RECIPE_QUALITY_ASSESSMENT_VERSION),
          {
            decision: correctedAssessment.decision,
            issueCodes: correctedAssessment.issues.map((issue) => issue.code),
            corrected: true,
          },
        );
        logInfo('Recipe capture corrections accepted', {
          captureId: body.captureId,
          reviewedIssueCodes: currentAssessment.issues
            .filter((issue) => issue.severity === 'blocking' && !issue.confirmed)
            .map((issue) => issue.code),
          decision: correctedAssessment.decision,
        });
        capture = correctedCapture;
      }

      if (typeof body.destinationCookbookId === 'string') {
        if (capture.status !== 'needs_destination') {
          return jsonError('This recipe is not ready to choose a cookbook', 409, req);
        }
        EdgeRuntime.waitUntil(prepareCaptureDestination(
          admin,
          userClient,
          user!.id,
          body.captureId,
          body.destinationCookbookId,
          authHeader,
        ));
        return jsonResponse({
          status: 'processing',
          capture: publicCapture({
            ...capture,
            destination_cookbook_id: body.destinationCookbookId,
            status: 'processing',
            art_status: 'generating',
            art_warning: null,
          }),
        }, 202, req);
      }
    } else {
      if (!isRecord(body.source) || typeof body.idempotencyKey !== 'string') {
        return jsonError('Missing capture source or idempotency key', 400, req);
      }
      const sourceType = body.source.type;
      if (!['url', 'text', 'image', 'video', 'audio'].includes(String(sourceType))) return jsonError('Invalid source type', 400, req);
      if (sourceType === 'text' && recipeTextSourceIsTooLarge(body.source.input)) {
        return jsonError('Recipe text is too long. Paste one recipe at a time.', 413, req);
      }
      const additionalImagePaths = sourceType === 'image' && Array.isArray(body.source.additionalImagePaths)
        ? body.source.additionalImagePaths
          .filter((candidate): candidate is string => typeof candidate === 'string' && candidate.trim().length > 0)
          .slice(0, MAX_CAPTURE_IMAGE_COUNT - 1)
        : [];
      if (additionalImagePaths.some((path) => !isOwnedCaptureStoragePath(path, user!.id))) {
        return jsonError('Invalid recipe image path', 400, req);
      }
      const sourcePayload = sourceType === 'image'
        ? {
            mimeType: body.source.mimeType,
            notes: body.source.notes,
            additionalImagePaths,
          }
        : sourceType === 'video'
          ? {
              input: body.source.input,
              mimeType: body.source.mimeType,
              fileName: body.source.fileName,
              byteSize: body.source.byteSize,
              rightsConfirmed: body.source.rightsConfirmed === true,
              notes: body.source.notes,
              framePaths: Array.isArray(body.source.framePaths)
                ? body.source.framePaths
                  .filter((candidate): candidate is string => typeof candidate === 'string' && candidate.trim().length > 0)
                  .slice(0, MAX_VIDEO_FRAMES)
                : undefined,
            }
        : sourceType === 'audio'
          ? {
              mimeType: body.source.mimeType,
              fileName: body.source.fileName,
              byteSize: body.source.byteSize,
              notes: body.source.notes,
            }
          : { input: body.source.input };
      const storagePath = sourceType === 'image' || sourceType === 'audio' || sourceType === 'video'
        ? typeof body.source.storagePath === 'string' ? body.source.storagePath : null
        : null;
      const { data, error } = await userClient.schema('nutriai').rpc('begin_recipe_capture', {
        p_source_type: sourceType,
        p_source_payload: sourcePayload,
        p_source_storage_path: storagePath,
        p_destination_cookbook_id: body.destinationCookbookId ?? null,
        p_idempotency_key: body.idempotencyKey,
      });
      if (error || !data) return jsonError(error?.message ?? 'Could not save recipe capture', 400, req);
      capture = data;
    }

    const captureId = String(capture.id);
    EdgeRuntime.waitUntil(processCapture(admin, user!.id, captureId, authHeader));

    let pendingPage: JsonRecord | undefined;
    if (typeof capture.pending_page_id === 'string') {
      const { data } = await admin.schema('nutriai').from('cookbook_pages')
        .select('*, recipes(*)').eq('id', capture.pending_page_id).maybeSingle();
      if (data) pendingPage = publicPage(data);
    }
    const queuedCapture = capture.status === 'ready'
      ? capture
      : {
          ...capture,
          status: 'processing',
          processing_started_at: new Date().toISOString(),
          failure_code: null,
          failure_message: null,
          failed_stage: null,
        };
    return jsonResponse({ status: 'processing', capture: publicCapture(queuedCapture), pendingPage }, 202, req);
  } catch (error) {
    return errorResponse(error, req);
  }
});
