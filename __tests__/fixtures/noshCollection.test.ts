import {
  collectionCookbooks,
  collectionPages,
  voiceTranscriptionQueries,
} from '@/__tests__/fixtures/noshCollection';

describe('Nosh collection retrieval fixtures', () => {
  it('represents two books with complete, overlapping cheesecake recipes', () => {
    expect(collectionCookbooks).toHaveLength(2);
    expect(new Set(collectionPages.map((page) => page.cookbookId))).toEqual(
      new Set(collectionCookbooks.map((cookbook) => cookbook.id)),
    );
    expect(collectionPages.every((page) => page.title.toLowerCase().includes('cheesecake'))).toBe(true);

    for (const page of collectionPages) {
      expect(page.recipeGraph?.ingredientGroups[0]?.ingredients.length).toBeGreaterThan(0);
      expect(page.recipeGraph?.stepGroups[0]?.steps.length).toBeGreaterThan(0);
    }
  });

  it('includes exact, voice-spaced, and ambiguous retrieval wording', () => {
    expect(voiceTranscriptionQueries).toEqual({
      intended: 'cheesecake',
      spaced: 'cheese cake',
      ambiguous: 'my cheesecake recipe',
    });
  });
});
