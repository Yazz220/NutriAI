import { ExternalRecipe } from '@/types/external';
import { CanonicalIngredient, CanonicalRecipe, RecipeProviderType, Meal } from '@/types';

const pickNutrient = (recipe: ExternalRecipe, names: string[]): number | undefined => {
  const list = recipe.nutrition?.nutrients || [];
  const found = list.find(n => names.some(name => n.name.toLowerCase() === name.toLowerCase()));
  return found?.amount;
};

export const toCanonicalFromMeal = (meal: Meal): CanonicalRecipe => {
  return {
    id: `meal:${meal.id}`,
    title: meal.name,
    image: meal.image,
    description: meal.description,
    servings: meal.servings,
    prepTimeMinutes: typeof meal.prepTime === 'number' ? meal.prepTime : undefined,
    cookTimeMinutes: typeof meal.cookTime === 'number' ? meal.cookTime : undefined,
    totalTimeMinutes: undefined,
    ingredients: (meal.ingredients || []).map((i) => ({
      name: i.name,
      amount: typeof i.quantity === 'number' ? i.quantity : undefined,
      unit: i.unit || undefined,
      optional: i.optional,
      original: `${i.quantity ?? ''} ${i.unit ?? ''} ${i.name}`.trim(),
    })),
    steps: meal.steps || [],
    nutritionPerServing: meal.nutritionPerServing ? { ...meal.nutritionPerServing } : undefined,
    source: { providerType: 'custom', providerId: meal.id },
    sourceUrl: meal.sourceUrl,
    tags: meal.tags || [],
  };
};

const mapIngredients = (recipe: ExternalRecipe): CanonicalIngredient[] => {
  const items = recipe.ingredients || [];
  return items.map((i) => ({
    name: i.name,
    amount: typeof i.amount === 'number' ? i.amount : undefined,
    unit: i.unit || undefined,
    original: i.original || i.originalName,
  }));
};

const mapSteps = (recipe: ExternalRecipe): string[] => {
  // Prefer analyzedInstructions if available
  const ai = recipe.analyzedInstructions?.[0]?.steps;
  if (Array.isArray(ai) && ai.length) {
    return ai.map((s: any) => String(s.step)).filter(Boolean);
  }
  // Fallback to plain instructions split
  if (recipe.instructions) {
    const byNewline = recipe.instructions.split('\n').map(s => s.trim()).filter(Boolean);
    if (byNewline.length > 1) return byNewline;
    const byPeriod = recipe.instructions.split(/\.(?!\d)/).map(s => s.trim()).filter(Boolean);
    if (byPeriod.length) return byPeriod;
  }
  return [];
};

export const toCanonicalFromExternal = (
  recipe: ExternalRecipe,
  providerType: RecipeProviderType
): CanonicalRecipe => {
  const prep = typeof recipe.preparationMinutes === 'number' ? recipe.preparationMinutes : undefined;
  const cook = typeof recipe.cookingMinutes === 'number' ? recipe.cookingMinutes : undefined;
  const total = typeof recipe.readyInMinutes === 'number' ? recipe.readyInMinutes : undefined;

  const description = recipe.summary || recipe.instructions || undefined;

  const calories = pickNutrient(recipe, ['Calories', 'Energy']);
  const protein = pickNutrient(recipe, ['Protein']);
  const carbs = pickNutrient(recipe, ['Carbohydrates', 'Carbs']);
  const fats = pickNutrient(recipe, ['Fat', 'Total Fat']);
  const fiber = pickNutrient(recipe, ['Fiber', 'Dietary Fiber']);
  const sugar = pickNutrient(recipe, ['Sugar', 'Sugars']);
  const sodium = pickNutrient(recipe, ['Sodium']);

  return {
    id: `${providerType}:${recipe.id}`,
    title: recipe.title,
    image: recipe.image,
    description,
    servings: recipe.servings,
    prepTimeMinutes: prep,
    cookTimeMinutes: cook,
    totalTimeMinutes: total,
    ingredients: mapIngredients(recipe),
    steps: mapSteps(recipe),
    nutritionPerServing: (calories || protein || carbs || fats || fiber || sugar || sodium)
      ? { calories, protein, carbs, fats, fiber, sugar, sodium }
      : undefined,
    source: { providerType, providerId: String(recipe.id) },
    sourceUrl: recipe.sourceUrl,
    tags: recipe.dishTypes || recipe.diets || [],
  };
};
