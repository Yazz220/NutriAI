import scenarios from '@/supabase/functions/nosh-chat/evals/scenarios.json';

describe('Nosh agent evaluation scenarios', () => {
  it('keeps a unique, broad regression set for focus, retrieval, actions, and memory', () => {
    expect(scenarios).toHaveLength(24);
    expect(new Set(scenarios.map((scenario) => scenario.id)).size).toBe(scenarios.length);
    expect(new Set(scenarios.map((scenario) => scenario.task))).toEqual(
      new Set(['collection', 'recipe-help', 'capture', 'walkthrough']),
    );
    expect(scenarios.some((scenario) => scenario.expectTools.includes('browse_recipe_collection'))).toBe(true);
    expect(scenarios.some((scenario) => scenario.expectTools.includes('save_cooking_preference'))).toBe(true);
    expect(scenarios.some((scenario) => scenario.id === 'current-focus-wins')).toBe(true);
  });

  it('never expects navigation unless the user explicitly asks to open a recipe', () => {
    const navigationCases = scenarios.filter((scenario) => scenario.expectTools.includes('open_recipe'));
    expect(navigationCases.map((scenario) => scenario.id)).toEqual(['explicit-open']);
  });
});
