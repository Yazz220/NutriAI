import { createRecipePageWithGraph } from '@/utils/cookbook/api';
import { supabase } from '@/lib/supabase';
import type { RecipeGraphDraft } from '@/types/recipeGraph';

jest.mock('@/lib/supabase', () => ({
  supabase: {
    schema: jest.fn(),
  },
}));

const mockSchema = supabase.schema as jest.Mock;

const recipeGraph: RecipeGraphDraft = {
  title: 'Tomato Toast',
  servings: 2,
  category: 'breakfast',
  ingredientGroups: [
    {
      id: 'main',
      ingredients: [{ name: 'tomato', quantity: '1' }],
    },
  ],
  stepGroups: [
    {
      id: 'main',
      steps: [{ id: 'step-1', text: 'Slice the tomato.' }],
    },
  ],
  tags: ['quick'],
  provenance: {
    sourceType: 'text',
    confidence: 0.95,
  },
};

describe('createRecipePageWithGraph', () => {
  it('writes the cookbook owner onto the RLS-protected recipe row', async () => {
    const recipeInsert = jest.fn(() => ({
      select: jest.fn(() => ({
        single: jest.fn().mockResolvedValue({ data: { id: 'recipe-1' }, error: null }),
      })),
    }));

    const pageSelect = jest.fn(() => ({
      eq: jest.fn(() => ({
        order: jest.fn(() => ({
          limit: jest.fn().mockResolvedValue({ data: [], error: null }),
        })),
      })),
    }));

    const pageInsert = jest.fn(() => ({
      select: jest.fn(() => ({
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'page-1',
            cookbook_id: 'cookbook-1',
            recipe_id: 'recipe-1',
            page_number: 1,
            section: 'breakfast',
            sort_order: 0,
            selected_version_id: null,
            recipe_graph: recipeGraph,
            style_id: 'vintage-garden',
            template_id: 'clean-cream',
            recipes: {
              id: 'recipe-1',
              user_id: 'user-1',
              title: recipeGraph.title,
              description: null,
              servings: recipeGraph.servings,
              prep_time: null,
              cook_time: null,
              ingredients: [{ name: 'tomato', quantity: '1' }],
              steps: ['Slice the tomato.'],
              source_type: 'text',
              source_url: null,
              tags: recipeGraph.tags,
              category: recipeGraph.category,
              confidence: recipeGraph.provenance.confidence,
            },
          },
          error: null,
        }),
      })),
    }));

    const from = jest.fn((table: string) => {
      if (table === 'recipes') return { insert: recipeInsert };
      if (table === 'cookbook_pages') return { select: pageSelect, insert: pageInsert };
      throw new Error(`Unexpected table: ${table}`);
    });
    mockSchema.mockReturnValue({ from });

    await createRecipePageWithGraph({
      cookbookId: 'cookbook-1',
      userId: 'user-1',
      recipeGraph,
      styleId: 'vintage-garden',
      templateId: 'clean-cream',
    });

    expect(mockSchema).toHaveBeenCalledWith('nutriai');
    expect(recipeInsert).toHaveBeenCalledWith(expect.objectContaining({ user_id: 'user-1' }));
  });
});
