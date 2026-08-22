import {
  classifyRecipeMatches,
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
});
