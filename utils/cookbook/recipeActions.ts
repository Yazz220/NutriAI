import type { IngredientGroup, RecipeGraph } from '@/types/recipeGraph';

export type RecipeActionKind = 'scale-servings' | 'substitute-ingredient' | 'patch';
export type RecipeActionCommitMode = 'session' | 'update' | 'new-version';

export interface RecipeActionProposal {
  kind: RecipeActionKind;
  title: string;
  summary: string;
  changes: string[];
  original: RecipeGraph;
  proposed: RecipeGraph;
}

export function proposeServingScale(
  graph: RecipeGraph,
  targetServings: number,
): RecipeActionProposal {
  if (!Number.isInteger(targetServings) || targetServings < 1 || targetServings > 100) {
    throw new Error('Serving count must be between 1 and 100');
  }
  if (!graph.servings || graph.servings < 1) {
    throw new Error('This recipe does not have a numeric serving count to scale from');
  }

  const ratio = targetServings / graph.servings;
  const ingredientGroups: IngredientGroup[] = graph.ingredientGroups.map((group) => ({
    ...group,
    ingredients: group.ingredients.map((ingredient) => ({
      ...ingredient,
      originalQuantity: ingredient.originalQuantity ?? ingredient.quantity,
      quantity: scaleQuantity(ingredient.quantity, ratio),
    })),
  }));
  const changedIngredients = ingredientGroups.reduce(
    (count, group, groupIndex) => count + group.ingredients.filter(
      (ingredient, ingredientIndex) => (
        ingredient.quantity !== graph.ingredientGroups[groupIndex].ingredients[ingredientIndex].quantity
      ),
    ).length,
    0,
  );

  return {
    kind: 'scale-servings',
    title: `Make it for ${targetServings}`,
    summary: `${graph.servings} servings to ${targetServings}`,
    changes: [
      `${changedIngredients} ingredient ${changedIngredients === 1 ? 'quantity' : 'quantities'} recalculated`,
      'Artwork stays unchanged',
    ],
    original: graph,
    proposed: {
      ...graph,
      servings: targetServings,
      yieldText: `${targetServings} servings`,
      ingredientGroups,
    },
  };
}

export function proposeIngredientSubstitution(
  graph: RecipeGraph,
  args: {
    ingredientName: string;
    substituteName: string;
    substituteQuantity?: string;
    substituteUnit?: string;
    reason?: string;
  },
): RecipeActionProposal {
  const target = args.ingredientName.trim().toLowerCase();
  let replacementCount = 0;
  const ingredientGroups = graph.ingredientGroups.map((group) => ({
    ...group,
    ingredients: group.ingredients.map((ingredient) => {
      if (!ingredient.name.toLowerCase().includes(target)) return ingredient;
      replacementCount += 1;
      return {
        ...ingredient,
        name: args.substituteName,
        quantity: args.substituteQuantity ?? ingredient.quantity,
        unit: args.substituteUnit ?? ingredient.unit,
      };
    }),
  }));

  if (replacementCount === 0) {
    throw new Error(`${args.ingredientName} was not found in this recipe`);
  }

  return {
    kind: 'substitute-ingredient',
    title: `Use ${args.substituteName}`,
    summary: `${args.ingredientName} to ${args.substituteName}`,
    changes: [
      `${replacementCount} ingredient ${replacementCount === 1 ? 'entry' : 'entries'} changed`,
      ...(args.reason ? [args.reason] : []),
      'Artwork stays unchanged',
    ],
    original: graph,
    proposed: { ...graph, ingredientGroups },
  };
}

export function proposeGraphPatch(
  graph: RecipeGraph,
  operations: Array<{ path: string; value: unknown }>,
): RecipeActionProposal {
  if (operations.length === 0) throw new Error('No recipe changes were supplied');
  const proposed = structuredCloneGraph(graph);
  operations.forEach((operation) => applyPatch(proposed, operation.path, operation.value));

  return {
    kind: 'patch',
    title: operations.length === 1 ? 'Review recipe change' : 'Review recipe changes',
    summary: `${operations.length} proposed ${operations.length === 1 ? 'change' : 'changes'}`,
    changes: [
      ...operations.slice(0, 4).map((operation) => describePath(operation.path)),
      ...(operations.length > 4 ? [`${operations.length - 4} more changes`] : []),
      'Artwork stays unchanged',
    ],
    original: graph,
    proposed,
  };
}

function scaleQuantity(quantity: string | undefined, ratio: number): string | undefined {
  if (!quantity) return undefined;
  const parsed = parseQuantity(quantity);
  if (parsed === null) return quantity;
  return formatQuantity(Math.round(parsed * ratio * 100) / 100);
}

function parseQuantity(value: string): number | null {
  const normalized = value.trim();
  const mixed = normalized.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]);
  const fraction = normalized.match(/^(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/);
  if (fraction && Number(fraction[2]) !== 0) return Number(fraction[1]) / Number(fraction[2]);
  const range = normalized.match(/^(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)$/);
  if (range) return Number(range[1]);
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatQuantity(value: number): string {
  if (Number.isInteger(value)) return String(value);
  const whole = Math.floor(value);
  const remainder = value - whole;
  const fractions: Array<[number, string]> = [
    [0.25, '1/4'],
    [1 / 3, '1/3'],
    [0.5, '1/2'],
    [2 / 3, '2/3'],
    [0.75, '3/4'],
  ];
  const match = fractions.find(([fraction]) => Math.abs(remainder - fraction) < 0.02);
  if (match) return whole > 0 ? `${whole} ${match[1]}` : match[1];
  return value.toFixed(2).replace(/\.?0+$/, '');
}

function structuredCloneGraph(graph: RecipeGraph): RecipeGraph {
  return JSON.parse(JSON.stringify(graph)) as RecipeGraph;
}

function applyPatch(target: RecipeGraph, path: string, value: unknown): void {
  const segments = path.split('/').filter(Boolean).map(decodePointerSegment);
  if (segments.length === 0) throw new Error('Recipe patch path cannot be empty');

  let current: unknown = target;
  for (const segment of segments.slice(0, -1)) {
    if (Array.isArray(current)) {
      const index = parseArrayIndex(segment, current.length);
      current = current[index];
    } else if (current && typeof current === 'object' && segment in current) {
      current = (current as Record<string, unknown>)[segment];
    } else {
      throw new Error(`Recipe patch path does not exist: ${path}`);
    }
  }

  const finalSegment = segments[segments.length - 1];
  if (Array.isArray(current)) {
    const index = parseArrayIndex(finalSegment, current.length);
    if (value === null) current.splice(index, 1);
    else current[index] = value;
    return;
  }
  if (!current || typeof current !== 'object' || !(finalSegment in current)) {
    throw new Error(`Recipe patch path does not exist: ${path}`);
  }
  if (value === null) delete (current as Record<string, unknown>)[finalSegment];
  else (current as Record<string, unknown>)[finalSegment] = value;
}

function parseArrayIndex(segment: string, length: number): number {
  const index = Number(segment);
  if (!Number.isInteger(index) || index < 0 || index >= length) {
    throw new Error(`Recipe patch index is out of range: ${segment}`);
  }
  return index;
}

function decodePointerSegment(segment: string): string {
  return segment.replace(/~1/g, '/').replace(/~0/g, '~');
}

function describePath(path: string): string {
  const label = path.split('/').filter(Boolean).at(-1) ?? 'recipe';
  return `${label.replace(/([a-z])([A-Z])/g, '$1 $2')} updated`;
}
