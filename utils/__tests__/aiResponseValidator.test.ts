/**
 * Unit tests for AI response validator
 */

import {
  validateAIResponse,
  validateRecipeResponse,
  createValidationSummary,
  RECIPE_VALIDATION_SCHEMA,
  ERROR_CODES
} from '../aiResponseValidator';

describe('AI Response Validator', () => {
  describe('validateAIResponse', () => {
    const simpleSchema = {
      name: {
        field: 'name',
        type: 'string' as const,
        required: true,
        minLength: 1,
        maxLength: 50
      },
      age: {
        field: 'age',
        type: 'number' as const,
        minimum: 0,
        maximum: 150
      }
    };

    test('should validate correct JSON response', () => {
      const response = JSON.stringify({
        name: 'John Doe',
        age: 30
      });

      const result = validateAIResponse(response, simpleSchema);

      expect(result.isValid).toBe(true);
      expect(result.data).toEqual({ name: 'John Doe', age: 30 });
      expect(result.errors).toHaveLength(0);
      expect(result.confidence).toBeGreaterThan(0.8);
      expect(result.fallbackUsed).toBe(false);
    });

    test('should extract JSON from code fences', () => {
      const response = `Here's the data:

\`\`\`json
{
  "name": "Jane Smith",
  "age": 25
}
\`\`\`

That's the result.`;

      const result = validateAIResponse(response, simpleSchema);

      expect(result.isValid).toBe(true);
      expect(result.data).toEqual({ name: 'Jane Smith', age: 25 });
    });

    test('should extract JSON from mixed content', () => {
      const response = `The extracted data is: {"name": "Bob Wilson", "age": 45} and that's it.`;

      const result = validateAIResponse(response, simpleSchema);

      expect(result.isValid).toBe(true);
      expect(result.data).toEqual({ name: 'Bob Wilson', age: 45 });
    });

    test('should handle missing required fields', () => {
      const response = JSON.stringify({
        age: 30
        // missing required 'name' field
      });

      const result = validateAIResponse(response, simpleSchema);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe(ERROR_CODES.MISSING_REQUIRED_FIELD);
      expect(result.errors[0].field).toBe('name');
      expect(result.errors[0].severity).toBe('critical');
    });

    test('should handle invalid types', () => {
      const response = JSON.stringify({
        name: 123, // should be string
        age: 'thirty' // should be number
      });

      const result = validateAIResponse(response, simpleSchema);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.errors.some(e => e.code === ERROR_CODES.INVALID_TYPE)).toBe(true);
    });

    test('should handle values out of range', () => {
      const response = JSON.stringify({
        name: 'A'.repeat(100), // too long
        age: -5 // below minimum
      });

      const result = validateAIResponse(response, simpleSchema);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === ERROR_CODES.VALUE_OUT_OF_RANGE)).toBe(true);
    });

    test('should clean and normalize data', () => {
      const response = JSON.stringify({
        name: '  John Doe  ', // extra whitespace
        age: 200 // above maximum
      });

      const result = validateAIResponse(response, simpleSchema, { allowPartialData: true });

      expect(result.data?.name).toBe('John Doe'); // trimmed
      expect(result.data?.age).toBe(150); // clamped to maximum
    });

    test('should use fallback strategy on JSON parse failure', () => {
      const response = 'This is not JSON at all, but contains name: John and age: 30';

      const result = validateAIResponse(response, simpleSchema, { 
        fallbackStrategy: 'simple',
        allowPartialData: true 
      });

      expect(result.fallbackUsed).toBe(true);
      expect(result.warnings.some(w => w.code === 'FALLBACK_USED')).toBe(true);
    });

    test('should handle strict mode validation', () => {
      const response = JSON.stringify({
        name: 'John Doe',
        age: 30,
        extraField: 'should cause warning'
      });

      const result = validateAIResponse(response, simpleSchema, { strictMode: true });

      expect(result.isValid).toBe(true);
      expect(result.warnings.some(w => w.code === 'EXTRA_FIELD')).toBe(true);
    });

    test('should respect confidence threshold', () => {
      const response = JSON.stringify({
        name: 'John',
        age: 30
      });

      const result = validateAIResponse(response, simpleSchema, { 
        confidenceThreshold: 0.9 
      });

      if (result.confidence < 0.9) {
        expect(result.errors.some(e => e.code === ERROR_CODES.LOW_CONFIDENCE)).toBe(true);
      }
    });

    test('should handle malformed JSON gracefully', () => {
      const response = '{"name": "John", "age": 30'; // missing closing brace

      const result = validateAIResponse(response, simpleSchema, { 
        fallbackStrategy: 'none' 
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === ERROR_CODES.INVALID_JSON)).toBe(true);
    });
  });

  describe('validateRecipeResponse', () => {
    test('should validate complete recipe', () => {
      const recipeResponse = JSON.stringify({
        title: 'Chocolate Chip Cookies',
        ingredients: [
          {
            name: 'flour',
            quantity: 2,
            unit: 'cup',
            confidence: 0.9,
            inferred: false,
            optional: false
          },
          {
            name: 'sugar',
            quantity: 1,
            unit: 'cup',
            confidence: 0.8,
            inferred: false,
            optional: false
          }
        ],
        instructions: [
          'Preheat oven to 350°F',
          'Mix flour and sugar in a bowl',
          'Bake for 12 minutes'
        ],
        prepTime: 15,
        cookTime: 12,
        servings: 24,
        confidence: 0.9
      });

      const result = validateRecipeResponse(recipeResponse);

      expect(result.isValid).toBe(true);
      expect(result.data?.title).toBe('Chocolate Chip Cookies');
      expect(result.data?.ingredients).toHaveLength(2);
      expect(result.data?.instructions).toHaveLength(3);
      expect(result.errors).toHaveLength(0);
    });

    test('should detect empty ingredients array', () => {
      const recipeResponse = JSON.stringify({
        title: 'Empty Recipe',
        ingredients: [], // empty array
        instructions: ['Do something'],
        confidence: 0.8
      });

      const result = validateRecipeResponse(recipeResponse);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === ERROR_CODES.EMPTY_ARRAY)).toBe(true);
    });

    test('should detect empty instructions array', () => {
      const recipeResponse = JSON.stringify({
        title: 'No Instructions Recipe',
        ingredients: [
          { name: 'flour', confidence: 0.8, inferred: false, optional: false }
        ],
        instructions: [], // empty array
        confidence: 0.8
      });

      const result = validateRecipeResponse(recipeResponse);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === ERROR_CODES.EMPTY_ARRAY)).toBe(true);
    });

    test('should validate ingredient properties', () => {
      const recipeResponse = JSON.stringify({
        title: 'Test Recipe',
        ingredients: [
          {
            name: '', // empty name
            quantity: -1, // negative quantity
            unit: 'invalid_unit', // invalid unit
            confidence: 1.5, // above maximum
            inferred: false,
            optional: false
          }
        ],
        instructions: ['Test instruction'],
        confidence: 0.8
      });

      const result = validateRecipeResponse(recipeResponse);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('should detect placeholder titles', () => {
      const recipeResponse = JSON.stringify({
        title: 'Untitled Recipe',
        ingredients: [
          { name: 'flour', confidence: 0.8, inferred: false, optional: false }
        ],
        instructions: ['Mix ingredients'],
        confidence: 0.8
      });

      const result = validateRecipeResponse(recipeResponse);

      expect(result.errors.some(e => e.code === ERROR_CODES.INVALID_FORMAT)).toBe(true);
    });

    test('should detect low confidence ingredients', () => {
      const recipeResponse = JSON.stringify({
        title: 'Low Confidence Recipe',
        ingredients: [
          { name: 'ingredient1', confidence: 0.3, inferred: false, optional: false },
          { name: 'ingredient2', confidence: 0.2, inferred: false, optional: false },
          { name: 'ingredient3', confidence: 0.4, inferred: false, optional: false }
        ],
        instructions: ['Cook everything'],
        confidence: 0.8
      });

      const result = validateRecipeResponse(recipeResponse);

      expect(result.errors.some(e => e.code === ERROR_CODES.LOW_CONFIDENCE)).toBe(true);
    });

    test('should detect short instructions', () => {
      const recipeResponse = JSON.stringify({
        title: 'Short Instructions Recipe',
        ingredients: [
          { name: 'flour', confidence: 0.8, inferred: false, optional: false }
        ],
        instructions: [
          'Mix', // too short
          'Cook', // too short
          'Serve' // too short
        ],
        confidence: 0.8
      });

      const result = validateRecipeResponse(recipeResponse);

      expect(result.errors.some(e => e.code === ERROR_CODES.INVALID_FORMAT)).toBe(true);
    });

    test('should validate time ranges', () => {
      const recipeResponse = JSON.stringify({
        title: 'Time Test Recipe',
        ingredients: [
          { name: 'flour', confidence: 0.8, inferred: false, optional: false }
        ],
        instructions: ['Cook the flour'],
        prepTime: -5, // negative time
        cookTime: 2000, // too long (over 24 hours)
        servings: 0, // invalid servings
        confidence: 0.8
      });

      const result = validateRecipeResponse(recipeResponse);

      expect(result.errors.some(e => e.code === ERROR_CODES.VALUE_OUT_OF_RANGE)).toBe(true);
    });
  });

  describe('JSON extraction strategies', () => {
    const simpleSchema = {
      test: { field: 'test', type: 'string' as const, required: true }
    };

    test('should handle clean JSON', () => {
      const response = '{"test": "value"}';
      const result = validateAIResponse(response, simpleSchema);
      expect(result.isValid).toBe(true);
    });

    test('should extract from markdown code blocks', () => {
      const response = `
Here's the result:
\`\`\`json
{"test": "value"}
\`\`\`
Done.`;
      const result = validateAIResponse(response, simpleSchema);
      expect(result.isValid).toBe(true);
    });

    test('should extract from code blocks without language', () => {
      const response = `
\`\`\`
{"test": "value"}
\`\`\``;
      const result = validateAIResponse(response, simpleSchema);
      expect(result.isValid).toBe(true);
    });

    test('should find JSON in mixed content', () => {
      const response = 'Some text before {"test": "value"} and after';
      const result = validateAIResponse(response, simpleSchema);
      expect(result.isValid).toBe(true);
    });

    test('should handle arrays', () => {
      const arraySchema = {
        items: { field: 'items', type: 'array' as const, required: true }
      };
      const response = 'Result: ["item1", "item2", "item3"]';
      const result = validateAIResponse(response, arraySchema);
      expect(result.isValid).toBe(true);
    });

    test('should clean malformed JSON', () => {
      const response = `{
        test: 'value with single quotes',
        extra: 'field',
      }`; // trailing comma and single quotes
      
      const result = validateAIResponse(response, simpleSchema);
      expect(result.isValid).toBe(true);
    });
  });

  describe('createValidationSummary', () => {
    test('should create summary for successful validation', () => {
      const result = {
        isValid: true,
        data: { test: 'value' },
        errors: [],
        warnings: [],
        confidence: 0.95,
        fallbackUsed: false
      };

      const summary = createValidationSummary(result);

      expect(summary).toContain('PASSED');
      expect(summary).toContain('95.0%');
      expect(summary).not.toContain('Fallback');
    });

    test('should create summary for failed validation', () => {
      const result = {
        isValid: false,
        errors: [
          {
            code: 'TEST_ERROR',
            message: 'Test error message',
            severity: 'high' as const,
            recoverable: true
          }
        ],
        warnings: [
          {
            code: 'TEST_WARNING',
            message: 'Test warning message'
          }
        ],
        confidence: 0.3,
        fallbackUsed: true
      };

      const summary = createValidationSummary(result);

      expect(summary).toContain('FAILED');
      expect(summary).toContain('30.0%');
      expect(summary).toContain('Fallback strategy was used');
      expect(summary).toContain('HIGH: Test error message');
      expect(summary).toContain('Test warning message');
    });
  });

  describe('edge cases and error handling', () => {
    const simpleSchema = {
      name: { field: 'name', type: 'string' as const, required: true }
    };

    test('should handle empty response', () => {
      const result = validateAIResponse('', simpleSchema);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === ERROR_CODES.INVALID_JSON)).toBe(true);
    });

    test('should handle null response', () => {
      const result = validateAIResponse('null', simpleSchema);
      expect(result.isValid).toBe(false);
    });

    test('should handle response with only whitespace', () => {
      const result = validateAIResponse('   \n\t   ', simpleSchema);
      expect(result.isValid).toBe(false);
    });

    test('should handle response with nested objects', () => {
      const nestedSchema = {
        user: {
          field: 'user',
          type: 'object' as const,
          required: true,
          properties: {
            name: { field: 'name', type: 'string' as const, required: true },
            age: { field: 'age', type: 'number' as const, minimum: 0 }
          }
        }
      };

      const response = JSON.stringify({
        user: {
          name: 'John',
          age: 30
        }
      });

      const result = validateAIResponse(response, nestedSchema);
      expect(result.isValid).toBe(true);
    });

    test('should handle custom validation functions', () => {
      const customSchema = {
        email: {
          field: 'email',
          type: 'string' as const,
          required: true,
          custom: (value: string) => {
            if (!value.includes('@')) {
              return {
                code: 'INVALID_EMAIL',
                message: 'Email must contain @ symbol',
                severity: 'high' as const,
                recoverable: true
              };
            }
            return null;
          }
        }
      };

      const response = JSON.stringify({ email: 'invalid-email' });
      const result = validateAIResponse(response, customSchema);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'INVALID_EMAIL')).toBe(true);
    });
  });
});