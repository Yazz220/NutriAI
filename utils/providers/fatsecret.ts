// FatSecret Provider (client-side fetch via token broker)
// NOTE: Do NOT put client_id/secret in the app. This module calls a Supabase Edge Function
// that exchanges credentials for an OAuth2 access token.

import { Platform } from 'react-native';
import type { ExternalRecipe, RecipeIngredient } from '@/types/external';

const TOKEN_URL = process.env.EXPO_PUBLIC_FATSECRET_TOKEN_URL; // e.g., https://<PROJECT>.supabase.co/functions/v1/fatsecret-token
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const PROXY_URL = process.env.EXPO_PUBLIC_FATSECRET_PROXY_URL; // e.g., https://<PROJECT>.supabase.co/functions/v1/fatsecret-proxy
const IS_PROXY = !!PROXY_URL;
const BASE_METHOD = PROXY_URL || 'https://platform.fatsecret.com/rest/server.api';
const PLACEHOLDER_IMG = 'https://via.placeholder.com/640x480.png?text=Recipe';

let cachedToken: { access_token: string; expires_at: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (!TOKEN_URL) {
    throw new Error('Missing EXPO_PUBLIC_FATSECRET_TOKEN_URL');
  }
  const now = Date.now();
  if (cachedToken && cachedToken.expires_at > now + 15_000) {
    return cachedToken.access_token;
  }
  const headers: Record<string, string> = {};
  // Some projects require anon headers even for verify_jwt=false functions
  if (SUPABASE_ANON_KEY) {
    headers['apikey'] = SUPABASE_ANON_KEY;
    headers['Authorization'] = `Bearer ${SUPABASE_ANON_KEY}`;
  }
  const res = await fetch(TOKEN_URL, { method: 'POST', headers });
  if (!res.ok) {
    const text = await res.text();
    console.warn('[FatSecret] token broker response', { status: res.status, body: text.slice(0, 200) });
    throw new Error(`Token broker error: ${res.status} ${text}`);
  }
  const json = await res.json();
  const ttl = typeof json.expires_in === 'number' ? json.expires_in * 1000 : 50 * 60 * 1000; // default 50m
  cachedToken = { access_token: json.access_token, expires_at: Date.now() + ttl };
  return cachedToken.access_token;
}

// Minimal types based on FatSecret recipes.* method responses
interface FSRecipeSummary {
  recipe_id: string;
  recipe_name: string;
  recipe_description?: string;
  recipe_image?: string; // sometimes available
  recipe_images?: { small?: string; medium?: string; large?: string } | string;
  cooking_time_min?: number;
  preparation_time_min?: number;
  number_of_servings?: number;
  recipe_types?: { recipe_type: string | string[] } | string[] | string;
}

interface FSRecipesSearchResponse {
  recipes?: { recipe?: FSRecipeSummary[] | FSRecipeSummary } | FSRecipeSummary[];
}

interface FSDirection { direction_number?: number; direction_description?: string }
interface FSIngredient { ingredient_description?: string }

interface FSRecipeDetail extends FSRecipeSummary {
  directions?: { direction?: FSDirection[] | FSDirection } | FSDirection[];
  ingredients?: { ingredient?: FSIngredient[] | FSIngredient } | FSIngredient[];
  url?: string;
}

interface FSRecipeGetResponse { recipe?: FSRecipeDetail }

const coerceArray = <T>(val: T | T[] | undefined): T[] => {
  if (!val) return [];
  return Array.isArray(val) ? val : [val];
};

function pickImage(r: FSRecipeSummary): string {
  // Try structured recipe_images first
  const imgs = (r as any).recipe_images;
  if (imgs) {
    if (typeof imgs === 'string') return imgs;
    return imgs.large || imgs.medium || imgs.small || '';
  }
  return r.recipe_image || '';
}

function toExternalRecipe(summary: FSRecipeSummary): ExternalRecipe {
  const prep = Number(summary.preparation_time_min || 0) || 0;
  const cook = Number(summary.cooking_time_min || 0) || 0;
  const servings = Number(summary.number_of_servings || 0) || 0;
  const img = pickImage(summary) || PLACEHOLDER_IMG;
  return {
    id: Number(summary.recipe_id),
    title: summary.recipe_name || '',
    image: img,
    servings: servings > 0 ? servings : 1,
    readyInMinutes: prep + cook,
    dishTypes: [],
    cuisines: [],
  } as ExternalRecipe;
}

function mapDetailToExternal(detail: FSRecipeDetail): ExternalRecipe {
  const base = toExternalRecipe(detail);
  const directions = coerceArray((detail as any)?.directions?.direction || (detail as any)?.directions);
  const steps = directions
    .map((d) => (d as FSDirection)?.direction_description || '')
    .map((s) => String(s).trim())
    .filter(Boolean);

  const ingredients = coerceArray((detail as any)?.ingredients?.ingredient || (detail as any)?.ingredients)
    .map((ing) => String((ing as FSIngredient)?.ingredient_description || '').trim())
    .filter(Boolean)
    .map((original) => ({ name: original, amount: 0, unit: '', original })) as RecipeIngredient[];

  return {
    ...base,
    instructions: steps.length ? steps.join('\n') : undefined,
    analyzedInstructions: steps.length
      ? [{ name: 'Steps', steps: steps.map((s, i) => ({ number: i + 1, step: s })) }]
      : undefined,
    ingredients: ingredients.length ? ingredients : undefined,
  } as ExternalRecipe;
}

export type RecipesSearchParams = { query?: string; type?: string; number?: number; page?: number };

function mealTypeToRecipeType(type?: string): string | undefined {
  if (!type) return undefined;
  const t = type.toLowerCase();
  if (t === 'breakfast') return 'Breakfast';
  if (t === 'lunch') return 'Lunch';
  if (t === 'dinner') return 'Main Dish';
  if (t === 'snacks' || t === 'snack') return 'Snack';
  return undefined;
}

async function fsGet(pathOrParams: URL | URLSearchParams): Promise<any> {
  // In proxy mode, the Edge Function fetches tokens & upstream; client must not attach FatSecret token
  const access = IS_PROXY ? null : await getAccessToken();
  let url: string;
  if (pathOrParams instanceof URL) url = pathOrParams.toString();
  else {
    const u = new URL(BASE_METHOD);
    u.search = pathOrParams.toString();
    url = u.toString();
  }
  console.log('[FatSecret] GET', url);
  const headers: Record<string, string> = {};
  if (IS_PROXY) {
    // Some Supabase projects require anon headers set; provide them proactively
    if (SUPABASE_ANON_KEY) {
      headers['apikey'] = SUPABASE_ANON_KEY;
      headers['Authorization'] = `Bearer ${SUPABASE_ANON_KEY}`;
    }
  } else {
    if (access) headers['Authorization'] = `Bearer ${access}`;
  }
  const res = await fetch(url, { headers });
  if (!res.ok) {
    const text = await res.text();
    console.warn('[FatSecret] error', res.status, text.slice(0, 200));
    throw new Error(`FatSecret error ${res.status}: ${text}`);
  }
  const json = await res.json();
  // If proxy returned an error payload, surface as thrown error
  if (json && typeof json === 'object' && 'error' in json && (json as any).error) {
    const err = (json as any).error;
    const code = typeof err?.code !== 'undefined' ? ` code ${err.code}` : '';
    const msg = typeof err?.message === 'string' ? err.message : JSON.stringify(err);
    throw new Error(`FatSecret proxy error${code}: ${msg}`);
  }
  return json;
}

export async function recipesSearch(params: RecipesSearchParams = {}): Promise<ExternalRecipe[]> {
  const q = new URLSearchParams();
  q.set('method', 'recipes.search.v3');
  q.set('format', 'json');
  if (params.query) q.set('search_expression', params.query);
  const rt = mealTypeToRecipeType(params.type);
  if (rt) q.set('recipe_type', rt);
  if (params.number) q.set('max_results', String(params.number));
  if (params.page) q.set('page_number', String(params.page));

  let json: FSRecipesSearchResponse | undefined;
  try {
    json = (await fsGet(q)) as FSRecipesSearchResponse;
  } catch (e) {
    console.warn('[FatSecret] recipes.search.v3 failed, will try foods.search fallback', e);
  }

  // FatSecret can nest arrays a few different ways
  let list: FSRecipeSummary[] = [];
  if (json) {
    if (Array.isArray(json.recipes)) list = json.recipes as FSRecipeSummary[];
    else if (json.recipes && (json.recipes as any).recipe) list = coerceArray((json.recipes as any).recipe);
  }
  let out = list.map(toExternalRecipe);

  if (out.length > 0) return out;

  // Fallback: foods.search to produce minimal "recipes" from foods
  try {
    const f = new URLSearchParams();
    f.set('method', 'foods.search');
    f.set('format', 'json');
    if (params.query) f.set('search_expression', params.query);
    if (params.number) f.set('max_results', String(params.number));
    const fj = await fsGet(f);
    const foods = coerceArray((fj?.foods?.food) ?? fj?.foods) as any[];
    const mapped: ExternalRecipe[] = foods.map((food: any, idx: number) => ({
      id: Number(food.food_id) || Date.now() + idx,
      title: String(food.food_name || food.food_description || 'Food item'),
      image: PLACEHOLDER_IMG,
      servings: 1,
      readyInMinutes: 0,
      sourceName: 'FatSecret',
      sourceUrl: food.food_url,
    }));
    console.log('[FatSecret] foods.search fallback count', mapped.length);
    return mapped;
  } catch (e) {
    console.warn('[FatSecret] foods.search fallback failed', e);
    throw e;
  }
}

export async function getRecipe(recipeId: number | string): Promise<ExternalRecipe> {
  const q = new URLSearchParams();
  q.set('method', 'recipe.get.v3'); // fall back to v2 on server if needed
  q.set('format', 'json');
  q.set('recipe_id', String(recipeId));
  const json = (await fsGet(q)) as FSRecipeGetResponse;
  const detail = json.recipe as FSRecipeDetail;
  if (!detail) throw new Error('Recipe not found');
  return mapDetailToExternal(detail);
}

export async function getRandomRecipes(tags?: string[], number: number = 12): Promise<ExternalRecipe[]> {
  // No true random endpoint; compose by sampling common terms
  const seeds = tags && tags.length ? tags : ['chicken', 'pasta', 'salad', 'soup', 'curry', 'vegan', 'beef', 'tofu', 'breakfast'];
  const per = Math.max(3, Math.floor(number / Math.max(1, Math.min(4, seeds.length))))
  const batches = await Promise.all(
    seeds.slice(0, 4).map(async (term) => {
      try {
        const out = await recipesSearch({ query: term, number: per });
        return out;
      } catch {
        return [] as ExternalRecipe[];
      }
    })
  );
  const flat = batches.flat();
  // Dedup by id
  const map = new Map<number, ExternalRecipe>();
  for (const r of flat) if (!map.has(r.id)) map.set(r.id, r);
  return Array.from(map.values()).slice(0, number);
}

export async function getTrendingRecipes(): Promise<ExternalRecipe[]> {
  // Approximate "trending" by popular categories/queries
  return getRandomRecipes(['popular', 'dinner', 'healthy', 'quick'], 12);
}
