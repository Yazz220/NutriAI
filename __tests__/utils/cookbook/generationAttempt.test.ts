import {
  getOrCreateGenerationAttempt,
  type GenerationAttempt,
} from '@/utils/cookbook/generationAttempt';

describe('generation attempts', () => {
  const payload = {
    cookbookId: 'cookbook-1',
    recipe: { title: 'Soup', ingredients: [], steps: [] },
  };

  it('reuses the request key when the reviewed payload has not changed', () => {
    const existing: GenerationAttempt = {
      key: 'generation-existing',
      fingerprint: JSON.stringify(payload),
    };

    expect(getOrCreateGenerationAttempt(existing, payload, () => 'generation-new')).toBe(existing);
  });

  it('creates a new request key when the reviewed payload changes', () => {
    const existing: GenerationAttempt = {
      key: 'generation-existing',
      fingerprint: JSON.stringify(payload),
    };
    const changedPayload = {
      ...payload,
      recipe: { ...payload.recipe, title: 'Tomato Soup' },
    };

    expect(getOrCreateGenerationAttempt(existing, changedPayload, () => 'generation-new')).toEqual({
      key: 'generation-new',
      fingerprint: JSON.stringify(changedPayload),
    });
  });
});
