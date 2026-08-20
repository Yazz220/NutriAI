/**
 * generate-page-art Edge Function
 *
 * Generates an isolated illustration for a cookbook page using the
 * OpenRouter Image API (Qwen Image 3 Pro). The illustration contains
 * NO text — the typesetter renders the recipe text separately as
 * live vector text.
 *
 * This replaces the legacy generate-cookbook-page function. Key differences:
 *   - Calls OpenRouter Image API (POST /api/v1/images), not OpenAI
 *   - Prompt contains NO recipe text — only dish name, cuisine, style
 *   - Output is an illustration asset, not a full-page PNG
 *   - Reuses the generation_requests idempotency table from the legacy function
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
 *     pageId?: string,         // optional, for re-generation
 *     recipeGraph: RecipeGraph,
 *     styleId: CookbookStyleId,
 *     idempotencyKey: string   // 16-160 chars, alphanumeric + . _ : -
 *   }
 *
 * Response (success, 200):
 *   { artAsset: PageArtAsset }
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

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const AI_API_KEY = Deno.env.get('AI_API_KEY') || '';
const AI_API_BASE = (Deno.env.get('AI_API_BASE') || 'https://openrouter.ai/api/v1').replace(/\/$/, '');
const ART_MODEL = Deno.env.get('ART_MODEL') || 'qwen/qwen-image-3-pro';
const BUCKET = Deno.env.get('COOKBOOK_PAGE_BUCKET') || 'cookbook-pages';
const IMAGE_GENERATION_TIMEOUT_MS = 120_000;
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
  ingredientGroups?: unknown[];
  stepGroups?: unknown[];
}

interface PageArtPromptPayload {
  styleId: string;
  styleDescriptor: string;
  themePrompt: string;
  dishName: string;
  cuisine?: string;
  artInstructions: string;
  styleReferences?: string[];
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

const VALID_STYLE_IDS = new Set([
  'vintage-garden', 'handwritten', 'editorial', 'watercolor', 'rustic', 'minimal',
  'sage-linen', 'terracotta-cloth', 'navy-leather', 'charcoal-cloth',
  'alabaster-linen', 'umber-leather',
]);

// ---------------------------------------------------------------------------
// Style preset descriptors (mirrored from constants/cookbookStyles.ts)
// ---------------------------------------------------------------------------
interface StylePreset {
  pagePromptDescriptor: string;
  themePrompt: string;
}

const STYLE_PRESETS: Record<string, StylePreset> = {
  'vintage-garden': {
    pagePromptDescriptor: 'warm minimal cookbook page, alabaster paper background, black ink line drawing, subtle vintage border, generous white space',
    themePrompt: 'alabaster cookbook page with black ink line illustration, subtle vintage border, warm minimal editorial style',
  },
  'handwritten': {
    pagePromptDescriptor: 'garden table cookbook page, black ink botanical line art, alabaster surface, airy layout, calm handmade cookbook feel',
    themePrompt: 'alabaster cookbook page with botanical black ink line art, airy layout, calm handmade cookbook style',
  },
  'editorial': {
    pagePromptDescriptor: 'classic family cookbook page, black ink food illustration, subtle decorative rule, alabaster background, spacious editorial layout',
    themePrompt: 'classic family cookbook page with black ink food illustration, subtle ornaments, warm alabaster background',
  },
  'watercolor': {
    pagePromptDescriptor: 'beloved family cookbook page, black ink line art, soft blush detail, simple centered composition, calm paper texture',
    themePrompt: 'beloved family cookbook page with black ink line art, soft blush accent, calm paper texture',
  },
  'rustic': {
    pagePromptDescriptor: 'minimal notes and recipes journal page, black ink line illustration, notebook-inspired margin, alabaster background, handwritten warmth',
    themePrompt: 'minimal notes and recipes journal page with black ink line illustration, notebook-inspired margin, alabaster background',
  },
  'minimal': {
    pagePromptDescriptor: 'clean citrus cookbook journal page, black ink citrus illustration, alabaster background, refined minimal cookbook layout',
    themePrompt: 'clean citrus cookbook journal page with black ink citrus illustration, refined minimal layout, alabaster background',
  },
  'sage-linen': {
    pagePromptDescriptor: 'herb garden cookbook page, black ink botanical line illustration, subtle sage green and gold accents, alabaster background, refined country kitchen editorial layout',
    themePrompt: 'herb garden cookbook page with black ink botanical line illustration, sage green and gold accents, alabaster background',
  },
  'terracotta-cloth': {
    pagePromptDescriptor: 'sun-warmed mediterranean cookbook page, black ink food illustration, subtle terracotta and copper accents, alabaster background, generous editorial spacing',
    themePrompt: 'sun-warmed mediterranean cookbook page with black ink food illustration, terracotta and copper accents, alabaster background',
  },
  'navy-leather': {
    pagePromptDescriptor: 'midnight bistro cookbook page, black ink line illustration, subtle navy and silver accents, clean alabaster background, refined brasserie editorial layout',
    themePrompt: 'midnight bistro cookbook page with black ink line illustration, navy and silver accents, clean alabaster background',
  },
  'charcoal-cloth': {
    pagePromptDescriptor: 'modern bistro cookbook page, black ink illustration, single restrained gold accent rule, alabaster background, confident minimal editorial layout',
    themePrompt: 'modern bistro cookbook page with black ink illustration, restrained gold accent rule, alabaster background, minimal editorial layout',
  },
  'alabaster-linen': {
    pagePromptDescriptor: 'bright farmhouse cookbook page, black ink line illustration, soft copper accent details, alabaster background, airy editorial layout with generous margins',
    themePrompt: 'bright farmhouse cookbook page with black ink line illustration, soft copper accents, alabaster background, airy layout',
  },
  'umber-leather': {
    pagePromptDescriptor: 'hearth kitchen cookbook page, black ink illustration, warm umber and gold accents, warm parchment background, heritage editorial layout',
    themePrompt: 'hearth kitchen cookbook page with black ink illustration, warm umber and gold accents, warm parchment background',
  },
};

function getStylePreset(styleId: string): StylePreset {
  return STYLE_PRESETS[styleId] ?? STYLE_PRESETS['vintage-garden'];
}

// ---------------------------------------------------------------------------
// Art prompt construction — NO recipe text, only visual description
// ---------------------------------------------------------------------------
function buildArtPrompt(graph: RecipeGraphInput, styleId: string): { prompt: string; payload: PageArtPromptPayload } {
  const preset = getStylePreset(styleId);
  const dishName = graph.title.trim();
  const cuisine = typeof graph.cuisine === 'string' && graph.cuisine.trim()
    ? graph.cuisine.trim()
    : undefined;

  const cuisineClause = cuisine ? `, ${cuisine} style` : '';

  const prompt = [
    preset.pagePromptDescriptor,
    preset.themePrompt,
    `Illustration of ${dishName}${cuisineClause}.`,
    'Hero food illustration, beautifully plated, appetizing, cookbook aesthetic.',
    'NO text, no words, no letters, no numbers, no recipe text, no handwriting, no captions, no labels.',
    'The illustration must be purely visual — only food, props, and decorative elements.',
  ].join(' ');

  const payload: PageArtPromptPayload = {
    styleId,
    styleDescriptor: preset.pagePromptDescriptor,
    themePrompt: preset.themePrompt,
    dishName,
    cuisine,
    artInstructions: 'Hero food illustration, beautifully plated, appetizing, cookbook aesthetic. NO text, no words, no letters, no numbers, no recipe text.',
  };

  return { prompt, payload };
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

async function generateArt(prompt: string, styleReferences?: string[]): Promise<{ bytes: Uint8Array; cost: number | undefined }> {
  if (!AI_API_KEY) throw new Error('OpenRouter is not configured (missing AI_API_KEY)');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), IMAGE_GENERATION_TIMEOUT_MS);

  const body: Record<string, unknown> = {
    model: ART_MODEL,
    prompt,
    aspect_ratio: '3:4',
    resolution: '2K',
    output_format: 'png',
    n: 1,
  };

  if (Array.isArray(styleReferences) && styleReferences.length > 0) {
    body.input_references = styleReferences.slice(0, MAX_STYLE_REFERENCES).map((url) => ({
      type: 'image_url',
      image_url: { url },
    }));
  }

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

async function reserveCredit(
  admin: SupabaseAdmin,
  userId: string,
  generationRequestId: string,
): Promise<string> {
  const { data, error } = await admin
    .schema('nutriai')
    .rpc('reserve_generation_credit', {
      p_user_id: userId,
      p_generation_request_id: generationRequestId,
    });

  if (error) throw new Error(error.message);
  if (typeof data !== 'string') throw new Error('Credit reservation failed');
  return data;
}

async function completeGenerationRequest(
  admin: SupabaseAdmin,
  userId: string,
  generationRequestId: string,
  versionId: string,
  responsePayload: JsonRecord,
): Promise<void> {
  const { error } = await admin
    .schema('nutriai')
    .rpc('complete_generation_request', {
      p_user_id: userId,
      p_generation_request_id: generationRequestId,
      p_version_id: versionId,
      p_response_payload: responsePayload,
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

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------
serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return corsResponse(req);

  const { user, error: authError } = await verifyAuth(req);
  if (authError) return authError;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return jsonError('Supabase service client is not configured', 500, req);
  }

  try {
    const body = await req.json().catch(() => null);
    if (!isRecord(body)) return jsonError('Invalid JSON body', 400, req);

    const { cookbookId, pageId, recipeGraph, styleId, idempotencyKey } = body;

    if (typeof cookbookId !== 'string' || cookbookId.length === 0) {
      return jsonError('Missing cookbookId', 400, req);
    }
    if (!isValidRecipeGraph(recipeGraph)) {
      return jsonError('Missing or invalid recipeGraph', 400, req);
    }
    if (typeof styleId !== 'string' || !VALID_STYLE_IDS.has(styleId)) {
      return jsonError('Invalid styleId', 400, req);
    }
    if (typeof idempotencyKey !== 'string' || !/^[A-Za-z0-9._:-]{16,160}$/.test(idempotencyKey)) {
      return jsonError('Invalid idempotencyKey (must be 16-160 chars, alphanumeric + . _ : -)', 400, req);
    }
    if (pageId !== undefined && typeof pageId !== 'string') {
      return jsonError('Invalid pageId', 400, req);
    }

    logInfo('generate-page-art started', { cookbookId, styleId, dishName: recipeGraph.title });

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Verify cookbook ownership
    const { data: cookbookRow, error: cookbookError } = await admin
      .schema('nutriai')
      .from('cookbooks')
      .select('id')
      .eq('id', cookbookId)
      .eq('user_id', user!.id)
      .single();

    if (cookbookError || !cookbookRow) return jsonError('Cookbook not found', 404, req);

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

    // Build the art prompt (NO recipe text)
    const { prompt, payload: artPayload } = buildArtPrompt(recipeGraph as RecipeGraphInput, styleId);
    const styleReferences = Array.isArray((body as JsonRecord).styleReferences)
      ? (body as JsonRecord).styleReferences as string[]
      : undefined;

    // Run generation in the background
    const generationTask = (async () => {
      let storagePath: string | undefined;
      let versionId: string | undefined;

      try {
        // Reserve credit before spending on generation
        await reserveCredit(admin, user!.id, generationRequestId);
      } catch (creditError) {
        const message = creditError instanceof Error ? creditError.message : 'Not enough credits';
        await failGenerationRequest(admin, user!.id, generationRequestId, message);
        const status = message.toLowerCase().includes('not enough credits') ? 402 : 500;
        return jsonError(message, status, req);
      }

      try {
        const { bytes, cost } = await generateArt(prompt, styleReferences);

        storagePath = `${user!.id}/${cookbookId}/${crypto.randomUUID()}.png`;
        const upload = await admin.storage.from(BUCKET).upload(storagePath, bytes, {
          contentType: 'image/png',
          upsert: false,
        });
        if (upload.error) throw new Error(upload.error.message);

        await updateGenerationRequest(admin, generationRequestId, user!.id, {
          storage_path: storagePath,
        });

        const { data: publicUrlData } = admin.storage.from(BUCKET).getPublicUrl(storagePath);
        const artUrl = publicUrlData.publicUrl;

        // Store as a page_version (reusing the existing table)
        const { data: versionRow, error: versionError } = await admin
          .schema('nutriai')
          .from('page_versions')
          .insert({
            page_id: pageId ?? null,
            image_url: artUrl,
            storage_path: storagePath,
            prompt_payload: artPayload,
            model: ART_MODEL,
            status: 'ready',
            credit_cost: 1,
          })
          .select('id')
          .single();

        if (versionError) throw new Error(versionError.message);
        versionId = String(versionRow.id);

        await updateGenerationRequest(admin, generationRequestId, user!.id, {
          version_id: versionId,
        });

        const responsePayload = {
          artAsset: {
            id: versionId,
            pageId: pageId ?? null,
            artUrl,
            storagePath,
            styleId,
            artPrompt: prompt,
            styleReferences: styleReferences ?? [],
            model: ART_MODEL,
            status: 'ready',
            creditCost: 1,
            cost,
          },
        };

        await completeGenerationRequest(
          admin,
          user!.id,
          generationRequestId,
          versionId,
          responsePayload,
        );

        logInfo('generate-page-art completed', {
          cookbookId,
          styleId,
          dishName: recipeGraph.title,
          cost,
          versionId,
        });

        return jsonResponse(responsePayload, 200, req);
      } catch (generationError) {
        const message = generationError instanceof Error ? generationError.message : 'Art generation failed';
        logError('generate-page-art failed', { error: message, cookbookId });

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

        return jsonError(message, 502, req);
      }
    })();

    EdgeRuntime.waitUntil(generationTask);
    return jsonResponse({ status: 'processing', requestId: generationRequestId }, 202, req);
  } catch (err) {
    return errorResponse(err, req);
  }
});
