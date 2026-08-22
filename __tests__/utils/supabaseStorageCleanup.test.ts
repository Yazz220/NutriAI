import { removeStoragePrefix, type StorageEntry } from '@/supabase/functions/_shared/storageCleanup';

function createStorageFixture(entriesByPath: Record<string, StorageEntry[]>) {
  const removed: string[][] = [];
  const bucket = {
    list: jest.fn(async (path: string) => ({ data: entriesByPath[path] ?? [], error: null })),
    remove: jest.fn(async (paths: string[]) => {
      removed.push(paths);
      return { error: null };
    }),
  };

  return {
    storage: { from: jest.fn(() => bucket) },
    bucket,
    removed,
  };
}

describe('removeStoragePrefix', () => {
  it('removes files under the user prefix, including nested artwork', async () => {
    const fixture = createStorageFixture({
      user1: [
        { id: 'capture-id', name: 'capture.jpg' },
        { id: null, name: 'book1' },
      ],
      'user1/book1': [{ id: 'art-id', name: 'page.png' }],
    });

    await expect(removeStoragePrefix(fixture.storage, 'cookbook-pages', '/user1/'))
      .resolves.toBe(2);
    expect(fixture.storage.from).toHaveBeenCalledWith('cookbook-pages');
    expect(fixture.removed).toEqual([['user1/capture.jpg', 'user1/book1/page.png']]);
  });

  it('treats an absent legacy bucket as already clean', async () => {
    const storage = {
      from: jest.fn(() => ({
        list: jest.fn(async () => ({
          data: null,
          error: { statusCode: '404', message: 'Bucket not found' },
        })),
        remove: jest.fn(),
      })),
    };

    await expect(removeStoragePrefix(storage, 'recipe-captures', 'user1')).resolves.toBe(0);
  });

  it('refuses an unscoped prefix', async () => {
    const fixture = createStorageFixture({});

    await expect(removeStoragePrefix(fixture.storage, 'cookbook-pages', '/'))
      .rejects.toThrow('scoped storage prefix');
    expect(fixture.bucket.list).not.toHaveBeenCalled();
  });
});
