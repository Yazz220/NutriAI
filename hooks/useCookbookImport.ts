import createContextHook from '@nkzw/create-context-hook';
import { useCallback, useEffect, useRef, useState } from 'react';
import { extractRecipe } from '@/utils/cookbook/api';
import { loadSourceDraft, saveSourceDraft } from '@/utils/cookbook/importDraft';
import { parsedDraftFromRecipeGraph } from '@/utils/cookbook/draft';
import { useAuth } from '@/hooks/useAuth';
import type { ParsedRecipeDraft } from '@/types/cookbook';
import type { RecipeGraphDraft } from '@/types/recipeGraph';

type ExtractResult = {
  recipeGraph: RecipeGraphDraft;
  /** Legacy-format draft (bridge for the existing review form). */
  draft: ParsedRecipeDraft;
  confidence: number;
  needsReview: boolean;
  reasons: string[];
};

export const [CookbookImportProvider, useCookbookImport] = createContextHook(() => {
  const { user } = useAuth();
  const [draft, setDraft] = useState<ParsedRecipeDraft | null>(null);
  const [recipeGraphDraft, setRecipeGraphDraft] = useState<RecipeGraphDraft | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [confidence, setConfidence] = useState(0);
  const [needsReview, setNeedsReview] = useState(false);
  const [reasons, setReasons] = useState<string[]>([]);
  const [sourceInput, setSourceInput] = useState('');
  const [sourceImageBase64, setSourceImageBase64] = useState<string | null>(null);
  const sourceInputRef = useRef(sourceInput);
  const restoredUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    const userId = user?.id;
    if (!userId) {
      if (restoredUserIdRef.current) {
        restoredUserIdRef.current = null;
        sourceInputRef.current = '';
        setSourceInput('');
        setSourceImageBase64(null);
      }
      return;
    }

    let cancelled = false;
    const currentInput = sourceInputRef.current;
    if (restoredUserIdRef.current && restoredUserIdRef.current !== userId) {
      sourceInputRef.current = '';
      setSourceInput('');
    }

    if (currentInput && !restoredUserIdRef.current) {
      restoredUserIdRef.current = userId;
      saveSourceDraft(userId, currentInput).catch(() => {});
      return;
    }

    loadSourceDraft(userId)
      .then((savedInput) => {
        if (cancelled || sourceInputRef.current !== currentInput) return;
        restoredUserIdRef.current = userId;
        sourceInputRef.current = savedInput;
        setSourceInput(savedInput);
      })
      .catch(() => {
        if (!cancelled) restoredUserIdRef.current = userId;
      });

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const updateSourceInput = useCallback((input: string) => {
    sourceInputRef.current = input;
    setSourceInput(input);
    if (user?.id) saveSourceDraft(user.id, input).catch(() => {});
  }, [user?.id]);

  const clearSourceDraft = useCallback(() => {
    updateSourceInput('');
    setSourceImageBase64(null);
    setRecipeGraphDraft(null);
  }, [updateSourceInput]);

  /**
   * Call the extract-recipe Edge Function (Phase 2).
   * Accepts any source type (url, text, image, video) in a single call.
   * Returns a RecipeGraphDraft (canonical) and a ParsedRecipeDraft (bridge
   * for the existing review form).
   */
  async function parseSource(payload: {
    type: 'url' | 'text' | 'image' | 'video';
    input?: string;
    imageBase64?: string;
    videoUrl?: string;
  }): Promise<ExtractResult> {
    setIsParsing(true);
    try {
      const result = await extractRecipe(payload);
      const graph = result.recipeGraph;
      const legacyDraft = parsedDraftFromRecipeGraph(graph);

      setRecipeGraphDraft(graph);
      setDraft(legacyDraft);
      setConfidence(result.confidence);
      setNeedsReview(result.confidence < 0.7);
      setReasons(result.extractionNotes ?? []);

      return {
        recipeGraph: graph,
        draft: legacyDraft,
        confidence: result.confidence,
        needsReview: result.confidence < 0.7,
        reasons: result.extractionNotes ?? [],
      };
    } finally {
      setIsParsing(false);
    }
  }

  return {
    draft,
    setDraft,
    recipeGraphDraft,
    isParsing,
    confidence,
    needsReview,
    reasons,
    sourceInput,
    setSourceInput: updateSourceInput,
    sourceImageBase64,
    setSourceImageBase64,
    clearSourceDraft,
    parseSource,
  };
});
