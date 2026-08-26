import { signStoredPageImages } from '@/utils/cookbook/privatePageUrls';
import { supabase } from '@/lib/supabase';

const mockCreateSignedUrls = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    storage: {
      from: jest.fn(() => ({ createSignedUrls: mockCreateSignedUrls })),
    },
  },
}));

describe('private cookbook page URLs', () => {
  beforeEach(() => mockCreateSignedUrls.mockReset());

  it('replaces a stored public URL with a short-lived authenticated URL', async () => {
    mockCreateSignedUrls.mockResolvedValue({
      data: [{ path: 'user-1/book-1/page.png', signedUrl: 'https://signed.example/page.png?token=short' }],
      error: null,
    });

    const [page] = await signStoredPageImages([{
      id: 'version-1',
      image_url: 'https://public.example/cookbook-pages/user-1/book-1/page.png',
      storage_path: 'user-1/book-1/page.png',
    }]);

    expect(supabase.storage.from).toHaveBeenCalledWith('cookbook-pages');
    expect(mockCreateSignedUrls).toHaveBeenCalledWith(['user-1/book-1/page.png'], 3600);
    expect(page.image_url).toBe('https://signed.example/page.png?token=short');
  });

  it('leaves legacy external images alone when no storage path exists', async () => {
    const [page] = await signStoredPageImages([{ image_url: 'https://legacy.example/page.png' }]);

    expect(mockCreateSignedUrls).not.toHaveBeenCalled();
    expect(page.image_url).toBe('https://legacy.example/page.png');
  });
});
