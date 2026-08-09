import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Cookbook, CookbookPage } from '@/types/cookbook';

export const SHELF_CACHE_KEY = 'nosh:cookbook-shelf:v2';
export const PAGES_CACHE_PREFIX = 'nosh:cookbook-pages:v2';

export interface CachedShelf {
  userId: string;
  cookbooks: Cookbook[];
}

export interface CachedBookPages {
  cookbookId: string;
  pages: CookbookPage[];
}

function shelfKey(userId?: string | null): string {
  return userId ? `${SHELF_CACHE_KEY}:${userId}` : SHELF_CACHE_KEY;
}

function pagesKey(cookbookId: string): string {
  return `${PAGES_CACHE_PREFIX}:${cookbookId}`;
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
