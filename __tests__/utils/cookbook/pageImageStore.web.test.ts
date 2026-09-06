/** @jest-environment node */
import { clearPageImageFiles, downloadPageImageFile, findPageImageFile } from '@/utils/cookbook/pageImageStore.web';

const entries = new Map<string, Response>();
const fakeCache = {
  match: jest.fn(async (key: string) => entries.get(key)?.clone()),
  put: jest.fn(async (key: string, response: Response) => {
    entries.set(key, response);
  }),
  delete: jest.fn(async (key: string) => entries.delete(key)),
};

beforeEach(() => {
  entries.clear();
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { location: { origin: 'https://folio.test' } },
  });
  Object.defineProperty(globalThis, 'caches', {
    configurable: true,
    value: { open: jest.fn(async () => fakeCache), delete: jest.fn(async () => true) },
  });
  jest.spyOn(URL, 'createObjectURL').mockReturnValue('blob:local-page');
  jest.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  jest.spyOn(globalThis, 'fetch').mockImplementation(
    async () =>
      new Response(new Uint8Array([1, 2, 3]), {
        status: 200,
        headers: { 'Content-Type': 'image/png' },
      }),
  );
});

afterEach(async () => {
  await clearPageImageFiles('user-a');
  jest.restoreAllMocks();
});

it('reuses a blob across DOM and texture reads, without retaining signed tokens in Cache Storage', async () => {
  const result = await downloadPageImageFile('user-a', 'full:page.png', 'https://storage/image?token=secret', () => {});
  expect(result).toEqual({ uri: 'blob:local-page', bytes: 3 });
  expect(await findPageImageFile('user-a', 'full:page.png')).toBe(result.uri);
  expect(fetch).toHaveBeenCalledTimes(1);
  expect([...entries.keys()][0]).not.toContain('secret');
});

it('restores persisted bytes without an image request', async () => {
  entries.set(
    'https://folio.test/folio-local-pages/' +
      encodeURIComponent(`folio-page-images-v1:${process.env.EXPO_PUBLIC_SUPABASE_URL}:user-a`) +
      '/full%3Apersisted.png',
    new Response(new Uint8Array([1, 2, 3]), { headers: { 'Content-Type': 'image/png' } }),
  );
  expect(await findPageImageFile('user-a', 'full:persisted.png')).toBe('blob:local-page');
  expect(fetch).not.toHaveBeenCalled();
});

it('does not persist an HTTP failure', async () => {
  jest.mocked(fetch).mockResolvedValueOnce(new Response('rate limited', { status: 429 }));
  await expect(downloadPageImageFile('user-a', 'full:page.png', 'https://storage', () => {})).rejects.toMatchObject({
    status: 429,
  });
  expect(entries.size).toBe(0);
});
