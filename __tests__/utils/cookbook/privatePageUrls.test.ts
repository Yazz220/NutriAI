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

    const first = await getSignedCookbookPageImageUrl('user-1/book-1/page.png');
    const second = await getSignedCookbookPageImageUrl('user-1/book-1/page.png');

    expect(first).toBe('https://signed.example/page.png?token=stable');
    expect(second).toBe(first);
    expect(mockCreateSignedUrl).toHaveBeenCalledTimes(1);
  });

  it('coalesces concurrent reads of the same page into one signing request', async () => {
    mockCreateSignedUrl.mockResolvedValue({
      data: { signedUrl: 'https://signed.example/page.png?token=shared' },
      error: null,
    });

    const [first, second] = await Promise.all([
      getSignedCookbookPageImageUrl('user-1/book-1/page.png'),
      getSignedCookbookPageImageUrl('user-1/book-1/page.png'),
    ]);

    expect(first).toBe(second);
    expect(mockCreateSignedUrl).toHaveBeenCalledTimes(1);
  });

  it('leaves legacy external images alone when no storage path exists', async () => {
    const [page] = await signStoredPageImages([{ image_url: 'https://legacy.example/page.png' }]);

    expect(mockCreateSignedUrl).not.toHaveBeenCalled();
    expect(page.image_url).toBe('https://legacy.example/page.png');
  });

  it('does not allow a late signing response to repopulate the cache after sign-out', async () => {
    let finish!: (value: unknown) => void;
    mockCreateSignedUrl.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    const pending = getSignedCookbookPageImageUrl('user-1/book-1/page.png');
    clearCookbookPageUrlCache();
    mockCreateSignedUrl.mockResolvedValue({ data: { signedUrl: 'https://new-session' }, error: null });
    const replacement = getSignedCookbookPageImageUrl('user-1/book-1/page.png');
    finish({ data: { signedUrl: 'https://old-session' }, error: null });
    await expect(pending).rejects.toThrow('session changed');
    expect(await replacement).toBe('https://new-session');
    expect(await getSignedCookbookPageImageUrl('user-1/book-1/page.png')).toBe('https://new-session');
    expect(mockCreateSignedUrl).toHaveBeenCalledTimes(2);
  });

  it('renews near expiry and keeps original and transformed credentials separate', async () => {
    const now = jest.spyOn(Date, 'now').mockReturnValue(0);
    try {
      mockCreateSignedUrl.mockResolvedValue({ data: { signedUrl: 'https://signed' }, error: null });
      await getSignedCookbookPageImageUrl('user-1/book-1/page.png');
      await getSignedCookbookPageImageUrl('user-1/book-1/page.png', 'thumbnail');
      now.mockReturnValue(56 * 60_000);
      await getSignedCookbookPageImageUrl('user-1/book-1/page.png');
      expect(mockCreateSignedUrl).toHaveBeenCalledTimes(3);
      expect(mockCreateSignedUrl).toHaveBeenNthCalledWith(2, 'user-1/book-1/page.png', 3600, {
        transform: { width: 480, height: 600, resize: 'contain', quality: 72 },
      });
    } finally { now.mockRestore(); }
  });
});
