import type { CookbookPagePromptPayload, CookbookTheme, StructuredRecipe } from '@/types/cookbook';

interface BuildPromptInput {
  recipe: StructuredRecipe;
  theme: CookbookTheme;
}

export function buildCookbookPagePromptPayload({
  recipe,
  theme,
}: BuildPromptInput): CookbookPagePromptPayload {
  return {
    layout: 'single-page-cookbook',
    theme,
    recipe: {
      title: recipe.title,
      servings: recipe.servings,
      prepTime: recipe.prepTime,
      cookTime: recipe.cookTime,
      ingredients: recipe.ingredients.map((ingredient) =>
        [ingredient.quantity, ingredient.unit, ingredient.name].filter(Boolean).join(' '),
      ),
      steps: recipe.steps,
    },
    instructions: [
      'Create one portrait recipe cookbook page.',
      'Readable recipe text is required.',
      'Use the supplied title, ingredients, directions, servings, and timing exactly.',
      'Keep the structure consistent: title, timing/servings, ingredients, directions, food visual.',
      'Apply the cookbook visual style without changing the recipe facts.',
      `Cookbook style: ${theme.prompt}`,
    ].join(' '),
  };
}
