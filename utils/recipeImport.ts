// Minimal client-side recipe import via scraping JSON-LD and Open Graph
// Note: For production, consider a server function to avoid CORS and site variability

export interface ImportedRecipe {
  name: string;
  description?: string;
  imageUrl?: string;
  ingredients: Array<{ name: string; quantity: number; unit: string; optional: boolean }>;
  steps: string[];
  tags: string[];
  prepTime?: number;
  cookTime?: number;
  servings?: number;
}

function parseISO8601DurationToMinutes(duration?: string): number | undefined {
  if (!duration) return undefined;
  // Simple PTxxM/PTxxHxxM parser
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!match) return undefined;
  const hours = parseInt(match[1] || '0', 10);
  const mins = parseInt(match[2] || '0', 10);
  return hours * 60 + mins;
}

function normalizeIngredient(raw: string) {
  // Very naive parser: "1 cup rice" -> { quantity: 1, unit: 'cup', name: 'rice' }
  const parts = raw.trim().split(/\s+/);
  const quantity = parseFloat(parts[0]);
  if (!isNaN(quantity) && parts.length >= 3) {
    const unit = parts[1];
    const name = parts.slice(2).join(' ');
    return { name, quantity, unit, optional: false };
  }
  return { name: raw.trim(), quantity: 1, unit: 'pcs', optional: false };
}

// AI fallback import from free-form text (copied recipe, transcript, etc.)
import { createChatCompletion } from './aiClient';

export async function importRecipeFromText(text: string): Promise<ImportedRecipe> {
  const sys = `You are a precise recipe parser. Given unstructured recipe text, extract a clean JSON with fields:
{
  "name": string,
  "description"?: string,
  "imageUrl"?: string,
  "ingredients": [{ "name": string, "quantity": number, "unit": string, "optional": boolean }],
  "steps": string[],
  "tags": string[],
  "prepTime"?: number, // minutes
  "cookTime"?: number, // minutes
  "servings"?: number
}
Rules: return ONLY minified JSON. Quantities should be numbers. Units short (e.g., g, ml, tbsp, tsp, cup, pcs).`;
  const user = text.slice(0, 8000);
  const raw = await createChatCompletion([
    { role: 'system', content: sys },
    { role: 'user', content: user },
  ]);
  const jsonStr = raw.trim().replace(/^```json\s*|```$/g, '');
  const data = JSON.parse(jsonStr);
  return normalizeImportedRecipe(data);
}

export async function importRecipeFromUrl(url: string): Promise<ImportedRecipe> {
  // Try fetching directly; if blocked, try reader proxy
  let html = '';
  try {
    const res = await fetch(url);
    html = await res.text();
  } catch {}
  if (!html) {
    try {
      const readerUrl = `https://r.jina.ai/http://${url.replace(/^https?:\/\//, '')}`;
      const res = await fetch(readerUrl);
      html = await res.text();
    } catch {}
  }
  if (!html) {
    // As a last resort, let AI parse from URL text itself (may be less accurate)
    return importRecipeFromText(`URL: ${url}\nIf you know this site format, reconstruct the recipe.`);
  }

  let doc: Document | null = null;
  try {
    doc = new DOMParser().parseFromString(html, 'text/html');
  } catch {}

  // Try JSON-LD @type Recipe
  const ldScripts = doc ? Array.from(doc.querySelectorAll('script[type="application/ld+json"]')) : [];
  for (const script of ldScripts) {
    try {
      const json = JSON.parse(script.textContent || '{}');
      const candidates = Array.isArray(json) ? json : [json];
      const recipeJson = candidates.find((j) => j['@type'] === 'Recipe' || (Array.isArray(j['@type']) && j['@type'].includes('Recipe')));
      if (recipeJson) {
        const ingredientsList: string[] = recipeJson.recipeIngredient || [];
        const instructions = (recipeJson.recipeInstructions || []).map((step: any) =>
          typeof step === 'string' ? step : step.text
        );
        return {
          name: recipeJson.name || 'Imported Recipe',
          description: recipeJson.description,
          imageUrl: (Array.isArray(recipeJson.image) ? recipeJson.image[0] : recipeJson.image) || undefined,
          ingredients: ingredientsList.map(normalizeIngredient),
          steps: instructions.filter(Boolean),
          tags: (recipeJson.keywords ? String(recipeJson.keywords).split(',').map((s: string) => s.trim()) : []),
          prepTime: parseISO8601DurationToMinutes(recipeJson.prepTime),
          cookTime: parseISO8601DurationToMinutes(recipeJson.cookTime),
          servings: recipeJson.recipeYield ? parseInt(String(recipeJson.recipeYield).replace(/\D/g, '') || '0', 10) : undefined,
        };
      }
    } catch {}
  }

  // Fallback: Open Graph
  const title = doc?.querySelector('meta[property="og:title"]')?.getAttribute('content') || doc?.title || 'Imported Recipe';
  const description = doc?.querySelector('meta[property="og:description"]')?.getAttribute('content') || undefined;
  const image = doc?.querySelector('meta[property="og:image"]')?.getAttribute('content') || undefined;

  const basic = {
    name: title,
    description,
    imageUrl: image,
    ingredients: [] as any[],
    steps: [] as string[],
    tags: [] as string[],
  };

  // As a better fallback, strip text content and ask AI to parse it
  try {
    const text = (doc?.body?.textContent || '').slice(0, 12000) || html.slice(0, 12000);
    if (text) {
      const parsed = await importRecipeFromText(text);
      return { ...basic, ...parsed, imageUrl: parsed.imageUrl || basic.imageUrl };
    }
  } catch {}

  return basic;
}

function normalizeImportedRecipe(data: any): ImportedRecipe {
  const ing = Array.isArray(data.ingredients) ? data.ingredients.map((i: any) => ({
    name: String(i.name || '').trim() || 'Ingredient',
    quantity: Number(i.quantity) > 0 ? Number(i.quantity) : 1,
    unit: String(i.unit || 'pcs'),
    optional: Boolean(i.optional),
  })) : [];
  const steps = Array.isArray(data.steps) ? data.steps.map((s: any) => String(s)).filter(Boolean) : [];
  const tags = Array.isArray(data.tags) ? data.tags.map((t: any) => String(t)) : [];
  return {
    name: String(data.name || 'Imported Recipe'),
    description: data.description ? String(data.description) : undefined,
    imageUrl: data.imageUrl ? String(data.imageUrl) : undefined,
    ingredients: ing,
    steps,
    tags,
    prepTime: typeof data.prepTime === 'number' ? data.prepTime : undefined,
    cookTime: typeof data.cookTime === 'number' ? data.cookTime : undefined,
    servings: typeof data.servings === 'number' ? data.servings : undefined,
  };
}


// Import from image via Vision model (Qwen VL) using OpenRouter-compatible API
export async function importRecipeFromImage(imageDataUrl: string): Promise<ImportedRecipe> {
  const AI_API_BASE = process.env.EXPO_PUBLIC_AI_API_BASE || 'https://openrouter.ai/api/v1';
  const AI_API_KEY = process.env.EXPO_PUBLIC_AI_API_KEY;
  const AI_PROXY_BASE = process.env.EXPO_PUBLIC_AI_PROXY_BASE; // Optional proxy
  const VISION_MODEL = process.env.EXPO_PUBLIC_AI_VISION_MODEL || 'qwen/qwen2.5-vl-72b-instruct:free';

  const base = AI_PROXY_BASE || AI_API_BASE;
  const url = `${base.replace(/\/$/, '')}/chat/completions`;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (!AI_PROXY_BASE && AI_API_KEY) {
    headers['Authorization'] = `Bearer ${AI_API_KEY}`;
    headers['HTTP-Referer'] = 'https://nutriai.app';
    headers['X-Title'] = 'NutriAI';
  }

  const system = [
    'You parse a photo/screenshot of a recipe (webpage, social video frame, notes).',
    'Return ONLY minified JSON matching:',
    '{"name": string, "description"?: string, "imageUrl"?: string, "ingredients": [{"name": string, "quantity": number, "unit": string, "optional": boolean}], "steps": string[], "tags": string[], "prepTime"?: number, "cookTime"?: number, "servings"?: number }',
    'Make reasonable guesses. Use short units (g, ml, tbsp, tsp, cup, pcs). Steps should be concise.'
  ].join('\n');

  const body = {
    model: VISION_MODEL,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: [
        { type: 'text', text: 'Extract the full recipe from this image as strict JSON.' },
        { type: 'image_url', image_url: { url: imageDataUrl } },
      ]}
    ],
    temperature: 0.2,
  } as const;

  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Vision recipe import failed (${res.status}): ${text}`);
  }
  const json = await res.json();
  const content = json?.choices?.[0]?.message?.content;
  if (typeof content !== 'string') throw new Error('Vision response missing content');
  const match = content.match(/\{[\s\S]*\}/);
  const toParse = match ? match[0] : content;
  const data = JSON.parse(toParse);
  return normalizeImportedRecipe(data);
}
