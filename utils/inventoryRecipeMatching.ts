import { InventoryItem } from '@/types';
import { ExternalRecipe } from '@/types/external';
import { Meal } from '@/types';

// Types for recipe availability analysis
export interface RecipeAvailability {
  recipeId: string | number;
  availableIngredients: number;
  totalIngredients: number;
  availabilityPercentage: number;
  missingIngredients: MissingIngredient[];
  expiringIngredients: ExpiringIngredient[]; // kept in type for compatibility but will be empty
  canCookNow: boolean;
  urgencyScore: number; // will be 0 with expiration removed
  recommendationReason: string;
}

export interface MissingIngredient {
  name: string;
  requiredQuantity: number;
  requiredUnit: string;
  availableQuantity: number;
  shortfall: number;
  estimatedCost?: number;
}

export interface ExpiringIngredient {
  name: string;
  quantity: number;
  unit: string;
  expiryDate: string;
  daysUntilExpiry: number;
  freshnessStatus: 'fresh' | 'aging' | 'expiring';
}

export interface IngredientMatch {
  inventoryItem: InventoryItem;
  recipeIngredient: any;
  isAvailable: boolean;
  quantityMatch: 'sufficient' | 'partial' | 'insufficient';
  conversionFactor?: number;
}

// Unit conversion utilities
const UNIT_CONVERSIONS: Record<string, Record<string, number>> = {
  // Weight conversions (to grams)
  weight: {
    'g': 1,
    'gram': 1,
    'grams': 1,
    'kg': 1000,
    'kilogram': 1000,
    'kilograms': 1000,
    'lb': 453.592,
    'pound': 453.592,
    'pounds': 453.592,
    'oz': 28.3495,
    'ounce': 28.3495,
    'ounces': 28.3495,
  },
  // Volume conversions (to milliliters)
  volume: {
    'ml': 1,
    'milliliter': 1,
    'milliliters': 1,
    'l': 1000,
    'liter': 1000,
    'liters': 1000,
    'cup': 236.588,
    'cups': 236.588,
    'tbsp': 14.7868,
    'tablespoon': 14.7868,
    'tablespoons': 14.7868,
    'tsp': 4.92892,
    'teaspoon': 4.92892,
    'teaspoons': 4.92892,
    'fl oz': 29.5735,
    'fluid ounce': 29.5735,
    'fluid ounces': 29.5735,
  },
  // Count conversions
  count: {
    'pcs': 1,
    'piece': 1,
    'pieces': 1,
    'pc': 1,
    'item': 1,
    'items': 1,
    'unit': 1,
    'units': 1,
  }
};

function getUnitType(unit: string): 'weight' | 'volume' | 'count' | 'unknown' {
  const normalizedUnit = unit.toLowerCase().trim();
  
  if (UNIT_CONVERSIONS.weight[normalizedUnit]) return 'weight';
  if (UNIT_CONVERSIONS.volume[normalizedUnit]) return 'volume';
  if (UNIT_CONVERSIONS.count[normalizedUnit]) return 'count';
  
  return 'unknown';
}

function convertToBaseUnit(quantity: number, unit: string): { quantity: number; baseUnit: string } {
  const unitType = getUnitType(unit);
  const normalizedUnit = unit.toLowerCase().trim();
  
  switch (unitType) {
    case 'weight':
      return {
        quantity: quantity * UNIT_CONVERSIONS.weight[normalizedUnit],
        baseUnit: 'g'
      };
    case 'volume':
      return {
        quantity: quantity * UNIT_CONVERSIONS.volume[normalizedUnit],
        baseUnit: 'ml'
      };
    case 'count':
      return {
        quantity: quantity * UNIT_CONVERSIONS.count[normalizedUnit],
        baseUnit: 'pcs'
      };
    default:
      return { quantity, baseUnit: unit };
  }
}

function normalizeIngredientName(name: string): string {
  return name.toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '') // Remove special characters
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/\b(fresh|dried|chopped|sliced|diced|minced|ground)\b/g, '') // Remove common modifiers
    .trim();
}

function findInventoryMatch(recipeIngredientName: string, inventory: InventoryItem[]): InventoryItem | null {
  const normalizedRecipeName = normalizeIngredientName(recipeIngredientName);
  
  // Try exact match first
  let match = inventory.find(item => 
    normalizeIngredientName(item.name) === normalizedRecipeName
  );
  
  if (match) return match;
  
  // Try partial matches
  match = inventory.find(item => {
    const normalizedInventoryName = normalizeIngredientName(item.name);
    return normalizedInventoryName.includes(normalizedRecipeName) || 
           normalizedRecipeName.includes(normalizedInventoryName);
  });
  
  if (match) return match;
  
  // Try fuzzy matching for common ingredient variations
  const commonVariations: Record<string, string[]> = {
    'chicken': ['chicken breast', 'chicken thigh', 'chicken leg'],
    'tomato': ['tomatoes', 'cherry tomatoes', 'roma tomatoes'],
    'onion': ['onions', 'yellow onion', 'white onion', 'red onion'],
    'garlic': ['garlic cloves', 'garlic powder'],
    'cheese': ['cheddar cheese', 'mozzarella cheese', 'parmesan cheese'],
  };
  
  for (const [base, variations] of Object.entries(commonVariations)) {
    if (normalizedRecipeName.includes(base)) {
      match = inventory.find(item => {
        const normalizedInventoryName = normalizeIngredientName(item.name);
        return variations.some(variation => 
          normalizedInventoryName.includes(variation) || variation.includes(normalizedInventoryName)
        );
      });
      if (match) return match;
    }
  }
  
  return null;
}

export function calculateRecipeAvailability(
  recipe: ExternalRecipe | Meal, 
  inventory: InventoryItem[]
): RecipeAvailability {
  const recipeId = 'id' in recipe ? recipe.id : (recipe as any).id;
  const ingredients = 'ingredients' in recipe ? recipe.ingredients : [];
  
  if (!ingredients || ingredients.length === 0) {
    return {
      recipeId,
      availableIngredients: 0,
      totalIngredients: 0,
      availabilityPercentage: 0,
      missingIngredients: [],
      expiringIngredients: [],
      canCookNow: false,
      urgencyScore: 0,
      recommendationReason: 'No ingredients specified'
    };
  }

  const matches: IngredientMatch[] = [];
  const missingIngredients: MissingIngredient[] = [];
  const expiringIngredients: ExpiringIngredient[] = [];
  
  let availableCount = 0;
  let urgencyScore = 0;

  for (const recipeIngredient of ingredients) {
    const ingredientName =
      (recipeIngredient as any)?.name ?? (recipeIngredient as any)?.original ?? '';
    
    const requiredQuantity = (recipeIngredient as any)?.amount ?? (recipeIngredient as any)?.quantity ?? 0;
    const requiredUnit = (recipeIngredient as any)?.unit ?? 'unit';
    
    const inventoryMatch = findInventoryMatch(ingredientName, inventory);
    
    if (!inventoryMatch) {
      missingIngredients.push({
        name: ingredientName,
        requiredQuantity,
        requiredUnit,
        availableQuantity: 0,
        shortfall: requiredQuantity
      });
      continue;
    }

    // App doesn't use quantities - if ingredient exists in inventory, it's available
    const isAvailable = true;
    availableCount++;
    
    matches.push({
      inventoryItem: inventoryMatch,
      recipeIngredient,
      isAvailable,
      quantityMatch: 'sufficient'
    });
  }

  const totalIngredients = ingredients.length;
  const availabilityPercentage = totalIngredients > 0 ? Math.round((availableCount / totalIngredients) * 100) : 0;
  const canCookNow = availabilityPercentage === 100;
  
  // Generate recommendation reason
  let recommendationReason = '';
  if (canCookNow) {
    if (expiringIngredients.length > 0) {
      recommendationReason = `Perfect timing! You have all ingredients and ${expiringIngredients.length} are expiring soon.`;
    } else {
      recommendationReason = 'You have all ingredients needed for this recipe!';
    }
  } else if (availabilityPercentage >= 75) {
    recommendationReason = `Almost ready! You have ${availabilityPercentage}% of ingredients.`;
  } else {
    recommendationReason = `You have ${availabilityPercentage}% of ingredients available.`;
  }

  return {
    recipeId,
    availableIngredients: availableCount,
    totalIngredients,
    availabilityPercentage,
    missingIngredients,
    expiringIngredients,
    canCookNow,
    urgencyScore,
    recommendationReason
  };
}

export function findRecipesForIngredients(
  ingredients: string[], 
  recipes: (ExternalRecipe | Meal)[]
): (ExternalRecipe | Meal)[] {
  const normalizedSearchIngredients = ingredients.map(normalizeIngredientName);
  
  return recipes.filter(recipe => {
    const recipeIngredients = 'ingredients' in recipe ? (recipe as any).ingredients : [];
    
    if (!recipeIngredients || recipeIngredients.length === 0) return false;
    
    // Check if recipe contains any of the search ingredients
    return recipeIngredients.some((recipeIngredient: any) => {
      const ingredientName =
        (recipeIngredient as any)?.name ?? (recipeIngredient as any)?.original ?? '';
      
      const normalizedRecipeName = normalizeIngredientName(ingredientName);
      
      return normalizedSearchIngredients.some(searchIngredient =>
        normalizedRecipeName.includes(searchIngredient) || 
        searchIngredient.includes(normalizedRecipeName)
      );
    });
  }).sort((a, b) => {
    // Sort by number of matching ingredients (descending)
    const aMatches = countMatchingIngredients(a, normalizedSearchIngredients);
    const bMatches = countMatchingIngredients(b, normalizedSearchIngredients);
    return bMatches - aMatches;
  });
}

function countMatchingIngredients(recipe: ExternalRecipe | Meal, searchIngredients: string[]): number {
  const recipeIngredients = 'ingredients' in recipe ? recipe.ingredients : [];
  if (!recipeIngredients) return 0;
  
  let matches = 0;
  for (const recipeIngredient of recipeIngredients as any[]) {
    const ingredientName =
      (recipeIngredient as any)?.name ?? (recipeIngredient as any)?.original ?? '';
    
    const normalizedRecipeName = normalizeIngredientName(ingredientName);
    
    if (searchIngredients.some(searchIngredient =>
      normalizedRecipeName.includes(searchIngredient) || 
      searchIngredient.includes(normalizedRecipeName)
    )) {
      matches++;
    }
  }
  return matches;
}

export function getExpiringIngredientRecipes(
  inventory: InventoryItem[], 
  recipes: (ExternalRecipe | Meal)[]
): Array<{ recipe: ExternalRecipe | Meal; availability: RecipeAvailability }> {
  // Expiration logic removed; return empty set
  return [];
}

export function getRecipesWithAvailability(
  recipes: (ExternalRecipe | Meal)[],
  inventory: InventoryItem[]
): Array<{ recipe: ExternalRecipe | Meal; availability: RecipeAvailability }> {
  return recipes
    .map(recipe => ({
      recipe,
      availability: calculateRecipeAvailability(recipe, inventory)
    }))
    .sort((a, b) => {
      // Prioritize recipes that can be cooked now
      if (a.availability.canCookNow && !b.availability.canCookNow) return -1;
      if (!a.availability.canCookNow && b.availability.canCookNow) return 1;
      
      // Then sort by availability percentage
      if (a.availability.availabilityPercentage !== b.availability.availabilityPercentage) {
        return b.availability.availabilityPercentage - a.availability.availabilityPercentage;
      }
      
      // Finally sort by urgency score (expiring ingredients)
      return b.availability.urgencyScore - a.availability.urgencyScore;
    });
}

// Utility function to get ingredient suggestions for shopping
export function getShoppingSuggestions(availability: RecipeAvailability): string[] {
  return availability.missingIngredients.map(ingredient => {
    if (ingredient.availableQuantity > 0) {
      const needed = ingredient.shortfall;
      return `${ingredient.name} (need ${needed} ${ingredient.requiredUnit} more)`;
    }
    return `${ingredient.name} (${ingredient.requiredQuantity} ${ingredient.requiredUnit})`;
  });
}

// Utility function to format availability for display
export function formatAvailabilityStatus(availability: RecipeAvailability): string {
  if (availability.canCookNow) {
    return 'Ready to cook!';
  }
  
  const missing = availability.missingIngredients.length;
  return `${availability.availabilityPercentage}% available (${missing} ingredient${missing !== 1 ? 's' : ''} needed)`;
}