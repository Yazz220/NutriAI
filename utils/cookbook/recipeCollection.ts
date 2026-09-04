import { supabase } from '@/lib/supabase';
import { flattenIngredients, type RecipeGraph } from '@/types/recipeGraph';
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

interface FallbackRecipeRow {
  id: string;
  cookbook_id: string;
  recipe_graph: RecipeGraph;
  updated_at: string;
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

function normalized(value: string | undefined): string {
  return value?.trim().toLocaleLowerCase() ?? '';
}

function containsFilter(value: string | undefined, filter: string): boolean {
  return normalized(value).includes(normalized(filter));
}

function totalTimeFor(recipe: RecipeGraph): number | undefined {
  if (recipe.totalTimeMinutes != null) return recipe.totalTimeMinutes;
  if (recipe.prepTimeMinutes == null && recipe.cookTimeMinutes == null) return undefined;
  return (recipe.prepTimeMinutes ?? 0) + (recipe.cookTimeMinutes ?? 0);
}

async function browseRecipeCollectionFallback(
  input: RecipeCollectionBrowseInput,
  safeOffset: number,
  limit: number,
): Promise<RecipeCollectionBrowseResult> {
  const schema = supabase.schema('nutriai');
  const [cookbookResponse, pageResponse] = await Promise.all([
    schema.from('cookbooks').select('id, title'),
    schema
      .from('cookbook_pages')
      .select('id, cookbook_id, recipe_graph, updated_at')
      .not('recipe_graph', 'is', null)
      .limit(501),
  ]);

  if (cookbookResponse.error) throw cookbookResponse.error;
  if (pageResponse.error) throw pageResponse.error;

  const cookbookTitles = new Map(
    ((cookbookResponse.data ?? []) as Array<{ id: string; title: string }>)
      .map((cookbook) => [cookbook.id, cookbook.title]),
  );
  const textFilter = normalized(input.text);
  const allIngredients = (input.ingredientsAll ?? []).map(normalized).filter(Boolean);
  const anyIngredients = (input.ingredientsAny ?? []).map(normalized).filter(Boolean);
  const excludedIngredients = (input.excludeIngredients ?? []).map(normalized).filter(Boolean);
  const tagFilters = (input.tags ?? []).map(normalized).filter(Boolean);
  const categoryFilter = normalized(input.category);
  const cuisineFilter = normalized(input.cuisine);
  const cookbookFilters = new Set(input.cookbookIds ?? []);

  const matches = ((pageResponse.data ?? []) as FallbackRecipeRow[])
    .filter((row) => row.recipe_graph && typeof row.recipe_graph.title === 'string')
    .map((row) => {
      const recipe = row.recipe_graph;
      const ingredientNames = flattenIngredients(recipe.ingredientGroups ?? []).map((item) => normalized(item.name));
      const tags = [...(recipe.tags ?? []), ...(recipe.dietaryTags ?? [])];
      const searchableText = normalized([
        recipe.title,
        recipe.description,
        recipe.category,
        recipe.cuisine,
        ...tags,
        ...ingredientNames,
      ].filter(Boolean).join(' '));
      const totalTimeMinutes = totalTimeFor(recipe);
      const textTerms = textFilter.split(/\s+/).filter(Boolean);
      const matchesText = textTerms.length === 0 || textTerms.every((term) => searchableText.includes(term));
      const matchesAllIngredients = allIngredients.every((filter) => ingredientNames.some((name) => name.includes(filter)));
      const matchesAnyIngredient = anyIngredients.length === 0
        || anyIngredients.some((filter) => ingredientNames.some((name) => name.includes(filter)));
      const matchesExcludedIngredients = excludedIngredients.every(
        (filter) => ingredientNames.every((name) => !name.includes(filter)),
      );
      const normalizedTags = tags.map(normalized);
      const matchesTags = tagFilters.every((filter) => normalizedTags.some((tag) => tag.includes(filter)));
      const matchesCategory = !categoryFilter || containsFilter(recipe.category, categoryFilter);
      const matchesCuisine = !cuisineFilter || containsFilter(recipe.cuisine, cuisineFilter);
      const matchesTime = input.maxTotalMinutes == null
        || (totalTimeMinutes != null && totalTimeMinutes <= input.maxTotalMinutes);
      const matchesCookbook = cookbookFilters.size === 0 || cookbookFilters.has(row.cookbook_id);

      if (!matchesText || !matchesAllIngredients || !matchesAnyIngredient || !matchesExcludedIngredients
        || !matchesTags || !matchesCategory || !matchesCuisine || !matchesTime || !matchesCookbook) {
        return null;
      }

      const titleMatch = textFilter && normalized(recipe.title).includes(textFilter) ? 2 : 0;
      const score = titleMatch + textTerms.filter((term) => searchableText.includes(term)).length;
      const matchReason: 'text' | 'ingredients' | 'filters' = textFilter
        ? 'text'
        : allIngredients.length > 0 || anyIngredients.length > 0 || excludedIngredients.length > 0
          ? 'ingredients'
          : 'filters';

      return {
        pageId: row.id,
        cookbookId: row.cookbook_id,
        cookbookTitle: cookbookTitles.get(row.cookbook_id) ?? 'Cookbook',
        title: recipe.title,
        ...(recipe.description ? { description: recipe.description } : {}),
        ...(recipe.category ? { category: recipe.category } : {}),
        ...(recipe.cuisine ? { cuisine: recipe.cuisine } : {}),
        ...(recipe.servings != null ? { servings: recipe.servings } : {}),
        tags: recipe.tags ?? [],
        ingredientPreview: flattenIngredients(recipe.ingredientGroups ?? []).slice(0, 5).map((item) => item.name),
        updatedAt: row.updated_at || recipe.updatedAt,
        score,
        ...(totalTimeMinutes != null ? { totalTimeMinutes } : {}),
        dietaryTags: recipe.dietaryTags ?? [],
        matchReason,
      };
    })
    .filter((candidate): candidate is NonNullable<typeof candidate> => candidate != null);

  const sort = input.sort ?? (textFilter ? 'relevance' : 'recent');
  matches.sort((left, right) => {
    if (sort === 'title') return left.title.localeCompare(right.title);
    if (sort === 'time') return (left.totalTimeMinutes ?? Number.MAX_SAFE_INTEGER)
      - (right.totalTimeMinutes ?? Number.MAX_SAFE_INTEGER);
    if (sort === 'relevance') return right.score - left.score || right.updatedAt.localeCompare(left.updatedAt);
    return right.updatedAt.localeCompare(left.updatedAt);
  });

  const totalCount = matches.length;
  const recipes = matches.slice(safeOffset, safeOffset + limit);
  const nextOffset = safeOffset + recipes.length;
  return {
    recipes,
    totalCount,
    ...(nextOffset < totalCount ? { nextCursor: String(nextOffset) } : {}),
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
    if (error.code === 'PGRST202') {
      const fallbackResult = await browseRecipeCollectionFallback(input, safeOffset, limit);
      trackEvent({
        type: 'nosh_collection_browse_completed',
        data: {
          resultCount: fallbackResult.recipes.length,
          totalCount: fallbackResult.totalCount,
          durationMs: Date.now() - startedAt,
          filteredToCookbook: Boolean(input.cookbookIds?.length),
          usedFallback: true,
        },
      });
      return fallbackResult;
    }
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
