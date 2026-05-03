import { scoreParsedRecipeConfidence } from '@/utils/cookbook/confidence';

describe('scoreParsedRecipeConfidence', () => {
  it('returns high confidence for complete recipes', () => {
    const score = scoreParsedRecipeConfidence({
      title: 'Lemon Pasta',
      ingredients: [
        { name: 'pasta', quantity: '8', unit: 'oz' },
        { name: 'lemon', quantity: '1', unit: '' },
        { name: 'butter', quantity: '2', unit: 'tbsp' },
      ],
      steps: ['Boil pasta.', 'Make sauce.', 'Toss together.'],
      servings: 4,
      sourceType: 'url',
    });
    expect(score.confidence).toBeGreaterThanOrEqual(0.8);
    expect(score.needsReview).toBe(false);
  });

  it('requires review for missing steps', () => {
    const score = scoreParsedRecipeConfidence({
      title: 'Mystery Dish',
      ingredients: [{ name: 'egg', quantity: '1', unit: '' }],
      steps: [],
      sourceType: 'text',
    });
    expect(score.needsReview).toBe(true);
    expect(score.reasons).toContain('Missing directions');
  });
});
