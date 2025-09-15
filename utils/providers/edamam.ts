import { CanonicalRecipe } from '../../types';

// Clean slate stubs: keep signatures, do not perform external calls
export async function edamamSearchRecipes(_params: { q: string; from?: number; to?: number }) {
  return [] as any[];
}

export async function edamamAnalyzeNutrition(_recipe: CanonicalRecipe) {
  return { notModified: true } as const;
}
