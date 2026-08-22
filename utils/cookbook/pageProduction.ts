import {
  fetchPageById,
  generateRecipePageImage,
} from '@/utils/cookbook/api';
import { pollCookbookGeneration } from '@/utils/cookbook/generationPolling';
import type { CookbookPage, CookbookStyleId, GeneratedRecipePage } from '@/types/cookbook';
import type { RecipeGraphDraft } from '@/types/recipeGraph';

interface FinishRecipePageImageInput {
  cookbookId: string;
  pageId: string;
  recipeGraph: RecipeGraphDraft;
  styleId: CookbookStyleId;
  styleRevision?: number;
  styleReferences?: string[];
  idempotencyKey: string;
}

interface FinishRecipePageCandidateInput extends FinishRecipePageImageInput {
  artDirection?: string;
  referenceArtUrl?: string;
}

/**
 * Finish the asynchronous half of straight-to-book production. The page row
 * already exists, so every poll targets the same page and generation request.
 */
export async function finishRecipePageImage(
  input: FinishRecipePageImageInput,
): Promise<CookbookPage> {
  return pollCookbookGeneration(async () => {
    const result = await generateRecipePageImage(input);
    if (!('pageImage' in result)) return result;

    const page = await fetchPageById(input.pageId);
    if (!page) throw new Error('Page not found after art generation');
    return { status: 'ready' as const, page };
  });
}

/**
 * Generate a complete replacement page without changing the selected version.
 */
export async function finishRecipePageCandidate(
  input: FinishRecipePageCandidateInput,
): Promise<GeneratedRecipePage> {
  return pollCookbookGeneration(async () => {
    const result = await generateRecipePageImage({ ...input, selectOnComplete: false });
    if (!('pageImage' in result)) return result;
    return { status: 'ready' as const, page: result.pageImage };
  });
}
