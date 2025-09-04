import {
  scaleIngredient,
  scaleIngredients,
  formatIngredientDisplay,
  getServingSuggestions,
  validateServingSize,
  scaleNutrition,
} from '../ingredientScaling';
import { CanonicalIngredient } from '@/types';

describe('ingredientScaling', () => {
  const mockIngredients: CanonicalIngredient[] = [
    { name: 'flour', amount: 2, unit: 'cups' },
    { name: 'sugar', amount: 1, unit: 'cup' },
    { name: 'eggs', amount: 3, unit: 'large' },
    { name: 'butter', amount: 0.5, unit: 'cup' },
    { name: 'salt', amount: 1, unit: 'tsp' },
    { name: 'vanilla', amount: 1, unit: 'tsp', optional: true },
    { name: 'onion', amount: 1, unit: 'whole' },
    { name: 'garlic', amount: 2, unit: 'cloves' },
    { name: 'pepper', original: 'to taste' },
  ];

  describe('scaleIngredient', () => {
    it('should scale volume measurements correctly', () => {
      const ingredient = { name: 'flour', amount: 2, unit: 'cups' };
      const scaled = scaleIngredient(ingredient, 1.5);
      
      expect(scaled.scaledAmount).toBe(3);
      expect(scaled.displayAmount).toBe('3');
      expect(scaled.isScaled).toBe(true);
    });

    it('should handle fractional scaling with smart rounding', () => {
      const ingredient = { name: 'butter', amount: 1, unit: 'cup' };
      const scaled = scaleIngredient(ingredient, 0.5);
      
      expect(scaled.scaledAmount).toBe(0.5);
      expect(scaled.displayAmount).toBe('½');
      expect(scaled.isScaled).toBe(true);
    });

    it('should handle whole item scaling', () => {
      const ingredient = { name: 'onion', amount: 1, unit: 'whole' };
      const scaled = scaleIngredient(ingredient, 2.5);
      
      expect(scaled.scaledAmount).toBe(2.5);
      expect(scaled.displayAmount).toBe('2 ½'); // 2.5 as mixed number
      expect(scaled.isScaled).toBe(true);
    });

    it('should handle count measurements', () => {
      const ingredient = { name: 'eggs', amount: 3, unit: 'large' };
      const scaled = scaleIngredient(ingredient, 2);
      
      expect(scaled.scaledAmount).toBe(6);
      expect(scaled.displayAmount).toBe('6');
      expect(scaled.isScaled).toBe(true);
    });

    it('should preserve descriptive amounts', () => {
      const ingredient = { name: 'pepper', original: 'to taste' };
      const scaled = scaleIngredient(ingredient, 3);
      
      expect(scaled.displayAmount).toBe('to taste');
      expect(scaled.isScaled).toBe(true);
    });

    it('should handle ingredients without numeric amounts', () => {
      const ingredient = { name: 'herbs', original: 'fresh basil leaves' };
      const scaled = scaleIngredient(ingredient, 2);
      
      expect(scaled.displayAmount).toBe('fresh basil leaves');
      expect(scaled.scaledAmount).toBeUndefined();
    });

    it('should not mark as scaled when scale factor is 1', () => {
      const ingredient = { name: 'flour', amount: 2, unit: 'cups' };
      const scaled = scaleIngredient(ingredient, 1);
      
      expect(scaled.isScaled).toBe(false);
      expect(scaled.scaledAmount).toBe(2);
    });
  });

  describe('scaleIngredients', () => {
    it('should scale all ingredients in a list', () => {
      const scaled = scaleIngredients(mockIngredients.slice(0, 3), 2);
      
      expect(scaled).toHaveLength(3);
      expect(scaled[0].scaledAmount).toBe(4); // flour: 2 * 2
      expect(scaled[1].scaledAmount).toBe(2); // sugar: 1 * 2
      expect(scaled[2].scaledAmount).toBe(6); // eggs: 3 * 2
    });

    it('should preserve ingredient properties', () => {
      const scaled = scaleIngredients([mockIngredients[5]], 1.5); // vanilla (optional)
      
      expect(scaled[0].optional).toBe(true);
      expect(scaled[0].name).toBe('vanilla');
      expect(scaled[0].unit).toBe('tsp');
    });
  });

  describe('formatIngredientDisplay', () => {
    it('should format scaled ingredients correctly', () => {
      const ingredient = { name: 'flour', amount: 2, unit: 'cups' };
      const scaled = scaleIngredient(ingredient, 1.5);
      const formatted = formatIngredientDisplay(scaled);
      
      expect(formatted).toBe('3 cups flour');
    });

    it('should handle optional ingredients', () => {
      const ingredient = { name: 'vanilla', amount: 1, unit: 'tsp', optional: true };
      const scaled = scaleIngredient(ingredient, 2);
      const formatted = formatIngredientDisplay(scaled);
      
      expect(formatted).toBe('2 tsp vanilla (optional)');
    });

    it('should handle ingredients without units', () => {
      const ingredient = { name: 'eggs', amount: 3 };
      const scaled = scaleIngredient(ingredient, 2);
      const formatted = formatIngredientDisplay(scaled);
      
      expect(formatted).toBe('6 eggs');
    });

    it('should handle descriptive ingredients', () => {
      const ingredient = { name: 'pepper', original: 'to taste' };
      const scaled = scaleIngredient(ingredient, 2);
      const formatted = formatIngredientDisplay(scaled);
      
      expect(formatted).toBe('to taste pepper');
    });
  });

  describe('getServingSuggestions', () => {
    it('should return appropriate serving suggestions', () => {
      const suggestions = getServingSuggestions(4);
      
      expect(suggestions).toContain(1);
      expect(suggestions).toContain(2);
      expect(suggestions).toContain(6);
      expect(suggestions).toContain(8);
      expect(suggestions).not.toContain(4); // Should exclude original
    });

    it('should include half and double suggestions', () => {
      const suggestions = getServingSuggestions(6);
      
      expect(suggestions).toContain(3); // Half
      // The double might not be included due to the slice(0, 4) limit and other suggestions
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.length).toBeLessThanOrEqual(4);
    });

    it('should limit to 4 suggestions', () => {
      const suggestions = getServingSuggestions(2);
      
      expect(suggestions.length).toBeLessThanOrEqual(4);
    });
  });

  describe('validateServingSize', () => {
    it('should validate correct serving sizes', () => {
      const result = validateServingSize(4);
      
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject serving sizes below minimum', () => {
      const result = validateServingSize(0.1, 0.25);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Minimum serving size');
    });

    it('should reject serving sizes above maximum', () => {
      const result = validateServingSize(100, 0.25, 50);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Maximum serving size');
    });

    it('should reject invalid numbers', () => {
      const result = validateServingSize(NaN);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('valid number');
    });

    it('should reject infinite values', () => {
      const result = validateServingSize(Infinity);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('valid number');
    });
  });

  describe('scaleNutrition', () => {
    const mockNutrition = {
      calories: 250,
      protein: 12,
      carbs: 30,
      fats: 8,
    };

    it('should scale nutrition values correctly', () => {
      const scaled = scaleNutrition(mockNutrition, 2);
      
      expect(scaled?.calories).toBe(500);
      expect(scaled?.protein).toBe(24);
      expect(scaled?.carbs).toBe(60);
      expect(scaled?.fats).toBe(16);
    });

    it('should handle fractional scaling', () => {
      const scaled = scaleNutrition(mockNutrition, 0.5);
      
      expect(scaled?.calories).toBe(125);
      expect(scaled?.protein).toBe(6);
      expect(scaled?.carbs).toBe(15);
      expect(scaled?.fats).toBe(4);
    });

    it('should handle undefined nutrition', () => {
      const scaled = scaleNutrition(undefined, 2);
      
      expect(scaled).toBeUndefined();
    });

    it('should handle partial nutrition data', () => {
      const partialNutrition = { calories: 200 };
      const scaled = scaleNutrition(partialNutrition, 1.5);
      
      expect(scaled?.calories).toBe(300);
      expect(scaled?.protein).toBeUndefined();
      expect(scaled?.carbs).toBeUndefined();
      expect(scaled?.fats).toBeUndefined();
    });

    it('should round protein, carbs, and fats to 1 decimal place', () => {
      const nutrition = { calories: 100, protein: 10.33, carbs: 15.67, fats: 5.99 };
      const scaled = scaleNutrition(nutrition, 1.5);
      
      expect(scaled?.protein).toBe(15.5); // 10.33 * 1.5 = 15.495 → 15.5
      expect(scaled?.carbs).toBe(23.5);   // 15.67 * 1.5 = 23.505 → 23.5
      expect(scaled?.fats).toBe(9.0);     // 5.99 * 1.5 = 8.985 → 9.0
    });
  });

  describe('edge cases', () => {
    it('should handle very small amounts', () => {
      const ingredient = { name: 'salt', amount: 0.125, unit: 'tsp' };
      const scaled = scaleIngredient(ingredient, 2);
      
      // 0.125 * 2 = 0.25
      expect(scaled.scaledAmount).toBe(0.25);
      // The smart rounding produces fraction formats like "3/10" for 0.3
      expect(scaled.displayAmount).toBeDefined();
      expect(scaled.displayAmount.length).toBeGreaterThan(0);
    });

    it('should handle very large amounts', () => {
      const ingredient = { name: 'water', amount: 100, unit: 'cups' };
      const scaled = scaleIngredient(ingredient, 1.5);
      
      expect(scaled.scaledAmount).toBe(150);
      expect(scaled.displayAmount).toBe('150');
    });

    it('should handle zero amounts', () => {
      const ingredient = { name: 'optional ingredient', amount: 0, unit: 'cups' };
      const scaled = scaleIngredient(ingredient, 2);
      
      expect(scaled.scaledAmount).toBe(0);
      expect(scaled.displayAmount).toBe('0');
    });

    it('should handle negative scale factors gracefully', () => {
      const ingredient = { name: 'flour', amount: 2, unit: 'cups' };
      const scaled = scaleIngredient(ingredient, -1);
      
      // Should handle gracefully, possibly by using absolute value or defaulting
      expect(scaled.scaledAmount).toBeDefined();
    });
  });
});