import { supabase } from '@/lib/supabase';
import type { RecipeGraph } from '@/types/recipeGraph';
import { trackEvent } from '@/utils/analytics';

export interface RecipeCollectionCandidate {
  pageId: string;
  cookbookId: string;
  cookbookTitle: string;
  title: string;
  description?: string;
  category?: string;
  cuisine?: string;
  servings?: number;
  tags: string[];
  ingredientPreview: string[];
  updatedAt: string;
  score: number;
}

export type RecipeCollectionSearchOutcome =
  | { status: 'empty'; candidates: [] }
  | { status: 'ambiguous'; candidates: RecipeCollectionCandidate[] }
  | { status: 'resolved'; candidate: RecipeCollectionCandidate; candidates: RecipeCollectionCandidate[] };

export interface LoadedCollectionRecipe {
  pageId: string;
  cookbookId: string;
  recipeGraph: RecipeGraph;
}

interface SearchRecipeRow {
  page_id: string;
  cookbook_id: string;
  cookbook_title: string;
  title: string;
  description: string | null;
  category: string | null;
  cuisine: string | null;
  servings: number | null;
  tags: string[] | null;
  ingredient_preview: string[] | null;
  updated_at: string;
  score: number;
}

function mapCandidate(row: SearchRecipeRow): RecipeCollectionCandidate {
  return {
    pageId: row.page_id,
    cookbookId: row.cookbook_id,
    cookbookTitle: row.cookbook_title,
    title: row.title,
    ...(row.description ? { description: row.description } : {}),
    ...(row.category ? { category: row.category } : {}),
    ...(row.cuisine ? { cuisine: row.cuisine } : {}),
    ...(row.servings != null ? { servings: row.servings } : {}),
    tags: row.tags ?? [],
    ingredientPreview: row.ingredient_preview ?? [],
    updatedAt: row.updated_at,
    score: Number(row.score),
  };
}

export function classifyRecipeMatches(
  candidates: RecipeCollectionCandidate[],
): RecipeCollectionSearchOutcome {
  if (candidates.length === 0) return { status: 'empty', candidates: [] };
  if (candidates.length === 1) {
    return { status: 'resolved', candidate: candidates[0], candidates };
  }

  const [first, second] = candidates;
  if (first.score - second.score >= 0.75) {
    return { status: 'resolved', candidate: first, candidates };
  }
  return { status: 'ambiguous', candidates };
}

export async function searchRecipeCollection(input: {
  query: string;
  cookbookId?: string;
  recentFirst?: boolean;
  limit?: number;
}): Promise<RecipeCollectionSearchOutcome> {
  const query = input.query.trim();
  if (!query) return { status: 'empty', candidates: [] };
  const startedAt = Date.now();

  const { data, error } = await supabase
    .schema('nutriai')
    .rpc('search_recipe_collection', {
      search_query: query,
      cookbook_filter: input.cookbookId ?? null,
      recent_first: input.recentFirst ?? false,
      result_limit: Math.max(1, Math.min(input.limit ?? 5, 5)),
    });

  if (error) {
    trackEvent({
      type: 'nosh_collection_search_failed',
      data: { durationMs: Date.now() - startedAt },
    });
    throw error;
  }

  const outcome = classifyRecipeMatches(((data ?? []) as SearchRecipeRow[]).map(mapCandidate));
  trackEvent({
    type: 'nosh_collection_search_completed',
    data: {
      status: outcome.status,
      candidateCount: outcome.candidates.length,
      durationMs: Date.now() - startedAt,
      filteredToCookbook: Boolean(input.cookbookId),
      recentFirst: input.recentFirst === true,
    },
  });
  return outcome;
}

export async function loadRecipeFromCollection(pageId: string): Promise<LoadedCollectionRecipe> {
  const { data, error } = await supabase
    .schema('nutriai')
    .from('cookbook_pages')
    .select('id, cookbook_id, recipe_graph')
    .eq('id', pageId)
    .not('recipe_graph', 'is', null)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('That saved recipe is no longer available.');

  const row = data as { id: string; cookbook_id: string; recipe_graph: RecipeGraph };
  return {
    pageId: row.id,
    cookbookId: row.cookbook_id,
    recipeGraph: row.recipe_graph,
  };
}
