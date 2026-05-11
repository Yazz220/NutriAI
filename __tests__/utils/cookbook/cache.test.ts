import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadCachedShelf, saveCachedShelf, loadCachedPages, saveCachedPages } from '@/utils/cookbook/cache';
import type { Cookbook } from '@/types/cookbook';

const sampleCookbook: Cookbook = {
  id: 'c1',
  userId: 'u1',
  title: 'My Cookbook',
  theme: { name: 'Warm', prompt: 'warm cookbook' },
  sectionOrder: ['breakfast', 'dinner', 'favorites'],
  coverStyle: 'handwritten',
  sections: [],
  createdAt: '2026-05-03T00:00:00.000Z',
  updatedAt: '2026-05-03T00:00:00.000Z',
};

describe('cookbook cache', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('round-trips the user shelf', async () => {
    await saveCachedShelf('u1', [sampleCookbook]);

    const cached = await loadCachedShelf('u1');
    expect(cached?.cookbooks[0].title).toBe('My Cookbook');
  });

  it('does not load another user shelf when scoped by user id', async () => {
    await saveCachedShelf('u1', [sampleCookbook]);

    const cached = await loadCachedShelf('u2');
    expect(cached).toBeNull();
  });

  it('round-trips per-cookbook pages', async () => {
    await saveCachedPages('c1', []);
    const cached = await loadCachedPages('c1');
    expect(cached).toEqual([]);
  });
});
