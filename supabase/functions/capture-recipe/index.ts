import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { verifyAuth } from '../_shared/auth.ts';
import { corsResponse, jsonError, jsonResponse } from '../_shared/cors.ts';
import { errorResponse } from '../_shared/error.ts';
import { logError, logInfo } from '../_shared/log.ts';
import {
  capturePageIdempotencyKey,
  capturePagePolicy,
  captureFailure,
} from '../_shared/capturePolicy.ts';
import { selectRecipeLayoutStrategy } from '../_shared/recipeLayout.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || '';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const CAPTURE_BUCKET = 'recipe-captures';

declare const EdgeRuntime: { waitUntil(promise: Promise<unknown>): void };
type JsonRecord = Record<string, unknown>;
type SupabaseClient = any;

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

async function readSource(admin: SupabaseClient, capture: JsonRecord): Promise<JsonRecord> {
  const sourceType = String(capture.source_type);
  const payload = isRecord(capture.source_payload) ? capture.source_payload : {};
  if (sourceType !== 'image') {
    const input = payload.input;
    if (typeof input !== 'string' || input.trim().length === 0) throw new Error('The saved recipe source is empty');
    return sourceType === 'video'
      ? { type: 'video', videoUrl: input }
      : { type: sourceType, input };
  }

  const storagePath = capture.source_storage_path;
  if (typeof storagePath !== 'string') throw new Error('The saved recipe image is missing');
  const { data, error } = await admin.storage.from(CAPTURE_BUCKET).download(storagePath);
  if (error || !data) throw new Error(error?.message ?? 'Could not read the saved recipe image');
  const bytes = new Uint8Array(await data.arrayBuffer());
  return {
    type: 'image',
    imageBase64: toBase64(bytes),
    imageMimeType: typeof payload.mimeType === 'string' ? payload.mimeType : 'image/jpeg',
    input: typeof payload.notes === 'string' ? payload.notes : undefined,
  };
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

  try {
    const extractPayload = await readSource(admin, capture);
    const extraction = await callFunction('extract-recipe', authHeader, extractPayload);
    if (!extraction.response.ok || !isRecord(extraction.data.recipeGraph)) {
      throw new Error(typeof extraction.data.error === 'string' ? extraction.data.error : 'Nosh could not read this recipe');
    }

    const recipeGraph = extraction.data.recipeGraph;
    const confidence = typeof extraction.data.confidence === 'number' ? extraction.data.confidence : 0;
    const extractionNotes = Array.isArray(extraction.data.extractionNotes) ? extraction.data.extractionNotes : [];
    const inferredFields = Array.isArray(extraction.data.inferredFields) ? extraction.data.inferredFields : [];

    await admin.schema('nutriai').from('recipe_captures').update({
      recipe_graph: recipeGraph,
      confidence,
      extraction_notes: extractionNotes,
      inferred_fields: inferredFields,
    }).eq('id', captureId).eq('user_id', userId);

    let { pageStatus, pageWarning } = capturePagePolicy(false);
    let pendingPageId: string | undefined;
    const destinationCookbookId = capture.destination_cookbook_id;

    if (typeof destinationCookbookId === 'string') {
      const { data: cookbook, error: cookbookError } = await admin
        .schema('nutriai')
        .from('cookbooks')
        .select('cover_style, style_revision, page_style_references')
        .eq('id', destinationCookbookId)
        .eq('user_id', userId)
        .single();
      if (cookbookError || !cookbook) throw new Error('The destination cookbook is unavailable');
      const styleId = cookbook.cover_style ?? 'handwritten';
      const styleRevision = Number(cookbook.style_revision ?? 1);
      const styleReferences = Array.isArray(cookbook.page_style_references)
        ? cookbook.page_style_references.filter((value: unknown): value is string => typeof value === 'string')
        : [];
      const templateId = selectRecipeLayoutStrategy(recipeGraph);
      const { data: pageId, error: pageError } = await admin.schema('nutriai').rpc(
        'create_capture_page',
        {
          p_user_id: userId,
          p_capture_id: captureId,
          p_recipe_graph: recipeGraph,
          p_style_id: styleId,
          p_style_revision: styleRevision,
          p_template_id: templateId,
        },
      );
      if (pageError || typeof pageId !== 'string') throw new Error(pageError?.message ?? 'Could not prepare the recipe page');
      pendingPageId = pageId;
      ({ pageStatus, pageWarning } = capturePagePolicy(true));

      const pageGeneration = await callFunction('generate-page-art', authHeader, {
        cookbookId: destinationCookbookId,
        pageId,
        recipeGraph,
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
    const failure = captureFailure(error);
    const message = failure.failureMessage;
    await admin.schema('nutriai').rpc('fail_recipe_capture', {
      p_user_id: userId,
      p_capture_id: captureId,
      p_failure_code: failure.failureCode,
      p_failure_message: message,
    });
    logError('Recipe capture processing failed', {
      captureId,
      error: message,
      failureCode: failure.failureCode,
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
      .select('cover_style, style_revision, page_style_references')
      .eq('id', destinationCookbookId)
      .eq('user_id', userId)
      .single();
    if (cookbookError || !cookbook) throw new Error('The destination cookbook is unavailable');

    const styleId = cookbook.cover_style ?? 'handwritten';
    const styleRevision = Number(cookbook.style_revision ?? 1);
    const styleReferences = Array.isArray(cookbook.page_style_references)
      ? cookbook.page_style_references.filter((value: unknown): value is string => typeof value === 'string')
      : [];
    const templateId = selectRecipeLayoutStrategy(capture.recipe_graph);
    const { data: pageId, error: pageError } = await admin.schema('nutriai').rpc(
      'create_capture_page',
      {
        p_user_id: userId,
        p_capture_id: captureId,
        p_recipe_graph: capture.recipe_graph,
        p_style_id: styleId,
        p_style_revision: styleRevision,
        p_template_id: templateId,
      },
    );
    if (pageError || typeof pageId !== 'string') {
      throw new Error(pageError?.message ?? 'Could not prepare the recipe page');
    }

    const pageGeneration = await callFunction('generate-page-art', authHeader, {
      cookbookId: destinationCookbookId,
      pageId,
      recipeGraph: capture.recipe_graph,
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
    logInfo('Recipe capture destination selected and page production started', {
      captureId,
      destinationCookbookId,
      pageId,
      durationMs: Date.now() - preparationStartedAt,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not prepare the recipe page';
    await admin.schema('nutriai').rpc('fail_recipe_capture', {
      p_user_id: userId,
      p_capture_id: captureId,
      p_failure_code: 'page_generation_failed',
      p_failure_message: message,
    });
    logError('Recipe capture destination preparation failed', {
      captureId,
      error: message,
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
      if (!['url', 'text', 'image', 'video'].includes(String(sourceType))) return jsonError('Invalid source type', 400, req);
      const sourcePayload = sourceType === 'image'
        ? { mimeType: body.source.mimeType, notes: body.source.notes }
        : { input: body.source.input };
      const storagePath = sourceType === 'image' ? body.source.storagePath : null;
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
    return jsonResponse({ status: 'processing', capture: publicCapture(capture), pendingPage }, 202, req);
  } catch (error) {
    return errorResponse(error, req);
  }
});
