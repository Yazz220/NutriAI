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
import { inspectUploadedVideoRecipeSource } from '../_shared/videoRecipeEvidence.ts';
import {
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
  RECIPE_GRAPH_NORMALIZATION_STAGE_VERSION,
  RECIPE_PAGE_GENERATION_STAGE_VERSION,
  sourceStageVersion,
  type CaptureCheckpointName,
} from '../_shared/captureStages.ts';
import { isCanonicalCookbookPageGenerationPayload } from '../_shared/cookbookPageGeometry.ts';
import { toCanonicalCookbookRecipe } from '../_shared/canonicalRecipe.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || '';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const CAPTURE_BUCKET = 'recipe-captures';
const AI_API_KEY = Deno.env.get('AI_API_KEY') || '';
const AI_API_BASE = Deno.env.get('AI_API_BASE') || 'https://openrouter.ai/api/v1';
const AUDIO_TRANSCRIPTION_API_KEY = Deno.env.get('AUDIO_TRANSCRIPTION_API_KEY') || AI_API_KEY;
const AUDIO_TRANSCRIPTION_API_BASE = Deno.env.get('AUDIO_TRANSCRIPTION_API_BASE') || AI_API_BASE;
const AUDIO_TRANSCRIPTION_MODEL = Deno.env.get('AUDIO_TRANSCRIPTION_MODEL') || 'openai/whisper-large-v3';

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
  | { ready: true; payload: JsonRecord }
  | {
      ready: false;
      reasonCode: RecipeEvidenceFailureCode;
      diagnostic: string;
      failedStage: Extract<CaptureFailureStage, 'source' | 'transcription'>;
    };

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
    await recordCaptureCheckpoint(
      admin,
      String(capture.user_id),
      String(capture.id),
      'source',
      sourceStageVersion(sourceType),
      sourceType === 'video'
        ? {
            sourceType,
            sourceKind: 'url',
            rightsConfirmed: payload.rightsConfirmed === true,
          }
        : { sourceType },
    );
    return {
      ready: true,
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
  const { data, error } = await admin.storage.from(CAPTURE_BUCKET).download(storagePath);
  if (error || !data) {
    throw new CaptureProcessingError('source', error?.message ?? 'Could not read the saved recipe attachment');
  }
  const bytes = new Uint8Array(await data.arrayBuffer());
  if (sourceType === 'image') {
    await recordCaptureCheckpoint(
      admin,
      String(capture.user_id),
      String(capture.id),
      'source',
      sourceStageVersion(sourceType),
      {
        sourceType,
        byteSize: bytes.byteLength,
        mimeType: typeof payload.mimeType === 'string' ? payload.mimeType : data.type,
      },
    );
    return {
      ready: true,
      payload: {
        type: 'image',
        imageBase64: toBase64(bytes),
        imageMimeType: typeof payload.mimeType === 'string' ? payload.mimeType : 'image/jpeg',
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
    if (!inspection.ready) return { ...inspection, failedStage: 'source' };

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
      },
    );
    return {
      ready: true,
      payload: {
        type: 'video',
        videoBase64: toBase64(bytes),
        videoMimeType: inspection.mimeType,
        videoFileName: typeof payload.fileName === 'string' ? payload.fileName : storagePath,
        videoRightsConfirmed: true,
        notes: typeof payload.notes === 'string' ? payload.notes : undefined,
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
    if (!evidence.ready) return { ...evidence, failedStage: 'source' };

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
        ready: true,
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
    if (!transcription.ready) return { ...transcription, failedStage: 'transcription' };

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
      ready: true,
      payload: {
        type: 'audio',
        input: transcription.transcript,
        notes: typeof payload.notes === 'string' ? payload.notes : undefined,
      },
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
      if (!preparedSource.ready) {
        const failureMessage = recipeEvidenceFeedback(preparedSource.reasonCode);
        const { error: failureError } = await admin.schema('nutriai').rpc('fail_recipe_capture', {
          p_user_id: userId,
          p_capture_id: captureId,
          p_failure_code: preparedSource.reasonCode,
          p_failure_message: failureMessage,
          p_failed_stage: preparedSource.failedStage,
        });
        if (failureError) throw new Error(failureError.message);
        logInfo('Recipe capture audio needs attention', {
          captureId,
          reasonCode: preparedSource.reasonCode,
          diagnostic: preparedSource.diagnostic,
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
      const sourcePayload = sourceType === 'image'
        ? { mimeType: body.source.mimeType, notes: body.source.notes }
        : sourceType === 'video'
          ? {
              input: body.source.input,
              mimeType: body.source.mimeType,
              fileName: body.source.fileName,
              byteSize: body.source.byteSize,
              rightsConfirmed: body.source.rightsConfirmed === true,
              notes: body.source.notes,
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
