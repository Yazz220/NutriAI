// TheMealDB adapter: fetches recipes and maps to ExternalRecipe shape
import { ExternalRecipe, RecipeIngredient } from '@/types/external';

const API_KEY = process.env.EXPO_PUBLIC_MEALDB_API_KEY || '1';
const BASE_URL = (process.env.EXPO_PUBLIC_MEALDB_API_BASE || 'https://www.themealdb.com/api/json/v1') + `/${API_KEY}`;

type MealDBMeal = Record<string, any> & {
  idMeal: string;
  strMeal: string;
  strMealThumb?: string;
  strCategory?: string;
  strArea?: string;
  strInstructions?: string;
  strSource?: string | null;
};

type MealDBResponse = { meals: MealDBMeal[] | null };

const fetchJson = async (url: string): Promise<MealDBResponse> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`MealDB HTTP ${res.status}`);
  return res.json();
};

// Parse common measure strings like "1", "1.5", "1/2", "1 1/2", "2-3 tbsp"
const parseQuantityUnit = (measureRaw?: string): { amount: number; unit: string } => {
  if (!measureRaw) return { amount: 0, unit: '' };
  const measure = String(measureRaw).trim();
  if (!measure) return { amount: 0, unit: '' };

  // Extract quantity at the start
  const mixedFraction = measure.match(/^(\d+)\s+(\d+)\/(\d+)(.*)$/); // 1 1/2 cup
  if (mixedFraction) {
    const whole = parseFloat(mixedFraction[1]);
    const num = parseFloat(mixedFraction[2]);
    const den = parseFloat(mixedFraction[3]) || 1;
    const rest = mixedFraction[4].trim();
    const amount = whole + (num / den);
    return { amount, unit: rest.trim() };
  }

  const simpleFraction = measure.match(/^(\d+)\/(\d+)(.*)$/); // 1/2 cup
  if (simpleFraction) {
    const num = parseFloat(simpleFraction[1]);
    const den = parseFloat(simpleFraction[2]) || 1;
    const rest = simpleFraction[3].trim();
    return { amount: num / den, unit: rest.trim() };
  }

  const numberFirst = measure.match(/^(\d+(?:\.\d+)?)(.*)$/); // 2.5 tbsp or 2 tbsp
  if (numberFirst) {
    const amount = parseFloat(numberFirst[1]);
    const rest = numberFirst[2].trim();
    return { amount: isNaN(amount) ? 0 : amount, unit: rest };
  }

  // Could be text like "to taste", "some"; keep as unit text, amount zero
  return { amount: 0, unit: measure };
};

export const mapMealDBMealToExternal = (meal: MealDBMeal): ExternalRecipe => {
  // Collect ingredients 1..20 with measures
  const ingredients: RecipeIngredient[] = [];
  for (let i = 1; i <= 20; i++) {
    const name = (meal as any)[`strIngredient${i}`];
    const measure = (meal as any)[`strMeasure${i}`];
    if (name && String(name).trim()) {
      const { amount, unit } = parseQuantityUnit(measure);
      ingredients.push({
        name: String(name).trim(),
        amount,
        unit: unit || '',
        original: `${measure || ''} ${name}`.trim(),
      });
    }
  }

  return {
    id: parseInt(meal.idMeal, 10),
    title: meal.strMeal,
    image: meal.strMealThumb || '',
    servings: 1,
    readyInMinutes: 0,
    sourceName: meal.strSource ? 'TheMealDB' : undefined,
    sourceUrl: meal.strSource || undefined,
    instructions: meal.strInstructions || '',
    cuisines: meal.strArea ? [meal.strArea] : [],
    dishTypes: meal.strCategory ? [meal.strCategory] : [],
    vegetarian: undefined,
    vegan: undefined,
    glutenFree: undefined,
    dairyFree: undefined,
    nutrition: undefined,
    ingredients,
    analyzedInstructions: undefined,
  } as ExternalRecipe;
};

export const searchMealsByName = async (query: string): Promise<ExternalRecipe[]> => {
  if (!query || !query.trim()) return [];
  const url = `${BASE_URL}/search.php?s=${encodeURIComponent(query.trim())}`;
  const data = await fetchJson(url);
  const meals = Array.isArray((data as any)?.meals) ? (data as any).meals : [];
  return meals.map(mapMealDBMealToExternal);
};

export const lookupMealById = async (id: number | string): Promise<ExternalRecipe | null> => {
  const url = `${BASE_URL}/lookup.php?i=${encodeURIComponent(String(id))}`;
  const data = await fetchJson(url);
  const meal = Array.isArray((data as any)?.meals) ? (data as any).meals?.[0] : undefined;
  return meal ? mapMealDBMealToExternal(meal) : null;
};

export const getRandomSelection = async (): Promise<ExternalRecipe[]> => {
  // returns ~10 random meals
  const url = `${BASE_URL}/randomselection.php`;
  try {
    const data = await fetchJson(url);
    const meals = Array.isArray((data as any)?.meals) ? (data as any).meals : [];
    return meals.map(mapMealDBMealToExternal);
  } catch (e) {
    // Not available for free keys; fallback handled by getRandomMeals
    return [];
  }
};

export const getRandomOne = async (): Promise<ExternalRecipe | null> => {
  const url = `${BASE_URL}/random.php`;
  const data = await fetchJson(url);
  const meal = Array.isArray((data as any)?.meals) ? (data as any).meals?.[0] : undefined;
  return meal ? mapMealDBMealToExternal(meal) : null;
};

export const getRandomMeals = async (count: number = 10): Promise<ExternalRecipe[]> => {
  // Robust approach using random.php which works with free keys.
  const results: Record<string, ExternalRecipe> = {};
  let attempts = 0;
  while (Object.keys(results).length < count && attempts < count * 4) {
    attempts++;
    const one = await getRandomOne();
    if (one) {
      results[String(one.id)] = one;
    }
  }
  return Object.values(results).slice(0, count);
};

export const filterByCategory = async (category: string, limit = 12): Promise<ExternalRecipe[]> => {
  // filter returns partials; perform lookup by id to get full details
  const url = `${BASE_URL}/filter.php?c=${encodeURIComponent(category)}`;
  const data = await fetchJson(url);
  const meals = (Array.isArray((data as any)?.meals) ? (data as any).meals : []).slice(0, limit);
  const detailed: ExternalRecipe[] = [];
  for (const m of meals) {
    const full = await lookupMealById(m.idMeal);
    if (full) detailed.push(full);
  }
  return detailed;
};
