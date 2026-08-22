import { supabase } from '@/lib/supabase';
import { getCookbook } from '@/utils/cookbook/api';
import {
  loadCollectionActionPreview,
  organizeRecipePage,
} from '@/utils/cookbook/collectionActions';
import { loadRecipeFromCollection } from '@/utils/cookbook/recipeCollection';

jest.mock('@/lib/supabase', () => ({ supabase: { schema: jest.fn() } }));
jest.mock('@/utils/cookbook/api', () => ({ getCookbook: jest.fn() }));
jest.mock('@/utils/cookbook/recipeCollection', () => ({ loadRecipeFromCollection: jest.fn() }));

const mockedSchema = jest.mocked(supabase.schema);
const mockedGetCookbook = jest.mocked(getCookbook);
const mockedLoadRecipe = jest.mocked(loadRecipeFromCollection);

describe('collection organization actions', () => {
  beforeEach(() => jest.clearAllMocks());

  it('builds a verified preview from canonical page and cookbook records', async () => {
    mockedLoadRecipe.mockResolvedValue({
      pageId: 'page-cheesecake',
      cookbookId: 'book-desserts',
      recipeGraph: { title: 'Cheesecake' } as never,
    });
    mockedGetCookbook
      .mockResolvedValueOnce({ id: 'book-favorites', title: 'Favorites' } as never)
      .mockResolvedValueOnce({ id: 'book-desserts', title: 'Desserts' } as never);

    await expect(loadCollectionActionPreview({
      action: 'move',
      pageId: 'page-cheesecake',
      destinationCookbookId: 'book-favorites',
    })).resolves.toEqual(expect.objectContaining({
      recipeTitle: 'Cheesecake',
      sourceCookbook: { id: 'book-desserts', title: 'Desserts' },
      destinationCookbook: { id: 'book-favorites', title: 'Favorites' },
    }));
  });

  it('rejects a no-op move before showing a confirmation card', async () => {
    mockedLoadRecipe.mockResolvedValue({
      pageId: 'page-cheesecake',
      cookbookId: 'book-desserts',
      recipeGraph: { title: 'Cheesecake' } as never,
    });
    mockedGetCookbook.mockResolvedValue({ id: 'book-desserts', title: 'Desserts' } as never);

    await expect(loadCollectionActionPreview({
      action: 'move',
      pageId: 'page-cheesecake',
      destinationCookbookId: 'book-desserts',
    })).rejects.toThrow('already in Desserts');
  });

  it('passes the stable request key to the private-schema RPC', async () => {
    const result = {
      action: 'copy',
      sourcePageId: 'page-cheesecake',
      sourceCookbookId: 'book-desserts',
      sourceCookbookTitle: 'Desserts',
      destinationCookbookId: 'book-favorites',
      destinationCookbookTitle: 'Favorites',
      resultPageId: 'page-copy',
      changed: true,
    };
    const rpc = jest.fn().mockResolvedValue({ data: result, error: null });
    mockedSchema.mockReturnValue({ rpc } as never);

    await expect(organizeRecipePage({
      action: 'copy',
      pageId: 'page-cheesecake',
      destinationCookbookId: 'book-favorites',
      idempotencyKey: 'collection:stable-request',
    })).resolves.toEqual(result);
    expect(rpc).toHaveBeenCalledWith('organize_recipe_page', {
      p_action: 'copy',
      p_page_id: 'page-cheesecake',
      p_destination_cookbook_id: 'book-favorites',
      p_idempotency_key: 'collection:stable-request',
    });
  });
});

