import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { useEffect, useMemo, useState } from 'react';
import { RecipeFolder } from '@/types';

const STORAGE_KEY = 'recipeFolders';

export const [RecipeFoldersProvider, useRecipeFolders] = createContextHook(() => {
  const [folders, setFolders] = useState<RecipeFolder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const toId = (v: string | number) => String(v);

  useEffect(() => {
    const load = async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            // Defensive normalization in case of legacy data
            const norm: RecipeFolder[] = parsed.map((f: any) => ({
              id: toId(f.id),
              name: (f.name ?? '').trim(),
              recipeIds: Array.isArray(f.recipeIds) ? f.recipeIds.map(toId) : [],
              createdAt: f.createdAt || new Date().toISOString(),
              updatedAt: f.updatedAt || new Date().toISOString(),
            }));
            setFolders(norm);
          }
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
    const trimmed = name.trim();
    // Prevent duplicate names (case-insensitive)
    const exists = folders.find((f) => f.name.toLowerCase() === trimmed.toLowerCase());
    if (exists) {
      // Touch updatedAt and return existing id for UX continuity
      setFolders((prev) => prev.map((f) => (f.id === exists.id ? { ...f, updatedAt: now } : f)));
      return exists.id;
    }
    const folder: RecipeFolder = {
      id: Date.now().toString(),
      name: trimmed,
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

  const addRecipeToFolder = (folderId: string, recipeId: string | number) => {
    const rid = toId(recipeId);
    setFolders((prev) =>
      prev.map((f) =>
        f.id === folderId && !f.recipeIds.includes(rid)
          ? { ...f, recipeIds: [...f.recipeIds, rid], updatedAt: new Date().toISOString() }
          : f
      )
    );
  };

  const removeRecipeFromFolder = (folderId: string, recipeId: string | number) => {
    const rid = toId(recipeId);
    setFolders((prev) =>
      prev.map((f) =>
        f.id === folderId
          ? { ...f, recipeIds: f.recipeIds.filter((r) => r !== rid), updatedAt: new Date().toISOString() }
          : f
      )
    );
  };

  const toggleRecipeInFolder = (folderId: string, recipeId: string | number) => {
    const rid = toId(recipeId);
    const target = folders.find((f) => f.id === folderId);
    if (!target) return;
    if (target.recipeIds.includes(rid)) {
      removeRecipeFromFolder(folderId, rid);
    } else {
      addRecipeToFolder(folderId, rid);
    }
  };

  const removeRecipeFromAllFolders = (recipeId: string | number) => {
    const rid = toId(recipeId);
    setFolders((prev) =>
      prev.map((f) =>
        f.recipeIds.includes(rid)
          ? { ...f, recipeIds: f.recipeIds.filter((r) => r !== rid), updatedAt: new Date().toISOString() }
          : f
      )
    );
  };

  const getFoldersForRecipe = (recipeId: string) => {
    const rid = toId(recipeId);
    return folders.filter((f) => f.recipeIds.includes(rid));
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
    removeRecipeFromAllFolders,
    toggleRecipeInFolder,
    getFoldersForRecipe,
  };
});
