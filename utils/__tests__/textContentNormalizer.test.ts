/**
 * Unit tests for text content normalizer
 */

import {
  normalizeTextContent,
  normalizeSocialMediaContent,
  normalizeOcrContent,
  normalizeTranscribedContent,
  normalizeWebContent
} from '../textContentNormalizer';

describe('Text Content Normalizer', () => {
  describe('normalizeTextContent', () => {
    test('should remove emojis from text', () => {
      const text = 'Amazing pasta recipe! 🍝 So delicious 😋 #cooking';
      const result = normalizeTextContent(text, { removeEmojis: true });
      
      expect(result.normalizedText).not.toContain('🍝');
      expect(result.normalizedText).not.toContain('😋');
      expect(result.appliedOperations).toContain('emoji-removal');
    });

    test('should remove hashtags and mentions', () => {
      const text = 'Check out this recipe from @chef_mike #cooking #pasta #delicious';
      const result = normalizeTextContent(text, { 
        removeHashtags: true, 
        removeMentions: true 
      });
      
      expect(result.normalizedText).not.toContain('#cooking');
      expect(result.normalizedText).not.toContain('@chef_mike');
      expect(result.appliedOperations).toContain('hashtag-removal');
      expect(result.appliedOperations).toContain('mention-removal');
    });

    test('should remove URLs from text', () => {
      const text = 'Great recipe from https://example.com/recipe and www.cooking.com';
      const result = normalizeTextContent(text, { removeUrls: true });
      
      expect(result.normalizedText).not.toContain('https://example.com/recipe');
      expect(result.normalizedText).not.toContain('www.cooking.com');
      expect(result.appliedOperations).toContain('url-removal');
    });

    test('should fix common text errors', () => {
      const text = 'Cook for 10 rninutes until ingrediants are ready. This recipie is great!';
      const result = normalizeTextContent(text, { fixCommonErrors: true });
      
      expect(result.normalizedText).toContain('minutes');
      expect(result.normalizedText).toContain('ingredients');
      expect(result.normalizedText).toContain('recipe');
      expect(result.appliedOperations).toContain('error-correction');
    });

    test('should standardize measurement units', () => {
      const text = '2 tablespoons butter, 3 teaspoons salt, 1 pound flour';
      const result = normalizeTextContent(text, { standardizeUnits: true });
      
      expect(result.normalizedText).toContain('2 tbsp butter');
      expect(result.normalizedText).toContain('3 tsp salt');
      expect(result.normalizedText).toContain('1 lb flour');
      expect(result.appliedOperations).toContain('unit-standardization');
    });

    test('should normalize whitespace and formatting', () => {
      const text = 'Recipe   with    extra   spaces\n\n\n\nand   too   many   line   breaks';
      const result = normalizeTextContent(text, { normalizeWhitespace: true });
      
      expect(result.normalizedText).toBe('Recipe with extra spaces\n\nand too many line breaks');
      expect(result.appliedOperations).toContain('whitespace-normalization');
    });

    test('should enhance recipe structure', () => {
      const text = `- 2 cups flour
- 1 cup sugar
- 3 eggs

1. Mix dry ingredients
2. Add eggs
3. Bake for 30 minutes`;

      const result = normalizeTextContent(text, { enhanceStructure: true });
      
      expect(result.normalizedText).toContain('Ingredients:');
      expect(result.normalizedText).toContain('Instructions:');
      expect(result.appliedOperations).toContain('structure-enhancement');
    });

    test('should preserve formatting when requested', () => {
      const text = 'Recipe\n  with\n    indentation\n      preserved';
      const result = normalizeTextContent(text, { 
        normalizeWhitespace: true,
        preserveFormatting: true 
      });
      
      // Should preserve line breaks but normalize spaces
      expect(result.normalizedText.split('\n')).toHaveLength(4);
    });

    test('should handle temperature standardization', () => {
      const text = 'Bake at 350 degrees fahrenheit or 180 degrees celsius';
      const result = normalizeTextContent(text, { standardizeUnits: true });
      
      expect(result.normalizedText).toContain('350°F');
      expect(result.normalizedText).toContain('180°C');
    });

    test('should handle time format standardization', () => {
      const text = 'Cook for 2 hours 30 minutes or 45 mins total';
      const result = normalizeTextContent(text, { standardizeUnits: true });
      
      expect(result.normalizedText).toContain('2h 30min');
      expect(result.normalizedText).toContain('45min');
    });

    test('should fix fraction formatting', () => {
      const text = '1 1/2 cups flour and 3/4 cup sugar';
      const result = normalizeTextContent(text, { enhanceStructure: true });
      
      expect(result.normalizedText).toContain('1 1/2 cups');
      expect(result.normalizedText).toContain('3/4 cup');
    });

    test('should standardize bullet points', () => {
      const text = `• First ingredient
* Second ingredient
- Third ingredient
· Fourth ingredient`;

      const result = normalizeTextContent(text, { normalizeWhitespace: true });
      
      const lines = result.normalizedText.split('\n');
      lines.forEach(line => {
        if (line.trim()) {
          expect(line).toMatch(/^- /);
        }
      });
    });

    test('should standardize numbered lists', () => {
      const text = `1) First step
2. Second step
3) Third step`;

      const result = normalizeTextContent(text, { normalizeWhitespace: true });
      
      expect(result.normalizedText).toContain('1. First step');
      expect(result.normalizedText).toContain('2. Second step');
      expect(result.normalizedText).toContain('3. Third step');
    });

    test('should calculate confidence score', () => {
      const text = 'Recipe with emojis 🍝 and #hashtags from https://example.com';
      const result = normalizeTextContent(text);
      
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(typeof result.confidence).toBe('number');
    });

    test('should track original and normalized lengths', () => {
      const text = 'Original text with extra content';
      const result = normalizeTextContent(text);
      
      expect(result.originalLength).toBe(text.length);
      expect(result.normalizedLength).toBe(result.normalizedText.length);
    });

    test('should handle empty text', () => {
      const result = normalizeTextContent('');
      
      expect(result.normalizedText).toBe('');
      expect(result.originalLength).toBe(0);
      expect(result.normalizedLength).toBe(0);
    });

    test('should handle text with only whitespace', () => {
      const text = '   \n\n\t   \n   ';
      const result = normalizeTextContent(text);
      
      expect(result.normalizedText).toBe('');
    });
  });

  describe('specialized normalization functions', () => {
    test('normalizeSocialMediaContent should handle social media text', () => {
      const text = 'Amazing recipe! 🍝 Check it out #cooking @chef_mike https://recipe.com';
      const result = normalizeSocialMediaContent(text);
      
      expect(result.normalizedText).not.toContain('🍝');
      expect(result.normalizedText).not.toContain('#cooking');
      expect(result.normalizedText).not.toContain('@chef_mike');
      expect(result.normalizedText).not.toContain('https://recipe.com');
      expect(result.appliedOperations).toContain('emoji-removal');
      expect(result.appliedOperations).toContain('hashtag-removal');
      expect(result.appliedOperations).toContain('mention-removal');
      expect(result.appliedOperations).toContain('url-removal');
    });

    test('normalizeOcrContent should handle OCR-specific issues', () => {
      const text = 'Recipie with rninutes and ingrediants from 0CR';
      const result = normalizeOcrContent(text);
      
      expect(result.normalizedText).toContain('Recipe');
      expect(result.normalizedText).toContain('minutes');
      expect(result.normalizedText).toContain('ingredients');
      expect(result.appliedOperations).toContain('error-correction');
      expect(result.appliedOperations).not.toContain('emoji-removal'); // OCR doesn't usually have emojis
    });

    test('normalizeTranscribedContent should handle transcription text', () => {
      const text = 'Add two tablespoons of butter and cook for thirty rninutes';
      const result = normalizeTranscribedContent(text);
      
      expect(result.normalizedText).toContain('2 tbsp');
      expect(result.normalizedText).toContain('minutes');
      expect(result.appliedOperations).toContain('unit-standardization');
      expect(result.appliedOperations).toContain('error-correction');
    });

    test('normalizeWebContent should handle web page content', () => {
      const text = 'Recipe from website with https://links.com and proper formatting';
      const result = normalizeWebContent(text);
      
      expect(result.normalizedText).not.toContain('https://links.com');
      expect(result.appliedOperations).toContain('url-removal');
      // Should preserve formatting for web content
    });
  });

  describe('edge cases and error handling', () => {
    test('should handle text with mixed content types', () => {
      const text = `Recipe: Pasta 🍝 #cooking
      
Ingredients:
- 2 tablespoons olive oil
- 1 pound pasta
- Salt to taste

Instructions:
1. Boil water for 10 rninutes
2. Add pasta and cook untill done
3. Serve hot

From: https://example.com @chef_mike`;

      const result = normalizeTextContent(text);
      
      expect(result.normalizedText).toContain('Ingredients:');
      expect(result.normalizedText).toContain('Instructions:');
      expect(result.normalizedText).toContain('2 tbsp olive oil');
      expect(result.normalizedText).toContain('1 lb pasta');
      expect(result.normalizedText).toContain('minutes');
      expect(result.normalizedText).toContain('until');
      expect(result.normalizedText).not.toContain('🍝');
      expect(result.normalizedText).not.toContain('#cooking');
      expect(result.normalizedText).not.toContain('@chef_mike');
      expect(result.normalizedText).not.toContain('https://example.com');
    });

    test('should handle very long text', () => {
      const longText = 'Recipe '.repeat(1000) + 'with ingredients and steps';
      const result = normalizeTextContent(longText);
      
      expect(result.normalizedText.length).toBeGreaterThan(0);
      expect(result.originalLength).toBe(longText.length);
    });

    test('should handle text with special characters', () => {
      const text = 'Recipe with special chars: àáâãäåæçèéêë and numbers 123456';
      const result = normalizeTextContent(text);
      
      expect(result.normalizedText).toContain('àáâãäåæçèéêë');
      expect(result.normalizedText).toContain('123456');
    });

    test('should handle text with only punctuation', () => {
      const text = '!@#$%^&*()_+-=[]{}|;:,.<>?';
      const result = normalizeTextContent(text);
      
      expect(result.normalizedText.length).toBeGreaterThan(0);
    });

    test('should maintain reasonable confidence for minimal changes', () => {
      const text = 'Perfect recipe with no issues to fix';
      const result = normalizeTextContent(text);
      
      expect(result.confidence).toBeGreaterThanOrEqual(0.5);
    });

    test('should detect ingredient lists correctly', () => {
      const textWithIngredients = `
- 2 cups flour
- 1 tsp salt
- 3 tbsp sugar
- 1 cup milk
`;
      const result = normalizeTextContent(textWithIngredients, { enhanceStructure: true });
      
      expect(result.normalizedText).toContain('Ingredients:');
    });

    test('should detect instruction lists correctly', () => {
      const textWithInstructions = `
1. Mix the flour and salt
2. Add milk and stir well
3. Cook in pan for 5 minutes
4. Serve hot
`;
      const result = normalizeTextContent(textWithInstructions, { enhanceStructure: true });
      
      expect(result.normalizedText).toContain('Instructions:');
    });
  });
});