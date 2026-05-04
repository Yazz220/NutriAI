import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { verifyAuth } from '../_shared/auth.ts';
import { corsResponse, jsonError, jsonResponse } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') || '';
const OPENAI_IMAGE_MODEL = Deno.env.get('OPENAI_IMAGE_MODEL') || 'gpt-image-2';
const BUCKET = Deno.env.get('COOKBOOK_PAGE_BUCKET') || 'cookbook-pages';

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
  const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
  const steps = Array.isArray(recipe.steps) ? recipe.steps : [];

  return [
    typeof promptPayload.instructions === 'string' ? promptPayload.instructions : '',
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

  const res = await fetch('https://api.openai.com/v1/images/generations', {
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
  });

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

async function reserveCredit(admin: SupabaseAdmin, userId: string): Promise<string> {
  const { data, error } = await admin
    .schema('nutriai')
    .rpc('reserve_generation_credit', { p_user_id: userId });

  if (error) throw new Error(error.message);
  if (typeof data !== 'string') throw new Error('Credit reservation failed.');
  return data;
}

async function refundCredit(admin: SupabaseAdmin, userId: string, relatedPageVersionId?: string): Promise<void> {
  const { error } = await admin
    .schema('nutriai')
    .from('credit_ledger')
    .insert({
      user_id: userId,
      event_type: 'adjustment',
      amount: 1,
      related_page_version_id: relatedPageVersionId ?? null,
    });

  if (error) console.error('Credit refund failed', error.message);
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

    const { cookbookId, pageId, recipe, promptPayload } = body;
    if (typeof cookbookId !== 'string' || cookbookId.length === 0 || !isValidRecipe(recipe) || !isRecord(promptPayload)) {
      return jsonError('Missing or invalid cookbookId, recipe, or promptPayload', 400, req);
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

    let recipeRow: RecipeRow;
    let pageRow: PageRow;
    let createdRecipeId: string | undefined;
    let createdPageId: string | undefined;

    if (pageId) {
      const { data: existingPage, error: existingPageError } = await admin
        .schema('nutriai')
        .from('cookbook_pages')
        .select('*, recipes(*)')
        .eq('id', pageId)
        .eq('cookbook_id', cookbookId)
        .single();

      if (existingPageError || !existingPage) return jsonError('Page not found', 404, req);
      pageRow = existingPage as PageRow;
      if (!pageRow.recipes) return jsonError('Page recipe not found', 404, req);
      recipeRow = pageRow.recipes;
    } else {
      try {
        recipeRow = await insertRecipe(admin, user!.id, recipe);
        createdRecipeId = recipeRow.id;
        pageRow = await insertPageLocked(admin, cookbookId, recipeRow.id, recipe.category ?? 'favorites');
        createdPageId = pageRow.id;
      } catch (dbError) {
        await deleteCreatedRows(admin, createdPageId, createdRecipeId);
        const message = dbError instanceof Error ? dbError.message : 'Could not create cookbook page.';
        return jsonError(message, 500, req);
      }
    }

    let spendLedgerId: string;
    try {
      spendLedgerId = await reserveCredit(admin, user!.id);
    } catch (creditError) {
      if (createdPageId || createdRecipeId) await deleteCreatedRows(admin, createdPageId, createdRecipeId);
      const message = creditError instanceof Error ? creditError.message : 'Not enough credits';
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

      const { error: ledgerError } = await admin
        .schema('nutriai')
        .from('credit_ledger')
        .update({ related_page_version_id: readyVersionId })
        .eq('id', spendLedgerId)
        .eq('user_id', user!.id);

      if (ledgerError) throw new Error(ledgerError.message);

      const { error: updateError } = await admin
        .schema('nutriai')
        .from('cookbook_pages')
        .update({ selected_version_id: readyVersionId })
        .eq('id', pageRow.id)
        .eq('cookbook_id', cookbookId);

      if (updateError) throw new Error(updateError.message);

      return jsonResponse(toClientPage(pageRow, recipeRow, readyVersionId, imageUrl), 200, req);
    } catch (generationError) {
      await removeStorageObject(admin, storagePath);
      await refundCredit(admin, user!.id);
      await deleteGeneratedVersion(admin, versionId);
      if (createdPageId || createdRecipeId) await deleteCreatedRows(admin, createdPageId, createdRecipeId);

      const message = generationError instanceof Error ? generationError.message : 'Image generation failed';
      const status = message.toLowerCase().includes('openai') || message.toLowerCase().includes('image generation')
        ? 502
        : 500;
      return jsonError(message, status, req);
    }
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : 'Generation failed', 500, req);
  }
});
