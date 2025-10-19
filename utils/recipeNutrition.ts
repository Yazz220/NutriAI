/**
 * Recipe Nutrition Calculator
 * 
 * Uses the USDA database to calculate accurate nutrition for recipes
 * based on their ingredient lists.
 */

import { MealIngredient } from '@/types';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

interface RecipeNutrition {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  fiber?: number;
}

interface NutritionCalculationResult {
  perServing: RecipeNutrition;
  total: RecipeNutrition;
  ingredientBreakdown: Array<{
    name: string;
    canonical: string;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    matched: boolean;
  }>;
}

/**
 * Calculate accurate nutrition for a recipe using USDA database
 * Falls back to estimation if Edge Function is unavailable
 */
export async function calculateRecipeNutrition(
  ingredients: MealIngredient[],
  servings: number = 1
): Promise<RecipeNutrition | null> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn('[Recipe Nutrition] Supabase not configured, using estimation');
    return estimateRecipeNutrition(ingredients, servings);
  }

  if (!ingredients || ingredients.length === 0) {
    return null;
  }

  try {
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/calculate-recipe-nutrition`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          ingredients,
          servings,
        }),
        signal: AbortSignal.timeout(5000), // 5 second timeout
      }
    );

    if (!response.ok) {
      // Function not deployed or boot error - fall back to estimation
      if (response.status === 503 || response.status === 404) {
        console.warn('[Recipe Nutrition] Edge Function unavailable, using estimation');
        return estimateRecipeNutrition(ingredients, servings);
      }
      
      const errorText = await response.text();
      console.warn('[Recipe Nutrition] API error:', response.status, errorText, '- using estimation');
      return estimateRecipeNutrition(ingredients, servings);
    }

    const result: NutritionCalculationResult = await response.json();
    
    console.log('[Recipe Nutrition] Calculated from USDA:', {
      perServing: result.perServing,
      matchedIngredients: result.ingredientBreakdown.filter(i => i.matched).length,
      totalIngredients: result.ingredientBreakdown.length,
    });
    
    return result.perServing;
    
  } catch (error) {
    // Network error, timeout, or function not available
    console.warn('[Recipe Nutrition] Error, using estimation:', error instanceof Error ? error.message : 'Unknown error');
    return estimateRecipeNutrition(ingredients, servings);
  }
}

/**
 * Calculate nutrition for multiple recipes in batch
 */
export async function calculateRecipeNutritionBatch(
  recipes: Array<{ ingredients: MealIngredient[]; servings: number }>
): Promise<Array<RecipeNutrition | null>> {
  return Promise.all(
    recipes.map(recipe => 
      calculateRecipeNutrition(recipe.ingredients, recipe.servings)
    )
  );
}

/**
 * Estimate basic nutrition from recipe if USDA calculation fails
 * Uses simple heuristics based on ingredient count
 */
export function estimateRecipeNutrition(
  ingredients: MealIngredient[],
  servings: number = 1
): RecipeNutrition {
  // Very rough estimation: ~100 calories per ingredient
  const totalCalories = ingredients.length * 100;
  
  return {
    calories: Math.round(totalCalories / servings),
    protein: Math.round((totalCalories * 0.15) / servings / 4), // 15% of calories from protein
    carbs: Math.round((totalCalories * 0.50) / servings / 4),   // 50% from carbs
    fats: Math.round((totalCalories * 0.35) / servings / 9),    // 35% from fats
  };
}
