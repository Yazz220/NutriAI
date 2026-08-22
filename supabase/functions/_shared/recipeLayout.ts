export type RecipeLayoutStrategy = 'clean-cream' | 'ink-sketch' | 'modern-editorial';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function countNestedItems(graph: Record<string, unknown>, groupsKey: string, itemsKey: string): number {
  const groups = graph[groupsKey];
  if (!Array.isArray(groups)) return 0;
  return groups.reduce(
    (sum, group) => sum + (isRecord(group) && Array.isArray(group[itemsKey]) ? group[itemsKey].length : 0),
    0,
  );
}

export function selectRecipeLayoutStrategy(graph: unknown): RecipeLayoutStrategy {
  const recipe = isRecord(graph) ? graph : {};
  const ingredientCount = countNestedItems(recipe, 'ingredientGroups', 'ingredients');
  const stepCount = countNestedItems(recipe, 'stepGroups', 'steps');

  if (ingredientCount <= 5 && stepCount <= 4) return 'clean-cream';
  if (ingredientCount <= 12 && stepCount <= 8) return 'ink-sketch';
  return 'modern-editorial';
}
