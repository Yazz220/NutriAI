import createContextHook from '@nkzw/create-context-hook';
import { useCallback, useEffect, useRef, useState } from 'react';
import { parseRecipeSource } from '@/utils/cookbook/api';
import { loadSourceDraft, saveSourceDraft } from '@/utils/cookbook/importDraft';
import { useAuth } from '@/hooks/useAuth';
import type { ParsedRecipeDraft } from '@/types/cookbook';

type ParseResult = {
  recipe: ParsedRecipeDraft;
  confidence: number;
  needsReview: boolean;
  reasons: string[];
};

export const [CookbookImportProvider, useCookbookImport] = createContextHook(() => {
  const { user } = useAuth();
  const [draft, setDraft] = useState<ParsedRecipeDraft | null>(null);
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
  }, [updateSourceInput]);

  async function parseSource(payload: Record<string, unknown>) {
    setIsParsing(true);
    try {
      const result: ParseResult = await parseRecipeSource(payload);
      setDraft(result.recipe);
      setConfidence(result.confidence);
      setNeedsReview(result.needsReview);
      setReasons(result.reasons);
      return result;
    } finally {
      setIsParsing(false);
    }
  }

  return {
    draft,
    setDraft,
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
