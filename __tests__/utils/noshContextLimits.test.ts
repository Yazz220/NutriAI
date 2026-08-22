import {
  MAX_LOADED_RECIPES_PER_REQUEST,
  countCompletedToolCallsSinceLatestUser,
} from '@/supabase/functions/_shared/noshContextLimits';

describe('Nosh recipe context limits', () => {
  it('counts only completed recipe loads for the latest user request', () => {
    const messages = [
      { role: 'user', content: 'Open my noodles' },
      {
        role: 'assistant',
        tool_calls: [{ id: 'old-load', function: { name: 'load_recipe' } }],
      },
      { role: 'tool', tool_call_id: 'old-load', content: '{}' },
      { role: 'user', content: 'Compare the cheesecake recipes' },
      {
        role: 'assistant',
        tool_calls: [
          { id: 'search', function: { name: 'search_recipe_collection' } },
          { id: 'load-a', function: { name: 'load_recipe' } },
          { id: 'load-b', function: { name: 'load_recipe' } },
        ],
      },
      { role: 'tool', tool_call_id: 'search', content: '{}' },
      { role: 'tool', tool_call_id: 'load-a', content: '{}' },
      { role: 'tool', tool_call_id: 'load-b', content: '{}' },
    ];

    expect(countCompletedToolCallsSinceLatestUser(messages, 'load_recipe')).toBe(2);
    expect(MAX_LOADED_RECIPES_PER_REQUEST).toBe(3);
  });

  it('does not count an unfinished tool call', () => {
    const messages = [
      { role: 'user', content: 'Compare these' },
      {
        role: 'assistant',
        tool_calls: [{ id: 'pending', function: { name: 'load_recipe' } }],
      },
    ];

    expect(countCompletedToolCallsSinceLatestUser(messages, 'load_recipe')).toBe(0);
  });
});
