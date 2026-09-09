import {
  applyRecipePageRevision,
  CookbookLimitReachedError,
  createCookbook,
  createRecipePageWithGraph,
  deleteCookbook,
  discardRecipeCapture,
  mapRecipeCapture,
  listRecipeCaptures,
  retryReaderStorageCleanup,
  startRecipeCapture,
  updateCookbookTitle,
  updateCookbookAppearance,
} from '@/utils/cookbook/api';
import { supabase } from '@/lib/supabase';
import { buildCookbookPageGridItems } from '@/utils/cookbook/pageGrid';
import { isCaptureProcessing, isCaptureReadyToOpen } from '@/utils/cookbook/captureLifecycle';
import type { RecipeGraphDraft } from '@/types/recipeGraph';
import { callAuthenticatedFunction, FunctionTimeoutError } from '@/utils/supabaseEdge';

jest.mock('@/lib/supabase', () => ({
  supabase: {
    schema: jest.fn(),
  },
}));
jest.mock('@/utils/supabaseEdge', () => ({
  ...jest.requireActual('@/utils/supabaseEdge'),
  callAuthenticatedFunction: jest.fn(),
}));

const mockSchema = supabase.schema as jest.Mock;
const mockedCallAuthenticatedFunction = jest.mocked(callAuthenticatedFunction);

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

  it('persists manual provenance for an assistant-authored copy without source metadata', async () => {
    const copiedGraph: RecipeGraphDraft = { ...recipeGraph, provenance: undefined };
    const recipeInsert = jest.fn(() => ({
      select: jest.fn(() => ({
        single: jest.fn().mockResolvedValue({ data: { id: 'recipe-copy' }, error: null }),
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
            id: 'page-copy',
            cookbook_id: 'cookbook-1',
            recipe_id: 'recipe-copy',
            page_number: 1,
            section: copiedGraph.category,
            sort_order: 0,
            selected_version_id: null,
            recipe_graph: copiedGraph,
            style_id: 'vintage-garden',
            template_id: 'clean-cream',
            recipes: {
              id: 'recipe-copy',
              user_id: 'user-1',
              title: copiedGraph.title,
              ingredients: [],
              steps: [],
              source_type: 'manual',
              tags: copiedGraph.tags,
              category: copiedGraph.category,
              confidence: 1,
            },
          },
          error: null,
        }),
      })),
    }));
    mockSchema.mockReturnValue({
      from: jest.fn((table: string) => {
        if (table === 'recipes') return { insert: recipeInsert };
        if (table === 'cookbook_pages') return { select: pageSelect, insert: pageInsert };
        throw new Error(`Unexpected table: ${table}`);
      }),
    });

    await createRecipePageWithGraph({
      cookbookId: 'cookbook-1',
      userId: 'user-1',
      recipeGraph: copiedGraph,
      styleId: 'vintage-garden',
      templateId: 'clean-cream',
    });

    expect(recipeInsert).toHaveBeenCalledWith(expect.objectContaining({
      source_type: 'manual',
    }));
  });
});

describe('mapRecipeCapture', () => {
  it('does not restart completed captures whose cookbook and page were deleted', async () => {
    const row = {
      id: 'deleted-page-capture', user_id: 'user-1', source_type: 'text' as const,
      source_payload: {}, status: 'ready', art_status: 'ready',
      destination_cookbook_id: null, pending_page_id: null,
      idempotency_key: 'original-capture-key', processing_attempt: 1,
      created_at: '2026-08-30T12:00:00.000Z', updated_at: '2026-09-03T12:00:00.000Z',
    };
    const order = jest.fn().mockResolvedValue({ data: [row], error: null });
    mockSchema.mockReturnValue({ from: jest.fn(() => ({ select: jest.fn(() => ({ eq: jest.fn(() => ({ order })) })) })) });
    mockedCallAuthenticatedFunction.mockClear();
    for (let open = 0; open < 2; open += 1) {
      const captures = await listRecipeCaptures('user-1');
      expect(captures[0].status).toBe('ready');
      expect(isCaptureProcessing(captures[0].status)).toBe(false);
      expect(isCaptureReadyToOpen(captures[0])).toBe(false);
      expect(buildCookbookPageGridItems({ cookbookId: 'new-book', pageSlots: [], captures, includeUnassignedCaptures: true })).toEqual([]);
    }
    expect(mockedCallAuthenticatedFunction).not.toHaveBeenCalled();
  });

  it('maps durable stage diagnostics without trusting unknown stage names', () => {
    const mapped = mapRecipeCapture({
      id: 'capture-1',
      user_id: 'user-1',
      source_type: 'text',
      source_payload: { input: 'Soup recipe' },
      status: 'needs_attention',
      art_status: 'not_started',
      failure_code: 'extraction_failed',
      failure_message: 'Safe copy',
      failed_stage: 'extraction',
      stage_checkpoints: {
        source: { version: 'text-source-v1', completedAt: '2026-08-30T12:00:00.000Z' },
      },
      idempotency_key: 'capture-request-123456',
      processing_attempt: 1,
      created_at: '2026-08-30T12:00:00.000Z',
      updated_at: '2026-08-30T12:01:00.000Z',
    });

    expect(mapped.failedStage).toBe('extraction');
    expect(mapped.stageCheckpoints.source?.version).toBe('text-source-v1');
  });
});

describe('startRecipeCapture', () => {
  it('recovers the durable capture when the request times out after the server accepted it', async () => {
    mockedCallAuthenticatedFunction.mockRejectedValue(new FunctionTimeoutError(20_000));
    const maybeSingle = jest.fn().mockResolvedValue({
      data: {
        id: 'capture-url-1',
        user_id: 'user-1',
        source_type: 'url',
        source_payload: { input: 'https://example.com/recipe' },
        status: 'processing',
        art_status: 'not_started',
        idempotency_key: 'capture-request-url-1',
        processing_attempt: 1,
        created_at: '2026-08-31T21:48:03.000Z',
        updated_at: '2026-08-31T21:48:03.000Z',
      },
      error: null,
    });
    const eq = jest.fn(() => ({ maybeSingle }));
    const select = jest.fn(() => ({ eq }));
    mockSchema.mockReturnValue({ from: jest.fn(() => ({ select })) });

    await expect(startRecipeCapture({
      source: { type: 'url', input: 'https://example.com/recipe' },
      destinationCookbookId: 'cookbook-1',
      idempotencyKey: 'capture-request-url-1',
    })).resolves.toMatchObject({
      status: 'processing',
      capture: { id: 'capture-url-1', status: 'processing' },
    });

    expect(eq).toHaveBeenCalledWith('idempotency_key', 'capture-request-url-1');
  });
});

describe('createCookbook', () => {
  it('persists cover finish and recipe-page style as independent choices', async () => {
    const rpc = jest.fn((_name: string, payload: Record<string, unknown>) => Promise.resolve({
      data: {
        id: 'cookbook-1',
        user_id: 'user-1',
        title: payload.p_title,
        theme_name: payload.p_theme_name,
        theme_prompt: payload.p_theme_prompt,
        section_order: [],
        cover_style: payload.p_cover_style,
        cover_finish_id: payload.p_cover_finish_id,
        cover_color_id: payload.p_cover_color_id,
        cover_title_color_id: payload.p_cover_title_color_id,
        cover_title_placement_id: payload.p_cover_title_placement_id,
        page_style_id: payload.p_page_style_id,
        style_revision: payload.p_style_revision,
        page_style_references: payload.p_page_style_references,
        page_template_id: payload.p_page_template_id,
        sections: payload.p_sections,
        is_default: false,
        created_at: '2026-08-23T00:00:00.000Z',
        updated_at: '2026-08-23T00:00:00.000Z',
      },
      error: null,
    }));
    mockSchema.mockReturnValue({ rpc });

    const cookbook = await createCookbook({
      userId: 'user-1',
      title: 'Desserts',
      coverFinishId: 'natural-linen',
      coverColorId: 'midnight',
      coverTitleColorId: 'ivory',
      coverTitlePlacementId: 'upper',
      pageStyleId: 'studio-editorial',
    });

    expect(rpc).toHaveBeenCalledWith(
      'create_cookbook_for_current_user',
      expect.objectContaining({
        p_title: 'Desserts',
        p_cover_style: 'navy-leather',
        p_cover_finish_id: 'natural-linen',
        p_cover_color_id: 'midnight',
        p_cover_title_color_id: 'ivory',
        p_cover_title_placement_id: 'upper',
        p_page_style_id: 'studio-editorial',
      }),
    );
    expect(cookbook).toMatchObject({
      title: 'Desserts',
      coverStyle: 'navy-leather',
      coverFinishId: 'natural-linen',
      coverColorId: 'midnight',
      coverTitleColorId: 'ivory',
      coverTitlePlacementId: 'upper',
      pageStyleId: 'studio-editorial',
    });
  });

  it('normalizes the guarded RPC denial into a stable limit error', async () => {
    const rpc = jest.fn().mockResolvedValue({
      data: null,
      error: { code: 'P0001', message: 'cookbook_limit_reached' },
    });
    mockSchema.mockReturnValue({ rpc });

    await expect(createCookbook({
      userId: 'user-1',
      title: 'Third Book',
      coverFinishId: 'natural-linen',
      coverColorId: 'midnight',
      coverTitleColorId: 'auto',
      coverTitlePlacementId: 'center',
      pageStyleId: 'studio-editorial',
    })).rejects.toBeInstanceOf(CookbookLimitReachedError);
  });
});

describe('updateCookbookTitle', () => {
  it('trims and persists a cookbook name', async () => {
    const eq = jest.fn().mockResolvedValue({ error: null });
    const update = jest.fn(() => ({ eq }));
    mockSchema.mockReturnValue({
      from: jest.fn((table: string) => {
        if (table === 'cookbooks') return { update };
        throw new Error(`Unexpected table: ${table}`);
      }),
    });

    await updateCookbookTitle('cookbook-1', '  Weeknight favorites  ');

    expect(update).toHaveBeenCalledWith({ title: 'Weeknight favorites' });
    expect(eq).toHaveBeenCalledWith('id', 'cookbook-1');
  });
});

describe('updateCookbookAppearance', () => {
  it('updates the physical identity atomically and returns the normalized cookbook', async () => {
    const single = jest.fn().mockResolvedValue({
      data: {
        id: 'cookbook-1',
        user_id: 'user-1',
        title: 'Weeknight Favorites',
        theme_name: 'Studio',
        theme_prompt: 'Studio pages',
        section_order: ['dinner'],
        cover_style: 'terracotta-cloth',
        cover_finish_id: 'natural-linen',
        cover_color_id: 'clay',
        cover_title_color_id: 'gilt',
        cover_title_placement_id: 'lower',
        page_style_id: 'studio',
        style_revision: 1,
        page_style_references: [],
        page_template_id: 'clean-cream',
        sections: [],
        is_default: false,
        created_at: '2026-08-23T00:00:00.000Z',
        updated_at: '2026-09-02T00:00:00.000Z',
      },
      error: null,
    });
    const select = jest.fn(() => ({ single }));
    const eq = jest.fn(() => ({ select }));
    const update = jest.fn(() => ({ eq }));
    mockSchema.mockReturnValue({
      from: jest.fn((table: string) => {
        if (table === 'cookbooks') return { update };
        throw new Error(`Unexpected table: ${table}`);
      }),
    });

    const result = await updateCookbookAppearance('cookbook-1', {
      title: '  Weeknight Favorites  ',
      coverFinishId: 'natural-linen',
      coverColorId: 'clay',
      coverTitleColorId: 'gilt',
      coverTitlePlacementId: 'lower',
    });

    expect(update).toHaveBeenCalledWith({
      title: 'Weeknight Favorites',
      cover_style: 'terracotta-cloth',
      cover_finish_id: 'natural-linen',
      cover_color_id: 'clay',
      cover_title_color_id: 'gilt',
      cover_title_placement_id: 'lower',
    });
    expect(eq).toHaveBeenCalledWith('id', 'cookbook-1');
    expect(select).toHaveBeenCalledWith('*');
    expect(result).toMatchObject({
      id: 'cookbook-1',
      title: 'Weeknight Favorites',
      coverFinishId: 'natural-linen',
      coverColorId: 'clay',
      coverTitleColorId: 'gilt',
      coverTitlePlacementId: 'lower',
      pageStyleId: 'studio',
    });
  });
});

describe('reader deletion', () => {
  it('deletes a cookbook through the authenticated cleanup function', async () => {
    mockedCallAuthenticatedFunction.mockResolvedValue({ result: { cookbookId: 'cookbook-1' } });

    await deleteCookbook('cookbook-1');

    expect(mockedCallAuthenticatedFunction).toHaveBeenCalledWith('delete-reader-content', {
      action: 'deleteCookbook',
      cookbookId: 'cookbook-1',
    });
  });

  it('discards unfinished capture work through the authenticated cleanup function', async () => {
    mockedCallAuthenticatedFunction.mockResolvedValue({ result: { captureId: 'capture-1' } });

    await discardRecipeCapture('capture-1');

    expect(mockedCallAuthenticatedFunction).toHaveBeenCalledWith('delete-reader-content', {
      action: 'discardCapture',
      captureId: 'capture-1',
    });
  });

  it('can retry queued Storage cleanup without deleting another record', async () => {
    mockedCallAuthenticatedFunction.mockResolvedValue({ result: null, cleanup: { removed: 1, pending: 0 } });

    await retryReaderStorageCleanup();

    expect(mockedCallAuthenticatedFunction).toHaveBeenCalledWith('delete-reader-content', {
      action: 'drain',
    });
  });
});

describe('applyRecipePageRevision', () => {
  it('applies corrected recipe data and its preview version through one RPC', async () => {
    const rpc = jest.fn().mockResolvedValue({ data: true, error: null });
    mockSchema.mockReturnValue({ rpc });
    const persistedGraph = {
      ...recipeGraph,
      id: 'graph-1',
      createdAt: '2026-08-25T00:00:00.000Z',
      updatedAt: '2026-08-25T01:00:00.000Z',
    };

    await applyRecipePageRevision('page-1', persistedGraph, 'version-2');

    expect(rpc).toHaveBeenCalledWith('apply_recipe_page_revision', {
      p_page_id: 'page-1',
      p_recipe_graph: persistedGraph,
      p_version_id: 'version-2',
    });
  });
});
