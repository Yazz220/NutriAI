import createContextHook from '@nkzw/create-context-hook';
import { useState } from 'react';
import { parseRecipeSource } from '@/utils/cookbook/api';
import type { ParsedRecipeDraft, RecipeSourceType } from '@/types/cookbook';

type ParseResult = {
  recipe: ParsedRecipeDraft;
  confidence: number;
  needsReview: boolean;
  reasons: string[];
};

function localDraftFromPayload(payload: Record<string, unknown>): ParseResult {
  const type = payload.type === 'url' || payload.type === 'image' || payload.type === 'video'
    ? payload.type
    : 'text';
  const input = typeof payload.input === 'string' ? payload.input.trim() : '';
  const firstLine = input.split('\n').map((line) => line.trim()).find(Boolean);

  return {
    recipe: {
      title: firstLine || (type === 'image' ? 'Imported Recipe Image' : 'Imported Recipe'),
      description: input || undefined,
      servings: 4,
      prepTime: 0,
      cookTime: 0,
      ingredients: [],
      steps: [],
      sourceType: type as RecipeSourceType,
      sourceUrl: type === 'url' || type === 'video' ? input : undefined,
      tags: [],
      category: 'favorites',
      confidence: 0.2,
    },
    confidence: 0.2,
    needsReview: true,
    reasons: ['Parser service is not connected yet'],
  };
}

export const [CookbookImportProvider, useCookbookImport] = createContextHook(() => {
  const [draft, setDraft] = useState<ParsedRecipeDraft | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [confidence, setConfidence] = useState(0);
  const [needsReview, setNeedsReview] = useState(false);
  const [reasons, setReasons] = useState<string[]>([]);

  async function parseSource(payload: Record<string, unknown>) {
    setIsParsing(true);
    try {
      let result: ParseResult;
      try {
        result = await parseRecipeSource(payload);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (!message.includes('(404)')) {
          throw err;
        }
        result = localDraftFromPayload(payload);
      }
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
