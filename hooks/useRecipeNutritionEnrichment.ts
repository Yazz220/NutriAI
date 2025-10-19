/**
 * Recipe Nutrition Enrichment Hook
 * 
 * Automatically calculates and caches nutrition data for recipes
 * that don't have it, using the USDA database.
 */

import { useEffect, useState } from 'react';
import { Meal } from '@/types';
import { ExternalRecipe } from '@/types/external';
import { calculateRecipeNutrition } from '@/utils/recipeNutrition';

interface RecipeWithNutrition extends Meal {
  nutritionPerServing?: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  };
}

/**
 * Enrich a single recipe with nutrition data if missing
 */
async function enrichRecipe(recipe: Meal): Promise<RecipeWithNutrition> {
  // Skip if already has nutrition
  if (recipe.nutritionPerServing?.calories && recipe.nutritionPerServing.calories > 0) {
    return recipe as RecipeWithNutrition;
  }

  // Skip if no ingredients
  if (!recipe.ingredients || recipe.ingredients.length === 0) {
    return recipe as RecipeWithNutrition;
  }

  try {
    console.log(`[Recipe Nutrition] Calculating for: ${recipe.name}`);
    
    const nutrition = await calculateRecipeNutrition(
      recipe.ingredients,
      recipe.servings || 1
    );

    if (nutrition) {
      return {
        ...recipe,
        nutritionPerServing: nutrition,
      };
    }
  } catch (error) {
    console.warn(`[Recipe Nutrition] Failed for ${recipe.name}:`, error);
  }

  return recipe as RecipeWithNutrition;
}

/**
 * Hook to enrich recipes with nutrition data
 */
export function useRecipeNutritionEnrichment(recipes: Meal[]): Meal[] {
  const [enrichedRecipes, setEnrichedRecipes] = useState<Meal[]>(recipes);
  const [isEnriching, setIsEnriching] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function enrichRecipes() {
      if (isEnriching || recipes.length === 0) return;

      // Check if any recipes need enrichment
      const needsEnrichment = recipes.some(
        r => r.ingredients?.length > 0 && 
        (!r.nutritionPerServing?.calories || r.nutritionPerServing.calories === 0)
      );

      if (!needsEnrichment) {
        setEnrichedRecipes(recipes);
        return;
      }

      setIsEnriching(true);

      try {
        // Enrich recipes in batches of 5 to avoid overwhelming the API
        const batchSize = 5;
        const enriched: Meal[] = [];

        for (let i = 0; i < recipes.length; i += batchSize) {
          if (!isMounted) break;

          const batch = recipes.slice(i, i + batchSize);
          const enrichedBatch = await Promise.all(
            batch.map(recipe => enrichRecipe(recipe))
          );

          enriched.push(...enrichedBatch);

          // Update state progressively for better UX
          if (isMounted) {
            setEnrichedRecipes([...enriched, ...recipes.slice(i + batchSize)]);
          }

          // Small delay between batches
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        if (isMounted) {
          setEnrichedRecipes(enriched);
        }
      } catch (error) {
        console.error('[Recipe Nutrition] Batch enrichment error:', error);
        if (isMounted) {
          setEnrichedRecipes(recipes);
        }
      } finally {
        if (isMounted) {
          setIsEnriching(false);
        }
      }
    }

    enrichRecipes();

    return () => {
      isMounted = false;
    };
  }, [recipes]);

  return enrichedRecipes;
}

/**
 * Enrich external recipes with nutrition
 */
export function useExternalRecipeNutritionEnrichment(recipes: ExternalRecipe[]): ExternalRecipe[] {
  const [enrichedRecipes, setEnrichedRecipes] = useState<ExternalRecipe[]>(recipes);

  useEffect(() => {
    let isMounted = true;

    async function enrichExternalRecipes() {
      const enriched = await Promise.all(
        recipes.map(async (recipe) => {
          // Skip if already has calories
          if (recipe.nutrition?.nutrients?.some((n: any) => n.name === 'Calories' && n.amount > 0)) {
            return recipe;
          }

          // Skip if no ingredients
          if (!recipe.ingredients || recipe.ingredients.length === 0) {
            return recipe;
          }

          try {
            const mealIngredients = recipe.ingredients.map((ing: any) => ({
              name: ing.name,
              quantity: ing.amount || 1,
              unit: ing.unit || 'piece',
            }));

            const nutrition = await calculateRecipeNutrition(
              mealIngredients,
              recipe.servings || 1
            );

            if (nutrition && isMounted) {
              return {
                ...recipe,
                nutrition: {
                  nutrients: [
                    { name: 'Calories', amount: nutrition.calories, unit: 'kcal' },
                    { name: 'Protein', amount: nutrition.protein, unit: 'g' },
                    { name: 'Carbohydrates', amount: nutrition.carbs, unit: 'g' },
                    { name: 'Fat', amount: nutrition.fats, unit: 'g' },
                  ],
                },
              };
            }
          } catch (error) {
            console.warn(`[External Recipe Nutrition] Failed for ${recipe.title}:`, error);
          }

          return recipe;
        })
      );

      if (isMounted) {
        setEnrichedRecipes(enriched);
      }
    }

    enrichExternalRecipes();

    return () => {
      isMounted = false;
    };
  }, [recipes]);

  return enrichedRecipes;
}
