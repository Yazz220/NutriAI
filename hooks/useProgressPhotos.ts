import { useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ProgressPhoto {
  id: string;
  uri: string; // local file uri
  dateISO: string;
}

const STORAGE_KEY = 'progress_photos_v1';
const CMP_STORAGE_KEY = 'progress_photo_comparisons_v1';

export interface PhotoComparison {
  id: string;
  leftPhotoId: string;
  rightPhotoId: string;
  createdAt: number;
}

export function useProgressPhotos() {
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [comparisons, setComparisons] = useState<PhotoComparison[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) setPhotos(JSON.parse(raw));
        const cmpRaw = await AsyncStorage.getItem(CMP_STORAGE_KEY);
        if (cmpRaw) setComparisons(JSON.parse(cmpRaw));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const persist = useCallback(async (next: ProgressPhoto[]) => {
    setPhotos(next);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {}
  }, []);

  const addPhoto = useCallback(async (uri: string) => {
    const p: ProgressPhoto = {
      id: Date.now().toString(),
      uri,
      dateISO: new Date().toISOString().split('T')[0],
    };
    await persist([p, ...photos]);
    return p;
  }, [persist, photos]);

  const removePhoto = useCallback(async (id: string) => {
    const next = photos.filter((p) => p.id !== id);
    await persist(next);
  }, [photos, persist]);

  const removeMany = useCallback(async (ids: string[]) => {
    const idSet = new Set(ids);
    const next = photos.filter((p) => !idSet.has(p.id));
    await persist(next);
  }, [photos, persist]);

  const clearAll = useCallback(async () => {
    await persist([]);
    setComparisons([]);
    try { await AsyncStorage.removeItem(CMP_STORAGE_KEY); } catch {}
  }, [persist]);

  // Comparisons
  const persistComparisons = useCallback(async (next: PhotoComparison[]) => {
    setComparisons(next);
    try { await AsyncStorage.setItem(CMP_STORAGE_KEY, JSON.stringify(next)); } catch {}
  }, []);

  const addComparison = useCallback(async (leftPhotoId: string, rightPhotoId: string) => {
    const cmp: PhotoComparison = { id: Date.now().toString(), leftPhotoId, rightPhotoId, createdAt: Date.now() };
    const next = [cmp, ...comparisons];
    await persistComparisons(next);
    return cmp;
  }, [comparisons, persistComparisons]);

  const removeComparison = useCallback(async (id: string) => {
    const next = comparisons.filter((c) => c.id !== id);
    await persistComparisons(next);
  }, [comparisons, persistComparisons]);

  return { photos, loading, addPhoto, removePhoto, removeMany, clearAll, comparisons, addComparison, removeComparison };
}
