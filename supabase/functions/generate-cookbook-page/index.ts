import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { verifyAuth } from '../_shared/auth.ts';
import { corsResponse, jsonError, jsonResponse } from '../_shared/cors.ts';
import { compensateGenerationFailure } from '../_shared/generationFailure.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') || '';
const OPENAI_IMAGE_MODEL = Deno.env.get('OPENAI_IMAGE_MODEL') || 'gpt-image-2';
const BUCKET = Deno.env.get('COOKBOOK_PAGE_BUCKET') || 'cookbook-pages';
const IMAGE_GENERATION_TIMEOUT_MS = 120_000;

declare const EdgeRuntime: {
  waitUntil(promise: Promise<unknown>): void;
};

type JsonRecord = Record<string, unknown>;

interface RecipeInput {
  title: string;
  description?: string;
  servings?: number;
  prepTime?: number;
  cookTime?: number;
  ingredients: unknown[];
  steps: string[];
  sourceType?: string;
  sourceUrl?: string;
  tags?: unknown[];
  category?: string;
  confidence?: number;
}

interface RecipeRow {
  id: string;
  title: string;
  description?: string | null;
  servings?: number | null;
  prep_time?: number | null;
  cook_time?: number | null;
  ingredients?: unknown;
  steps?: unknown;
  source_type?: string;
  source_url?: string | null;
  tags?: unknown;
  category?: string | null;
  confidence?: number | string | null;
}

interface PageRow {
  id: string;
  cookbook_id: string;
  recipe_id: string;
  page_number: number;
  section: string;
  sort_order: number;
  selected_version_id?: string | null;
  recipes?: RecipeRow | null;
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

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isValidRecipe(value: unknown): value is RecipeInput {
  if (!isRecord(value)) return false;
  return (
    typeof value.title === 'string' &&
    value.title.trim().length > 0 &&
    Array.isArray(value.ingredients) &&
    Array.isArray(value.steps)
  );
}

function base64ToBytes(base64: string): Uint8Array {
  const bin = atob(base64.replace(/^data:[^;]+;base64,/, ''));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function promptFromPayload(promptPayload: JsonRecord): string {
  const recipe = isRecord(promptPayload.recipe) ? promptPayload.recipe : {};
  const template = isRecord(promptPayload.template) ? promptPayload.template : {};
  const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
  const steps = Array.isArray(recipe.steps) ? recipe.steps : [];

  return [
    typeof promptPayload.instructions === 'string' ? promptPayload.instructions : '',
    '',
    `Page template: ${typeof template.name === 'string' ? template.name : 'not specified'}`,
    `Template style reference: ${typeof template.promptDescriptor === 'string' ? template.promptDescriptor : 'not specified'}`,
    '',
    `Title: ${typeof recipe.title === 'string' ? recipe.title : 'Untitled recipe'}`,
    `Servings: ${recipe.servings ?? 'not specified'}`,
    `Prep time: ${recipe.prepTime ?? 0} minutes`,
    `Cook time: ${recipe.cookTime ?? 0} minutes`,
    'Ingredients:',
    ...ingredients.map((item) => `- ${String(item)}`),
    'Directions:',
    ...steps.map((step, index) => `${index + 1}. ${String(step)}`),
    '',
    'Design requirements: portrait cookbook page, readable text, no invented ingredients, no invented directions.',
  ].join('\n');
}

async function generateImage(prompt: string): Promise<Uint8Array> {
  if (!OPENAI_API_KEY) throw new Error('OpenAI image generation is not configured.');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), IMAGE_GENERATION_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${OPENAI_API_KEY}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: OPENAI_IMAGE_MODEL,
        prompt,
        size: '1024x1536',
        quality: 'medium',
        output_format: 'png',
        moderation: 'auto',
        n: 1,
      }),
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('OpenAI image generation timed out.');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = isRecord(data) && isRecord(data.error) && typeof data.error.message === 'string'
      ? data.error.message
      : `OpenAI image error (${res.status})`;
    throw new Error(message);
  }

  const b64 = isRecord(data) && Array.isArray(data.data) && isRecord(data.data[0])
    ? data.data[0].b64_json
    : undefined;
  if (typeof b64 !== 'string') throw new Error('OpenAI image response did not include b64_json.');

  return base64ToBytes(b64);
}

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
    throw new Error('Could not start page generation.');
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

  if (error || !data) throw new Error(error?.message ?? 'Generation request not found.');
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
  if (typeof data !== 'string') throw new Error('Credit reservation failed.');
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
    console.error('Generation request failure cleanup could not be recorded', error.message);
    return null;
  }
  return data === true;
}

async function removeStorageObject(admin: SupabaseAdmin, storagePath?: string): Promise<void> {
  if (!storagePath) return;
  const { error } = await admin.storage.from(BUCKET).remove([storagePath]);
  if (error) console.error('Generated page storage cleanup failed', error.message);
}

async function deleteCreatedRows(admin: SupabaseAdmin, pageId?: string, recipeId?: string): Promise<void> {
  if (pageId) {
    const { error } = await admin.schema('nutriai').from('cookbook_pages').delete().eq('id', pageId);
    if (error) console.error('Generated page cleanup failed', error.message);
  }

  if (recipeId) {
    const { error } = await admin.schema('nutriai').from('recipes').delete().eq('id', recipeId);
    if (error) console.error('Generated recipe cleanup failed', error.message);
  }
}

async function deleteGeneratedVersion(admin: SupabaseAdmin, versionId?: string): Promise<void> {
  if (!versionId) return;
  const { error } = await admin.schema('nutriai').from('page_versions').delete().eq('id', versionId);
  if (error) console.error('Generated page version cleanup failed', error.message);
}

async function insertRecipe(admin: SupabaseAdmin, userId: string, recipe: RecipeInput): Promise<RecipeRow> {
  const { data, error } = await admin
    .schema('nutriai')
    .from('recipes')
    .insert({
      user_id: userId,
      title: recipe.title.trim(),
      description: recipe.description ?? null,
      servings: recipe.servings ?? null,
      prep_time: recipe.prepTime ?? null,
      cook_time: recipe.cookTime ?? null,
      ingredients: recipe.ingredients,
      steps: recipe.steps,
      source_type: recipe.sourceType ?? 'text',
      source_url: recipe.sourceUrl ?? null,
      tags: recipe.tags ?? [],
      category: recipe.category ?? 'favorites',
      confidence: recipe.confidence ?? 1,
    })
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return data as RecipeRow;
}

async function insertPageLocked(
  admin: SupabaseAdmin,
  cookbookId: string,
  recipeId: string,
  section: string,
): Promise<PageRow> {
  const { data, error } = await admin
    .schema('nutriai')
    .rpc('create_cookbook_page', {
      p_cookbook_id: cookbookId,
      p_recipe_id: recipeId,
      p_section: section,
    });

  if (error) throw new Error(error.message);
  if (!data) throw new Error('Could not create cookbook page.');
  return data as PageRow;
}

function toClientPage(page: PageRow, recipe: RecipeRow, versionId: string, imageUrl: string) {
  return {
    id: page.id,
    cookbookId: page.cookbook_id,
    recipeId: recipe.id,
    title: recipe.title,
    section: page.section,
    pageNumber: page.page_number,
    sortOrder: page.sort_order,
    selectedVersionId: versionId,
    imageUrl,
    recipe: {
      id: recipe.id,
      title: recipe.title,
      description: recipe.description ?? undefined,
      servings: recipe.servings ?? undefined,
      prepTime: recipe.prep_time ?? undefined,
      cookTime: recipe.cook_time ?? undefined,
      ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients : [],
      steps: Array.isArray(recipe.steps) ? recipe.steps : [],
      sourceType: recipe.source_type ?? 'text',
      sourceUrl: recipe.source_url ?? undefined,
      tags: Array.isArray(recipe.tags) ? recipe.tags : [],
      category: recipe.category ?? page.section,
      confidence: Number(recipe.confidence ?? 0),
    },
  };
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return corsResponse(req);

  const { user, error: authError } = await verifyAuth(req);
  if (authError) return authError;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return jsonError('Supabase service client is not configured.', 500, req);
  }

  try {
    const body = await req.json().catch(() => null);
    if (!isRecord(body)) return jsonError('Invalid JSON body', 400, req);

    const { cookbookId, pageId, recipe, promptPayload, idempotencyKey } = body;
    if (
      typeof cookbookId !== 'string' ||
      cookbookId.length === 0 ||
      !isValidRecipe(recipe) ||
      !isRecord(promptPayload) ||
      typeof idempotencyKey !== 'string' ||
      !/^[A-Za-z0-9._:-]{16,160}$/.test(idempotencyKey)
    ) {
      return jsonError('Missing or invalid cookbookId, recipe, promptPayload, or idempotencyKey', 400, req);
    }
    if (pageId !== undefined && typeof pageId !== 'string') {
      return jsonError('Invalid pageId', 400, req);
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { data: cookbookRow, error: cookbookError } = await admin
      .schema('nutriai')
      .from('cookbooks')
      .select('id')
      .eq('id', cookbookId)
      .eq('user_id', user!.id)
      .single();

    if (cookbookError || !cookbookRow) return jsonError('Cookbook not found', 404, req);

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
      const message = requestError instanceof Error ? requestError.message : 'Could not start page generation.';
      const status = message.toLowerCase().includes('reused') ? 409 : 500;
      return jsonError(message, status, req);
    }

    if (!generationRequest.claimed) {
      if (generationRequest.status === 'ready' && isRecord(generationRequest.response)) {
        return jsonResponse(generationRequest.response, 200, req);
      }
      if (generationRequest.status === 'processing') {
        return jsonResponse({ status: 'processing', requestId: generationRequest.id }, 202, req);
      }
      await removeStorageObject(admin, generationRequest.storagePath ?? undefined);
      await deleteGeneratedVersion(admin, generationRequest.versionId ?? undefined);
      if (generationRequest.createdPage) {
        await deleteCreatedRows(
          admin,
          generationRequest.pageId ?? undefined,
          generationRequest.recipeId ?? undefined,
        );
      }
      return jsonError(generationRequest.error ?? 'This generation attempt failed.', 409, req);
    }

    const generationRequestId = generationRequest.id;
    const generationTask = (async () => {

    let recipeRow: RecipeRow;
    let pageRow: PageRow;
    let createdRecipeId: string | undefined;
    let createdPageId: string | undefined;

    try {
      if (pageId) {
        const { data: existingPage, error: existingPageError } = await admin
          .schema('nutriai')
          .from('cookbook_pages')
          .select('*, recipes(*)')
          .eq('id', pageId)
          .eq('cookbook_id', cookbookId)
          .single();

        if (existingPageError || !existingPage) throw new Error('Page not found');
        pageRow = existingPage as PageRow;
        if (!pageRow.recipes) throw new Error('Page recipe not found');
        recipeRow = pageRow.recipes;
      } else {
        recipeRow = await insertRecipe(admin, user!.id, recipe);
        createdRecipeId = recipeRow.id;
        pageRow = await insertPageLocked(admin, cookbookId, recipeRow.id, recipe.category ?? 'favorites');
        createdPageId = pageRow.id;
      }

      await updateGenerationRequest(admin, generationRequestId, user!.id, {
        recipe_id: recipeRow.id,
        page_id: pageRow.id,
      });
    } catch (dbError) {
      const message = dbError instanceof Error ? dbError.message : 'Could not create cookbook page.';
      const failed = await failGenerationRequest(admin, user!.id, generationRequestId, message);
      if (failed === true) {
        await deleteCreatedRows(admin, createdPageId, createdRecipeId);
      }
      return jsonError(message, message.toLowerCase().includes('not found') ? 404 : 500, req);
    }

    try {
      await reserveCredit(admin, user!.id, generationRequestId);
    } catch (creditError) {
      const message = creditError instanceof Error ? creditError.message : 'Not enough credits';
      const failed = await failGenerationRequest(admin, user!.id, generationRequestId, message);
      if (failed === true && (createdPageId || createdRecipeId)) {
        await deleteCreatedRows(admin, createdPageId, createdRecipeId);
      }
      const status = message.toLowerCase().includes('not enough credits') ? 402 : 500;
      return jsonError(message, status, req);
    }

    let storagePath: string | undefined;
    let versionId: string | undefined;

    try {
      const imageBytes = await generateImage(promptFromPayload(promptPayload));
      storagePath = `${user!.id}/${cookbookId}/${crypto.randomUUID()}.png`;
      const upload = await admin.storage.from(BUCKET).upload(storagePath, imageBytes, {
        contentType: 'image/png',
        upsert: false,
      });
      if (upload.error) throw new Error(upload.error.message);
      await updateGenerationRequest(admin, generationRequestId, user!.id, {
        storage_path: storagePath,
      });

      const { data: publicUrl } = admin.storage.from(BUCKET).getPublicUrl(storagePath);
      const imageUrl = publicUrl.publicUrl;

      const { data: versionRow, error: versionError } = await admin
        .schema('nutriai')
        .from('page_versions')
        .insert({
          page_id: pageRow.id,
          image_url: imageUrl,
          storage_path: storagePath,
          prompt_payload: promptPayload,
          model: OPENAI_IMAGE_MODEL,
          status: 'ready',
          credit_cost: 1,
        })
        .select('id')
        .single();

      if (versionError) throw new Error(versionError.message);
      const readyVersionId = String(versionRow.id);
      versionId = readyVersionId;
      await updateGenerationRequest(admin, generationRequestId, user!.id, {
        version_id: readyVersionId,
      });
      const responsePayload = toClientPage(pageRow, recipeRow, readyVersionId, imageUrl);
      await completeGenerationRequest(
        admin,
        user!.id,
        generationRequestId,
        readyVersionId,
        responsePayload,
      );

      return jsonResponse(responsePayload, 200, req);
    } catch (generationError) {
      const message = generationError instanceof Error ? generationError.message : 'Image generation failed';
      await compensateGenerationFailure(
        message,
        {
          storagePath,
          versionId,
          pageId: createdPageId,
          recipeId: createdRecipeId,
        },
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
              console.error('Completed generation response recovery failed', recoveryError);
              return false;
            }
          },
          removeStorage: (path) => removeStorageObject(admin, path),
          removeVersion: (id) => deleteGeneratedVersion(admin, id),
          removeCreatedRows: (pageId, recipeId) => deleteCreatedRows(admin, pageId, recipeId),
        },
      );
      return jsonError(message, message.toLowerCase().includes('openai') || message.toLowerCase().includes('image generation')
        ? 502
        : 500, req);
    }
    })();

    EdgeRuntime.waitUntil(generationTask);
    return jsonResponse({ status: 'processing', requestId: generationRequestId }, 202, req);
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : 'Generation failed', 500, req);
  }
});
