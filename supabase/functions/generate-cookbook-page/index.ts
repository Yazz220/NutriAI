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

    const { data: credits, error: creditsError } = await admin
      .schema('nutriai')
      .from('credit_ledger')
      .select('amount')
      .eq('user_id', user!.id);

    if (creditsError) return jsonError(creditsError.message, 500, req);

    const balance = (credits ?? []).reduce((sum: number, row: { amount: number | string }) => {
      return sum + Number(row.amount);
    }, 0);
    if (balance < 1) return jsonError('Not enough credits', 402, req);

    let imageBytes: Uint8Array;
    try {
      imageBytes = await generateImage(promptFromPayload(promptPayload));
    } catch (generationError) {
      const message = generationError instanceof Error ? generationError.message : 'Image generation failed';
      return jsonError(message, 502, req);
    }

    const storagePath = `${user!.id}/${cookbookId}/${crypto.randomUUID()}.png`;
    const upload = await admin.storage.from(BUCKET).upload(storagePath, imageBytes, {
      contentType: 'image/png',
      upsert: false,
    });
    if (upload.error) return jsonError(upload.error.message, 500, req);

    const { data: publicUrl } = admin.storage.from(BUCKET).getPublicUrl(storagePath);
    const imageUrl = publicUrl.publicUrl;

    let recipeRow: RecipeRow;
    let pageRow: PageRow;

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
      const { data: insertedRecipe, error: recipeError } = await admin
        .schema('nutriai')
        .from('recipes')
        .insert({
          user_id: user!.id,
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

      if (recipeError) return jsonError(recipeError.message, 500, req);
      recipeRow = insertedRecipe as RecipeRow;

      const { count, error: countError } = await admin
        .schema('nutriai')
        .from('cookbook_pages')
        .select('id', { count: 'exact', head: true })
        .eq('cookbook_id', cookbookId);

      if (countError) return jsonError(countError.message, 500, req);

      const pageNumber = (count ?? 0) + 1;
      const { data: insertedPage, error: pageError } = await admin
        .schema('nutriai')
        .from('cookbook_pages')
        .insert({
          cookbook_id: cookbookId,
          recipe_id: recipeRow.id,
          page_number: pageNumber,
          section: recipe.category ?? 'favorites',
          sort_order: pageNumber,
        })
        .select('*')
        .single();

      if (pageError) return jsonError(pageError.message, 500, req);
      pageRow = insertedPage as PageRow;
    }

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

    if (versionError) return jsonError(versionError.message, 500, req);

    const { error: updateError } = await admin
      .schema('nutriai')
      .from('cookbook_pages')
      .update({ selected_version_id: versionRow.id })
      .eq('id', pageRow.id)
      .eq('cookbook_id', cookbookId);

    if (updateError) return jsonError(updateError.message, 500, req);

    const { error: ledgerError } = await admin
      .schema('nutriai')
      .from('credit_ledger')
      .insert({
        user_id: user!.id,
        event_type: 'generation_spend',
        amount: -1,
        related_page_version_id: versionRow.id,
      });

    if (ledgerError) return jsonError(ledgerError.message, 500, req);

    return jsonResponse(toClientPage(pageRow, recipeRow, versionRow.id, imageUrl), 200, req);
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : 'Generation failed', 500, req);
  }
});
