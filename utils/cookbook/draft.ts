import type { ParsedRecipeDraft, StructuredIngredient, StructuredRecipe } from '@/types/cookbook';

export interface RecipeDraftFormValues {
  title: string;
  servings: string;
  ingredients: string;
  steps: string;
}

export function ingredientToLine(ingredient: StructuredIngredient): string {
  return [ingredient.quantity, ingredient.unit, ingredient.name].filter(Boolean).join(' ');
}

export function splitRecipeLines(value: string): string[] {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

export function ingredientsFromText(
  value: string,
  originalIngredients: StructuredIngredient[],
): StructuredIngredient[] {
  const originalLines = originalIngredients.map(ingredientToLine);
  return splitRecipeLines(value).map((line, index) => {
    const original = originalIngredients[index];
    if (original && line === originalLines[index]) {
      return original;
    }
    return { name: line };
  });
}

export function structuredRecipeFromDraft(
  draft: ParsedRecipeDraft,
  values: RecipeDraftFormValues,
  fallbackId = `draft-${Date.now()}`,
): StructuredRecipe {
  return {
    ...draft,
    id: draft.id ?? fallbackId,
    title: values.title.trim(),
    servings: Number(values.servings) || draft.servings || 4,
    ingredients: ingredientsFromText(values.ingredients, draft.ingredients),
    steps: splitRecipeLines(values.steps),
    tags: draft.tags ?? [],
    category: draft.category ?? 'dinner',
  };
}
