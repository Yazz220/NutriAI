import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { verifyAuth } from '../_shared/auth.ts';
import { corsResponse, jsonError, jsonResponse } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';

type SourceType = 'url' | 'text' | 'image';

interface RequestBody {
  type: SourceType;
  input?: string;
  imageBase64?: string;
}

interface ParsedRecipe {
  title: string;
  description?: string;
  servings: number;
  prepTime?: number;
  cookTime?: number;
  ingredients: unknown[];
  steps: unknown[];
  sourceType: SourceType;
  sourceUrl?: string;
  tags?: unknown[];
  category?: string;
}

function basicTextRecipe(input: string, sourceType: SourceType, sourceUrl?: string): ParsedRecipe {
  const lines = input.split('\n').map((line) => line.trim()).filter(Boolean);
  const title = lines[0] || 'Imported Recipe';
  const ingredients = lines
    .filter((line) => /^[-*]?\s*\d|cup|tbsp|tsp|gram|g |oz|egg|salt|flour/i.test(line))
    .slice(0, 20)
    .map((line) => ({ name: line.replace(/^[-*]\s*/, '') }));
  const steps = lines
    .filter((line) => /bake|cook|mix|stir|boil|chop|serve|heat|add/i.test(line))
    .slice(0, 12);

  return {
    title,
    ingredients,
    steps,
    servings: 4,
    sourceType,
    sourceUrl,
  };
}

function confidenceFor(recipe: { title: string; ingredients: unknown[]; steps: unknown[] }) {
  const reasons: string[] = [];
  let confidence = 0.2;
  if (recipe.title) confidence += 0.2;
  if (recipe.ingredients.length >= 3) confidence += 0.3;
  else reasons.push('Too few ingredients');
  if (recipe.steps.length >= 2) confidence += 0.3;
  else reasons.push('Missing directions');
  confidence = Math.min(1, Math.round(confidence * 100) / 100);
  return { confidence, needsReview: confidence < 0.75, reasons };
}

async function textFromUrl(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { accept: 'text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8' },
  });
  if (!res.ok) throw new Error(`URL fetch failed (${res.status})`);
  const html = await res.text();
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, '\n')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function parseImageRecipe(req: Request, imageBase64: string): Promise<ParsedRecipe> {
  const res = await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/functions/v1/parse-image-recipe`, {
    method: 'POST',
    headers: {
      authorization: req.headers.get('authorization') ?? '',
      apikey: req.headers.get('apikey') ?? '',
      'content-type': 'application/json',
    },
    body: JSON.stringify({ image: imageBase64 }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof data?.error === 'string' ? data.error : `Image parser failed (${res.status})`);
  }

  const recipe = data.recipe ?? {};
  return {
    title: recipe.title ?? 'Imported Recipe',
    description: recipe.description ?? '',
    servings: Number(recipe.servings) || 4,
    prepTime: Number(recipe.prepTime) || 0,
    cookTime: Number(recipe.cookTime) || 0,
    ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients : [],
    steps: Array.isArray(recipe.steps) ? recipe.steps : [],
    sourceType: 'image',
    tags: Array.isArray(recipe.tags) ? recipe.tags : [],
    category: recipe.category ?? 'favorites',
  };
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return corsResponse(req);

  const { error: authError } = await verifyAuth(req);
  if (authError) return authError;

  try {
    const body = (await req.json()) as RequestBody;
    if (!body.type) return jsonError('Missing source type', 400, req);
    if (body.type !== 'url' && body.type !== 'text' && body.type !== 'image') {
      return jsonError('Unsupported source type', 400, req);
    }

    if (body.type === 'image') {
      if (!body.imageBase64) return jsonError('Missing imageBase64', 400, req);
      const parsed = await parseImageRecipe(req, body.imageBase64);
      const confidence = confidenceFor(parsed);
      return jsonResponse({ recipe: parsed, ...confidence }, 200, req);
    }

    if (!body.input?.trim()) return jsonError('Missing input', 400, req);

    const sourceText = body.type === 'url' ? await textFromUrl(body.input) : body.input;
    const parsed = basicTextRecipe(sourceText, body.type, body.type === 'url' ? body.input : undefined);
    const confidence = confidenceFor(parsed);

    return jsonResponse({
      recipe: {
        ...parsed,
        sourceType: body.type,
        tags: [],
        category: 'favorites',
      },
      ...confidence,
    }, 200, req);
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : 'Parse failed', 500, req);
  }
});
