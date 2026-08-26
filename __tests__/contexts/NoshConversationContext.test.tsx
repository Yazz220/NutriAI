import React from 'react';
import { act, renderHook } from '@testing-library/react-native';
import {
  NoshConversationProvider,
  useNoshConversation,
} from '@/contexts/NoshConversationContext';
import type { Cookbook, CookbookPage } from '@/types/cookbook';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <NoshConversationProvider>{children}</NoshConversationProvider>
);

const cookbook = { id: 'book-a', title: 'Dinner' } as Cookbook;
const firstPage = { id: 'page-a', cookbookId: 'book-a', title: 'Soup' } as CookbookPage;
const secondPage = { id: 'page-b', cookbookId: 'book-a', title: 'Pasta' } as CookbookPage;

describe('NoshConversationProvider', () => {
  it('keeps conversation focus fixed when the visible reader page changes', () => {
    const { result } = renderHook(() => useNoshConversation(), { wrapper });

    act(() => {
      result.current.setVisibleBookContext({ cookbook, pages: [firstPage, secondPage], page: firstPage });
      result.current.open('recipe-ask', {
        kind: 'recipe',
        cookbookId: cookbook.id,
        pageId: firstPage.id,
        title: firstPage.title,
      });
    });
    act(() => {
      result.current.setVisibleBookContext({ cookbook, pages: [firstPage, secondPage], page: secondPage });
    });

    expect(result.current.interaction.focus).toEqual(expect.objectContaining({ pageId: firstPage.id }));
    expect(result.current.interaction.visibleContext).toEqual(expect.objectContaining({ pageId: secondPage.id }));
  });

  it('makes the newly opened recipe authoritative immediately', () => {
    const { result } = renderHook(() => useNoshConversation(), { wrapper });

    act(() => {
      result.current.open('recipe-ask', {
        kind: 'recipe', cookbookId: 'book-a', pageId: 'page-a', title: 'Soup',
      });
    });
    act(() => {
      result.current.open('recipe-ask', {
        kind: 'recipe', cookbookId: 'book-a', pageId: 'page-b', title: 'Pasta',
      });
    });

    expect(result.current.interaction.focus).toEqual(expect.objectContaining({ pageId: 'page-b' }));
  });

  it('restores thread focus without restoring capture scratch state', () => {
    const { result } = renderHook(() => useNoshConversation(), { wrapper });

    act(() => {
      result.current.restoreInteraction({
        entryPoint: 'recipe-ask',
        task: 'recipe-help',
        focus: { kind: 'recipe', cookbookId: 'book-a', pageId: 'page-a', title: 'Soup' },
      });
    });

    expect(result.current.interaction.focus).toEqual(expect.objectContaining({ pageId: 'page-a' }));
    expect(result.current.pendingImageBase64).toBeNull();
  });
});
