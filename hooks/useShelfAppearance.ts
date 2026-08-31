import { useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  DEFAULT_BOOKSHELF_SCENE,
  type BookshelfScene,
  type ShelfStyleId,
  type WallpaperStyleId,
} from '@/constants/shelfAppearance';
import { useAuth } from '@/hooks/useAuth';
import {
  loadBookshelfScene,
  saveBookshelfScene,
} from '@/utils/cookbook/shelfAppearanceStorage';

export const BOOKSHELF_SCENE_QUERY_KEY = (userId: string | undefined) => [
  'bookshelf-scene',
  userId,
];

export function useShelfAppearance() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => BOOKSHELF_SCENE_QUERY_KEY(user?.id), [user?.id]);
  const sceneQuery = useQuery({
    queryKey,
    enabled: !!user?.id,
    queryFn: () => loadBookshelfScene(user!.id),
    staleTime: Infinity,
  });

  const scene = sceneQuery.data ?? DEFAULT_BOOKSHELF_SCENE;

  async function saveSceneChange(change: Partial<BookshelfScene>) {
    if (!user?.id) return;
    await queryClient.cancelQueries({ queryKey });
    const previousScene = queryClient.getQueryData<BookshelfScene>(queryKey) ?? scene;
    const nextScene = { ...previousScene, ...change };
    queryClient.setQueryData(queryKey, nextScene);
    try {
      await saveBookshelfScene(user.id, nextScene);
    } catch (error) {
      queryClient.setQueryData(queryKey, previousScene);
      throw error;
    }
  }

  async function setShelfStyleId(shelfStyleId: ShelfStyleId) {
    if (shelfStyleId === scene.shelfStyleId) return;
    await saveSceneChange({ shelfStyleId });
  }

  async function setWallpaperStyleId(wallpaperStyleId: WallpaperStyleId) {
    if (wallpaperStyleId === scene.wallpaperStyleId) return;
    await saveSceneChange({ wallpaperStyleId });
  }

  return {
    scene,
    isLoading: sceneQuery.isLoading,
    setShelfStyleId,
    setWallpaperStyleId,
  };
}
