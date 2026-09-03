import scenarios from '@/supabase/functions/nosh-chat/evals/scenarios.json';

describe('Folio agent evaluation scenarios', () => {
  it('keeps a unique, broad regression set for focus, retrieval, actions, and memory', () => {
    expect(scenarios).toHaveLength(28);
    expect(new Set(scenarios.map((scenario) => scenario.id)).size).toBe(scenarios.length);
    expect(new Set(scenarios.map((scenario) => scenario.task))).toEqual(
      new Set(['collection', 'cookbook-help', 'recipe-help', 'capture', 'preferences']),
    );
    expect(scenarios.some((scenario) => scenario.expectTools.includes('browse_recipe_collection'))).toBe(true);
    expect(scenarios.some((scenario) => scenario.expectTools.includes('save_cooking_preference'))).toBe(true);
    expect(scenarios.some((scenario) => scenario.id === 'current-focus-wins')).toBe(true);
  });

  it('never expects navigation unless the user explicitly asks to open a recipe', () => {
    const navigationCases = scenarios.filter((scenario) => scenario.expectTools.includes('open_recipe'));
    expect(navigationCases.map((scenario) => scenario.id)).toEqual(['explicit-open']);
  });

  it('never expects walkthrough tools (removed — the agent guides in text)', () => {
    for (const scenario of scenarios) {
      expect(scenario.expectTools).not.toContain('set_walkthrough');
      expect(scenario.expectTools).not.toContain('guide_next_step');
      expect(scenario.forbidTools).not.toContain('set_walkthrough');
      expect(scenario.forbidTools).not.toContain('guide_next_step');
    }
    expect(scenarios.some((scenario) => scenario.id === 'step-by-step-guidance')).toBe(true);
  });

  it('covers multi-turn memory scenarios that forbid re-searching on follow-up turns', () => {
    const multiTurn = scenarios.filter((scenario) => Array.isArray(scenario.turns));
    expect(multiTurn.map((scenario) => scenario.id)).toEqual([
      'multi-turn-shopping-list-for-it',
      'multi-turn-second-result',
      'multi-turn-focus-vs-subject',
    ]);
    for (const scenario of multiTurn) {
      expect(scenario.turns.length).toBeGreaterThanOrEqual(2);
      // The final turn must never re-search what earlier turns already established.
      const finalTurn = scenario.turns[scenario.turns.length - 1];
      expect(finalTurn.forbidTools).toEqual(expect.arrayContaining(['search_recipe_collection']));
    }
    // The shopping-list scenario ends in plain text, not a tool call.
    const shoppingList = scenarios.find((scenario) => scenario.id === 'multi-turn-shopping-list-for-it');
    expect(shoppingList?.turns[2].expectTextIncludes).toEqual(['•']);
  });
});
