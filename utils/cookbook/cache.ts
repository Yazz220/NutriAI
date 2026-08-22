import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Cookbook, CookbookPage } from '@/types/cookbook';
import type { RecipeCapture } from '@/utils/cookbook/captureLifecycle';

export const SHELF_CACHE_KEY = 'nosh:cookbook-shelf:v2';
export const PAGES_CACHE_PREFIX = 'nosh:cookbook-pages:v2';
export const CAPTURES_CACHE_PREFIX = 'nosh:recipe-captures:v1';

export interface CachedShelf {
  userId: string;
  cookbooks: Cookbook[];
}

export interface CachedBookPages {
  cookbookId: string;
  pages: CookbookPage[];
}

export interface CachedCaptures {
  userId: string;
  captures: RecipeCapture[];
  cachedAt: string;
}

function shelfKey(userId?: string | null): string {
  return userId ? `${SHELF_CACHE_KEY}:${userId}` : SHELF_CACHE_KEY;
}

function pagesKey(cookbookId: string): string {
  return `${PAGES_CACHE_PREFIX}:${cookbookId}`;
}

function capturesKey(userId: string): string {
  return `${CAPTURES_CACHE_PREFIX}:${userId}`;
}

export async function saveCachedCaptures(userId: string, captures: RecipeCapture[]): Promise<void> {
  const payload: CachedCaptures = { userId, captures, cachedAt: new Date().toISOString() };
  await AsyncStorage.setItem(capturesKey(userId), JSON.stringify(payload));
}

export async function loadCachedCaptures(userId?: string | null): Promise<CachedCaptures | null> {
  if (!userId) return null;
  const key = capturesKey(userId);
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as CachedCaptures;
    if (parsed.userId !== userId || !Array.isArray(parsed.captures)) {
      await AsyncStorage.removeItem(key);
      return null;
    }
    return parsed;
  } catch {
    await AsyncStorage.removeItem(key);
    return null;
  }
}

export async function clearCachedCaptures(userId?: string | null): Promise<void> {
  if (!userId) return;
  await AsyncStorage.removeItem(capturesKey(userId));
}

export async function saveCachedShelf(userId: string, cookbooks: Cookbook[]): Promise<void> {
  const payload: CachedShelf = { userId, cookbooks };
  await AsyncStorage.setItem(shelfKey(userId), JSON.stringify(payload));
}

export async function loadCachedShelf(userId?: string | null): Promise<CachedShelf | null> {
  if (!userId) return null;
  const raw = await AsyncStorage.getItem(shelfKey(userId));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as CachedShelf;
    if (parsed.userId !== userId) {
      await AsyncStorage.removeItem(shelfKey(userId));
      return null;
    }
    return parsed;
  } catch {
    await AsyncStorage.removeItem(shelfKey(userId));
    return null;
  }
}

export async function loadCachedCookbook(userId: string, cookbookId: string): Promise<Cookbook | null> {
  const shelf = await loadCachedShelf(userId);
  return shelf?.cookbooks.find((cookbook) => cookbook.id === cookbookId) ?? null;
}

export async function saveCachedPages(cookbookId: string, pages: CookbookPage[]): Promise<void> {
  const payload: CachedBookPages = { cookbookId, pages };
  await AsyncStorage.setItem(pagesKey(cookbookId), JSON.stringify(payload));
}

export async function loadCachedPages(cookbookId: string): Promise<CookbookPage[] | null> {
  const raw = await AsyncStorage.getItem(pagesKey(cookbookId));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as CachedBookPages;
    return parsed.pages ?? null;
  } catch {
    await AsyncStorage.removeItem(pagesKey(cookbookId));
    return null;
  }
}

export async function clearCachedShelf(userId?: string | null): Promise<void> {
  const keys = new Set<string>([shelfKey(userId)]);
  if (userId) keys.add(SHELF_CACHE_KEY);
  await AsyncStorage.multiRemove([...keys]);
}

export async function clearCachedPages(cookbookIds: string[]): Promise<void> {
  const keys = [...new Set(cookbookIds.filter(Boolean).map((cookbookId) => pagesKey(cookbookId)))];
  if (keys.length === 0) return;
  await AsyncStorage.multiRemove(keys);
}
