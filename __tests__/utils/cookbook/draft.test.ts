import {
  ingredientToLine,
  ingredientsFromText,
  splitRecipeLines,
  structuredRecipeFromDraft,
} from '@/utils/cookbook/draft';
import type { ParsedRecipeDraft } from '@/types/cookbook';

const draft: ParsedRecipeDraft = {
  title: 'Tomato Toast',
  servings: 2,
  ingredients: [
    { quantity: '2', unit: 'slices', name: 'bread' },
    { quantity: '1', name: 'tomato' },
  ],
  steps: ['Toast bread', 'Add tomato'],
  sourceType: 'text',
  tags: ['quick'],
  category: 'breakfast',
};

describe('cookbook draft helpers', () => {
  it('formats structured ingredients as editable lines', () => {
    expect(ingredientToLine({ quantity: '1', unit: 'cup', name: 'rice' })).toBe('1 cup rice');
    expect(ingredientToLine({ name: 'salt' })).toBe('salt');
  });

  it('splits multiline text into trimmed non-empty lines', () => {
    expect(splitRecipeLines(' one\n\n two  \n')).toEqual(['one', 'two']);
  });

  it('preserves original ingredient structure when a line is unchanged', () => {
    expect(ingredientsFromText('2 slices bread\n1 tomato', draft.ingredients)).toEqual(draft.ingredients);
  });

  it('converts edited ingredient lines to simple ingredient names', () => {
    expect(ingredientsFromText('2 slices bread\nbasil', draft.ingredients)).toEqual([
      draft.ingredients[0],
      { name: 'basil' },
    ]);
  });

  it('builds a structured recipe from reviewed fields', () => {
    expect(
      structuredRecipeFromDraft(
        draft,
        {
          title: ' Tomato Toast ',
          servings: '3',
          ingredients: '2 slices bread\nbasil',
          steps: 'Toast bread\nAdd basil',
        },
        'fixed-id',
      ),
    ).toMatchObject({
      id: 'fixed-id',
      title: 'Tomato Toast',
      servings: 3,
      ingredients: [draft.ingredients[0], { name: 'basil' }],
      steps: ['Toast bread', 'Add basil'],
      tags: ['quick'],
      category: 'breakfast',
    });
  });
});
