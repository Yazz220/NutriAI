import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { useEffect, useMemo, useState } from 'react';
import { RecipeFolder } from '@/types';

const STORAGE_KEY = 'recipeFolders';

export const [RecipeFoldersProvider, useRecipeFolders] = createContextHook(() => {
  const [folders, setFolders] = useState<RecipeFolder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) setFolders(parsed);
        }
      } catch (e) {
        console.warn('[RecipeFolders] Failed to load, starting empty', e);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (isLoading) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(folders)).catch((e) =>
      console.warn('[RecipeFolders] Failed to persist', e)
    );
  }, [folders, isLoading]);

  const createFolder = (name: string) => {
    const now = new Date().toISOString();
    const folder: RecipeFolder = {
      id: Date.now().toString(),
      name: name.trim(),
      recipeIds: [],
      createdAt: now,
      updatedAt: now,
    };
    setFolders((prev) => [folder, ...prev]);
    return folder.id;
  };

  const renameFolder = (id: string, name: string) => {
    setFolders((prev) =>
      prev.map((f) => (f.id === id ? { ...f, name: name.trim(), updatedAt: new Date().toISOString() } : f))
    );
  };

  const deleteFolder = (id: string) => {
    setFolders((prev) => prev.filter((f) => f.id !== id));
  };

  const addRecipeToFolder = (folderId: string, recipeId: string) => {
    setFolders((prev) =>
      prev.map((f) =>
        f.id === folderId && !f.recipeIds.includes(recipeId)
          ? { ...f, recipeIds: [...f.recipeIds, recipeId], updatedAt: new Date().toISOString() }
          : f
      )
    );
  };

  const removeRecipeFromFolder = (folderId: string, recipeId: string) => {
    setFolders((prev) =>
      prev.map((f) =>
        f.id === folderId
          ? { ...f, recipeIds: f.recipeIds.filter((r) => r !== recipeId), updatedAt: new Date().toISOString() }
          : f
      )
    );
  };

  const getFoldersForRecipe = (recipeId: string) => {
    return folders.filter((f) => f.recipeIds.includes(recipeId));
  };

  const byId = useMemo(() => Object.fromEntries(folders.map((f) => [f.id, f])), [folders]);

  return {
    folders,
    foldersById: byId,
    isLoading,
    createFolder,
    renameFolder,
    deleteFolder,
    addRecipeToFolder,
    removeRecipeFromFolder,
    getFoldersForRecipe,
  };
});
