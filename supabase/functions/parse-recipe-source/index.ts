import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { verifyAuth } from '../_shared/auth.ts';
import { normalizeBase64Payload } from '../_shared/base64.ts';
import { corsResponse, jsonError, jsonResponse } from '../_shared/cors.ts';
import { assertPublicDnsHostname, validatePublicHttpUrl } from '../_shared/publicUrl.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const AI_API_KEY = Deno.env.get('AI_API_KEY') || '';
const AI_API_BASE = (Deno.env.get('AI_API_BASE') || 'https://openrouter.ai/api/v1').replace(/\/$/, '');
const AI_MODEL = Deno.env.get('AI_MODEL') || 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free';
const MAX_URL_BYTES = 1_000_000;
const MAX_IMAGE_BASE64_BYTES = 8_000_000;
const FETCH_TIMEOUT_MS = 10_000;

const RECIPE_JSON_PROMPT = `Extract one complete recipe from the user's source.

Return ONLY valid JSON with this exact shape:
{
  "title": "Recipe name",
  "description": "Short useful description",
  "servings": 4,
  "prepTime": 15,
  "cookTime": 30,
  "ingredients": [
    { "name": "ingredient name", "quantity": "1", "unit": "cup", "isOptional": false }
  ],
  "steps": ["Step 1", "Step 2"],
  "tags": ["quick", "family"],
  "category": "dinner"
}

Rules:
- If the source is a recipe link, use the page text and metadata in the prompt.
- If the source is an image or video, read visible text, captions, narration, and cooking actions.
- Keep quantities as strings so fractions and ranges survive.
- prepTime and cookTime are minutes. Use 0 if unknown.
- category must be one of: breakfast, lunch, dinner, healthy, desserts, sides, favorites.
- If this is not a recipe, return { "error": "No recipe found" }.`;

type SourceType = 'url' | 'text' | 'image' | 'video';
type OpenRouterContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } }
  | { type: 'video_url'; video_url: { url: string } };

interface RequestBody {
  type: SourceType;
  input?: string;
  imageBase64?: string;
  videoUrl?: string;
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

interface RawRecipe {
  title?: unknown;
  description?: unknown;
  servings?: unknown;
  prepTime?: unknown;
  prep_time?: unknown;
  cookTime?: unknown;
  cook_time?: unknown;
  ingredients?: unknown;
  steps?: unknown;
  instructions?: unknown;
  tags?: unknown;
  category?: unknown;
  sourceUrl?: unknown;
  source_url?: unknown;
  error?: unknown;
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
  const parsedUrl = validatePublicHttpUrl(url);
  await assertPublicDnsHostname(parsedUrl.hostname);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(parsedUrl.toString(), {
      redirect: 'manual',
      signal: controller.signal,
      headers: { accept: 'text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8' },
    });

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get('location');
      if (!location) throw new Error('URL redirect missing location');
      const redirected = new URL(location, parsedUrl);
      validatePublicHttpUrl(redirected.toString());
      return textFromUrl(redirected.toString());
    }

    const contentLength = Number(res.headers.get('content-length') ?? 0);
    if (contentLength > MAX_URL_BYTES) {
      throw new Error('URL response is too large');
    }

    if (!res.ok) throw new Error(`URL fetch failed (${res.status})`);

    const limited = await readLimitedText(res, MAX_URL_BYTES);
    return limited
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, '\n')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  } finally {
    clearTimeout(timeout);
  }
}

async function readLimitedText(res: Response, maxBytes: number): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) {
    const text = await res.text();
    if (text.length > maxBytes) throw new Error('URL response is too large');
    return text;
  }

  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new Error('URL response is too large');
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

function normalizeImageBase64(value: string): string {
  return normalizeBase64Payload(value, MAX_IMAGE_BASE64_BYTES, 'image');
}

function extractJsonObject(value: string): RawRecipe {
  const trimmed = value.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  const jsonText = start >= 0 && end > start ? trimmed.slice(start, end + 1) : trimmed;

  try {
    return JSON.parse(jsonText) as RawRecipe;
  } catch {
    throw new Error('AI parser returned invalid JSON');
  }
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean);
}

function normalizeIngredients(value: unknown): Array<{ name: string; quantity?: string; unit?: string; isOptional?: boolean }> {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (typeof item === 'string') return { name: item.trim() };
      if (!item || typeof item !== 'object') return { name: '' };
      const record = item as Record<string, unknown>;
      return {
        name: asString(record.name),
        quantity: asString(record.quantity) || undefined,
        unit: asString(record.unit) || undefined,
        isOptional: typeof record.isOptional === 'boolean' ? record.isOptional : undefined,
      };
    })
    .filter((ingredient) => ingredient.name);
}

function normalizeCategory(value: unknown): string {
  const category = asString(value).toLowerCase();
  return ['breakfast', 'lunch', 'dinner', 'healthy', 'desserts', 'sides', 'favorites'].includes(category)
    ? category
    : 'favorites';
}

function normalizeAiRecipe(raw: RawRecipe, sourceType: SourceType, sourceUrl?: string): ParsedRecipe {
  if (typeof raw.error === 'string' && raw.error.trim()) {
    throw new Error(raw.error.trim());
  }

  const steps = asStringArray(raw.steps).length ? asStringArray(raw.steps) : asStringArray(raw.instructions);
  const recipe: ParsedRecipe = {
    title: asString(raw.title, 'Imported Recipe'),
    description: asString(raw.description),
    servings: asNumber(raw.servings, 4) || 4,
    prepTime: asNumber(raw.prepTime ?? raw.prep_time),
    cookTime: asNumber(raw.cookTime ?? raw.cook_time),
    ingredients: normalizeIngredients(raw.ingredients),
    steps,
    sourceType,
    sourceUrl: (sourceUrl ?? asString(raw.sourceUrl ?? raw.source_url)) || undefined,
    tags: asStringArray(raw.tags),
    category: normalizeCategory(raw.category),
  };

  return recipe;
}

async function callOpenRouter(content: string | OpenRouterContentPart[]): Promise<RawRecipe> {
  if (!AI_API_KEY) {
    throw new Error('OpenRouter is not configured');
  }

  const res = await fetch(`${AI_API_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${AI_API_KEY}`,
      'content-type': 'application/json',
      'http-referer': 'https://nosh.app',
      'x-title': 'Nosh Cookbook',
    },
    body: JSON.stringify({
      model: AI_MODEL,
      messages: [
        { role: 'system', content: RECIPE_JSON_PROMPT },
        { role: 'user', content },
      ],
      temperature: 0.1,
      max_tokens: 2500,
      response_format: { type: 'json_object' },
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = typeof data?.error?.message === 'string'
      ? data.error.message
      : typeof data?.error === 'string'
        ? data.error
        : `OpenRouter parser failed (${res.status})`;
    throw new Error(message);
  }

  const contentValue = data?.choices?.[0]?.message?.content;
  const text = Array.isArray(contentValue)
    ? contentValue.map((part) => part?.text ?? '').join('\n')
    : String(contentValue ?? '');
  if (!text.trim()) throw new Error('OpenRouter parser returned no content');
  return extractJsonObject(text);
}

function imageContent(imageBase64: string, prompt = 'Extract the recipe from this image.'): OpenRouterContentPart[] {
  const url = `data:image/jpeg;base64,${imageBase64}`;
  return [
    { type: 'text', text: prompt },
    { type: 'image_url', image_url: { url } },
  ];
}

function videoContent(videoUrl: string): OpenRouterContentPart[] {
  return [
    {
      type: 'text',
      text: 'Extract the complete recipe from this cooking video. Use narration, captions, visible ingredients, and on-screen instructions.',
    },
    { type: 'video_url', video_url: { url: videoUrl } },
  ];
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

async function parseVideoRecipe(req: Request, videoUrl: string): Promise<ParsedRecipe> {
  const res = await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/functions/v1/parse-video-recipe`, {
    method: 'POST',
    headers: {
      authorization: req.headers.get('authorization') ?? '',
      apikey: req.headers.get('apikey') ?? '',
      'content-type': 'application/json',
    },
    body: JSON.stringify({ url: videoUrl }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof data?.error === 'string' ? data.error : `Video parser failed (${res.status})`);
  }

  const recipe = data.recipe ?? {};
  return {
    title: recipe.title ?? 'Imported Video Recipe',
    description: recipe.description ?? '',
    servings: Number(recipe.servings) || 4,
    prepTime: Number(recipe.prepTime) || 0,
    cookTime: Number(recipe.cookTime) || 0,
    ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients : [],
    steps: Array.isArray(recipe.steps) ? recipe.steps : [],
    sourceType: 'video',
    sourceUrl: recipe.sourceUrl ?? videoUrl,
    tags: Array.isArray(recipe.tags) ? recipe.tags : [],
    category: recipe.category ?? 'favorites',
  };
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return corsResponse(req);

  const { error: authError } = await verifyAuth(req);
  if (authError) return authError;

  try {
    let body: RequestBody;
    try {
      body = (await req.json()) as RequestBody;
    } catch {
      return jsonError('Invalid JSON body', 400, req);
    }

    if (!body.type) return jsonError('Missing source type', 400, req);
    if (body.type !== 'url' && body.type !== 'text' && body.type !== 'image' && body.type !== 'video') {
      return jsonError('Unsupported source type', 400, req);
    }

    if (body.type === 'image') {
      if (!body.imageBase64) return jsonError('Missing imageBase64', 400, req);
      let imageBase64: string;
      try {
        imageBase64 = normalizeImageBase64(body.imageBase64);
      } catch (validationErr) {
        const message = validationErr instanceof Error ? validationErr.message : 'Invalid image';
        return jsonError(message, 400, req);
      }
      let parsed: ParsedRecipe;
      try {
        parsed = normalizeAiRecipe(await callOpenRouter(imageContent(imageBase64)), 'image');
      } catch {
        parsed = await parseImageRecipe(req, imageBase64);
      }
      const confidence = confidenceFor(parsed);
      return jsonResponse({ recipe: parsed, ...confidence }, 200, req);
    }

    if (body.type === 'video') {
      const videoUrl = (body.videoUrl ?? body.input ?? '').trim();
      if (!videoUrl) return jsonError('Missing video URL', 400, req);
      let parsedVideoUrl: URL;
      try {
        parsedVideoUrl = validatePublicHttpUrl(videoUrl);
        await assertPublicDnsHostname(parsedVideoUrl.hostname);
      } catch (validationErr) {
        const message = validationErr instanceof Error ? validationErr.message : 'Invalid URL';
        return jsonError(message, 400, req);
      }

      let parsed: ParsedRecipe;
      try {
        parsed = normalizeAiRecipe(await callOpenRouter(videoContent(parsedVideoUrl.toString())), 'video', parsedVideoUrl.toString());
      } catch {
        parsed = await parseVideoRecipe(req, parsedVideoUrl.toString());
      }
      const confidence = confidenceFor(parsed);
      return jsonResponse({ recipe: parsed, ...confidence }, 200, req);
    }

    if (!body.input?.trim()) return jsonError('Missing input', 400, req);

    let sourceText: string;
    try {
      sourceText = body.type === 'url' ? await textFromUrl(body.input) : body.input;
    } catch (validationErr) {
      const message = validationErr instanceof Error ? validationErr.message : 'Could not import URL';
      return jsonError(message, 400, req);
    }
    let parsed: ParsedRecipe;
    try {
      const prompt = body.type === 'url'
        ? `Source URL: ${body.input}\n\nPage text:\n${sourceText}`
        : sourceText;
      parsed = normalizeAiRecipe(
        await callOpenRouter(prompt),
        body.type,
        body.type === 'url' ? body.input : undefined,
      );
    } catch {
      parsed = basicTextRecipe(sourceText, body.type, body.type === 'url' ? body.input : undefined);
    }
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
