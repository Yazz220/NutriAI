import { slugifyIngredient, ingredientDisplayFromSlug, SYNONYMS } from '@/utils/ingredientSlug';

describe('slugifyIngredient', () => {
  it('resolves known synonyms', () => {
    expect(slugifyIngredient('scallion')).toBe('onion-green');
    expect(slugifyIngredient('green onion')).toBe('onion-green');
    expect(slugifyIngredient('coriander')).toBe('cilantro');
  });

  it('handles base + variant for known roots', () => {
    expect(slugifyIngredient('onion', 'red')).toBe('onion-red');
  });

  it('falls back to hyphenated normalization for unknown names', () => {
    expect(slugifyIngredient('Bell Pepper')).toBe('bell-pepper');
    expect(slugifyIngredient('  Extra   Spaces  ')).toBe('extra-spaces');
  });

  it('is case-insensitive', () => {
    expect(slugifyIngredient('BASIL')).toBe('basil');
    expect(slugifyIngredient('Yellow Onion')).toBe('onion-yellow');
  });

  it('handles empty input gracefully', () => {
    expect(slugifyIngredient('')).toBe('');
  });
});

describe('ingredientDisplayFromSlug', () => {
  it('converts slug to title case', () => {
    expect(ingredientDisplayFromSlug('onion-green')).toBe('Onion Green');
    expect(ingredientDisplayFromSlug('bell-pepper')).toBe('Bell Pepper');
  });
});
