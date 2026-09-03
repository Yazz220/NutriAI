import {
  MAX_LOADED_RECIPES_PER_REQUEST,
  compactChatHistory,
  countCompletedToolCallsSinceLatestUser,
} from '@/supabase/functions/_shared/noshContextLimits';

describe('Folio recipe context limits', () => {
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

  it('keeps compact recipe references while removing old full-recipe payloads', () => {
    const messages = [
      { role: 'user', content: 'Tell me about soup' },
      { role: 'assistant', content: '', tool_calls: [{ id: 'old', function: { name: 'load_recipe' } }] },
      {
        role: 'tool',
        tool_call_id: 'old',
        content: JSON.stringify({
          pageId: 'page-soup',
          cookbookId: 'book-dinner',
          recipeGraph: {
            title: 'Tomato Soup',
            servings: 4,
            ingredientGroups: [{ ingredients: [{ name: 'tomato' }] }],
            notes: 'x'.repeat(5000),
          },
        }),
      },
      { role: 'assistant', content: 'It is a tomato soup.' },
      { role: 'user', content: 'Can I use oat cream instead?' },
      { role: 'assistant', content: '', tool_calls: [{ id: 'current', function: { name: 'substitute_ingredient' } }] },
      { role: 'tool', tool_call_id: 'current', content: '{"accepted":true}' },
    ];

    expect(compactChatHistory(messages, 1000)).toEqual([
      messages[0],
      messages[1],
      {
        role: 'tool',
        tool_call_id: 'old',
        content: JSON.stringify({
          summary: true,
          pageId: 'page-soup',
          cookbookId: 'book-dinner',
          title: 'Tomato Soup',
          servings: 4,
          ingredientCount: 1,
          note: 'Full recipe omitted from history. Call load_recipe with this pageId for exact quantities.',
        }),
      },
      messages[3],
      messages[4],
      messages[5],
      messages[6],
    ]);
  });

  it('keeps search results as compact candidate lists and drops unfinished rounds', () => {
    const candidate = {
      pageId: 'page-fajitas',
      cookbookId: 'book-a',
      cookbookTitle: 'Weeknights',
      title: 'Chicken Fajitas',
      description: 'd'.repeat(500),
      ingredientPreview: ['chicken', 'peppers'],
      score: 9,
    };
    const messages = [
      { role: 'user', content: 'Do I have fajitas?' },
      { role: 'assistant', content: '', tool_calls: [{ id: 'search', function: { name: 'search_recipe_collection' } }] },
      {
        role: 'tool',
        tool_call_id: 'search',
        content: JSON.stringify({ status: 'resolved', candidate, candidates: [candidate] }),
      },
      { role: 'assistant', content: 'Yes.' },
      { role: 'assistant', content: '', tool_calls: [{ id: 'never-finished', function: { name: 'load_recipe' } }] },
      { role: 'tool', tool_call_id: 'orphan', content: '{}' },
      { role: 'user', content: 'What is in it?' },
    ];

    const compacted = compactChatHistory(messages, 5000);

    expect(compacted.map((message) => message.role)).toEqual(['user', 'assistant', 'tool', 'assistant', 'user']);
    expect(JSON.parse(String(compacted[2].content))).toEqual({
      summary: true,
      status: 'resolved',
      candidate: { pageId: 'page-fajitas', title: 'Chicken Fajitas', cookbookTitle: 'Weeknights' },
      candidates: [{ pageId: 'page-fajitas', title: 'Chicken Fajitas', cookbookTitle: 'Weeknights' }],
    });
  });

  it('drops the oldest history first when the budget is tight', () => {
    const messages = [
      { role: 'user', content: 'a'.repeat(400) },
      { role: 'assistant', content: 'b'.repeat(400) },
      { role: 'user', content: 'c'.repeat(100) },
      { role: 'assistant', content: 'd'.repeat(100) },
      { role: 'user', content: 'now' },
    ];

    expect(compactChatHistory(messages, 400)).toEqual([messages[2], messages[3], messages[4]]);
  });
});
