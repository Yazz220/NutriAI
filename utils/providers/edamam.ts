import { CanonicalRecipe, CanonicalIngredient, CanonicalRecipeNutritionPerServing } from '../../types';

// Dual mode support
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const FUNCTIONS_BASE = SUPABASE_URL ? `${SUPABASE_URL}/functions/v1` : undefined;

const EDA_APP_ID = process.env.EXPO_PUBLIC_EDAMAM_APP_ID; // Local dev only
const EDA_APP_KEY = process.env.EXPO_PUBLIC_EDAMAM_APP_KEY; // Local dev only
const EDA_BASE = 'https://api.edamam.com';

const useDirect = !!(EDA_APP_ID && EDA_APP_KEY);

function funcHeaders() {
  if (!SUPABASE_ANON) return { 'Content-Type': 'application/json' } as Record<string, string>;
  return {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_ANON,
    'Authorization': `Bearer ${SUPABASE_ANON}`,
  } as Record<string, string>;
}

// Search recipes via direct Edamam (local) or Supabase proxy (default)
export async function edamamSearchRecipes(params: { q: string; from?: number; to?: number }) {
  const qp = new URLSearchParams();
  qp.set('q', params.q);
  if (typeof params.from === 'number') qp.set('from', String(params.from));
  if (typeof params.to === 'number') qp.set('to', String(params.to));

  if (useDirect) {
    qp.set('type', 'public');
    qp.set('app_id', EDA_APP_ID!);
    qp.set('app_key', EDA_APP_KEY!);
    const url = `${EDA_BASE}/api/recipes/v2?${qp.toString()}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Search failed: ${res.status}`);
    const data = await res.json();
    const hits: any[] = data.hits || [];
    return hits.map(mapEdamamHitToCanonical);
  }

  if (!FUNCTIONS_BASE) throw new Error('Supabase Functions base URL missing');
  qp.set('type', 'public');
  const url = `${FUNCTIONS_BASE}/recipes-search?${qp.toString()}`;
  const res = await fetch(url, { headers: funcHeaders() });
  if (!res.ok) throw new Error(`Search failed: ${res.status}`);
  const data = await res.json();
  const hits: any[] = data.hits || [];
  return hits.map(mapEdamamHitToCanonical);
}

// Analyze nutrition for a recipe using direct Edamam or proxy
export async function edamamAnalyzeNutrition(recipe: CanonicalRecipe) {
  const payload = canonicalToEdamamPayload(recipe);

  if (useDirect) {
    const url = `${EDA_BASE}/api/nutrition-details?app_id=${encodeURIComponent(EDA_APP_ID!)}&app_key=${encodeURIComponent(EDA_APP_KEY!)}`;
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Analyze failed: ${res.status} ${text}`);
    }
    const etag = res.headers.get('etag') || undefined;
    const json = await res.json();
    return { etag, data: json } as const;
  }

  if (!FUNCTIONS_BASE) throw new Error('Supabase Functions base URL missing');
  const url = `${FUNCTIONS_BASE}/nutrition-analyze`;
  const res = await fetch(url, { method: 'POST', headers: funcHeaders(), body: JSON.stringify(payload) });
  if (res.status === 304) {
    return { notModified: true } as const;
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Analyze failed: ${res.status} ${text}`);
  }
  const etag = res.headers.get('etag') || undefined;
  const json = await res.json();
  return { etag, data: json } as const;
}

// ————— Mapping helpers —————
function mapEdamamHitToCanonical(hit: any): CanonicalRecipe {
  const r = hit.recipe || hit;
  const servings = r.yield || 1;
  const nutrients = r.totalNutrients || {};

  const per: CanonicalRecipeNutritionPerServing | undefined = {
    calories: safeDiv(nutrients?.ENERC_KCAL?.quantity, servings),
    protein: safeDiv(nutrients?.PROCNT?.quantity, servings),
    carbs: safeDiv((nutrients?.CHOCDF_NET?.quantity ?? nutrients?.CHOCDF?.quantity), servings),
    fats: safeDiv(nutrients?.FAT?.quantity, servings),
    fiber: safeDiv(nutrients?.FIBTG?.quantity, servings),
    sugar: safeDiv(nutrients?.SUGAR?.quantity, servings),
    sodium: safeDiv(nutrients?.NA?.quantity, servings),
  };

  const ingredients: CanonicalIngredient[] = (r.ingredientLines || []).map((line: string) => ({
    name: line,
    original: line,
  }));

  return {
    id: r.uri || r.uriHash || r.shareAs || r.url || r.label,
    title: r.label,
    image: r.image,
    description: r.summary || r.healthLabels?.join(', '),
    servings,
    totalTimeMinutes: r.totalTime || undefined,
    ingredients,
    steps: [],
    nutritionPerServing: per,
    source: { providerType: 'unknown', providerId: r.uri },
    sourceUrl: r.url || r.shareAs,
    tags: r.dietLabels?.concat(r.healthLabels || []) || [],
  };
}

function canonicalToEdamamPayload(recipe: CanonicalRecipe) {
  return {
    title: recipe.title,
    ingr: (recipe.ingredients || []).map((ing) => ing.original || `${ing.amount ?? ''} ${ing.unit ?? ''} ${ing.name}`.trim()),
    yield: recipe.servings || 1,
    time: recipe.totalTimeMinutes || undefined,
  };
}

function safeDiv(a?: number, b?: number) {
  if (typeof a !== 'number' || typeof b !== 'number' || b === 0) return undefined;
  return a / b;
}
