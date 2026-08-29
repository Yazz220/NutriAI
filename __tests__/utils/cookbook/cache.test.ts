import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  loadCachedCookbook,
  loadCachedShelf,
  saveCachedShelf,
  loadCachedPages,
  saveCachedPages,
  loadCachedCaptures,
  saveCachedCaptures,
} from '@/utils/cookbook/cache';
import type { Cookbook } from '@/types/cookbook';
import type { RecipeCapture } from '@/utils/cookbook/captureLifecycle';

const sampleCookbook: Cookbook = {
  id: 'c1',
  userId: 'u1',
  title: 'My Cookbook',
  theme: { name: 'Warm', prompt: 'warm cookbook' },
  sectionOrder: ['breakfast', 'dinner', 'favorites'],
  coverStyle: 'handwritten',
  coverFinishId: 'fine-cloth',
  coverColorId: 'sage',
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

  it('finds a cached cookbook by its user-scoped shelf entry', async () => {
    await saveCachedShelf('u1', [sampleCookbook]);

    expect(await loadCachedCookbook('u1', 'c1')).toEqual(sampleCookbook);
    expect(await loadCachedCookbook('u1', 'missing')).toBeNull();
  });

  it('round-trips per-cookbook pages', async () => {
    await saveCachedPages('c1', []);
    const cached = await loadCachedPages('c1');
    expect(cached).toEqual([]);
  });

  it('restores unfinished captures only for their owner', async () => {
    const capture: RecipeCapture = {
      id: 'capture-1',
      userId: 'u1',
      sourceType: 'url',
      sourcePayload: { input: 'https://example.com/recipe' },
      status: 'reading',
      extractionNotes: [],
      inferredFields: [],
      artStatus: 'not_started',
      idempotencyKey: 'capture-key-0001',
      processingAttempt: 1,
      createdAt: '2026-08-21T00:00:00.000Z',
      updatedAt: '2026-08-21T00:00:00.000Z',
    };
    await saveCachedCaptures('u1', [capture]);

    expect((await loadCachedCaptures('u1'))?.captures).toEqual([capture]);
    expect(await loadCachedCaptures('u2')).toBeNull();
  });
});
