import { buildCookbookPagePromptPayload } from '@/utils/cookbook/pagePrompt';
import { getRecipeTemplate } from '@/constants/recipeTemplates';

describe('buildCookbookPagePromptPayload', () => {
  it('builds deterministic payload for one-page generation', () => {
    const payload = buildCookbookPagePromptPayload({
      recipe: {
        id: 'r1',
        title: 'Blueberry Muffins',
        servings: 12,
        ingredients: [{ name: 'blueberries', quantity: '1', unit: 'cup' }],
        steps: ['Mix batter.', 'Bake until golden.'],
        tags: ['breakfast'],
        category: 'breakfast',
        sourceType: 'text',
      },
      theme: {
        name: 'Warm handwritten',
        prompt: 'warm handwritten family cookbook, cream paper, soft watercolor food illustration',
      },
    });

    expect(payload.recipe.title).toBe('Blueberry Muffins');
    expect(payload.layout).toBe('single-page-cookbook');
    expect(payload.instructions).toContain('Readable recipe text is required.');
  });

  it('includes the selected recipe template in the generation prompt', () => {
    const template = getRecipeTemplate('ink-sketch');

    const payload = buildCookbookPagePromptPayload({
      recipe: {
        id: 'r1',
        title: 'Blueberry Muffins',
        servings: 12,
        ingredients: [{ name: 'blueberries', quantity: '1', unit: 'cup' }],
        steps: ['Mix batter.', 'Bake until golden.'],
        tags: ['breakfast'],
        category: 'breakfast',
        sourceType: 'text',
      },
      recipeTemplateId: 'ink-sketch',
    });

    expect(payload.template?.id).toBe('ink-sketch');
    expect(payload.instructions).toContain(template.promptDescriptor);
  });
});
