import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadCachedCookbook, saveCachedCookbook } from '@/utils/cookbook/cache';

describe('cookbook cache', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('round-trips cached cookbook data', async () => {
    await saveCachedCookbook({
      cookbook: {
        id: 'c1',
        userId: 'u1',
        title: 'My Cookbook',
        theme: { name: 'Warm', prompt: 'warm cookbook' },
        sectionOrder: ['breakfast', 'dinner', 'favorites'],
        createdAt: '2026-05-03T00:00:00.000Z',
        updatedAt: '2026-05-03T00:00:00.000Z',
      },
      pages: [],
    });

    const cached = await loadCachedCookbook();
    expect(cached?.cookbook.title).toBe('My Cookbook');
  });

  it('does not load another user cache when scoped by user id', async () => {
    await saveCachedCookbook({
      cookbook: {
        id: 'c1',
        userId: 'u1',
        title: 'User One Cookbook',
        theme: { name: 'Warm', prompt: 'warm cookbook' },
        sectionOrder: ['breakfast', 'dinner', 'favorites'],
        createdAt: '2026-05-03T00:00:00.000Z',
        updatedAt: '2026-05-03T00:00:00.000Z',
      },
      pages: [],
    });

    const cached = await loadCachedCookbook('u2');
    expect(cached).toBeNull();
  });
});
