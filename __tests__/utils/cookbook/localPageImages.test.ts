import {
  getPageImageDeliveryStats,
  purgeStoredPageImages,
  resolveStoredPageImage,
} from '@/utils/cookbook/localPageImages';
import { setPageImageUser } from '@/utils/cookbook/pageImageSession';
import { getSignedCookbookPageImageUrl } from '@/utils/cookbook/privatePageUrls';
import { downloadPageImageFile, PageImageDownloadError } from '@/utils/cookbook/pageImageStore';

const mockFiles = new Map<string, string>();
jest.mock('@/utils/cookbook/privatePageUrls', () => ({
  clearCookbookPageUrlCache: jest.fn(),
  invalidateCookbookPageUrl: jest.fn(),
  getSignedCookbookPageImageUrl: jest.fn(async () => 'https://storage.example/image?token=secret'),
}));
jest.mock('@/utils/cookbook/pageImageStore', () => ({
  PageImageDownloadError: class extends Error {
    status: number;
    constructor(code: number) {
      super('download');
      this.status = code;
    }
  },
  findPageImageFile: jest.fn(async (user, key) => mockFiles.get(`${user}:${key}`) ?? null),
  downloadPageImageFile: jest.fn(),
  removePageImageFile: jest.fn(async (user, key) => {
    mockFiles.delete(`${user}:${key}`);
  }),
  clearPageImageFiles: jest.fn(async (user) => {
    [...mockFiles.keys()].filter((key) => key.startsWith(`${user}:`)).forEach((key) => mockFiles.delete(key));
  }),
}));

const path = 'user-a/book-a/version-a.png';
const download = jest.mocked(downloadPageImageFile);
const sign = jest.mocked(getSignedCookbookPageImageUrl);

beforeEach(() => {
  jest.clearAllMocks();
  mockFiles.clear();
  setPageImageUser(null);
  setPageImageUser('user-a');
  download.mockReset().mockImplementation(async (user, key, _url, assertActive) => {
    assertActive();
    const uri = `file:///documents/${key}`;
    mockFiles.set(`${user}:${key}`, uri);
    return { uri, bytes: 4_000_000 };
  });
});

it('coalesces reader, Skia, share and export into one original download', async () => {
  const results = await Promise.all(Array.from({ length: 8 }, () => resolveStoredPageImage(path)));
  expect(new Set(results).size).toBe(1);
  expect(download).toHaveBeenCalledTimes(1);
  expect(sign).toHaveBeenCalledTimes(1);
});

it('reopens offline after an auth/session restart without signing or downloading', async () => {
  const uri = await resolveStoredPageImage(path);
  setPageImageUser(null);
  setPageImageUser('user-a');
  sign.mockRejectedValueOnce(new Error('offline'));
  expect(await resolveStoredPageImage(path)).toBe(uri);
  expect(await resolveStoredPageImage(path, 'thumbnail')).toBe(uri);
  expect(download).toHaveBeenCalledTimes(1);
  expect(sign).toHaveBeenCalledTimes(1);
  sign.mockReset().mockResolvedValue('https://storage.example/image');
});

it('downloads only the new immutable version after redesign', async () => {
  await resolveStoredPageImage(path);
  await resolveStoredPageImage(path);
  await resolveStoredPageImage(path.replace('version-a', 'version-b'));
  expect(download).toHaveBeenCalledTimes(2);
});

it('uses cached originals for grids and coalesces a grid with a pending reader download', async () => {
  const full = resolveStoredPageImage(path);
  const thumbnail = resolveStoredPageImage(path, 'thumbnail');
  expect(await thumbnail).toBe(await full);
  expect(download).toHaveBeenCalledTimes(1);
});

it('falls back when transformation signing fails, and retains the original for reopen', async () => {
  sign.mockRejectedValueOnce({ status: 400, message: 'Image transformations disabled' });
  const uri = await resolveStoredPageImage(path, 'thumbnail');
  expect(uri).toContain('original-v1');
  expect(await resolveStoredPageImage(path, 'thumbnail')).toBe(uri);
  expect(download).toHaveBeenCalledTimes(1);
  expect(sign).toHaveBeenCalledTimes(2);
});

it('does not escalate a thumbnail rate limit to an original download', async () => {
  download.mockRejectedValueOnce(new PageImageDownloadError(429));
  await expect(resolveStoredPageImage(path, 'thumbnail')).rejects.toMatchObject({ status: 429 });
  expect(download).toHaveBeenCalledTimes(1);
  expect(sign).toHaveBeenCalledTimes(1);
});

it('does not disable transformations for the book after an unrelated bad request', async () => {
  sign.mockRejectedValueOnce({ status: 400, message: 'Object not found' });
  await expect(resolveStoredPageImage(path, 'thumbnail')).rejects.toMatchObject({ status: 400 });
  expect(download).not.toHaveBeenCalled();
  await resolveStoredPageImage(path.replace('version-a', 'version-b'), 'thumbnail');
  expect(sign).toHaveBeenLastCalledWith(path.replace('version-a', 'version-b'), 'thumbnail');
});

it('renews a rejected credential once, without an unbounded retry loop', async () => {
  download.mockRejectedValue(new PageImageDownloadError(403));
  await expect(resolveStoredPageImage(path)).rejects.toMatchObject({ status: 403 });
  expect(download).toHaveBeenCalledTimes(2);
});

it('blocks cached private images across accounts and signed-out sessions', async () => {
  await resolveStoredPageImage(path);
  setPageImageUser('user-b');
  await expect(resolveStoredPageImage(path)).rejects.toThrow('another account');
  setPageImageUser(null);
  await expect(resolveStoredPageImage(path)).rejects.toThrow('Sign in');
});

it('does not publish a download after sign-out', async () => {
  download.mockImplementationOnce(async (_user, _key, _url, assertActive) => {
    setPageImageUser(null);
    assertActive();
    return { uri: 'file:///bad', bytes: 1 };
  });
  await expect(resolveStoredPageImage(path)).rejects.toThrow('Sign in');
  expect(mockFiles.size).toBe(0);
});

it('purges only the requested user and records byte counts without credentials', async () => {
  mockFiles.set('user-b:original', 'file:///keep');
  const before = getPageImageDeliveryStats();
  await resolveStoredPageImage(path);
  expect(getPageImageDeliveryStats().downloadedBytes - before.downloadedBytes).toBe(4_000_000);
  await purgeStoredPageImages('user-a');
  expect([...mockFiles.keys()]).toEqual(['user-b:original']);
  expect(JSON.stringify(getPageImageDeliveryStats())).not.toContain('secret');
});
