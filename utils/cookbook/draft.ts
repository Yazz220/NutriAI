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

    if (original) {
      const originalPrefix = [original.quantity, original.unit].filter(Boolean).join(' ');
      if (originalPrefix && line.startsWith(`${originalPrefix} `)) {
        return { ...original, name: line.slice(originalPrefix.length + 1).trim() };
      }

      const lowerLine = line.toLowerCase();
      const lowerName = original.name.toLowerCase();
      if (lowerLine.endsWith(lowerName)) {
        const prefix = line.slice(0, line.length - original.name.length).trim();
        if (prefix) {
          if (original.unit && prefix.toLowerCase().endsWith(original.unit.toLowerCase())) {
            const quantity = prefix.slice(0, prefix.length - original.unit.length).trim();
            return { ...original, quantity: quantity || undefined };
          }
          if (!original.unit) return { ...original, quantity: prefix };
        }
      }
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
