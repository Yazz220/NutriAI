import {
  applyToolResult,
  deriveConversationState,
  emptyConversationState,
  formatConversationState,
  fromThreadStateRow,
  mergeWithPersisted,
  toThreadStateRow,
} from '@/supabase/functions/_shared/noshConversationState';

const fajitas = {
  pageId: 'page-fajitas',
  cookbookId: 'book-dinner',
  cookbookTitle: 'Weeknight Dinners',
  title: 'Chicken Fajitas',
  score: 9,
};
const tacos = { ...fajitas, pageId: 'page-tacos', title: 'Chicken Tacos', score: 8.9 };

function toolRound(id: string, name: string, args: Record<string, unknown>, result: unknown) {
  return [
    { role: 'assistant', content: '', tool_calls: [{ id, function: { name, arguments: JSON.stringify(args) } }] },
    { role: 'tool', tool_call_id: id, content: JSON.stringify(result) },
  ];
}

describe('Folio conversation working memory', () => {
  it('keeps the recipe found earlier as the subject of later unnamed follow-ups', () => {
    const messages = [
      { role: 'user', content: 'Do I have a chicken fajita recipe?' },
      ...toolRound('s1', 'search_recipe_collection', { query: 'chicken fajita' }, {
        status: 'resolved',
        candidate: fajitas,
        candidates: [fajitas, tacos],
      }),
      { role: 'assistant', content: 'Yes, Chicken Fajitas in Weeknight Dinners.' },
      { role: 'user', content: 'What ingredients do I need?' },
      ...toolRound('l1', 'load_recipe', { pageId: 'page-fajitas' }, {
        pageId: 'page-fajitas',
        cookbookId: 'book-dinner',
        recipeGraph: { title: 'Chicken Fajitas', ingredientGroups: [] },
      }),
      { role: 'assistant', content: 'Chicken, peppers, onions…' },
      { role: 'user', content: 'Make me a shopping list for it.' },
    ];

    const state = deriveConversationState(messages);

    expect(state.subject).toEqual({
      pageId: 'page-fajitas',
      title: 'Chicken Fajitas',
      cookbookId: 'book-dinner',
    });
    expect(state.subjectSource).toBe('tool');
    expect(state.recentCandidates.map((ref) => ref.pageId)).toEqual(['page-fajitas', 'page-tacos']);
    expect(state.loadedRecipes).toHaveLength(1);
    expect(formatConversationState(state).join('\n')).toContain('Current subject: Chicken Fajitas (pageId: page-fajitas)');
  });

  it('does not pick a subject from an ambiguous search but keeps the candidates for "the second one"', () => {
    const messages = [
      { role: 'user', content: 'Tell me about my chicken recipe' },
      ...toolRound('s1', 'search_recipe_collection', { query: 'chicken' }, {
        status: 'ambiguous',
        candidates: [fajitas, tacos],
      }),
    ];

    const state = deriveConversationState(messages);

    expect(state.subject).toBeNull();
    expect(state.recentCandidates.map((ref) => ref.title)).toEqual(['Chicken Fajitas', 'Chicken Tacos']);
    expect(formatConversationState(state)).toEqual(expect.arrayContaining([
      expect.stringContaining('2. Chicken Tacos in Weeknight Dinners (pageId: page-tacos)'),
    ]));
  });

  it('treats a sole browse result as the subject', () => {
    const state = applyToolResult(emptyConversationState(), 'browse_recipe_collection', {
      recipes: [{ ...fajitas, totalTimeMinutes: 30 }],
      totalCount: 1,
    });

    expect(state.subject?.pageId).toBe('page-fajitas');
  });

  it('lets the opened recipe be the subject until the conversation resolves another one', () => {
    const focus = { pageId: 'page-soup', title: 'Tomato Soup', cookbookId: 'book-soups' };

    expect(deriveConversationState([{ role: 'user', content: 'What is the next step?' }], focus)).toEqual(
      expect.objectContaining({ subject: focus, subjectSource: 'focus' }),
    );

    const afterSearch = deriveConversationState([
      { role: 'user', content: 'Do I have fajitas?' },
      ...toolRound('s1', 'search_recipe_collection', { query: 'fajitas' }, {
        status: 'resolved',
        candidate: fajitas,
        candidates: [fajitas],
      }),
    ], focus);
    expect(afterSearch.subject?.pageId).toBe('page-fajitas');
    expect(afterSearch.subjectSource).toBe('tool');
  });

  it('lets a focus accepted later in the thread override an older chat subject', () => {
    const focus = { pageId: 'page-soup', title: 'Tomato Soup', cookbookId: 'book-soups' };
    const messages = [
      { role: 'user', content: 'Do I have fajitas?' },
      ...toolRound('s1', 'search_recipe_collection', { query: 'fajitas' }, {
        status: 'resolved',
        candidate: fajitas,
        candidates: [fajitas],
      }),
      { role: 'assistant', content: 'Yes.' },
      { role: 'user', content: 'What is in this recipe?' },
    ];

    expect(deriveConversationState(messages, focus, 1).subject?.pageId).toBe('page-soup');
    expect(deriveConversationState(messages, focus, 0).subject?.pageId).toBe('page-fajitas');
  });

  it('follows a moved recipe to its new page id and ignores tool errors', () => {
    let state = applyToolResult(emptyConversationState(), 'open_recipe', {
      success: true,
      pageId: 'page-fajitas',
      cookbookId: 'book-dinner',
      title: 'Chicken Fajitas',
    });
    state = applyToolResult(state, 'load_recipe', { error: 'unavailable' });
    expect(state.subject?.pageId).toBe('page-fajitas');

    state = applyToolResult(state, 'organize_recipe', {
      resultPageId: 'page-fajitas-copy',
      destinationCookbookId: 'book-mexican',
    }, { action: 'move', pageId: 'page-fajitas', destinationCookbookId: 'book-mexican' });
    expect(state.subject).toEqual({
      pageId: 'page-fajitas-copy',
      title: 'Chicken Fajitas',
      cookbookId: 'book-mexican',
    });
  });

  it('includes the active task in the formatted state block', () => {
    const state = { ...emptyConversationState(), activeTask: 'recipe-help' };
    expect(formatConversationState(state).join('\n')).toContain('Active task: recipe-help');
  });

  it('omits the active task line when no task is set', () => {
    const lines = formatConversationState(emptyConversationState());
    expect(lines.some((line) => line.startsWith('Active task:'))).toBe(false);
  });

  it('round-trips state through toThreadStateRow and fromThreadStateRow', () => {
    const state: ReturnType<typeof emptyConversationState> = {
      subject: { pageId: 'page-soup', title: 'Tomato Soup', cookbookId: 'book-soups' },
      subjectSource: 'tool',
      recentCandidates: [{ pageId: 'page-soup', title: 'Tomato Soup', cookbookTitle: 'Soups' }],
      loadedRecipes: [{ pageId: 'page-soup', title: 'Tomato Soup' }],
      activeTask: 'recipe-help',
    };
    const row = toThreadStateRow(state);
    expect(row).toEqual({
      subject_page_id: 'page-soup',
      subject_title: 'Tomato Soup',
      subject_cookbook_id: 'book-soups',
      subject_source: 'tool',
      recent_candidates: [{ pageId: 'page-soup', title: 'Tomato Soup', cookbookTitle: 'Soups' }],
      loaded_recipes: [{ pageId: 'page-soup', title: 'Tomato Soup' }],
      active_task: 'recipe-help',
    });
    const restored = fromThreadStateRow(row);
    expect(restored).toEqual(state);
  });

  it('handles null subject and empty lists in round-trip', () => {
    const state = emptyConversationState();
    const restored = fromThreadStateRow(toThreadStateRow(state));
    expect(restored).toEqual({ ...emptyConversationState(), activeTask: null });
  });

  it('falls back to empty state from an invalid row', () => {
    expect(fromThreadStateRow(null)).toEqual(emptyConversationState());
    expect(fromThreadStateRow('not an object')).toEqual(emptyConversationState());
  });

  it('mergeWithPersisted uses derived values when available and falls back to persisted', () => {
    const derived = {
      ...emptyConversationState(),
      subject: { pageId: 'page-fajitas', title: 'Chicken Fajitas' },
      subjectSource: 'tool' as const,
      recentCandidates: [{ pageId: 'page-fajitas', title: 'Chicken Fajitas' }],
      activeTask: 'recipe-help',
    };
    const persisted = {
      ...emptyConversationState(),
      subject: { pageId: 'page-old-soup', title: 'Old Soup' },
      subjectSource: 'tool' as const,
      recentCandidates: [{ pageId: 'page-old-soup', title: 'Old Soup' }],
      loadedRecipes: [{ pageId: 'page-old-soup', title: 'Old Soup' }],
      activeTask: 'collection',
    };

    // Derived wins for subject, candidates, and activeTask.
    const merged = mergeWithPersisted(derived, persisted);
    expect(merged.subject?.pageId).toBe('page-fajitas');
    expect(merged.recentCandidates[0]?.pageId).toBe('page-fajitas');
    expect(merged.activeTask).toBe('recipe-help');
    // Persisted fills in loadedRecipes (not in derived).
    expect(merged.loadedRecipes[0]?.pageId).toBe('page-old-soup');
  });

  it('mergeWithPersisted uses persisted subject when derivation found none (compacted history)', () => {
    const derived = emptyConversationState();
    const persisted = {
      ...emptyConversationState(),
      subject: { pageId: 'page-fajitas', title: 'Chicken Fajitas' },
      subjectSource: 'tool' as const,
      activeTask: 'recipe-help',
    };

    const merged = mergeWithPersisted(derived, persisted);
    expect(merged.subject?.pageId).toBe('page-fajitas');
    expect(merged.subjectSource).toBe('tool');
    expect(merged.activeTask).toBe('recipe-help');
  });

  it('mergeWithPersisted uses persisted activeTask when derived has none', () => {
    const derived = { ...emptyConversationState(), subject: null };
    const persisted = { ...emptyConversationState(), activeTask: 'collection' };

    expect(mergeWithPersisted(derived, persisted).activeTask).toBe('collection');
  });
});
