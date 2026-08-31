import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { Cookbook, CookbookPage } from '@/types/cookbook';
import type { RecipeGraph } from '@/types/recipeGraph';
import {
  taskForEntryPoint,
  type NoshEntryPoint,
  type NoshFocus,
  type NoshInteractionEnvelope,
  type NoshInteractionSession,
  type NoshVisibleContext,
} from '@/types/noshInteraction';

export interface NoshVisibleBookContext {
  cookbook: Cookbook | null;
  pages: CookbookPage[];
  page: CookbookPage | null;
}

interface NoshConversationValue {
  visible: boolean;
  interaction: NoshInteractionEnvelope;
  visibleBookContext: NoshVisibleBookContext;
  pendingImageBase64: string | null;
  pendingImageMimeType: string | null;
  recipePreview: { pageId: string; graph: RecipeGraph } | null;
  open: (entryPoint: NoshEntryPoint, focus?: NoshFocus) => void;
  requestFocus: (focus: NoshFocus) => void;
  restoreInteraction: (session: NoshInteractionSession) => void;
  close: () => void;
  setVisibleBookContext: (context: NoshVisibleBookContext) => void;
  updateVisiblePage: (page: CookbookPage) => void;
  setPendingImageBase64: (value: string | null) => void;
  setPendingImageMimeType: (value: string | null) => void;
  setRecipePreview: (preview: { pageId: string; graph: RecipeGraph } | null) => void;
}

export const EMPTY_VISIBLE_BOOK_CONTEXT: NoshVisibleBookContext = {
  cookbook: null,
  pages: [],
  page: null,
};

const DEFAULT_SESSION: NoshInteractionSession = {
  entryPoint: 'shelf-nosh',
  task: 'collection',
  focus: { kind: 'collection' },
};

function visibleContextFor(bookContext: NoshVisibleBookContext): NoshVisibleContext {
  if (bookContext.cookbook && bookContext.page) {
    return {
      kind: 'recipe',
      cookbookId: bookContext.cookbook.id,
      pageId: bookContext.page.id,
      title: bookContext.page.title,
    };
  }
  if (bookContext.cookbook) {
    return { kind: 'cookbook', cookbookId: bookContext.cookbook.id, title: bookContext.cookbook.title };
  }
  return { kind: 'collection' };
}

const NoshConversationContext = createContext<NoshConversationValue | null>(null);

export function NoshConversationProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [session, setSession] = useState<NoshInteractionSession>(DEFAULT_SESSION);
  const [visibleBookContext, setVisibleBookContextState] = useState<NoshVisibleBookContext>(
    EMPTY_VISIBLE_BOOK_CONTEXT,
  );
  const [pendingImageBase64, setPendingImageBase64] = useState<string | null>(null);
  const [pendingImageMimeType, setPendingImageMimeType] = useState<string | null>(null);
  const [recipePreview, setRecipePreview] = useState<{ pageId: string; graph: RecipeGraph } | null>(null);

  const open = useCallback((entryPoint: NoshEntryPoint, focus?: NoshFocus) => {
    setSession((current) => {
      const nextFocus = focus ?? current.focus;
      return { entryPoint, task: taskForEntryPoint(entryPoint), focus: nextFocus };
    });
    setVisible(true);
  }, []);

  const requestFocus = useCallback((focus: NoshFocus) => {
    setSession((current) => ({
      ...current,
      task: focus.kind === 'recipe' ? 'recipe-help' : focus.kind === 'capture' ? 'capture' : 'collection',
      focus,
    }));
  }, []);

  const restoreInteraction = useCallback((next: NoshInteractionSession) => {
    setSession(next);
  }, []);

  const close = useCallback(() => setVisible(false), []);

  const setVisibleBookContext = useCallback((next: NoshVisibleBookContext) => {
    setVisibleBookContextState((current) => (
      current.cookbook === next.cookbook && current.pages === next.pages && current.page === next.page
        ? current
        : next
    ));
  }, []);

  const updateVisiblePage = useCallback((page: CookbookPage) => {
    setVisibleBookContextState((current) => ({
      ...current,
      page: current.page?.id === page.id ? page : current.page,
      pages: current.pages.some((candidate) => candidate.id === page.id)
        ? current.pages.map((candidate) => candidate.id === page.id ? page : candidate)
        : current.pages,
    }));
  }, []);

  const interaction = useMemo<NoshInteractionEnvelope>(() => ({
    ...session,
    visibleContext: visibleContextFor(visibleBookContext),
  }), [session, visibleBookContext]);

  const value = useMemo<NoshConversationValue>(() => ({
    visible,
    interaction,
    visibleBookContext,
    pendingImageBase64,
    pendingImageMimeType,
    recipePreview,
    open,
    requestFocus,
    restoreInteraction,
    close,
    setVisibleBookContext,
    updateVisiblePage,
    setPendingImageBase64,
    setPendingImageMimeType,
    setRecipePreview,
  }), [
    visible,
    interaction,
    visibleBookContext,
    pendingImageBase64,
    pendingImageMimeType,
    recipePreview,
    open,
    requestFocus,
    restoreInteraction,
    close,
    setVisibleBookContext,
    updateVisiblePage,
  ]);

  return (
    <NoshConversationContext.Provider value={value}>
      {children}
    </NoshConversationContext.Provider>
  );
}

export function useNoshConversation(): NoshConversationValue {
  const value = useContext(NoshConversationContext);
  if (!value) throw new Error('useNoshConversation must be used inside NoshConversationProvider');
  return value;
}
