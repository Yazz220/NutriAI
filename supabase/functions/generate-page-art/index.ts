/**
 * generate-page-art Edge Function
 *
 * Generates the complete, flat recipe page that the cookbook reader displays.
 * The page includes the exact recipe copy, food imagery, typography, paper,
 * and decoration. The RecipeGraph remains the canonical reasoning data for
 * Nosh while this image is the user-facing reading artifact.
 *
 * Required Supabase Function secrets:
 *   AI_API_KEY            — OpenRouter API key
 *   AI_API_BASE           — Provider base URL (default: https://openrouter.ai/api/v1)
 *   ART_MODEL             — Image model (default: qwen/qwen-image-3-pro)
 *   SUPABASE_URL          — Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY — Supabase service role key
 *   COOKBOOK_PAGE_BUCKET  — Storage bucket (default: cookbook-pages)
 *
 * Request body:
 *   { cookbookId: string,
 *     pageId: string,          // existing page that will own the art asset
 *     recipeGraph: RecipeGraph,
 *     styleId: CookbookPageStyleId,
 *     styleRevision?: number,
 *     idempotencyKey: string   // 16-160 chars, alphanumeric + . _ : -
 *   }
 *
 * Response (success, 200):
 *   { pageImage: GeneratedRecipePage }
 *
 * Response (processing, 202):
 *   { status: "processing", requestId: string }
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { verifyAuth } from '../_shared/auth.ts';
import { corsResponse, jsonError, jsonResponse } from '../_shared/cors.ts';
import { compensateGenerationFailure } from '../_shared/generationFailure.ts';
import { errorResponse } from '../_shared/error.ts';
import { fetchWithRetry } from '../_shared/fetchRetry.ts';
import { logError, logInfo } from '../_shared/log.ts';
import {
  buildRecipePagePrompt,
  buildOpenRouterImageRequest,
  isRecipePageStyleId,
} from '../_shared/artGeneration.ts';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const AI_API_KEY = Deno.env.get('AI_API_KEY') || '';
const AI_API_BASE = (Deno.env.get('AI_API_BASE') || 'https://openrouter.ai/api/v1').replace(/\/$/, '');
const ART_MODEL = Deno.env.get('ART_MODEL') || 'qwen/qwen-image-3-pro';
const BUCKET = Deno.env.get('COOKBOOK_PAGE_BUCKET') || 'cookbook-pages';
// Reference-image edits take longer than text-to-image generations on Qwen.
// Leave ten seconds for persistence and compensation within Supabase's
// 150-second Free-plan worker limit.
const IMAGE_GENERATION_TIMEOUT_MS = 140_000;
const MAX_STYLE_REFERENCES = 4;

declare const EdgeRuntime: {
  waitUntil(promise: Promise<unknown>): void;
};

type JsonRecord = Record<string, unknown>;

// ---------------------------------------------------------------------------
// Types (mirrors of client types — kept local to avoid cross-runtime imports)
// ---------------------------------------------------------------------------
interface RecipeGraphInput {
  title: string;
  description?: string;
  servings?: number;
  cuisine?: string;
  category?: string;
  tags?: unknown[];
  ingredientGroups?: any[];
  stepGroups?: any[];
  notes?: string[];
}

interface GenerationRequestState {
  id: string;
  status: 'processing' | 'ready' | 'failed';
  claimed: boolean;
  response?: unknown;
  error?: string | null;
  recipeId?: string | null;
  pageId?: string | null;
  versionId?: string | null;
  storagePath?: string | null;
  createdPage?: boolean;
}

type SupabaseAdmin = any;

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------
function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isValidRecipeGraph(value: unknown): value is RecipeGraphInput {
  if (!isRecord(value)) return false;
  return typeof value.title === 'string' && value.title.trim().length > 0;
}

// ---------------------------------------------------------------------------
// Image generation via OpenRouter Image API
// ---------------------------------------------------------------------------
function base64ToBytes(base64: string): Uint8Array {
  const bin = atob(base64.replace(/^data:[^;]+;base64,/, ''));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function generatePageImage(
  prompt: string,
  styleReferences?: string[],
): Promise<{ bytes: Uint8Array; cost: number | undefined }> {
  if (!AI_API_KEY) throw new Error('OpenRouter is not configured (missing AI_API_KEY)');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), IMAGE_GENERATION_TIMEOUT_MS);

  const body = buildOpenRouterImageRequest(
    ART_MODEL,
    prompt,
    undefined,
    styleReferences?.slice(0, MAX_STYLE_REFERENCES) ?? [],
  );

  try {
    const res = await fetchWithRetry(`${AI_API_BASE}/images`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${AI_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://nosh.app',
        'X-Title': 'Nosh Cookbook',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const message = isRecord(data) && isRecord(data.error) && typeof data.error.message === 'string'
        ? data.error.message
        : isRecord(data) && typeof data.error === 'string'
          ? data.error
          : `OpenRouter image generation failed (${res.status})`;
      throw new Error(message);
    }

    const b64 = isRecord(data) && Array.isArray(data.data) && isRecord(data.data[0])
      ? data.data[0].b64_json
      : undefined;
    if (typeof b64 !== 'string') throw new Error('Image response did not include b64_json');

    const cost = isRecord(data) && isRecord(data.usage) && typeof data.usage.cost === 'number'
      ? data.usage.cost
      : undefined;

    return { bytes: base64ToBytes(b64), cost };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Image generation timed out');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

// ---------------------------------------------------------------------------
// Idempotency — reuses the generation_requests table and RPCs
// ---------------------------------------------------------------------------
async function beginGenerationRequest(
  admin: SupabaseAdmin,
  userId: string,
  cookbookId: string,
  idempotencyKey: string,
  requestPayload: JsonRecord,
): Promise<GenerationRequestState> {
  const { data, error } = await admin
    .schema('nutriai')
    .rpc('begin_generation_request', {
      p_user_id: userId,
      p_cookbook_id: cookbookId,
      p_idempotency_key: idempotencyKey,
      p_request_payload: requestPayload,
    });

  if (error) throw new Error(error.message);
  if (!isRecord(data) || typeof data.id !== 'string' || typeof data.status !== 'string') {
    throw new Error('Could not start art generation');
  }
  return data as unknown as GenerationRequestState;
}

async function updateGenerationRequest(
  admin: SupabaseAdmin,
  requestId: string,
  userId: string,
  values: JsonRecord,
): Promise<void> {
  const { data, error } = await admin
    .schema('nutriai')
    .from('generation_requests')
    .update(values)
    .eq('id', requestId)
    .eq('user_id', userId)
    .select('id')
    .single();

  if (error || !data) throw new Error(error?.message ?? 'Generation request not found');
}

async function completeGenerationRequest(
  admin: SupabaseAdmin,
  userId: string,
  generationRequestId: string,
  versionId: string,
  responsePayload: JsonRecord,
  selectVersion: boolean,
): Promise<void> {
  const { error } = await admin
    .schema('nutriai')
    .rpc('complete_art_generation_request', {
      p_user_id: userId,
      p_generation_request_id: generationRequestId,
      p_version_id: versionId,
      p_response_payload: responsePayload,
      p_select_version: selectVersion,
    });

  if (error) throw new Error(error.message);
}

async function failGenerationRequest(
  admin: SupabaseAdmin,
  userId: string,
  generationRequestId: string,
  message: string,
): Promise<boolean | null> {
  const { data, error } = await admin
    .schema('nutriai')
    .rpc('fail_generation_request', {
      p_user_id: userId,
      p_generation_request_id: generationRequestId,
      p_error_message: message,
    });

  if (error) {
    logError('Generation request failure cleanup could not be recorded', { error: error.message });
    return null;
  }
  return data === true;
}

async function removeStorageObject(admin: SupabaseAdmin, storagePath?: string): Promise<void> {
  if (!storagePath) return;
  const { error } = await admin.storage.from(BUCKET).remove([storagePath]);
  if (error) logError('Generated art storage cleanup failed', { error: error.message });
}

async function deleteGeneratedVersion(admin: SupabaseAdmin, versionId?: string): Promise<void> {
  if (!versionId) return;
  const { error } = await admin.schema('nutriai').from('page_versions').delete().eq('id', versionId);
  if (error) logError('Generated art version cleanup failed', { error: error.message });
}

async function finalizeCapturePage(
  admin: SupabaseAdmin,
  userId: string,
  pageId: string,
): Promise<void> {
  const { error } = await admin.schema('nutriai').rpc('finalize_recipe_capture_page', {
    p_user_id: userId,
    p_page_id: pageId,
  });
  if (error) {
    logError('Recipe capture page could not be published', { pageId, error: error.message });
  }
}

async function failCapturePage(
  admin: SupabaseAdmin,
  userId: string,
  pageId: string,
  message: string,
): Promise<void> {
  const { error } = await admin.schema('nutriai').rpc('fail_recipe_capture_page', {
    p_user_id: userId,
    p_page_id: pageId,
    p_failure_message: message,
  });
  if (error) {
    logError('Recipe capture page failure could not be recorded', { pageId, error: error.message });
  }
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------
serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return corsResponse(req);
  const requestStartedAt = Date.now();

  const { user, error: authError } = await verifyAuth(req);
  if (authError) return authError;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return jsonError('Supabase service client is not configured', 500, req);
  }

  try {
    const body = await req.json().catch(() => null);
    if (!isRecord(body)) return jsonError('Invalid JSON body', 400, req);

    const {
      cookbookId,
      pageId,
      recipeGraph,
      styleId: requestedStyleId,
      styleRevision: requestedStyleRevision,
      idempotencyKey,
      artDirection,
      referenceArtUrl,
      selectOnComplete,
    } = body;

    if (typeof cookbookId !== 'string' || cookbookId.length === 0) {
      return jsonError('Missing cookbookId', 400, req);
    }
    if (!isValidRecipeGraph(recipeGraph)) {
      return jsonError('Missing or invalid recipeGraph', 400, req);
    }
    if (!isRecipePageStyleId(requestedStyleId)) {
      return jsonError('Invalid styleId', 400, req);
    }
    if (requestedStyleRevision !== undefined
      && (!Number.isInteger(requestedStyleRevision) || Number(requestedStyleRevision) < 1)) {
      return jsonError('Invalid styleRevision', 400, req);
    }
    if (typeof idempotencyKey !== 'string' || !/^[A-Za-z0-9._:-]{16,160}$/.test(idempotencyKey)) {
      return jsonError('Invalid idempotencyKey (must be 16-160 chars, alphanumeric + . _ : -)', 400, req);
    }
    if (typeof pageId !== 'string' || pageId.length === 0) {
      return jsonError('Missing or invalid pageId', 400, req);
    }
    if (artDirection !== undefined && (typeof artDirection !== 'string' || artDirection.length > 600)) {
      return jsonError('Invalid artDirection', 400, req);
    }
    if (referenceArtUrl !== undefined && (
      typeof referenceArtUrl !== 'string'
      || !/^https:\/\//i.test(referenceArtUrl)
      || referenceArtUrl.length > 2048
    )) {
      return jsonError('Invalid referenceArtUrl', 400, req);
    }
    if (selectOnComplete !== undefined && typeof selectOnComplete !== 'boolean') {
      return jsonError('Invalid selectOnComplete', 400, req);
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // The cookbook owns the page aesthetic. Never let a caller override the
    // persisted identity or its reference anchors on a per-recipe request.
    const { data: cookbookRow, error: cookbookError } = await admin
      .schema('nutriai')
      .from('cookbooks')
      .select('id, page_style_id, style_revision, page_style_references')
      .eq('id', cookbookId)
      .eq('user_id', user!.id)
      .single();

    if (cookbookError || !cookbookRow) return jsonError('Cookbook not found', 404, req);
    const styleId = isRecipePageStyleId(cookbookRow.page_style_id)
      ? cookbookRow.page_style_id
      : requestedStyleId;
    const styleRevision = Number.isInteger(cookbookRow.style_revision)
      && Number(cookbookRow.style_revision) > 0
      ? Number(cookbookRow.style_revision)
      : Number(requestedStyleRevision ?? 1);
    const cookbookStyleReferences = Array.isArray(cookbookRow.page_style_references)
      ? cookbookRow.page_style_references.filter((value: unknown): value is string => (
          typeof value === 'string' && /^https:\/\//i.test(value) && value.length <= 2048
        )).slice(0, MAX_STYLE_REFERENCES)
      : [];

    logInfo('generate recipe page started', {
      cookbookId,
      styleId,
      styleRevision,
      dishName: recipeGraph.title,
    });

    // The service-role client bypasses RLS, so bind the requested page to the
    // authenticated user's cookbook before writing any generation state.
    const { data: pageRow, error: pageError } = await admin
      .schema('nutriai')
      .from('cookbook_pages')
      .select('id')
      .eq('id', pageId)
      .eq('cookbook_id', cookbookId)
      .single();

    if (pageError || !pageRow) return jsonError('Cookbook page not found', 404, req);

    // Begin idempotent generation request
    let generationRequest: GenerationRequestState;
    try {
      generationRequest = await beginGenerationRequest(
        admin,
        user!.id,
        cookbookId,
        idempotencyKey,
        body,
      );
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : 'Could not start art generation';
      const status = message.toLowerCase().includes('reused') ? 409 : 500;
      return jsonError(message, status, req);
    }

    // If not claimed, return existing state
    if (!generationRequest.claimed) {
      logInfo('generate-page-art idempotent replay', {
        cookbookId,
        requestId: generationRequest.id,
        status: generationRequest.status,
        durationMs: Date.now() - requestStartedAt,
      });
      if (generationRequest.status === 'ready' && isRecord(generationRequest.response)) {
        return jsonResponse(generationRequest.response, 200, req);
      }
      if (generationRequest.status === 'processing') {
        return jsonResponse({ status: 'processing', requestId: generationRequest.id }, 202, req);
      }
      // Failed — clean up and return error
      await removeStorageObject(admin, generationRequest.storagePath ?? undefined);
      await deleteGeneratedVersion(admin, generationRequest.versionId ?? undefined);
      return jsonError(generationRequest.error ?? 'Art generation failed', 409, req);
    }

    const generationRequestId = generationRequest.id;

    // complete_generation_request requires generation_requests.page_id and
    // verifies that the generated version belongs to that page.
    try {
      await updateGenerationRequest(admin, generationRequestId, user!.id, {
        page_id: pageId,
      });
    } catch (requestError) {
      const message = requestError instanceof Error
        ? requestError.message
        : 'Could not attach art generation to the cookbook page';
      await failGenerationRequest(admin, user!.id, generationRequestId, message);
      return jsonError(message, 500, req);
    }

    const inputReferences = [
      ...(typeof referenceArtUrl === 'string' ? [referenceArtUrl] : []),
      ...cookbookStyleReferences,
    ].slice(0, MAX_STYLE_REFERENCES);
    const { prompt, payload: pagePromptPayload } = buildRecipePagePrompt(
      recipeGraph as RecipeGraphInput,
      styleId,
      {
        styleRevision,
        visualDirection: typeof artDirection === 'string' ? artDirection : undefined,
        styleReferences: inputReferences,
      },
    );

    // Run generation in the background
    const generationTask = (async () => {
      let storagePath: string | undefined;
      let versionId: string | undefined;

      try {
        const { bytes, cost } = await generatePageImage(prompt, inputReferences);

        storagePath = `${user!.id}/${cookbookId}/${crypto.randomUUID()}.png`;
        const upload = await admin.storage.from(BUCKET).upload(storagePath, bytes, {
          contentType: 'image/png',
          upsert: false,
        });
        if (upload.error) throw new Error(upload.error.message);

        await updateGenerationRequest(admin, generationRequestId, user!.id, {
          storage_path: storagePath,
        });

        // Store as a page_version (reusing the existing table)
        const { data: versionRow, error: versionError } = await admin
          .schema('nutriai')
          .from('page_versions')
          .insert({
            page_id: pageId,
            image_url: null,
            storage_path: storagePath,
            prompt_payload: pagePromptPayload,
            model: ART_MODEL,
            status: 'ready',
            credit_cost: 0,
          })
          .select('id')
          .single();

        if (versionError) throw new Error(versionError.message);
        versionId = String(versionRow.id);

        await updateGenerationRequest(admin, generationRequestId, user!.id, {
          version_id: versionId,
        });

        const responsePayload = {
          pageImage: {
            id: versionId,
            pageId,
            storagePath,
            styleId,
            styleRevision: pagePromptPayload.styleRevision,
            generationPrompt: prompt,
            styleReferences: inputReferences,
            model: ART_MODEL,
            status: 'ready',
            creditCost: 0,
            cost,
            createdAt: new Date().toISOString(),
          },
        };

        await completeGenerationRequest(
          admin,
          user!.id,
          generationRequestId,
          versionId,
          responsePayload,
          selectOnComplete !== false,
        );
        await finalizeCapturePage(admin, user!.id, pageId);

        logInfo('generate recipe page completed', {
          cookbookId,
          styleId,
          dishName: recipeGraph.title,
          cost,
          versionId,
          durationMs: Date.now() - requestStartedAt,
        });

        return jsonResponse(responsePayload, 200, req);
      } catch (generationError) {
        const message = generationError instanceof Error ? generationError.message : 'Recipe page generation failed';
        logError('generate recipe page failed', {
          error: message,
          cookbookId,
          durationMs: Date.now() - requestStartedAt,
        });

        await compensateGenerationFailure(
          message,
          { storagePath, versionId, pageId: undefined, recipeId: undefined },
          {
            recordFailure: () => failGenerationRequest(admin, user!.id, generationRequestId, message),
            recoverCompleted: async () => {
              try {
                const recovered = await beginGenerationRequest(
                  admin,
                  user!.id,
                  cookbookId,
                  idempotencyKey,
                  body,
                );
                return recovered.status === 'ready' && isRecord(recovered.response);
              } catch (recoveryError) {
                logError('Completed art generation recovery failed', { error: String(recoveryError) });
                return false;
              }
            },
            removeStorage: (path) => removeStorageObject(admin, path),
            removeVersion: (id) => deleteGeneratedVersion(admin, id),
            removeCreatedRows: async () => {}, // no rows created in this function
          },
        );
        await failCapturePage(admin, user!.id, pageId, message);

        return jsonError(message, 502, req);
      }
    })();

    EdgeRuntime.waitUntil(generationTask);
    return jsonResponse({ status: 'processing', requestId: generationRequestId }, 202, req);
  } catch (err) {
    return errorResponse(err, req);
  }
});
