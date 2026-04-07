/**
 * Import Orchestrator
 *
 * Ties together the URL/text import pipelines (existing `importRecipe`) with
 * image/video Edge-Function pipelines.  After importing, the recipe is
 * auto-categorised with AI and returned as a `Meal` ready to save.
 */

import { importRecipe } from '@/utils/recipeImport';
import { createChatCompletion, ChatMessage } from '@/utils/aiClient';
import { ContentType, extractUrl, looksLikeRecipe } from '@/utils/contentDetector';
import { Meal, MealCategory, MealIngredient, MEAL_CATEGORIES } from '@/types/index';
import { ImportedRecipe, ImportedIngredient } from '@/types/importedRecipe';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface ImportResult {
  success: boolean;
  meal?: Meal;
  error?: string;
  /** true when the user sent a conversation message rather than a recipe */
  isConversation?: boolean;
}

// ---------------------------------------------------------------------------
// Shared Edge-Function helper
// ---------------------------------------------------------------------------

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Call a Supabase Edge Function by name.
 * Throws on non-2xx responses.
 */
export async function callEdgeFunction<T = unknown>(
  functionName: string,
  body: Record<string, unknown>,
): Promise<T> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(
      'Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.',
    );
  }

  const url = `${SUPABASE_URL.replace(/\/$/, '')}/functions/v1/${functionName}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      apikey: SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Edge function "${functionName}" failed (${res.status}): ${text}`);
  }

  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Ingredient normalisation
// ---------------------------------------------------------------------------

/**
 * Normalise various ingredient shapes returned by the import pipelines into
 * the canonical `MealIngredient[]` expected by `Meal`.
 */
export function normalizeIngredients(
  ingredients: Array<ImportedIngredient | { name?: string; original?: string; amount?: number; unit?: string } | string>,
): MealIngredient[] {
  return ingredients
    .map((ing): MealIngredient | null => {
      if (!ing) return null;

      if (typeof ing === 'string') {
        return { name: ing.trim(), quantity: 1, unit: '' };
      }

      const name = (ing as ImportedIngredient).name?.trim() || (ing as any).original?.trim() || '';
      if (!name) return null;

      return {
        name,
        quantity: typeof (ing as any).amount === 'number' ? (ing as any).amount : 1,
        unit: (ing as any).unit?.trim() ?? '',
        optional: (ing as any).optional ?? false,
      };
    })
    .filter((ing): ing is MealIngredient => ing !== null && ing.name.length > 0);
}

// ---------------------------------------------------------------------------
// ImportedRecipe → Meal
// ---------------------------------------------------------------------------

function generateMealId(): string {
  return `meal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Convert an `ImportedRecipe` (from the import pipelines) into a `Meal`
 * ready to persist, tagged with the supplied AI-determined category.
 */
export function importedToMeal(imported: ImportedRecipe, category: MealCategory): Meal {
  const steps = imported.instructions.map((inst) => inst.text).filter(Boolean);

  const nutritionPerServing = imported.nutrition
    ? {
        calories: imported.nutrition.calories ?? 0,
        protein: imported.nutrition.protein ?? 0,
        carbs: imported.nutrition.carbs ?? 0,
        fats: imported.nutrition.fat ?? 0,
      }
    : undefined;

  return {
    id: generateMealId(),
    name: imported.title,
    description: imported.description ?? '',
    ingredients: normalizeIngredients(imported.ingredients),
    steps,
    image: imported.image,
    tags: [
      ...(imported.tags ?? []),
      ...(imported.categories ?? []),
    ],
    prepTime: imported.prepTime ?? 0,
    cookTime: imported.cookTime ?? 0,
    servings: imported.servings ?? 4,
    sourceUrl: imported.sourceUrl ?? imported.source,
    category,
    nutritionPerServing,
  };
}

// ---------------------------------------------------------------------------
// AI categorisation
// ---------------------------------------------------------------------------

const DEFAULT_CATEGORY: MealCategory = 'dinner';

/**
 * Ask the AI to assign a single `MealCategory` to the recipe.
 * Falls back to `'dinner'` on any error.
 */
export async function categorizeRecipe(
  title: string,
  ingredientNames: string[],
): Promise<MealCategory> {
  try {
    const validList = MEAL_CATEGORIES.join(', ');
    const ingredientSample = ingredientNames.slice(0, 10).join(', ') || 'unknown';

    const messages: ChatMessage[] = [
      {
        role: 'system',
        content:
          `You are a culinary classifier. Given a recipe title and a few ingredient names, ` +
          `respond with exactly ONE word — the most appropriate meal category from this list: ${validList}. ` +
          `No punctuation, no explanation.`,
      },
      {
        role: 'user',
        content: `Title: "${title}"\nIngredients: ${ingredientSample}`,
      },
    ];

    const raw = (await createChatCompletion(messages)).trim().toLowerCase();

    // Validate the response is one of the known categories
    const matched = MEAL_CATEGORIES.find((cat) => raw.startsWith(cat));
    return matched ?? DEFAULT_CATEGORY;
  } catch (err) {
    console.warn('[importOrchestrator] categorizeRecipe failed, using default:', err);
    return DEFAULT_CATEGORY;
  }
}

// ---------------------------------------------------------------------------
// Image pipeline (via ai-nutrition-scan Edge Function)
// ---------------------------------------------------------------------------

interface ImageScanResponse {
  title?: string;
  description?: string;
  ingredients?: Array<{ name: string; amount?: number; unit?: string }>;
  steps?: string[];
  prepTime?: number;
  cookTime?: number;
  servings?: number;
}

async function importFromImage(imageBase64: string): Promise<ImportedRecipe> {
  const result = await callEdgeFunction<ImageScanResponse>('ai-nutrition-scan', {
    imageBase64,
    mode: 'recipe',
  });

  const title = result.title || 'Imported Recipe';
  const ingredients: ImportedIngredient[] = (result.ingredients ?? []).map((ing) => ({
    name: ing.name,
    original: ing.name,
    amount: ing.amount,
    unit: ing.unit,
  }));

  return {
    id: `import_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    title,
    description: result.description ?? '',
    source: 'image',
    sourceType: 'image',
    ingredients,
    instructions: (result.steps ?? []).map((text, i) => ({ step: i + 1, text })),
    prepTime: result.prepTime,
    cookTime: result.cookTime,
    servings: result.servings,
    createdAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Video pipeline (via parse-recipe Edge Function with video mode)
// ---------------------------------------------------------------------------

interface VideoParseResponse {
  title?: string;
  description?: string;
  ingredients?: Array<{ name: string; amount?: number; unit?: string }>;
  instructions?: Array<{ step: number; text: string }>;
  prepTime?: number;
  cookTime?: number;
  servings?: number;
}

async function importFromVideoUrl(videoUrl: string): Promise<ImportedRecipe> {
  const result = await callEdgeFunction<VideoParseResponse>('parse-recipe', {
    url: videoUrl,
    mode: 'video',
  });

  const title = result.title || 'Imported Recipe';
  const ingredients: ImportedIngredient[] = (result.ingredients ?? []).map((ing) => ({
    name: ing.name,
    original: ing.name,
    amount: ing.amount,
    unit: ing.unit,
  }));

  return {
    id: `import_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    title,
    description: result.description ?? '',
    source: videoUrl,
    sourceType: 'video',
    sourceUrl: videoUrl,
    ingredients,
    instructions: result.instructions ?? [],
    prepTime: result.prepTime,
    cookTime: result.cookTime,
    servings: result.servings,
    createdAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Main orchestrator
// ---------------------------------------------------------------------------

/**
 * Route any user input to the correct import pipeline, auto-categorise the
 * result and return a `Meal` ready to save.
 *
 * @param text        Raw text / URL the user submitted
 * @param contentType Classification from `detectContentType()`
 * @param imageBase64 Base-64 image data when `contentType === 'image'`
 */
export async function orchestrateImport(
  text: string,
  contentType: ContentType,
  imageBase64?: string,
): Promise<ImportResult> {
  try {
    // Detect conversations early so we don't try to parse chat as a recipe
    if (contentType === 'text' && !looksLikeRecipe(text)) {
      return { success: false, isConversation: true };
    }

    let imported: ImportedRecipe;

    switch (contentType) {
      case 'image': {
        if (!imageBase64) {
          return { success: false, error: 'No image data provided.' };
        }
        imported = await importFromImage(imageBase64);
        break;
      }

      case 'video_url': {
        const url = extractUrl(text);
        if (!url) {
          return { success: false, error: 'Could not extract a video URL from the input.' };
        }
        imported = await importFromVideoUrl(url);
        break;
      }

      case 'recipe_url': {
        const url = extractUrl(text);
        if (!url) {
          return { success: false, error: 'Could not extract a URL from the input.' };
        }
        const result = await importRecipe(url, 'link', { useAI: true });
        if (!result.success || !result.recipe) {
          return { success: false, error: result.error ?? 'Failed to import recipe from URL.' };
        }
        imported = result.recipe;
        break;
      }

      case 'text':
      default: {
        const result = await importRecipe(text, 'text', { useAI: true });
        if (!result.success || !result.recipe) {
          return { success: false, error: result.error ?? 'Failed to parse recipe from text.' };
        }
        imported = result.recipe;
        break;
      }
    }

    // Auto-categorise using AI
    const ingredientNames = imported.ingredients.map((i) => i.name);
    const category = await categorizeRecipe(imported.title, ingredientNames);

    const meal = importedToMeal(imported, category);

    return { success: true, meal };
  } catch (err) {
    console.error('[importOrchestrator] orchestrateImport error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'An unexpected error occurred during import.',
    };
  }
}
