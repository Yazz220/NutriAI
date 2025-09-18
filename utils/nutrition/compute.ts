import { ExternalRecipe, RecipeIngredient } from '@/types/external';
import { NUTRITION_PER_100G, ALIASES } from './facts';
import { WEIGHT_UNITS, VOLUME_UNITS, DENSITY_G_PER_ML, COUNT_UNITS, COUNT_WEIGHTS_G, parseQuantityUnit } from './units';

export type PerServing = { calories: number; protein: number; carbs: number; fats: number };
export type Totals = PerServing; // same shape, represents whole-recipe totals

function normalizeName(name?: string): string {
  if (!name) return '';
  return name.toLowerCase().trim();
}

function resolveAlias(name: string): string {
  const n = normalizeName(name);
  return ALIASES[n] || n;
}

function matchFactKey(name: string): string | null {
  const n = resolveAlias(name);
  if (NUTRITION_PER_100G[n]) return n;
  // try partial includes for multi-word names
  const keys = Object.keys(NUTRITION_PER_100G);
  const found = keys.find(k => n.includes(k));
  return found || null;
}

function toGrams(amount: number, unitRaw: string, ingredientName: string, original?: string): number {
  // If amount is missing or tiny, try parsing from the original string
  if ((!amount || amount <= 0.0001) && original) {
    const parsed = parseQuantityUnit(original);
    amount = parsed.amount || amount;
    unitRaw = parsed.unit || unitRaw;
  }
  const unit = (unitRaw || '').toLowerCase().trim();
  if (!amount || isNaN(amount)) return 0;

  // weight units -> grams
  if (WEIGHT_UNITS[unit] !== undefined) return amount * WEIGHT_UNITS[unit];

  // count-based (or missing unit but name suggests a count item)
  if (COUNT_UNITS.has(unit) || !unit) {
    const nameKey = normalizeName(ingredientName);
    let countWeight = COUNT_WEIGHTS_G[nameKey] || 0;
    // Handle common container units like can/jar/packet/pouch with defaults by ingredient category
    if (!countWeight) {
      const n = nameKey;
      const isBeans = n.includes('bean');
      const isTomato = n.includes('tomato');
      const isVeg = n.includes('veg');
      const isGrain = n.includes('grain') || n.includes('rice') || n.includes('pasta');
      // Typical drained weights
      if (unit.includes('can') || unit.includes('tin')) {
        if (isBeans) countWeight = 240; // drained weight of 400g can
        else if (isTomato) countWeight = 400; // whole contents used
        else countWeight = 300;
      } else if (unit.includes('jar') || unit.includes('carton')) {
        countWeight = 350;
      } else if (unit.includes('packet') || unit.includes('pack') || unit.includes('pouch') || unit.includes('pocket')) {
        if (isGrain) countWeight = 250; // ready rice/mixed grains pouch
        else if (isVeg) countWeight = 300; // frozen mixed veg pouch
        else countWeight = 200;
      }
    }
    if (countWeight) return amount * countWeight;
    return 0; // unknown count weight
  }

  // volume -> ml then to grams using density
  if (VOLUME_UNITS[unit] !== undefined) {
    const ml = amount * VOLUME_UNITS[unit];
    const key = matchFactKey(ingredientName) || 'water';
    const density = DENSITY_G_PER_ML[key] || DENSITY_G_PER_ML['water'];
    return ml * density;
  }

  return 0;
}

function add(a: PerServing, b: PerServing): PerServing {
  return {
    calories: a.calories + b.calories,
    protein: a.protein + b.protein,
    carbs: a.carbs + b.carbs,
    fats: a.fats + b.fats,
  };
}

// Compute nutrition totals for the entire list of ingredients (no serving division)
export function computeTotalsFromIngredients(ingredients: RecipeIngredient[]): Totals | undefined {
  if (!Array.isArray(ingredients) || ingredients.length === 0) return undefined;
  const total = ingredients.reduce<PerServing>((acc, ing) => {
    const grams = toGrams(ing.amount || 0, ing.unit || '', ing.name || ing.originalName || '', ing.original);
    if (!grams || grams <= 0) return acc;
    const key = matchFactKey(ing.name || ing.originalName || '') || 'water';
    const per100 = NUTRITION_PER_100G[key];
    if (!per100) return acc;
    const factor = grams / 100;
    return add(acc, {
      calories: per100.calories * factor,
      protein: per100.protein * factor,
      carbs: per100.carbs * factor,
      fats: per100.fats * factor,
    });
  }, { calories: 0, protein: 0, carbs: 0, fats: 0 });
  return total;
}

// Heuristic: estimate servings when provider doesn't supply it
export function estimateServingsFromIngredients(ingredients: RecipeIngredient[], totals?: Totals): number {
  if (!Array.isArray(ingredients) || ingredients.length === 0) return 1;

  // Egg-based heuristic: ~2 eggs per serving
  const eggCount = ingredients.reduce((cnt, ing) => {
    const name = (ing.name || ing.originalName || '').toLowerCase();
    if (name.includes('egg')) {
      const amt = ing.amount || parseQuantityUnit(ing.original || '').amount || 0;
      return cnt + (isFinite(amt) ? amt : 0);
    }
    return cnt;
  }, 0);
  const eggServings = eggCount >= 2 ? Math.round(eggCount / 2) : 0;

  // Bread slices heuristic: ~2 slices per serving
  const sliceCount = ingredients.reduce((cnt, ing) => {
    const name = (ing.name || ing.originalName || '').toLowerCase();
    const unit = (ing.unit || '').toLowerCase();
    if (name.includes('bread') || name.includes('muffin') || unit.includes('slice')) {
      const parsed = parseQuantityUnit(ing.original || `${ing.amount || ''} ${ing.unit || ''}`);
      const amt = ing.amount || parsed.amount || 0;
      return cnt + (isFinite(amt) ? amt : 0);
    }
    return cnt;
  }, 0);
  const breadServings = sliceCount >= 2 ? Math.round(sliceCount / 2) : 0;

  // Protein weight heuristic: ~150g cooked protein per serving
  const proteinKeywords = ['chicken', 'beef', 'pork', 'turkey', 'lamb', 'fish', 'salmon', 'tuna', 'shrimp', 'egg'];
  let proteinGrams = 0;
  ingredients.forEach((ing) => {
    const name = (ing.name || ing.originalName || '').toLowerCase();
    if (proteinKeywords.some(k => name.includes(k))) {
      proteinGrams += toGrams(ing.amount || 0, ing.unit || '', name, ing.original);
    }
  });
  const proteinServings = proteinGrams > 0 ? Math.round(proteinGrams / 150) : 0;

  // Calorie-based heuristic: 500–700 kcal per serving typical for mains
  const t = totals || computeTotalsFromIngredients(ingredients);
  const totalCalories = t?.calories || 0;
  const calorieServings = totalCalories > 0 ? Math.round(totalCalories / 600) : 0;

  // Combine heuristics: take the max of non-zero, fallback to 1
  const candidates = [eggServings, breadServings, proteinServings, calorieServings].filter(n => n && isFinite(n)) as number[];
  let est = candidates.length ? Math.max(...candidates) : 1;

  // Clamp to reasonable range
  est = Math.min(Math.max(est, 1), 12);
  return est;
}

export function computeFromIngredients(ingredients: RecipeIngredient[], servings: number = 1): PerServing | undefined {
  if (!Array.isArray(ingredients) || ingredients.length === 0) return undefined;
  const total = computeTotalsFromIngredients(ingredients) || { calories: 0, protein: 0, carbs: 0, fats: 0 };

  const sv = servings && servings > 0 ? servings : 1;
  // round to 1 decimal for macros, calories integer
  return {
    calories: Math.round(total.calories / sv),
    protein: Math.round((total.protein / sv) * 10) / 10,
    carbs: Math.round((total.carbs / sv) * 10) / 10,
    fats: Math.round((total.fats / sv) * 10) / 10,
  };
}

export function computeForExternalRecipe(recipe: ExternalRecipe): PerServing | undefined {
  const ings = recipe.ingredients || [];
  if (!ings.length) return undefined;
  // If recipe.servings is missing or 1, estimate a better default
  const totals = computeTotalsFromIngredients(ings);
  const estServings = (recipe.servings && recipe.servings > 1) ? recipe.servings : estimateServingsFromIngredients(ings, totals);
  return computeFromIngredients(ings, estServings || 1);
}

// Helper to expose an estimated servings for consumers (UI/save flows)
export function estimateServingsForExternalRecipe(recipe: ExternalRecipe): number {
  const ings = recipe.ingredients || [];
  if (!ings.length) return recipe.servings || 1;
  if (recipe.servings && recipe.servings > 1) return recipe.servings;
  const totals = computeTotalsFromIngredients(ings);
  return estimateServingsFromIngredients(ings, totals);
}
