import { getCookbookStyle } from '@/constants/cookbookStyles';
import type {
  Cookbook,
  CookbookPagePromptPayload,
  CookbookStyleId,
  CookbookTheme,
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
}

export function buildCookbookPagePromptPayload({
  recipe,
  cookbook,
  coverStyle,
  theme,
}: BuildPromptInput): CookbookPagePromptPayload {
  const preset = getCookbookStyle(cookbook?.coverStyle ?? coverStyle ?? null);
  const resolvedTheme: CookbookTheme = theme ?? cookbook?.theme ?? preset.theme;

  return {
    layout: 'single-page-cookbook',
    theme: resolvedTheme,
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
      `Cookbook style: ${preset.pagePromptDescriptor}`,
    ].join(' '),
  };
}
