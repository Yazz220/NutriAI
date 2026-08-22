import {
  isNoshInteractionSession,
  isSameNoshFocus,
  taskForEntryPoint,
} from '@/types/noshInteraction';

describe('Nosh interaction model', () => {
  it('maps purpose-built entry points to active tasks', () => {
    expect(taskForEntryPoint('shelf-nosh')).toBe('collection');
    expect(taskForEntryPoint('recipe-ask')).toBe('recipe-help');
    expect(taskForEntryPoint('cookbook-add')).toBe('capture');
    expect(taskForEntryPoint('share-to-nosh')).toBe('capture');
    expect(taskForEntryPoint('walkthrough')).toBe('walkthrough');
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
});

