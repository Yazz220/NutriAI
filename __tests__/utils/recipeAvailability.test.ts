import {
  calculateRecipeAvailability,
  filterRecipesByAvailability,
  sortRecipesByAvailability,
  calculateTotalMissingIngredients,
} from '@/utils/recipeAvailability';
import { InventoryItem, Recipe } from '@/types';

const makeInventory = (items: Array<{ name: string; quantity: number; unit: string }>): InventoryItem[] =>
  items.map((it, i) => ({
    id: `inv-${i}`,
    name: it.name,
    quantity: it.quantity,
    unit: it.unit,
    category: 'Pantry' as const,
    addedDate: new Date().toISOString(),
  }));

const makeRecipe = (id: string, ingredients: Array<{ name: string; quantity: number; unit: string; optional?: boolean }>): Recipe =>
  ({
    id,
    name: `Recipe ${id}`,
    ingredients: ingredients.map((ing) => ({
      name: ing.name,
      quantity: ing.quantity,
      unit: ing.unit,
      ...(ing.optional ? { optional: true } : {}),
    })),
  } as unknown as Recipe);

describe('calculateRecipeAvailability', () => {
  it('returns 100% when all ingredients are in inventory', () => {
    const inventory = makeInventory([
      { name: 'Flour', quantity: 500, unit: 'g' },
      { name: 'Sugar', quantity: 200, unit: 'g' },
    ]);
    const recipe = makeRecipe('1', [
      { name: 'Flour', quantity: 250, unit: 'g' },
      { name: 'Sugar', quantity: 100, unit: 'g' },
    ]);

    const result = calculateRecipeAvailability(recipe, inventory);
    expect(result.availabilityPercentage).toBe(100);
    expect(result.missingIngredients).toHaveLength(0);
  });

  it('reports missing ingredients', () => {
    const inventory = makeInventory([{ name: 'Flour', quantity: 500, unit: 'g' }]);
    const recipe = makeRecipe('2', [
      { name: 'Flour', quantity: 250, unit: 'g' },
      { name: 'Butter', quantity: 100, unit: 'g' },
    ]);

    const result = calculateRecipeAvailability(recipe, inventory);
    expect(result.availabilityPercentage).toBe(50);
    expect(result.missingIngredients).toHaveLength(1);
    expect(result.missingIngredients[0].name).toBe('Butter');
  });

  it('skips optional ingredients in percentage calculation', () => {
    const inventory = makeInventory([{ name: 'Flour', quantity: 500, unit: 'g' }]);
    const recipe = makeRecipe('3', [
      { name: 'Flour', quantity: 250, unit: 'g' },
      { name: 'Vanilla', quantity: 1, unit: 'tsp', optional: true },
    ]);

    const result = calculateRecipeAvailability(recipe, inventory);
    expect(result.availabilityPercentage).toBe(100);
  });

  it('handles unit conversion (kg → g)', () => {
    const inventory = makeInventory([{ name: 'Flour', quantity: 1, unit: 'kg' }]);
    const recipe = makeRecipe('4', [{ name: 'Flour', quantity: 500, unit: 'g' }]);

    const result = calculateRecipeAvailability(recipe, inventory);
    expect(result.availabilityPercentage).toBe(100);
  });

  it('reports partial quantity as missing difference', () => {
    const inventory = makeInventory([{ name: 'Flour', quantity: 100, unit: 'g' }]);
    const recipe = makeRecipe('5', [{ name: 'Flour', quantity: 250, unit: 'g' }]);

    const result = calculateRecipeAvailability(recipe, inventory);
    expect(result.availabilityPercentage).toBe(0);
    expect(result.missingIngredients[0].quantity).toBe(150);
  });

  it('returns 100% for recipe with no ingredients', () => {
    const result = calculateRecipeAvailability(makeRecipe('6', []), []);
    expect(result.availabilityPercentage).toBe(100);
  });
});

describe('filterRecipesByAvailability', () => {
  const inventory = makeInventory([{ name: 'Flour', quantity: 500, unit: 'g' }]);
  const r1 = makeRecipe('a', [{ name: 'Flour', quantity: 100, unit: 'g' }]);
  const r2 = makeRecipe('b', [{ name: 'Flour', quantity: 100, unit: 'g' }, { name: 'Milk', quantity: 1, unit: 'cup' }]);
  const recipes = [r1, r2].map((r) => ({
    ...r,
    availability: calculateRecipeAvailability(r, inventory),
  }));

  it('filters canMakeNow', () => {
    const filtered = filterRecipesByAvailability(recipes, 'canMakeNow');
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('a');
  });

  it('filters missingFew', () => {
    const filtered = filterRecipesByAvailability(recipes, 'missingFew');
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('b');
  });

  it('returns all for "all"', () => {
    expect(filterRecipesByAvailability(recipes, 'all')).toHaveLength(2);
  });
});

describe('sortRecipesByAvailability', () => {
  const inventory = makeInventory([{ name: 'Flour', quantity: 500, unit: 'g' }]);
  const full = makeRecipe('full', [{ name: 'Flour', quantity: 100, unit: 'g' }]);
  const partial = makeRecipe('partial', [
    { name: 'Flour', quantity: 100, unit: 'g' },
    { name: 'Milk', quantity: 1, unit: 'cup' },
  ]);
  const recipes = [partial, full].map((r) => ({
    ...r,
    availability: calculateRecipeAvailability(r, inventory),
  }));

  it('sorts by availability descending', () => {
    const sorted = sortRecipesByAvailability(recipes, 'availability');
    expect(sorted[0].id).toBe('full');
    expect(sorted[1].id).toBe('partial');
  });
});

describe('calculateTotalMissingIngredients', () => {
  it('aggregates missing ingredients across recipes', () => {
    const inventory = makeInventory([]);
    const r1 = makeRecipe('x', [{ name: 'Milk', quantity: 1, unit: 'cup' }]);
    const r2 = makeRecipe('y', [{ name: 'Milk', quantity: 2, unit: 'cup' }]);
    const recipes = [r1, r2].map((r) => ({
      ...r,
      availability: calculateRecipeAvailability(r, inventory),
    }));

    const missing = calculateTotalMissingIngredients(recipes);
    expect(missing).toHaveLength(1);
    expect(missing[0].name).toBe('Milk');
    expect(missing[0].quantity).toBe(3);
  });
});
