import createContextHook from '@nkzw/create-context-hook';
import { useState } from 'react';
import { parseRecipeSource } from '@/utils/cookbook/api';
import type { ParsedRecipeDraft } from '@/types/cookbook';

type ParseResult = {
  recipe: ParsedRecipeDraft;
  confidence: number;
  needsReview: boolean;
  reasons: string[];
};

export const [CookbookImportProvider, useCookbookImport] = createContextHook(() => {
  const [draft, setDraft] = useState<ParsedRecipeDraft | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [confidence, setConfidence] = useState(0);
  const [needsReview, setNeedsReview] = useState(false);
  const [reasons, setReasons] = useState<string[]>([]);

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
    parseSource,
  };
});
