import { supabase } from '@/lib/supabase';
import { updatePageSelectedVersion } from '@/utils/cookbook/api';

jest.mock('@/lib/supabase', () => ({
  supabase: { schema: jest.fn() },
}));

const mockSchema = supabase.schema as jest.Mock;

describe('art version selection', () => {
  beforeEach(() => jest.clearAllMocks());

  it('uses the ownership-checked page/version RPC', async () => {
    const rpc = jest.fn().mockResolvedValue({ data: true, error: null });
    mockSchema.mockReturnValue({ rpc });

    await expect(updatePageSelectedVersion('page-1', 'version-2')).resolves.toBeUndefined();

    expect(mockSchema).toHaveBeenCalledWith('nutriai');
    expect(rpc).toHaveBeenCalledWith('select_page_art_version', {
      p_page_id: 'page-1',
      p_version_id: 'version-2',
    });
  });

  it('rejects a version that does not belong to the recipe page', async () => {
    mockSchema.mockReturnValue({
      rpc: jest.fn().mockResolvedValue({ data: false, error: null }),
    });

    await expect(updatePageSelectedVersion('page-1', 'foreign-version'))
      .rejects.toThrow('does not belong');
  });
});
