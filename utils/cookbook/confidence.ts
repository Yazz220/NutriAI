import type { ParsedRecipeDraft, RecipeConfidenceResult } from '@/types/cookbook';

export function scoreParsedRecipeConfidence(recipe: ParsedRecipeDraft): RecipeConfidenceResult {
  const reasons: string[] = [];
  let score = 0;

  if (recipe.title?.trim()) score += 0.2;
  else reasons.push('Missing title');

  if (recipe.ingredients.length >= 3) score += 0.25;
  else reasons.push('Too few ingredients');

  if (recipe.steps.length >= 2) score += 0.25;
  else reasons.push('Missing directions');

  if (recipe.servings && recipe.servings > 0) score += 0.1;
  else reasons.push('Missing servings');

  if (recipe.sourceType === 'url' || recipe.sourceType === 'image') score += 0.1;
  if (recipe.ingredients.every((ingredient) => ingredient.name.trim().length > 0)) score += 0.1;

  const confidence = Math.min(1, Math.round(score * 100) / 100);
  return {
    confidence,
    needsReview: confidence < 0.75,
    reasons,
  };
}
