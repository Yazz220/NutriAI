import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DEFAULT_BOOKSHELF_SCENE,
  isShelfStyleId,
  isWallpaperStyleId,
  type BookshelfScene,
} from '@/constants/shelfAppearance';

const SHELF_APPEARANCE_PREFIX = 'nosh:bookshelf-scene:v1';

function storageKey(userId: string): string {
  return `${SHELF_APPEARANCE_PREFIX}:${userId}`;
}

export async function loadBookshelfScene(userId: string): Promise<BookshelfScene> {
  const raw = await AsyncStorage.getItem(storageKey(userId));
  if (!raw) return DEFAULT_BOOKSHELF_SCENE;

  try {
    const parsed = JSON.parse(raw) as Partial<BookshelfScene>;
    if (!isShelfStyleId(parsed.shelfStyleId)) {
      await AsyncStorage.removeItem(storageKey(userId));
      return DEFAULT_BOOKSHELF_SCENE;
    }
    return {
      shelfStyleId: parsed.shelfStyleId,
      wallpaperStyleId: isWallpaperStyleId(parsed.wallpaperStyleId)
        ? parsed.wallpaperStyleId
        : DEFAULT_BOOKSHELF_SCENE.wallpaperStyleId,
    };
  } catch {
    await AsyncStorage.removeItem(storageKey(userId));
    return DEFAULT_BOOKSHELF_SCENE;
  }
}

export async function saveBookshelfScene(userId: string, scene: BookshelfScene): Promise<void> {
  await AsyncStorage.setItem(storageKey(userId), JSON.stringify(scene));
}

export async function clearBookshelfScene(userId: string): Promise<void> {
  await AsyncStorage.removeItem(storageKey(userId));
}
