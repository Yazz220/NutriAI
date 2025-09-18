import { InventoryItem, Recipe, Meal, MealIngredient, RecipeAvailability, RecipeWithAvailability } from '@/types';

// Unit conversion mappings for common ingredient units
const UNIT_CONVERSIONS: Record<string, Record<string, number>> = {
  // Weight conversions (to grams)
  'kg': { 'g': 1000, 'kg': 1, 'lb': 2.20462, 'oz': 35.274 },
  'g': { 'g': 1, 'kg': 0.001, 'lb': 0.00220462, 'oz': 0.035274 },
  'lb': { 'g': 453.592, 'kg': 0.453592, 'lb': 1, 'oz': 16 },
  'oz': { 'g': 28.3495, 'kg': 0.0283495, 'lb': 0.0625, 'oz': 1 },
  
  // Volume conversions (to ml)
  'liter': { 'ml': 1000, 'liter': 1, 'cup': 4.22675, 'tbsp': 67.628, 'tsp': 202.884 },
  'l': { 'ml': 1000, 'l': 1, 'liter': 1, 'cup': 4.22675, 'tbsp': 67.628, 'tsp': 202.884 },
  'ml': { 'ml': 1, 'liter': 0.001, 'l': 0.001, 'cup': 0.00422675, 'tbsp': 0.067628, 'tsp': 0.202884 },
  'cup': { 'ml': 236.588, 'liter': 0.236588, 'l': 0.236588, 'cup': 1, 'tbsp': 16, 'tsp': 48 },
  'tbsp': { 'ml': 14.7868, 'liter': 0.0147868, 'l': 0.0147868, 'cup': 0.0625, 'tbsp': 1, 'tsp': 3 },
  'tsp': { 'ml': 4.92892, 'liter': 0.00492892, 'l': 0.00492892, 'cup': 0.0208333, 'tbsp': 0.333333, 'tsp': 1 },
  
  // Count units (no conversion)
  'pcs': { 'pcs': 1, 'pieces': 1, 'piece': 1 },
  'pieces': { 'pcs': 1, 'pieces': 1, 'piece': 1 },
  'piece': { 'pcs': 1, 'pieces': 1, 'piece': 1 },
};

// Normalize unit names to handle variations
const normalizeUnit = (unit: string): string => {
  const normalized = unit.toLowerCase().trim();
  
  // Handle common variations
  const unitMappings: Record<string, string> = {
    'pc': 'pcs',
    'piece': 'pcs',
    'pieces': 'pcs',
    'l': 'liter',
    'litre': 'liter',
    'litres': 'liter',
    'liters': 'liter',
    'gram': 'g',
    'grams': 'g',
    'kilogram': 'kg',
    'kilograms': 'kg',
    'pound': 'lb',
    'pounds': 'lb',
    'ounce': 'oz',
    'ounces': 'oz',
    'tablespoon': 'tbsp',
    'tablespoons': 'tbsp',
    'teaspoon': 'tsp',
    'teaspoons': 'tsp',
    'cups': 'cup',
    'milliliter': 'ml',
    'milliliters': 'ml',
    'millilitre': 'ml',
    'millilitres': 'ml',
  };
  
  return unitMappings[normalized] || normalized;
};

// Convert quantity from one unit to another
const convertQuantity = (quantity: number, fromUnit: string, toUnit: string): number | null => {
  const normalizedFromUnit = normalizeUnit(fromUnit);
  const normalizedToUnit = normalizeUnit(toUnit);
  
  if (normalizedFromUnit === normalizedToUnit) {
    return quantity;
  }
  
  const conversions = UNIT_CONVERSIONS[normalizedFromUnit];
  if (!conversions || !(normalizedToUnit in conversions)) {
    return null; // Cannot convert between these units
  }
  
  return quantity * conversions[normalizedToUnit];
};

// Check if an ingredient name matches (fuzzy matching)
const ingredientNamesMatch = (name1: string, name2: string): boolean => {
  const normalize = (name: string) => name.toLowerCase().trim().replace(/s$/, ''); // Remove plural 's'
  return normalize(name1) === normalize(name2);
};

// Calculate availability for a single recipe
export const calculateRecipeAvailability = (
  recipe: Recipe | Meal,
  inventory: InventoryItem[]
): RecipeAvailability => {
  const ingredients: any[] = 'ingredients' in recipe ? ((recipe as any).ingredients ?? []) : [];
  const totalIngredients = ingredients.filter(ing => !('optional' in ing) || !ing.optional).length;
  
  let availableIngredients = 0;
  const missingIngredients: MealIngredient[] = [];
  const expiringIngredients: MealIngredient[] = [];
  
  // Check each required ingredient
  ingredients.forEach((ingredient: any) => {
    if ('optional' in ingredient && ingredient.optional) return;
    
    // Find matching inventory item
    const inventoryItem = inventory.find(item => 
      ingredientNamesMatch(item.name, ingredient.name)
    );
    
    if (!inventoryItem) {
      missingIngredients.push(ingredient);
      return;
    }
    
    // Try to convert units and check quantity
    const convertedQuantity = convertQuantity(
      inventoryItem.quantity,
      inventoryItem.unit,
      ingredient.unit
    );
    
    if (convertedQuantity === null) {
      // Cannot convert units, assume available if inventory item exists
      availableIngredients++;
      
      // Expiration tracking removed
    } else if (convertedQuantity >= ingredient.quantity) {
      availableIngredients++;
      
      // Expiration tracking removed
    } else {
      // Not enough quantity
      missingIngredients.push({
        ...ingredient,
        quantity: ingredient.quantity - convertedQuantity
      });
    }
  });
  
  const availabilityPercentage = totalIngredients > 0 
    ? Math.round((availableIngredients / totalIngredients) * 100)
    : 100;
  
  return {
    recipeId: String((recipe as any).id),
    availableIngredients,
    totalIngredients,
    availabilityPercentage,
    missingIngredients,
    expiringIngredients,
  };
};

// Calculate availability for multiple recipes
export const calculateMultipleRecipeAvailability = (
  recipes: (Recipe | Meal)[],
  inventory: InventoryItem[]
): RecipeWithAvailability[] => {
  return recipes.map(recipe => ({
    ...recipe,
    availability: calculateRecipeAvailability(recipe, inventory)
  }));
};

// Sort recipes by availability and other criteria
export const sortRecipesByAvailability = (
  recipesWithAvailability: RecipeWithAvailability[],
  sortBy: 'availability' | 'expiring' | 'prepTime' | 'name' = 'availability'
): RecipeWithAvailability[] => {
  return [...recipesWithAvailability].sort((a, b) => {
    switch (sortBy) {
      case 'availability':
        // Sort by availability percentage (descending), then by number of expiring ingredients (descending)
        if (a.availability.availabilityPercentage !== b.availability.availabilityPercentage) {
          return b.availability.availabilityPercentage - a.availability.availabilityPercentage;
        }
        return b.availability.expiringIngredients.length - a.availability.expiringIngredients.length;
      
      case 'expiring':
        // Expiration removed; fallback to availability sort
        return b.availability.availabilityPercentage - a.availability.availabilityPercentage;
      
      case 'prepTime':
        const aPrepTime = typeof (a as any).prepTime === 'number' ? (a as any).prepTime : 0;
        const bPrepTime = typeof (b as any).prepTime === 'number' ? (b as any).prepTime : 0;
        return aPrepTime - bPrepTime;
      
      case 'name':
        return a.name.localeCompare(b.name);
      
      default:
        return 0;
    }
  });
};

// Filter recipes by availability criteria
export const filterRecipesByAvailability = (
  recipesWithAvailability: RecipeWithAvailability[],
  filterType: 'all' | 'canMakeNow' | 'missingFew',
  maxMissingIngredients: number = 3
): RecipeWithAvailability[] => {
  switch (filterType) {
    case 'canMakeNow':
      return recipesWithAvailability.filter(recipe => 
        recipe.availability.availabilityPercentage === 100
      );
    
    case 'missingFew':
      return recipesWithAvailability.filter(recipe => 
        recipe.availability.missingIngredients.length > 0 && 
        recipe.availability.missingIngredients.length <= maxMissingIngredients
      );
    
    case 'all':
    default:
      return recipesWithAvailability;
  }
};

// Get recipes that use expiring ingredients
export const getRecipesUsingExpiringIngredients = (
  recipesWithAvailability: RecipeWithAvailability[]
): RecipeWithAvailability[] => {
  // Expiration removed; return empty list or simply return all
  return [];
};

// Calculate total missing ingredients for multiple recipes (for shopping list generation)
export const calculateTotalMissingIngredients = (
  recipesWithAvailability: RecipeWithAvailability[]
): MealIngredient[] => {
  const ingredientMap = new Map<string, MealIngredient>();
  
  recipesWithAvailability.forEach(recipe => {
    recipe.availability.missingIngredients.forEach(ingredient => {
      const key = `${ingredient.name.toLowerCase()}-${ingredient.unit.toLowerCase()}`;
      
      if (ingredientMap.has(key)) {
        const existing = ingredientMap.get(key)!;
        existing.quantity += ingredient.quantity;
      } else {
        ingredientMap.set(key, { ...ingredient });
      }
    });
  });
  
  return Array.from(ingredientMap.values());
};