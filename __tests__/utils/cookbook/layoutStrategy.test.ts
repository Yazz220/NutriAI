import { selectRecipeLayoutStrategy } from '../../../supabase/functions/_shared/recipeLayout';

function recipeWithCounts(ingredients: number, steps: number) {
  return {
    ingredientGroups: [{ ingredients: Array.from({ length: ingredients }, () => ({})) }],
    stepGroups: [{ steps: Array.from({ length: steps }, () => ({})) }],
  };
}

describe('automatic recipe layout strategy', () => {
  it('gives sparse recipes a roomy single-column composition', () => {
    expect(selectRecipeLayoutStrategy(recipeWithCounts(3, 3))).toBe('clean-cream');
  });

  it('uses the balanced strategy for standard recipes', () => {
    expect(selectRecipeLayoutStrategy(recipeWithCounts(9, 6))).toBe('ink-sketch');
  });

  it('uses two columns for dense recipes', () => {
    expect(selectRecipeLayoutStrategy(recipeWithCounts(20, 10))).toBe('modern-editorial');
  });
});
