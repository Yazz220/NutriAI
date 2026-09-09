import {
  isNoshInteractionSession,
  isSameNoshFocus,
  shouldOfferNoshFocusTransition,
  taskForEntryPoint,
} from '@/types/noshInteraction';

describe('Folio interaction model', () => {
  it('maps purpose-built entry points to active tasks', () => {
    expect(taskForEntryPoint('shelf-nosh')).toBe('collection');
    expect(taskForEntryPoint('cookbook-nosh')).toBe('cookbook-help');
    expect(taskForEntryPoint('recipe-ask')).toBe('recipe-help');
    expect(taskForEntryPoint('cookbook-add')).toBe('capture');
    expect(taskForEntryPoint('share-to-nosh')).toBe('capture');
    expect(taskForEntryPoint('settings-preferences')).toBe('preferences');
  });

  it('compares focus by stable identity rather than labels', () => {
    expect(isSameNoshFocus(
      { kind: 'recipe', cookbookId: 'book-a', pageId: 'page-a', title: 'Old title' },
      { kind: 'recipe', cookbookId: 'book-a', pageId: 'page-a', title: 'New title' },
    )).toBe(true);
    expect(isSameNoshFocus(
      { kind: 'recipe', cookbookId: 'book-a', pageId: 'page-a', title: 'Soup' },
      { kind: 'recipe', cookbookId: 'book-a', pageId: 'page-b', title: 'Soup' },
    )).toBe(false);
  });

  it('accepts persisted session metadata and rejects incomplete focus', () => {
    expect(isNoshInteractionSession({
      entryPoint: 'recipe-ask',
      task: 'recipe-help',
      focus: { kind: 'recipe', cookbookId: 'book-a', pageId: 'page-a', title: 'Soup' },
    })).toBe(true);
    expect(isNoshInteractionSession({
      entryPoint: 'recipe-ask',
      task: 'recipe-help',
      focus: { kind: 'recipe', pageId: 'page-a' },
    })).toBe(false);
  });

  it('protects a nonempty conversation from a silent recipe focus change', () => {
    const current = {
      entryPoint: 'recipe-ask',
      task: 'recipe-help',
      focus: { kind: 'recipe', cookbookId: 'book-a', pageId: 'page-a', title: 'Soup' },
    } as const;
    const requested = {
      entryPoint: 'recipe-ask',
      task: 'recipe-help',
      focus: { kind: 'recipe', cookbookId: 'book-a', pageId: 'page-b', title: 'Pasta' },
    } as const;

    expect(shouldOfferNoshFocusTransition(current, requested, true)).toBe(true);
    expect(shouldOfferNoshFocusTransition(current, requested, false)).toBe(false);
    expect(shouldOfferNoshFocusTransition(current, current, true)).toBe(false);
    expect(shouldOfferNoshFocusTransition(current, {
      entryPoint: 'cookbook-nosh',
      task: 'cookbook-help',
      focus: { kind: 'cookbook', cookbookId: 'book-a', title: 'Dinner' },
    }, true)).toBe(true);
  });
});

