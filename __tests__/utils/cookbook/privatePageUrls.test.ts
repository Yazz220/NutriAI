import {
  clearCookbookPageUrlCache,
  getSignedCookbookPageImageUrl,
  signStoredPageImages,
} from '@/utils/cookbook/privatePageUrls';
import { supabase } from '@/lib/supabase';

const mockCreateSignedUrl = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    storage: {
      from: jest.fn(() => ({ createSignedUrl: mockCreateSignedUrl })),
    },
  },
}));

describe('private cookbook page URLs', () => {
  beforeEach(() => {
    mockCreateSignedUrl.mockReset();
    clearCookbookPageUrlCache();
  });

  it('replaces a stored public URL with a short-lived authenticated URL', async () => {
    mockCreateSignedUrl.mockResolvedValue({
      data: { signedUrl: 'https://signed.example/page.png?token=short' },
      error: null,
    });

    const [page] = await signStoredPageImages([{
      id: 'version-1',
      image_url: 'https://public.example/cookbook-pages/user-1/book-1/page.png',
      storage_path: 'user-1/book-1/page.png',
    }]);

    expect(supabase.storage.from).toHaveBeenCalledWith('cookbook-pages');
    expect(mockCreateSignedUrl).toHaveBeenCalledWith('user-1/book-1/page.png', 3600);
    expect(page.image_url).toBe('https://signed.example/page.png?token=short');
  });

  it('reuses one stable signed URL for repeated reads of the same immutable page', async () => {
    mockCreateSignedUrl.mockResolvedValue({
      data: { signedUrl: 'https://signed.example/page.png?token=stable' },
      error: null,
    });

    const first = await getSignedCookbookPageImageUrl('user-1/book-1/page.png', 'full');
    const second = await getSignedCookbookPageImageUrl('user-1/book-1/page.png', 'full');

    expect(first).toBe(second);
    expect(mockCreateSignedUrl).toHaveBeenCalledTimes(1);
  });

  it('signs a bounded transformed asset for page grids', async () => {
    mockCreateSignedUrl.mockResolvedValue({
      data: { signedUrl: 'https://signed.example/render/page.png?token=thumb' },
      error: null,
    });

    await getSignedCookbookPageImageUrl('user-1/book-1/page.png', 'thumbnail');

    expect(mockCreateSignedUrl).toHaveBeenCalledWith(
      'user-1/book-1/page.png',
      3600,
      {
        transform: {
          width: 480,
          height: 600,
          resize: 'contain',
          quality: 72,
        },
      },
    );
  });

  it('leaves legacy external images alone when no storage path exists', async () => {
    const [page] = await signStoredPageImages([{ image_url: 'https://legacy.example/page.png' }]);

    expect(mockCreateSignedUrl).not.toHaveBeenCalled();
    expect(page.image_url).toBe('https://legacy.example/page.png');
  });
});
