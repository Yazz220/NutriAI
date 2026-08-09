import { getCookbookStyle } from '@/constants/cookbookStyles';
import { getRecipeTemplate } from '@/constants/recipeTemplates';
import type {
  Cookbook,
  CookbookPagePromptPayload,
  CookbookStyleId,
  CookbookTheme,
  RecipeTemplateId,
  StructuredRecipe,
} from '@/types/cookbook';

interface BuildPromptInput {
  recipe: StructuredRecipe;
  /**
   * Either a full cookbook (preferred), a style id, or a theme. Whichever is
   * supplied, we resolve it to the matching style preset's prompt descriptor.
   */
  cookbook?: Cookbook | null;
  coverStyle?: CookbookStyleId;
  theme?: CookbookTheme;
  recipeTemplateId?: RecipeTemplateId | string | null;
}

export function buildCookbookPagePromptPayload({
  recipe,
  cookbook,
  coverStyle,
  theme,
  recipeTemplateId,
}: BuildPromptInput): CookbookPagePromptPayload {
  const preset = getCookbookStyle(cookbook?.coverStyle ?? coverStyle ?? null);
  const resolvedTheme: CookbookTheme = theme ?? cookbook?.theme ?? preset.theme;
  const template = getRecipeTemplate(recipeTemplateId);

  return {
    layout: 'single-page-cookbook',
    theme: resolvedTheme,
    template: {
      id: template.id,
      name: template.name,
      styleDescriptor: template.styleDescriptor,
      promptDescriptor: template.promptDescriptor,
    },
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
      'Use the selected page template as the primary visual reference for layout and style.',
      'Apply the template without changing the recipe facts.',
      `Selected page template: ${template.name}.`,
      `Template style: ${template.promptDescriptor}.`,
      `Cookbook cover identity for subtle continuity only: ${preset.pagePromptDescriptor}`,
    ].join(' '),
  };
}
