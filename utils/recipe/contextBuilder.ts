import { Recipe } from '@/types';
import { AIProfileContext, buildSafetyWarningsPrompt, containsAllergen, violatesDietaryRestriction } from '@/utils/ai/profileContextBuilder';
import { buildRecipeChefPrompt } from '@/utils/recipeChefPrompt';

export function buildRecipeContext(recipe: Recipe) {
  const ing = (recipe.ingredients || [])
    .map((i) => `- ${i?.quantity ?? ''} ${i?.unit ?? ''} ${i?.name ?? ''}`.trim())
    .filter(Boolean)
    .join('\n');
  const stepsArr = Array.isArray((recipe as any).instructions) ? (recipe as any).instructions as string[] : [];
  const steps = stepsArr.map((s, i) => `${i + 1}. ${s}`).join('\n');
  const lines: string[] = [];
  lines.push(`TITLE: ${recipe.name}`);
  if (recipe.servings) lines.push(`SERVINGS: ${recipe.servings}`);
  if ('prepTime' in recipe && recipe.prepTime) lines.push(`PREP: ${recipe.prepTime}`);
  if ('cookTime' in recipe && (recipe as any).cookTime) lines.push(`COOK: ${(recipe as any).cookTime}`);
  if (Array.isArray(recipe.tags) && recipe.tags.length) lines.push(`TAGS: ${recipe.tags.join(', ')}`);
  lines.push('\nINGREDIENTS:\n' + (ing || 'n/a'));
  lines.push('\nSTEPS:\n' + (steps || 'n/a'));
  return lines.join('\n');
}

export function buildRecipeSystemPrompt(recipe: Recipe, userContext?: AIProfileContext) {
  const ctx = buildRecipeContext(recipe);
  const chefPrompt = buildRecipeChefPrompt(userContext);
  
  // Add safety analysis if user context provided
  let safetyAnalysis = '';
  if (userContext && (userContext.allergies.length > 0 || userContext.dietaryRestriction)) {
    const issues: string[] = [];
    
    recipe.ingredients.forEach(ing => {
      const allergen = containsAllergen(ing.name, userContext.allergies);
      if (allergen) {
        issues.push(`⚠️ CONTAINS ${allergen.toUpperCase()} - user is allergic!`);
      }
      
      const violation = violatesDietaryRestriction(ing.name, userContext.dietaryRestriction);
      if (violation) {
        issues.push(`⚠️ Contains ${violation} - conflicts with ${userContext.dietaryRestriction} diet`);
      }
    });
    
    if (issues.length > 0) {
      safetyAnalysis = `\n\nSAFETY ALERTS FOR THIS RECIPE:\n${issues.join('\n')}\n→ Proactively suggest safe substitutes in your responses`;
    }
  }
  
  return `${chefPrompt}\n\nCURRENT RECIPE:\n${ctx}${safetyAnalysis}`;
}
