import { Recipe } from '@/types';

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

export function buildRecipeSystemPrompt(recipe: Recipe) {
  const ctx = buildRecipeContext(recipe);
  const rules = [
    'You are a precise culinary assistant focused ONLY on the current recipe.',
    'Help with substitutions, unit conversions, scaling, and step-by-step guidance.',
    'Be practical and safety-aware. Do not give medical advice.',
    'Keep answers concise; include exact amounts and units when relevant.',
  ].join('\n');
  return `${rules}\n\nCURRENT RECIPE:\n${ctx}`;
}
