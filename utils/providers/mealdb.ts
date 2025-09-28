// TheMealDB provider integration (free API)
// Docs: https://www.themealdb.com/api.php
// Endpoints used:
// - search.php?s=TERM
// - randomselection.php (10 random meals)
// - lookup.php?i=ID
// - filter.php?i=INGREDIENT (minimal fields)

import { ExternalRecipe, RecipeIngredient } from '@/types/external';

const API_KEY = (process.env.EXPO_PUBLIC_MEALDB_API_KEY || '1').trim();
const PROXY_BASE = (process.env.EXPO_PUBLIC_RECIPES_PROXY_BASE || '').trim();
const SECONDARY_PROXY = 'https://api.allorigins.win/raw';

function proxyBaseUrl(): string | null {
  if (!PROXY_BASE) return null;
  return PROXY_BASE.replace(/\/$/, '') + `/themealdb/${API_KEY}`;
}

function directBaseUrl(): string {
  return `https://www.themealdb.com/api/json/v1/${API_KEY}`;
}

async function fetchJsonFrom<T>(base: string, path: string): Promise<T> {
  const url = `${base}${path.startsWith('/') ? '' : '/'}${path}`;
  const res = await fetch(url, {
    headers: {
      Accept: 'application/json',
      Referer: 'https://nosh.app',
    },
  });
  if (!res.ok) {
    throw new Error(`MealDB request failed ${res.status}: ${await res.text()}`);
  }
  const ctype = res.headers.get('content-type') || '';
  if (ctype.includes('text/html')) {
    const text = await res.text();
    throw new Error(`MealDB response not JSON (possible Cloudflare protection): ${text.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

async function getJson<T>(path: string): Promise<T> {
  const proxy = proxyBaseUrl();
  // Try proxy first if configured
  if (proxy) {
    try {
      return await fetchJsonFrom<T>(proxy, path);
    } catch (e) {
      // Fall back to direct origin if proxy unavailable or blocked
    }
  }
  try {
    return await fetchJsonFrom<T>(directBaseUrl(), path);
  } catch (e) {
    // Final fallback: AllOrigins raw proxy
    try {
      const upstream = `${directBaseUrl()}${path.startsWith('/') ? '' : '/'}${path}`;
      const url = `${SECONDARY_PROXY}?url=${encodeURIComponent(upstream)}`;
      const res = await fetch(url, {
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) {
        throw new Error(`AllOrigins failed ${res.status}: ${await res.text()}`);
      }
      // AllOrigins returns raw upstream body; attempt JSON parse
      const text = await res.text();
      try {
        return JSON.parse(text) as T;
      } catch (parseErr) {
        throw new Error(`AllOrigins response not JSON: ${text.slice(0, 200)}`);
      }
    } catch (e2) {
      throw e; // bubble original error
    }
  }
}

function mapMealToExternal(meal: any): ExternalRecipe {
  const id = Number(meal.idMeal);
  const title = meal.strMeal || '';
  const image = meal.strMealThumb || '';
  const instructions: string = meal.strInstructions || '';
  const cuisines = meal.strArea ? [meal.strArea] : [];
  const dishTypes = meal.strCategory ? [meal.strCategory] : [];
  const tags = typeof meal.strTags === 'string' && meal.strTags.length
    ? String(meal.strTags).split(',').map((s: string) => s.trim()).filter(Boolean)
    : [];

  const ingredients: RecipeIngredient[] = [];
  for (let i = 1; i <= 20; i++) {
    const name = (meal[`strIngredient${i}`] || '').trim();
    const measure = (meal[`strMeasure${i}`] || '').trim();
    if (!name) continue;
    ingredients.push({
      name,
      amount: 0,
      unit: '',
      original: measure ? `${measure} ${name}` : name,
    });
  }

  const analyzedInstructions = instructions
    ? [{ name: 'Steps', steps: instructions.split(/\r?\n/).map((s, idx) => ({ number: idx + 1, step: s })).filter((s) => s.step && s.step.trim().length > 0) }]
    : [];

  return {
    id,
    title,
    image,
    servings: 1,
    readyInMinutes: 0,
    sourceUrl: meal.strSource || undefined,
    cuisines,
    dishTypes: [...dishTypes, ...tags],
    instructions,
    analyzedInstructions,
    ingredients,
    summary: undefined,
  } as ExternalRecipe;
}

export async function mealdbSearch(query: string): Promise<ExternalRecipe[]> {
  try {
    const data = await getJson<{ meals: any[] | null }>(`/search.php?s=${encodeURIComponent(query)}`);
    const meals = data.meals || [];
    if (meals.length) return meals.map(mapMealToExternal);
  } catch {
    // ignore
  }
  // Fallback: try first-letter search if the term has letters
  const letter = (query || '').trim().toLowerCase().match(/[a-z]/)?.[0];
  if (letter) {
    try {
      const data = await getJson<{ meals: any[] | null }>(`/search.php?f=${letter}`);
      const meals = data.meals || [];
      return meals.map(mapMealToExternal);
    } catch {
      // ignore
    }
  }
  // Fallback to random selection
  return mealdbRandomSelection();
}

export async function mealdbRandomSelection(): Promise<ExternalRecipe[]> {
  try {
    const data = await getJson<{ meals: any[] | null }>(`/randomselection.php`);
    const meals = data.meals || [];
    if (meals.length) return meals.map(mapMealToExternal);
  } catch (e) {
    // ignore and fall back
  }
  // Fallback strategy: use alphabetic search to get a selection
  const letters = 'abcdefghijklmnopqrstuvwxyz'.split('');
  // Shuffle a bit for variety
  for (let i = letters.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [letters[i], letters[j]] = [letters[j], letters[i]];
  }
  const results: ExternalRecipe[] = [];
  for (const letter of letters) {
    try {
      const data = await getJson<{ meals: any[] | null }>(`/search.php?f=${letter}`);
      const meals = data.meals || [];
      for (const m of meals) {
        results.push(mapMealToExternal(m));
        if (results.length >= 10) return results;
      }
    } catch {
      // continue
    }
  }
  return results;
}

export async function mealdbLookupById(id: string | number): Promise<ExternalRecipe | null> {
  const data = await getJson<{ meals: any[] | null }>(`/lookup.php?i=${encodeURIComponent(String(id))}`);
  const meals = data.meals || [];
  if (!meals.length) return null;
  return mapMealToExternal(meals[0]);
}

export async function mealdbFilterByIngredient(ingredient: string): Promise<ExternalRecipe[]> {
  // filter.php returns minimal meals; we perform lookup for details
  const data = await getJson<{ meals: any[] | null }>(`/filter.php?i=${encodeURIComponent(ingredient)}`);
  const meals = data.meals || [];
  const ids = meals.map((m: any) => m.idMeal).slice(0, 12);
  const detailed = await Promise.all(ids.map((id: string) => mealdbLookupById(id)));
  return detailed.filter(Boolean) as ExternalRecipe[];
}

