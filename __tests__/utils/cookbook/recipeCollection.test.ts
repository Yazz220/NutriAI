import {
  classifyRecipeMatches,
  browseRecipeCollection,
  loadRecipeFromCollection,
  searchRecipeCollection,
  type RecipeCollectionCandidate,
} from '@/utils/cookbook/recipeCollection';
import { supabase } from '@/lib/supabase';

jest.mock('@/lib/supabase', () => ({
  supabase: { schema: jest.fn() },
}));

const mockedSchema = jest.mocked(supabase.schema);

const candidate = (overrides: Partial<RecipeCollectionCandidate> = {}): RecipeCollectionCandidate => ({
  pageId: 'page-baked',
  cookbookId: 'book-desserts',
  cookbookTitle: 'Desserts',
  title: 'Baked Cheesecake',
  tags: [],
  ingredientPreview: ['cream cheese', 'eggs'],
  updatedAt: '2026-08-21T00:00:00.000Z',
  score: 1,
  ...overrides,
});

describe('recipe collection retrieval', () => {
  beforeEach(() => mockedSchema.mockReset());

  it('returns an ordinary empty outcome when nothing matches', () => {
    expect(classifyRecipeMatches([])).toEqual({ status: 'empty', candidates: [] });
  });

  it('keeps close matches ambiguous instead of guessing', () => {
    const matches = [
      candidate({ score: 1.2 }),
      candidate({ pageId: 'page-no-bake', title: 'No-Bake Cheesecake', score: 1.1 }),
    ];

    expect(classifyRecipeMatches(matches)).toEqual({ status: 'ambiguous', candidates: matches });
  });

  it('resolves a clearly stronger exact match', () => {
    const matches = [
      candidate({ score: 6.2 }),
      candidate({ pageId: 'page-no-bake', title: 'No-Bake Cheesecake', score: 1.1 }),
    ];

    expect(classifyRecipeMatches(matches)).toEqual({
      status: 'resolved',
      candidate: matches[0],
      candidates: matches,
    });
  });

  it('searches through the authenticated private-schema RPC', async () => {
    const rpc = jest.fn().mockResolvedValue({
      data: [{
        page_id: 'page-baked',
        cookbook_id: 'book-desserts',
        cookbook_title: 'Desserts',
        title: 'Baked Cheesecake',
        description: null,
        category: 'desserts',
        cuisine: 'American',
        servings: 8,
        tags: ['baked'],
        ingredient_preview: ['cream cheese', 'eggs'],
        updated_at: '2026-08-21T00:00:00.000Z',
        score: 6.2,
      }],
      error: null,
    });
    mockedSchema.mockReturnValue({ rpc } as never);

    await expect(searchRecipeCollection({ query: '  cheesecake  ', limit: 20 })).resolves.toEqual(
      expect.objectContaining({ status: 'resolved' }),
    );
    expect(mockedSchema).toHaveBeenCalledWith('nutriai');
    expect(rpc).toHaveBeenCalledWith('search_recipe_collection', {
      search_query: 'cheesecake',
      cookbook_filter: null,
      recent_first: false,
      result_limit: 5,
    });
  });

  it('loads the canonical RecipeGraph only after a page is selected', async () => {
    const graph = {
      title: 'Baked Cheesecake',
      servings: 8,
      ingredientGroups: [{
        id: 'filling',
        ingredients: [
          { name: 'cream cheese', quantity: '680', unit: 'g' },
          { name: 'eggs', quantity: '3' },
        ],
      }],
    };
    const maybeSingle = jest.fn().mockResolvedValue({
      data: { id: 'page-baked', cookbook_id: 'book-desserts', recipe_graph: graph },
      error: null,
    });
    const not = jest.fn().mockReturnValue({ maybeSingle });
    const eq = jest.fn().mockReturnValue({ not });
    const select = jest.fn().mockReturnValue({ eq });
    const from = jest.fn().mockReturnValue({ select });
    mockedSchema.mockReturnValue({ from } as never);

    await expect(loadRecipeFromCollection('page-baked')).resolves.toEqual({
      pageId: 'page-baked',
      cookbookId: 'book-desserts',
      recipeGraph: graph,
    });
    expect((await loadRecipeFromCollection('page-baked')).recipeGraph.ingredientGroups)
      .toEqual(graph.ingredientGroups);
    expect(select).toHaveBeenCalledWith('id, cookbook_id, recipe_graph');
  });

  it('browses compact recipe cards with deterministic filters and pagination', async () => {
    const rpc = jest.fn().mockResolvedValue({
      data: [{
        page_id: 'page-soup',
        cookbook_id: 'book-dinner',
        cookbook_title: 'Dinner',
        title: 'Tomato Soup',
        description: 'Quick soup',
        category: 'soup',
        cuisine: null,
        servings: 4,
        total_time_minutes: 25,
        tags: ['weeknight'],
        dietary_tags: ['vegetarian'],
        ingredient_preview: ['tomatoes', 'stock'],
        updated_at: '2026-08-25T00:00:00.000Z',
        score: 2.4,
        match_reason: 'ingredients',
        total_count: 3,
      }],
      error: null,
    });
    mockedSchema.mockReturnValue({ rpc } as never);

    await expect(browseRecipeCollection({
      ingredientsAny: ['tomatoes'],
      maxTotalMinutes: 30,
      limit: 1,
    })).resolves.toEqual({
      recipes: [expect.objectContaining({
        pageId: 'page-soup',
        totalTimeMinutes: 25,
        dietaryTags: ['vegetarian'],
        matchReason: 'ingredients',
      })],
      totalCount: 3,
      nextCursor: '1',
    });
    expect(rpc).toHaveBeenCalledWith('browse_recipe_collection', expect.objectContaining({
      ingredients_any: ['tomatoes'],
      max_total_minutes: 30,
      result_offset: 0,
      result_limit: 1,
      sort_mode: 'recent',
    }));
  });
});
