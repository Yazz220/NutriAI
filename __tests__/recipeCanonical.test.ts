import { toCanonicalFromExternal, toCanonicalFromMeal } from '../utils/recipeCanonical';
import { Meal } from '../types';

describe('recipeCanonical normalizers', () => {
  test('toCanonicalFromExternal maps core fields, steps, ingredients, and nutrition', () => {
    const external: any = {
      id: 123,
      title: 'Test Pasta',
      image: undefined,
      summary: 'Delicious test pasta',
      servings: 4,
      preparationMinutes: 10,
      cookingMinutes: 20,
      readyInMinutes: 35,
      ingredients: [
        { name: 'Pasta', amount: 200, unit: 'g', original: '200g Pasta' },
        { name: 'Salt', amount: 1, unit: 'tsp', original: '1 tsp salt' },
      ],
      analyzedInstructions: [
        { steps: [{ step: 'Boil water.' }, { step: 'Cook pasta.' }] },
      ],
      nutrition: { nutrients: [
        { name: 'Calories', amount: 500 },
        { name: 'Protein', amount: 20 },
      ]},
      sourceUrl: 'https://example.com/pasta',
      dishTypes: ['main course'],
    };

    const canonical = toCanonicalFromExternal(external, 'mealdb');
    expect(canonical.title).toBe('Test Pasta');
    expect(canonical.image).toBeUndefined();
    expect(canonical.servings).toBe(4);
    expect(canonical.prepTimeMinutes).toBe(10);
    expect(canonical.cookTimeMinutes).toBe(20);
    expect(canonical.totalTimeMinutes).toBe(35);
    expect(canonical.ingredients.length).toBe(2);
    expect(canonical.steps).toEqual(['Boil water.', 'Cook pasta.']);
    expect(canonical.nutritionPerServing?.calories).toBe(500);
    expect(canonical.nutritionPerServing?.protein).toBe(20);
    expect(canonical.source).toBeDefined();
    expect(canonical.source!.providerType).toBe('mealdb');
    expect(canonical.sourceUrl).toBe('https://example.com/pasta');
    expect(Array.isArray(canonical.tags)).toBe(true);
  });

  test('toCanonicalFromMeal maps Meal to CanonicalRecipe', () => {
    const meal: Meal = {
      id: 'm1',
      name: 'Local Salad',
      image: undefined,
      description: 'Crisp and fresh',
      servings: 2,
      prepTime: 5,
      cookTime: 0,
      ingredients: [
        { name: 'Lettuce', quantity: 1, unit: 'head', optional: false },
        { name: 'Olive Oil', quantity: 1, unit: 'tbsp', optional: true },
      ],
      steps: ['Wash lettuce', 'Dress and serve'],
      nutritionPerServing: { calories: 150, protein: 3 },
      sourceUrl: 'https://local.example.com/salad',
      tags: ['salad'],
    } as any;

    const canonical = toCanonicalFromMeal(meal);
    expect(canonical.id).toBe('meal:m1');
    expect(canonical.title).toBe('Local Salad');
    expect(canonical.ingredients[0].name).toBe('Lettuce');
    expect(canonical.steps.length).toBe(2);
    expect(canonical.nutritionPerServing?.calories).toBe(150);
    expect(canonical.sourceUrl).toContain('salad');
  });
});
