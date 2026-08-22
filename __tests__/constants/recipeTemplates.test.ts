import {
  DEFAULT_RECIPE_TEMPLATE_ID,
  getRecipeTemplate,
  listRecipeTemplates,
  orderRecipeTemplates,
} from '@/constants/recipeTemplates';

describe('recipe templates', () => {
  it('defines the three page templates for the first flow pass', () => {
    const templates = listRecipeTemplates();

    expect(templates.map((template) => template.id)).toEqual([
      'clean-cream',
      'ink-sketch',
      'modern-editorial',
    ]);
    expect(templates.some((template) => template.id === DEFAULT_RECIPE_TEMPLATE_ID)).toBe(true);
  });

  it('falls back to the default template for unknown ids', () => {
    expect(getRecipeTemplate('missing-template').id).toBe(DEFAULT_RECIPE_TEMPLATE_ID);
  });

  it('orders favorite templates first without dropping the remaining templates', () => {
    const ordered = orderRecipeTemplates(['modern-editorial']);

    expect(ordered.map((template) => template.id)).toEqual([
      'modern-editorial',
      'clean-cream',
      'ink-sketch',
    ]);
  });
});
