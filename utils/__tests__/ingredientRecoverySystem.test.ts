/**
 * Unit tests for ingredient recovery system
 */

import { recoverAndValidateIngredients } from '../ingredientRecoverySystem';

// Mock the AI client
jest.mock('../aiClient', () => ({
  createChatCompletion: jest.fn()
}));

import { createChatCompletion } from '../aiClient';

describe('Ingredient Recovery System', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('recoverAndValidateIngredients', () => {
    test('should find missing ingredients mentioned in instructions', async () => {
      const ingredients = [
        {
          name: 'flour',
          quantity: 2,
          unit: 'cup',
          optional: false,
          confidence: 0.9,
          inferred: false
        },
        {
          name: 'sugar',
          quantity: 1,
          unit: 'cup',
          optional: false,
          confidence: 0.9,
          inferred: false
        }
      ];

      const instructions = [
        'Mix flour and sugar in a bowl',
        'Add salt and pepper to taste',
        'Season with garlic powder',
        'Drizzle with olive oil'
      ];

      const result = await recoverAndValidateIngredients(
        ingredients,
        instructions,
        'Recipe content with flour, sugar, salt, pepper, garlic powder, and olive oil'
      );

      expect(result.missingIngredients.length).toBeGreaterThan(0);
      expect(result.recoveredIngredients.length).toBeGreaterThan(ingredients.length);
      
      const missingNames = result.missingIngredients.map(m => m.name.toLowerCase());
      expect(missingNames).toContain('salt');
      expect(missingNames).toContain('pepper');
    });

    test('should infer quantities for ingredients without them', async () => {
      const ingredients = [
        {
          name: 'salt',
          optional: false,
          confidence: 0.8,
          inferred: false
          // No quantity or unit
        },
        {
          name: 'olive oil',
          optional: false,
          confidence: 0.8,
          inferred: false
          // No quantity or unit
        }
      ];

      const instructions = [
        'Season with salt to taste',
        'Drizzle olive oil over the mixture'
      ];

      const result = await recoverAndValidateIngredients(
        ingredients,
        instructions,
        'Recipe with salt and olive oil',
        { enableQuantityInference: true }
      );

      expect(result.inferredQuantities.length).toBeGreaterThan(0);
      
      const saltIngredient = result.recoveredIngredients.find(ing => ing.name === 'salt');
      expect(saltIngredient?.quantity).toBeDefined();
      expect(saltIngredient?.unit).toBeDefined();
      expect(saltIngredient?.inferred).toBe(true);
    });

    test('should detect consistency issues', async () => {
      const ingredients = [
        {
          name: 'flour',
          quantity: 2,
          unit: 'cup',
          optional: false,
          confidence: 0.9,
          inferred: false
        },
        {
          name: 'unused ingredient',
          quantity: 1,
          unit: 'cup',
          optional: false,
          confidence: 0.9,
          inferred: false
        }
      ];

      const instructions = [
        'Mix the flour with water',
        'Add some mystery ingredient not in the list'
      ];

      const result = await recoverAndValidateIngredients(
        ingredients,
        instructions,
        'Recipe content',
        { enableConsistencyCheck: true }
      );

      expect(result.inconsistencies.length).toBeGreaterThan(0);
      
      const missingInSteps = result.inconsistencies.find(i => i.type === 'missing_in_steps');
      expect(missingInSteps).toBeDefined();
      expect(missingInSteps?.ingredientName).toBe('unused ingredient');
    });

    test('should handle duplicate ingredients', async () => {
      const ingredients = [
        {
          name: 'salt',
          quantity: 1,
          unit: 'tsp',
          optional: false,
          confidence: 0.9,
          inferred: false
        },
        {
          name: 'salt', // Duplicate
          quantity: 0.5,
          unit: 'tsp',
          optional: false,
          confidence: 0.8,
          inferred: false
        }
      ];

      const instructions = ['Season with salt'];

      const result = await recoverAndValidateIngredients(
        ingredients,
        instructions,
        'Recipe with salt'
      );

      const duplicateIssue = result.inconsistencies.find(i => i.type === 'duplicate_ingredient');
      expect(duplicateIssue).toBeDefined();
      expect(duplicateIssue?.ingredientName).toBe('salt');
    });

    test('should use AI for quantity inference when enabled', async () => {
      (createChatCompletion as jest.Mock).mockResolvedValue(JSON.stringify({
        quantity: 2,
        unit: 'tbsp',
        confidence: 0.8,
        reasoning: 'Based on typical recipe proportions'
      }));

      const ingredients = [
        {
          name: 'butter',
          optional: false,
          confidence: 0.8,
          inferred: false
          // No quantity
        }
      ];

      const instructions = ['Melt the butter in a pan'];

      const result = await recoverAndValidateIngredients(
        ingredients,
        instructions,
        'Recipe with butter',
        { useAIForInference: true }
      );

      expect(createChatCompletion).toHaveBeenCalled();
      
      const butterIngredient = result.recoveredIngredients.find(ing => ing.name === 'butter');
      expect(butterIngredient?.quantity).toBe(2);
      expect(butterIngredient?.unit).toBe('tbsp');
    });

    test('should handle AI inference failure gracefully', async () => {
      (createChatCompletion as jest.Mock).mockRejectedValue(new Error('AI service unavailable'));

      const ingredients = [
        {
          name: 'unknown spice',
          optional: false,
          confidence: 0.8,
          inferred: false
        }
      ];

      const instructions = ['Add the unknown spice'];

      const result = await recoverAndValidateIngredients(
        ingredients,
        instructions,
        'Recipe content',
        { useAIForInference: true }
      );

      // Should not throw error, should continue with other methods
      expect(result).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
    });

    test('should respect maxInferredIngredients limit', async () => {
      const ingredients = [
        {
          name: 'flour',
          quantity: 2,
          unit: 'cup',
          optional: false,
          confidence: 0.9,
          inferred: false
        }
      ];

      const instructions = [
        'Mix flour with salt, pepper, garlic powder, onion powder, paprika, oregano, and basil'
      ];

      const result = await recoverAndValidateIngredients(
        ingredients,
        instructions,
        'Recipe content',
        { maxInferredIngredients: 2 }
      );

      expect(result.missingIngredients.length).toBeLessThanOrEqual(2);
    });

    test('should identify optional ingredients correctly', async () => {
      const ingredients = [
        {
          name: 'flour',
          quantity: 2,
          unit: 'cup',
          optional: false,
          confidence: 0.9,
          inferred: false
        }
      ];

      const instructions = [
        'Mix flour with water',
        'Garnish with parsley if desired'
      ];

      const result = await recoverAndValidateIngredients(
        ingredients,
        instructions,
        'Recipe content'
      );

      const parsleyIngredient = result.recoveredIngredients.find(ing => 
        ing.name.toLowerCase().includes('parsley')
      );
      
      if (parsleyIngredient) {
        expect(parsleyIngredient.optional).toBe(true);
      }
    });

    test('should handle ingredient synonyms', async () => {
      const ingredients = [
        {
          name: 'olive oil',
          quantity: 2,
          unit: 'tbsp',
          optional: false,
          confidence: 0.9,
          inferred: false
        }
      ];

      const instructions = [
        'Heat the oil in a pan' // Uses synonym "oil" instead of "olive oil"
      ];

      const result = await recoverAndValidateIngredients(
        ingredients,
        instructions,
        'Recipe content'
      );

      // Should not flag "oil" as missing since "olive oil" is present
      const oilMissing = result.missingIngredients.find(m => 
        m.name.toLowerCase().includes('oil')
      );
      expect(oilMissing).toBeUndefined();
    });

    test('should calculate confidence score appropriately', async () => {
      const ingredients = [
        {
          name: 'flour',
          quantity: 2,
          unit: 'cup',
          optional: false,
          confidence: 0.9,
          inferred: false
        }
      ];

      const instructions = ['Mix flour with water'];

      const result = await recoverAndValidateIngredients(
        ingredients,
        instructions,
        'Simple recipe with flour and water'
      );

      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(typeof result.confidence).toBe('number');
    });

    test('should provide helpful recovery notes', async () => {
      const ingredients = [
        {
          name: 'flour',
          quantity: 2,
          unit: 'cup',
          optional: false,
          confidence: 0.9,
          inferred: false
        }
      ];

      const instructions = [
        'Mix flour with salt',
        'Add pepper to taste'
      ];

      const result = await recoverAndValidateIngredients(
        ingredients,
        instructions,
        'Recipe content'
      );

      expect(result.recoveryNotes.length).toBeGreaterThan(0);
      expect(result.recoveryNotes.some(note => 
        note.includes('missing ingredient')
      )).toBe(true);
    });

    test('should handle empty ingredients list', async () => {
      const result = await recoverAndValidateIngredients(
        [],
        ['Mix some ingredients'],
        'Recipe content'
      );

      expect(result).toBeDefined();
      expect(result.originalIngredients).toHaveLength(0);
      expect(result.confidence).toBeGreaterThan(0);
    });

    test('should handle empty instructions', async () => {
      const ingredients = [
        {
          name: 'flour',
          quantity: 2,
          unit: 'cup',
          optional: false,
          confidence: 0.9,
          inferred: false
        }
      ];

      const result = await recoverAndValidateIngredients(
        ingredients,
        [],
        'Recipe content'
      );

      expect(result).toBeDefined();
      expect(result.recoveredIngredients).toHaveLength(1);
    });

    test('should disable specific recovery features when requested', async () => {
      const ingredients = [
        {
          name: 'flour',
          optional: false,
          confidence: 0.8,
          inferred: false
          // No quantity
        }
      ];

      const instructions = ['Mix flour with salt'];

      const result = await recoverAndValidateIngredients(
        ingredients,
        instructions,
        'Recipe content',
        {
          enableMissingIngredientDetection: false,
          enableQuantityInference: false,
          enableConsistencyCheck: false
        }
      );

      expect(result.missingIngredients).toHaveLength(0);
      expect(result.inferredQuantities).toHaveLength(0);
      expect(result.inconsistencies).toHaveLength(0);
    });
  });

  describe('edge cases and error handling', () => {
    test('should handle malformed ingredient data', async () => {
      const malformedIngredients = [
        {
          name: '',
          quantity: -1,
          unit: null,
          optional: 'maybe', // Wrong type
          confidence: 2, // Out of range
          inferred: 'yes' // Wrong type
        } as any
      ];

      const result = await recoverAndValidateIngredients(
        malformedIngredients,
        ['Cook something'],
        'Recipe content'
      );

      expect(result).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
    });

    test('should handle very long instruction text', async () => {
      const longInstructions = Array(100).fill('Mix ingredients and cook well').map((text, i) => `${i + 1}. ${text}`);

      const result = await recoverAndValidateIngredients(
        [{ name: 'flour', quantity: 1, unit: 'cup', optional: false, confidence: 0.9, inferred: false }],
        longInstructions,
        'Recipe content'
      );

      expect(result).toBeDefined();
    });

    test('should handle special characters in ingredient names', async () => {
      const ingredients = [
        {
          name: 'crème fraîche',
          quantity: 1,
          unit: 'cup',
          optional: false,
          confidence: 0.9,
          inferred: false
        }
      ];

      const instructions = ['Add the crème fraîche'];

      const result = await recoverAndValidateIngredients(
        ingredients,
        instructions,
        'French recipe content'
      );

      expect(result).toBeDefined();
      expect(result.inconsistencies.length).toBe(0);
    });

    test('should handle recovery system failure gracefully', async () => {
      // Force an error by passing invalid data
      const result = await recoverAndValidateIngredients(
        null as any,
        null as any,
        null as any
      );

      expect(result).toBeDefined();
      expect(result.confidence).toBe(0.5);
      expect(result.recoveryNotes.some(note => note.includes('Recovery failed'))).toBe(true);
    });
  });
});