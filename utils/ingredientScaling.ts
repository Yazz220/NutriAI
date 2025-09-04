import { CanonicalIngredient } from '@/types';

/**
 * Smart ingredient scaling utility that handles different measurement types
 * and provides intelligent rounding for practical cooking
 */

interface ScaledIngredient extends CanonicalIngredient {
  scaledAmount?: number;
  displayAmount: string;
  isScaled: boolean;
  originalAmount?: number;
}

/**
 * Common measurement units and their scaling behavior
 */
const MEASUREMENT_TYPES = {
  // Volume measurements - scale linearly
  volume: ['cup', 'cups', 'tbsp', 'tablespoon', 'tablespoons', 'tsp', 'teaspoon', 'teaspoons', 
           'ml', 'milliliter', 'milliliters', 'l', 'liter', 'liters', 'fl oz', 'fluid ounce', 'fluid ounces',
           'pint', 'pints', 'quart', 'quarts', 'gallon', 'gallons'],
  
  // Weight measurements - scale linearly
  weight: ['g', 'gram', 'grams', 'kg', 'kilogram', 'kilograms', 'oz', 'ounce', 'ounces', 
           'lb', 'lbs', 'pound', 'pounds'],
  
  // Count measurements - scale linearly but round to whole numbers
  count: ['piece', 'pieces', 'pcs', 'pc', 'item', 'items', 'clove', 'cloves', 'slice', 'slices',
          'strip', 'strips', 'leaf', 'leaves', 'sprig', 'sprigs'],
  
  // Whole items - special handling for fractional scaling
  whole: ['whole', 'entire', 'large', 'medium', 'small', 'can', 'cans', 'jar', 'jars', 
          'package', 'packages', 'bag', 'bags', 'box', 'boxes'],
  
  // Descriptive amounts - minimal scaling
  descriptive: ['pinch', 'pinches', 'dash', 'dashes', 'splash', 'splashes', 'handful', 'handfuls',
                'to taste', 'as needed', 'optional']
};

/**
 * Fraction conversion utilities
 */
const COMMON_FRACTIONS: Record<number, string> = {
  0.125: '⅛',
  0.25: '¼', 
  0.333: '⅓',
  0.375: '⅜',
  0.5: '½',
  0.625: '⅝',
  0.667: '⅔',
  0.75: '¾',
  0.875: '⅞',
};

/**
 * Convert decimal to fraction string for display
 */
function decimalToFraction(decimal: number, tolerance: number = 0.01): string {
  // Check for common fractions first
  for (const [value, fraction] of Object.entries(COMMON_FRACTIONS)) {
    if (Math.abs(decimal - parseFloat(value)) < tolerance) {
      return fraction;
    }
  }
  
  // For other fractions, use simple fraction conversion
  if (decimal < 1) {
    // Try common denominators
    const denominators = [2, 3, 4, 5, 6, 8, 10, 12, 16];
    for (const denom of denominators) {
      const numerator = Math.round(decimal * denom);
      if (Math.abs((numerator / denom) - decimal) < tolerance && numerator > 0) {
        return `${numerator}/${denom}`;
      }
    }
  }
  
  return decimal.toString();
}

/**
 * Smart rounding based on the magnitude of the number
 */
function smartRound(value: number): number {
  if (value < 0.1) return Math.round(value * 100) / 100; // 2 decimal places
  if (value < 1) return Math.round(value * 10) / 10;     // 1 decimal place
  if (value < 10) return Math.round(value * 4) / 4;      // Quarter precision
  if (value < 100) return Math.round(value * 2) / 2;     // Half precision
  return Math.round(value);                              // Whole numbers
}

/**
 * Determine measurement type from unit string
 */
function getMeasurementType(unit?: string): keyof typeof MEASUREMENT_TYPES | 'unknown' {
  if (!unit) return 'count';
  
  const unitLower = unit.toLowerCase().trim();
  
  for (const [type, units] of Object.entries(MEASUREMENT_TYPES)) {
    if (units.some(u => unitLower.includes(u) || u.includes(unitLower))) {
      return type as keyof typeof MEASUREMENT_TYPES;
    }
  }
  
  return 'unknown';
}

/**
 * Format scaled amount for display with intelligent rounding and fraction conversion
 */
function formatScaledAmount(
  originalAmount: number, 
  scaleFactor: number, 
  unit?: string,
  measurementType?: keyof typeof MEASUREMENT_TYPES | 'unknown'
): string {
  const scaledValue = originalAmount * scaleFactor;
  const type = measurementType || getMeasurementType(unit);
  
  // Handle different measurement types
  switch (type) {
    case 'descriptive':
      // Don't scale descriptive amounts much
      if (scaleFactor > 2) return `${Math.ceil(scaleFactor)} times the amount`;
      return originalAmount.toString();
    
    case 'count':
    case 'whole':
      // Round to sensible whole numbers or fractions
      const rounded = smartRound(scaledValue);
      if (rounded < 1 && rounded > 0) {
        return decimalToFraction(rounded);
      }
      if (rounded !== Math.floor(rounded) && rounded < 10) {
        const whole = Math.floor(rounded);
        const fraction = rounded - whole;
        const fractionStr = decimalToFraction(fraction);
        return whole > 0 ? `${whole} ${fractionStr}` : fractionStr;
      }
      return Math.round(rounded).toString();
    
    case 'volume':
    case 'weight':
      // Use smart rounding for measurements
      const smartRounded = smartRound(scaledValue);
      if (smartRounded < 1 && smartRounded > 0) {
        return decimalToFraction(smartRounded);
      }
      if (smartRounded !== Math.floor(smartRounded)) {
        const whole = Math.floor(smartRounded);
        const fraction = smartRounded - whole;
        const fractionStr = decimalToFraction(fraction);
        return whole > 0 ? `${whole} ${fractionStr}` : fractionStr;
      }
      return smartRounded.toString();
    
    default:
      // Unknown units - use conservative rounding
      return smartRound(scaledValue).toString();
  }
}

/**
 * Scale a single ingredient with intelligent formatting
 */
export function scaleIngredient(
  ingredient: CanonicalIngredient, 
  scaleFactor: number
): ScaledIngredient {
  const originalAmount = typeof ingredient.amount === 'number' ? ingredient.amount : 1;
  const measurementType = getMeasurementType(ingredient.unit);
  const isScaled = Math.abs(scaleFactor - 1) > 0.01;
  
  let displayAmount: string;
  let scaledAmount: number | undefined;
  
  if (typeof ingredient.amount === 'number') {
    scaledAmount = originalAmount * scaleFactor;
    displayAmount = formatScaledAmount(originalAmount, scaleFactor, ingredient.unit, measurementType);
  } else {
    // No numeric amount, just return original
    displayAmount = ingredient.original || ingredient.name;
  }
  
  return {
    ...ingredient,
    scaledAmount,
    displayAmount,
    isScaled,
    originalAmount,
  };
}

/**
 * Scale all ingredients in a recipe
 */
export function scaleIngredients(
  ingredients: CanonicalIngredient[], 
  scaleFactor: number
): ScaledIngredient[] {
  return ingredients.map(ingredient => scaleIngredient(ingredient, scaleFactor));
}

/**
 * Format ingredient for display with proper scaling
 */
export function formatIngredientDisplay(scaledIngredient: ScaledIngredient): string {
  const parts: string[] = [];
  
  // Add scaled amount
  if (scaledIngredient.displayAmount && scaledIngredient.displayAmount !== scaledIngredient.name) {
    parts.push(scaledIngredient.displayAmount);
  }
  
  // Add unit if present and not already in display amount
  if (scaledIngredient.unit && !scaledIngredient.displayAmount.includes(scaledIngredient.unit)) {
    parts.push(scaledIngredient.unit);
  }
  
  // Add ingredient name
  parts.push(scaledIngredient.name);
  
  // Add optional indicator
  if (scaledIngredient.optional) {
    parts.push('(optional)');
  }
  
  return parts.join(' ');
}

/**
 * Get scaling suggestions based on common serving sizes
 */
export function getServingSuggestions(originalServings: number): number[] {
  const suggestions = [1, 2, 4, 6, 8, 12];
  
  // Filter out the original serving size and add some relative suggestions
  const filtered = suggestions.filter(s => s !== originalServings);
  
  // Add some relative suggestions
  if (originalServings > 1) {
    filtered.push(Math.ceil(originalServings / 2)); // Half
  }
  if (originalServings < 12) {
    filtered.push(originalServings * 2); // Double
  }
  
  // Sort and remove duplicates
  return [...new Set(filtered)].sort((a, b) => a - b).slice(0, 4);
}

/**
 * Validate serving size input
 */
export function validateServingSize(
  servings: number, 
  minServings: number = 0.25, 
  maxServings: number = 50
): { isValid: boolean; error?: string } {
  if (isNaN(servings) || !isFinite(servings)) {
    return { isValid: false, error: 'Please enter a valid number' };
  }
  
  if (servings < minServings) {
    return { isValid: false, error: `Minimum serving size is ${minServings}` };
  }
  
  if (servings > maxServings) {
    return { isValid: false, error: `Maximum serving size is ${maxServings}` };
  }
  
  return { isValid: true };
}

/**
 * Calculate nutrition scaling
 */
export function scaleNutrition(
  nutrition: { calories?: number; protein?: number; carbs?: number; fats?: number } | undefined,
  scaleFactor: number
): typeof nutrition {
  if (!nutrition) return undefined;
  
  return {
    calories: nutrition.calories ? Math.round(nutrition.calories * scaleFactor) : undefined,
    protein: nutrition.protein ? Math.round(nutrition.protein * scaleFactor * 10) / 10 : undefined,
    carbs: nutrition.carbs ? Math.round(nutrition.carbs * scaleFactor * 10) / 10 : undefined,
    fats: nutrition.fats ? Math.round(nutrition.fats * scaleFactor * 10) / 10 : undefined,
  };
}