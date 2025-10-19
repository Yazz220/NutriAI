/**
 * Type definitions for imported recipes
 */

export interface ImportedIngredient {
  name: string;
  original: string;
  amount?: number;
  unit?: string;
}

export interface ImportedInstruction {
  step: number;
  text: string;
}

export interface ImportedNutrition {
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
}

export interface ImportedRecipe {
  id: string;
  title: string;
  description?: string;
  image?: string;
  source: string;
  sourceType: 'web' | 'text' | 'image' | 'video';
  sourceUrl?: string;
  ingredients: ImportedIngredient[];
  instructions: ImportedInstruction[];
  prepTime?: number; // in minutes
  cookTime?: number; // in minutes  
  totalTime?: number; // in minutes
  servings?: number;
  nutrition?: ImportedNutrition;
  categories?: string[];
  tags?: string[];
  createdAt: string;
  updatedAt?: string;
}

/**
 * Convert ImportedRecipe to ExternalRecipe format
 */
export function toExternalRecipe(imported: ImportedRecipe): any {
  return {
    id: Date.now(), // Generate numeric ID
    title: imported.title,
    image: imported.image || '',
    servings: imported.servings || 4,
    readyInMinutes: imported.totalTime || 0,
    preparationMinutes: imported.prepTime,
    cookingMinutes: imported.cookTime,
    sourceUrl: imported.sourceUrl || imported.source,
    instructions: imported.instructions.map(i => i.text).join('\n'),
    ingredients: imported.ingredients.map(ing => ({
      name: ing.name,
      original: ing.original,
      amount: ing.amount || 0,
      unit: ing.unit || '',
    })),
    nutrition: imported.nutrition ? {
      nutrients: [
        imported.nutrition.calories && {
          name: 'Calories',
          amount: imported.nutrition.calories,
          unit: 'kcal',
        },
        imported.nutrition.protein && {
          name: 'Protein',
          amount: imported.nutrition.protein,
          unit: 'g',
        },
        imported.nutrition.carbs && {
          name: 'Carbohydrates', 
          amount: imported.nutrition.carbs,
          unit: 'g',
        },
        imported.nutrition.fat && {
          name: 'Fat',
          amount: imported.nutrition.fat,
          unit: 'g',
        },
      ].filter(Boolean),
    } : undefined,
    summary: imported.description,
  };
}
