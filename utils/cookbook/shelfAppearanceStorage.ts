import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import {
  DEFAULT_BOOKSHELF_SCENE,
  isShelfStyleId,
  isWallpaperStyleId,
  type BookshelfScene,
} from '@/constants/shelfAppearance';

const SHELF_APPEARANCE_PREFIX = 'nosh:bookshelf-scene:v1';
const PREFERENCE_KEY = 'bookshelf_scene';

function storageKey(userId: string): string {
  return `${SHELF_APPEARANCE_PREFIX}:${userId}`;
}

export async function loadBookshelfScene(userId: string): Promise<BookshelfScene> {
  // 1. Try local cache first for instant offline rendering
  const raw = await AsyncStorage.getItem(storageKey(userId));
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Partial<BookshelfScene>;
      if (isShelfStyleId(parsed.shelfStyleId)) {
        return {
          shelfStyleId: parsed.shelfStyleId,
          wallpaperStyleId: isWallpaperStyleId(parsed.wallpaperStyleId)
            ? parsed.wallpaperStyleId
            : DEFAULT_BOOKSHELF_SCENE.wallpaperStyleId,
        };
      }
      await AsyncStorage.removeItem(storageKey(userId));
    } catch {
      await AsyncStorage.removeItem(storageKey(userId));
    }
  }

  // 2. Try remote preference from Supabase (e.g. after logout/login or on a new device)
  try {
    const { data, error } = await supabase
      .schema('nutriai')
      .from('cooking_preferences')
      .select('value')
      .eq('user_id', userId)
      .eq('preference_key', PREFERENCE_KEY)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && data?.value) {
      const parsed = JSON.parse(data.value) as Partial<BookshelfScene>;
      if (isShelfStyleId(parsed.shelfStyleId)) {
        const remoteScene: BookshelfScene = {
          shelfStyleId: parsed.shelfStyleId,
          wallpaperStyleId: isWallpaperStyleId(parsed.wallpaperStyleId)
            ? parsed.wallpaperStyleId
            : DEFAULT_BOOKSHELF_SCENE.wallpaperStyleId,
        };
        await AsyncStorage.setItem(storageKey(userId), JSON.stringify(remoteScene)).catch(() => {});
        return remoteScene;
      }
    }
  } catch {
    // Offline or test environment without Supabase mock — fall through to default
  }

  return DEFAULT_BOOKSHELF_SCENE;
}

export async function saveBookshelfScene(userId: string, scene: BookshelfScene): Promise<void> {
  // 1. Save locally for instant offline availability
  await AsyncStorage.setItem(storageKey(userId), JSON.stringify(scene));

  // 2. Sync to Supabase so the chosen wallpaper survives logouts and device switches
  try {
    const value = JSON.stringify(scene);
    await supabase
      .schema('nutriai')
      .from('cooking_preferences')
      .delete()
      .eq('user_id', userId)
      .eq('preference_key', PREFERENCE_KEY);

    await supabase
      .schema('nutriai')
      .from('cooking_preferences')
      .insert({
        user_id: userId,
        preference_key: PREFERENCE_KEY,
        value,
        updated_at: new Date().toISOString(),
      });
  } catch {
    // Best-effort remote sync; local AsyncStorage already succeeded
  }
}

export async function clearBookshelfScene(userId: string): Promise<void> {
  await AsyncStorage.removeItem(storageKey(userId));
}
