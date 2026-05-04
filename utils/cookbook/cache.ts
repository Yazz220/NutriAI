import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Cookbook, CookbookPage } from '@/types/cookbook';

export const CACHE_KEY = 'nosh:cookbook-cache:v1';

export interface CachedCookbook {
  cookbook: Cookbook;
  pages: CookbookPage[];
}

function cacheKeyForUser(userId?: string | null): string {
  return userId ? `${CACHE_KEY}:${userId}` : CACHE_KEY;
}

export async function saveCachedCookbook(value: CachedCookbook, userId = value.cookbook.userId): Promise<void> {
  const serialized = JSON.stringify(value);
  await AsyncStorage.setItem(cacheKeyForUser(userId), serialized);
  await AsyncStorage.setItem(CACHE_KEY, serialized);
}

export async function loadCachedCookbook(userId?: string | null): Promise<CachedCookbook | null> {
  const key = cacheKeyForUser(userId);
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as CachedCookbook;
    if (userId && parsed.cookbook.userId !== userId) {
      await AsyncStorage.removeItem(key);
      return null;
    }
    return parsed;
  } catch {
    await AsyncStorage.removeItem(key);
    return null;
  }
}
