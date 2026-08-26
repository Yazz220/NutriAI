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

export interface RecipeCollectionBrowseInput {
  cookbookIds?: string[];
  text?: string;
  ingredientsAll?: string[];
  ingredientsAny?: string[];
  excludeIngredients?: string[];
  tags?: string[];
  category?: string;
  cuisine?: string;
  maxTotalMinutes?: number;
  sort?: 'relevance' | 'recent' | 'title' | 'time';
  cursor?: string;
  limit?: number;
}

export interface RecipeCollectionBrowseResult {
  recipes: Array<RecipeCollectionCandidate & {
    totalTimeMinutes?: number;
    dietaryTags: string[];
    matchReason: 'text' | 'ingredients' | 'filters';
  }>;
  totalCount: number;
  nextCursor?: string;
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

interface BrowseRecipeRow extends SearchRecipeRow {
  total_time_minutes: number | null;
  dietary_tags: string[] | null;
  match_reason: 'text' | 'ingredients' | 'filters';
  total_count: number | string;
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

export async function browseRecipeCollection(
  input: RecipeCollectionBrowseInput,
): Promise<RecipeCollectionBrowseResult> {
  const offset = Number.parseInt(input.cursor ?? '0', 10);
  const safeOffset = Number.isFinite(offset) ? Math.max(0, Math.min(offset, 500)) : 0;
  const limit = Math.max(1, Math.min(input.limit ?? 12, 20));
  const startedAt = Date.now();
  const { data, error } = await supabase
    .schema('nutriai')
    .rpc('browse_recipe_collection', {
      cookbook_filters: input.cookbookIds?.length ? input.cookbookIds : null,
      text_filter: input.text?.trim() || null,
      ingredients_all: input.ingredientsAll?.length ? input.ingredientsAll : null,
      ingredients_any: input.ingredientsAny?.length ? input.ingredientsAny : null,
      exclude_ingredients: input.excludeIngredients?.length ? input.excludeIngredients : null,
      tag_filters: input.tags?.length ? input.tags : null,
      category_filter: input.category?.trim() || null,
      cuisine_filter: input.cuisine?.trim() || null,
      max_total_minutes: input.maxTotalMinutes ?? null,
      sort_mode: input.sort ?? (input.text ? 'relevance' : 'recent'),
      result_offset: safeOffset,
      result_limit: limit,
    });

  if (error) {
    trackEvent({
      type: 'nosh_collection_browse_failed',
      data: { durationMs: Date.now() - startedAt },
    });
    throw error;
  }

  const rows = (data ?? []) as BrowseRecipeRow[];
  const recipes = rows.map((row) => ({
    ...mapCandidate(row),
    ...(row.total_time_minutes != null ? { totalTimeMinutes: row.total_time_minutes } : {}),
    dietaryTags: row.dietary_tags ?? [],
    matchReason: row.match_reason,
  }));
  const totalCount = rows.length > 0 ? Number(rows[0].total_count) : 0;
  const nextOffset = safeOffset + recipes.length;

  trackEvent({
    type: 'nosh_collection_browse_completed',
    data: {
      resultCount: recipes.length,
      totalCount,
      durationMs: Date.now() - startedAt,
      filteredToCookbook: Boolean(input.cookbookIds?.length),
    },
  });

  return {
    recipes,
    totalCount,
    ...(nextOffset < totalCount ? { nextCursor: String(nextOffset) } : {}),
  };
}
