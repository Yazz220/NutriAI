/**
 * Unit tests for AI recipe parser
 */

import { parseRecipeWithAI, validateRecipeConsistency } from '../aiRecipeParser';

// Mock the AI client
jest.mock('../aiClient', () => ({
  createChatCompletion: jest.fn()
}));

import { createChatCompletion } from '../aiClient';

describe('AI Recipe Parser', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('parseRecipeWithAI', () => {
    test('should parse a complete recipe successfully', async () => {
      const mockResponse = JSON.stringify({
        title: 'Chocolate Chip Cookies',
        description: 'Delicious homemade cookies',
        ingredients: [
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
          },
          {
            name: 'chocolate chips',
            quantity: 1,
            unit: 'cup',
            optional: false,
            confidence: 0.8,
            inferred: false
          }
        ],
        instructions: [
          'Preheat oven to 350°F',
          'Mix flour and sugar in a bowl',
          'Add chocolate chips and mix well',
          'Bake for 12 minutes'
        ],
        prepTime: 15,
        cookTime: 12,
        servings: 24,
        difficulty: 'easy',
        cuisine: 'American',
        tags: ['dessert', 'cookies', 'baking'],
        confidence: 0.9
      });

      (createChatCompletion as jest.Mock).mockResolvedValue(mockResponse);

      const recipeContent = `
        Chocolate Chip Cookies
        
        Ingredients:
        - 2 cups flour
        - 1 cup sugar
        - 1 cup chocolate chips
        
        Instructions:
        1. Preheat oven to 350°F
        2. Mix flour and sugar in a bowl
        3. Add chocolate chips and mix well
        4. Bake for 12 minutes
        
        Prep time: 15 minutes
        Cook time: 12 minutes
        Serves: 24 cookies
      `;

      const result = await parseRecipeWithAI(recipeContent, { useMultiStage: false });

      expect(result.title).toBe('Chocolate Chip Cookies');
      expect(result.ingredients).toHaveLength(3);
      expect(result.instructions).toHaveLength(4);
      expect(result.prepTime).toBe(15);
      expect(result.cookTime).toBe(12);
      expect(result.servings).toBe(24);
      expect(result.confidence).toBe(0.9);
    });

    test('should handle multi-stage parsing', async () => {
      // Mock responses for each stage
      const initialParseResponse = JSON.stringify({
        title: 'Pasta Recipe',
        ingredients: [
          { name: 'pasta', quantity: 1, unit: 'lb', optional: false, confidence: 0.8, inferred: false }
        ],
        instructions: ['Cook pasta'],
        confidence: 0.7
      });

      const enhancedIngredientsResponse = JSON.stringify([
        { name: 'pasta', quantity: 1, unit: 'lb', optional: false, confidence: 0.9, inferred: false },
        { name: 'salt', quantity: 1, unit: 'tsp', optional: false, confidence: 0.7, inferred: true }
      ]);

      const validatedInstructionsResponse = JSON.stringify([
        'Boil water with salt',
        'Add pasta and cook for 8-10 minutes',
        'Drain and serve'
      ]);

      const finalValidationResponse = JSON.stringify({
        title: 'Pasta Recipe',
        ingredients: [
          { name: 'pasta', quantity: 1, unit: 'lb', optional: false, confidence: 0.9, inferred: false },
          { name: 'salt', quantity: 1, unit: 'tsp', optional: false, confidence: 0.7, inferred: true }
        ],
        instructions: [
          'Boil water with salt',
          'Add pasta and cook for 8-10 minutes',
          'Drain and serve'
        ],
        prepTime: 5,
        cookTime: 10,
        servings: 4,
        tags: ['pasta', 'quick'],
        confidence: 0.8
      });

      (createChatCompletion as jest.Mock)
        .mockResolvedValueOnce(initialParseResponse)
        .mockResolvedValueOnce(enhancedIngredientsResponse)
        .mockResolvedValueOnce(validatedInstructionsResponse)
        .mockResolvedValueOnce(finalValidationResponse);

      const result = await parseRecipeWithAI('Simple pasta recipe', { useMultiStage: true });

      expect(result.title).toBe('Pasta Recipe');
      expect(result.ingredients).toHaveLength(2);
      expect(result.instructions).toHaveLength(3);
      expect(result.confidence).toBe(0.8);
      expect(createChatCompletion).toHaveBeenCalledTimes(4);
    });

    test('should handle JSON extraction from code fences', async () => {
      const mockResponse = `Here's the recipe:

\`\`\`json
{
  "title": "Test Recipe",
  "ingredients": [
    {"name": "test ingredient", "quantity": 1, "unit": "cup", "optional": false, "confidence": 0.8, "inferred": false}
  ],
  "instructions": ["Test instruction"],
  "confidence": 0.8
}
\`\`\`

That's the extracted recipe.`;

      (createChatCompletion as jest.Mock).mockResolvedValue(mockResponse);

      const result = await parseRecipeWithAI('test content', { useMultiStage: false });

      expect(result.title).toBe('Test Recipe');
      expect(result.ingredients).toHaveLength(1);
      expect(result.instructions).toHaveLength(1);
    });

    test('should handle malformed JSON gracefully', async () => {
      const mockResponse = 'This is not valid JSON at all';

      (createChatCompletion as jest.Mock).mockResolvedValue(mockResponse);

      await expect(parseRecipeWithAI('test content', { useMultiStage: false }))
        .rejects.toThrow('Failed to parse AI response as valid JSON');
    });

    test('should retry on failure', async () => {
      (createChatCompletion as jest.Mock)
        .mockRejectedValueOnce(new Error('API Error'))
        .mockResolvedValueOnce(JSON.stringify({
          title: 'Retry Recipe',
          ingredients: [
            { name: 'ingredient', quantity: 1, unit: 'cup', optional: false, confidence: 0.8, inferred: false }
          ],
          instructions: ['instruction'],
          confidence: 0.8
        }));

      const result = await parseRecipeWithAI('test content', { 
        useMultiStage: false, 
        maxRetries: 1 
      });

      expect(result.title).toBe('Retry Recipe');
      expect(createChatCompletion).toHaveBeenCalledTimes(2);
    });

    test('should fail after max retries', async () => {
      (createChatCompletion as jest.Mock)
        .mockRejectedValue(new Error('Persistent API Error'));

      await expect(parseRecipeWithAI('test content', { 
        useMultiStage: false, 
        maxRetries: 1 
      })).rejects.toThrow('Recipe parsing failed after 2 attempts');

      expect(createChatCompletion).toHaveBeenCalledTimes(2);
    });

    test('should validate minimum requirements', async () => {
      const mockResponse = JSON.stringify({
        title: 'Invalid Recipe',
        ingredients: [], // Empty ingredients
        instructions: ['Some instruction'],
        confidence: 0.8
      });

      (createChatCompletion as jest.Mock).mockResolvedValue(mockResponse);

      await expect(parseRecipeWithAI('test content', { useMultiStage: false }))
        .rejects.toThrow('Recipe must have at least one ingredient');
    });

    test('should normalize recipe data', async () => {
      const mockResponse = JSON.stringify({
        title: 'Test Recipe',
        ingredients: [
          {
            name: 'flour',
            quantity: 'invalid', // Invalid quantity type
            unit: 'cup',
            optional: 'yes', // Should be boolean
            confidence: 1.5, // Should be clamped to 1.0
            inferred: 'false' // Should be boolean
          }
        ],
        instructions: ['Valid instruction', '', '   '], // Empty/whitespace instructions
        prepTime: -5, // Negative time
        servings: 0, // Invalid servings
        difficulty: 'invalid', // Invalid difficulty
        tags: ['valid', '', null, 'another'], // Mixed valid/invalid tags
        confidence: 0.8
      });

      (createChatCompletion as jest.Mock).mockResolvedValue(mockResponse);

      const result = await parseRecipeWithAI('test content', { useMultiStage: false });

      expect(result.ingredients[0].quantity).toBeUndefined();
      expect(result.ingredients[0].optional).toBe(false);
      expect(result.ingredients[0].confidence).toBe(1.0);
      expect(result.ingredients[0].inferred).toBe(false);
      expect(result.instructions).toHaveLength(1);
      expect(result.prepTime).toBeUndefined();
      expect(result.servings).toBeUndefined();
      expect(result.difficulty).toBeUndefined();
      expect(result.tags).toEqual(['valid', 'another']);
    });

    test('should handle confidence threshold', async () => {
      const mockResponse = JSON.stringify({
        title: 'Low Confidence Recipe',
        ingredients: [
          { name: 'ingredient', quantity: 1, unit: 'cup', optional: false, confidence: 0.8, inferred: false }
        ],
        instructions: ['instruction'],
        confidence: 0.5 // Below threshold
      });

      (createChatCompletion as jest.Mock).mockResolvedValue(mockResponse);

      // Should not throw, but should log warning
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = await parseRecipeWithAI('test content', { 
        useMultiStage: false,
        confidenceThreshold: 0.7 
      });

      expect(result.confidence).toBe(0.5);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Recipe confidence 0.5 below threshold 0.7')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('validateRecipeConsistency', () => {
    test('should validate recipe consistency', async () => {
      const mockValidationResponse = JSON.stringify({
        validationNotes: ['Recipe looks good overall'],
        missingIngredients: ['salt'],
        inferredQuantities: [
          { name: 'salt', originalQuantity: null, suggestedQuantity: 1, unit: 'tsp' }
        ],
        inconsistencies: [
          {
            type: 'missing_ingredient',
            description: 'Salt is mentioned in instructions but not in ingredients',
            severity: 'medium',
            suggestion: 'Add salt to ingredients list'
          }
        ]
      });

      (createChatCompletion as jest.Mock).mockResolvedValue(mockValidationResponse);

      const recipe = {
        title: 'Test Recipe',
        ingredients: [
          { name: 'flour', quantity: 2, unit: 'cup', optional: false, confidence: 0.9, inferred: false }
        ],
        instructions: ['Mix flour with salt'],
        tags: [],
        confidence: 0.8
      };

      const result = await validateRecipeConsistency(recipe as any, 'original content');

      expect(result.validationNotes).toContain('Recipe looks good overall');
      expect(result.missingIngredients).toContain('salt');
      expect(result.inferredQuantities).toHaveLength(1);
      expect(result.inconsistencies).toHaveLength(1);
      expect(result.inconsistencies[0].type).toBe('missing_ingredient');
    });

    test('should handle validation failure gracefully', async () => {
      (createChatCompletion as jest.Mock).mockRejectedValue(new Error('Validation failed'));

      const recipe = {
        title: 'Test Recipe',
        ingredients: [],
        instructions: [],
        tags: [],
        confidence: 0.8
      };

      const result = await validateRecipeConsistency(recipe as any, 'content');

      expect(result.validatedRecipe).toBe(recipe);
      expect(result.validationNotes).toContain('Validation check failed');
      expect(result.missingIngredients).toHaveLength(0);
      expect(result.inferredQuantities).toHaveLength(0);
      expect(result.inconsistencies).toHaveLength(0);
    });

    test('should handle malformed validation response', async () => {
      (createChatCompletion as jest.Mock).mockResolvedValue('Invalid JSON response');

      const recipe = {
        title: 'Test Recipe',
        ingredients: [],
        instructions: [],
        tags: [],
        confidence: 0.8
      };

      const result = await validateRecipeConsistency(recipe as any, 'content');

      expect(result.validationNotes).toContain('Validation check failed');
    });
  });

  describe('edge cases and error handling', () => {
    test('should handle empty content', async () => {
      const mockResponse = JSON.stringify({
        title: 'Empty Recipe',
        ingredients: [
          { name: 'unknown', quantity: 1, unit: 'cup', optional: false, confidence: 0.3, inferred: true }
        ],
        instructions: ['No instructions available'],
        confidence: 0.3
      });

      (createChatCompletion as jest.Mock).mockResolvedValue(mockResponse);

      const result = await parseRecipeWithAI('', { useMultiStage: false });

      expect(result.title).toBe('Empty Recipe');
      expect(result.confidence).toBe(0.3);
    });

    test('should handle very long content', async () => {
      const longContent = 'Recipe content '.repeat(1000);
      
      const mockResponse = JSON.stringify({
        title: 'Long Recipe',
        ingredients: [
          { name: 'ingredient', quantity: 1, unit: 'cup', optional: false, confidence: 0.8, inferred: false }
        ],
        instructions: ['instruction'],
        confidence: 0.8
      });

      (createChatCompletion as jest.Mock).mockResolvedValue(mockResponse);

      const result = await parseRecipeWithAI(longContent, { useMultiStage: false });

      expect(result.title).toBe('Long Recipe');
      // Should truncate content in prompts
      expect(createChatCompletion).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            content: expect.stringMatching(/Recipe content.*Recipe content/)
          })
        ])
      );
    });

    test('should handle special characters in recipe', async () => {
      const mockResponse = JSON.stringify({
        title: 'Crème Brûlée',
        ingredients: [
          { name: 'crème fraîche', quantity: 1, unit: 'cup', optional: false, confidence: 0.9, inferred: false }
        ],
        instructions: ['Prepare crème brûlée'],
        cuisine: 'French',
        confidence: 0.9
      });

      (createChatCompletion as jest.Mock).mockResolvedValue(mockResponse);

      const result = await parseRecipeWithAI('French recipe content', { useMultiStage: false });

      expect(result.title).toBe('Crème Brûlée');
      expect(result.ingredients[0].name).toBe('crème fraîche');
      expect(result.cuisine).toBe('French');
    });
  });
});