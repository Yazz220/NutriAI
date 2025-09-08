import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useState } from 'react';

export type WeightEntry = { date: string; weightKg: number };

const STORAGE_KEY = 'weight_log_v1';

function iso(date = new Date()): string {
  return date.toISOString().split('T')[0];
}

export function useWeightLog() {
  const [entries, setEntries] = useState<WeightEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed: WeightEntry[] = JSON.parse(raw);
          // Ensure unique by date
          const map = new Map<string, WeightEntry>();
          parsed.forEach(e => {
            if (typeof e?.date === 'string' && typeof e?.weightKg === 'number') {
              map.set(e.date, { date: e.date, weightKg: e.weightKg });
            }
          });
          const arr = Array.from(map.values()).sort((a,b) => a.date.localeCompare(b.date));
          setEntries(arr);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!loading) {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entries)).catch(() => {});
    }
  }, [entries, loading]);

  const addOrUpdate = useCallback((dateISO: string, weightKg: number) => {
    setEntries(prev => {
      const next = prev.filter(e => e.date !== dateISO);
      next.push({ date: dateISO, weightKg });
      next.sort((a,b) => a.date.localeCompare(b.date));
      return next;
    });
  }, []);

  const remove = useCallback((dateISO: string) => {
    setEntries(prev => prev.filter(e => e.date !== dateISO));
  }, []);

  const getRange = useCallback((days: number): WeightEntry[] => {
    const today = iso();
    const start = new Date();
    start.setDate(start.getDate() - (days - 1));
    const startISO = start.toISOString().split('T')[0];
    return entries.filter(e => e.date >= startISO && e.date <= today);
  }, [entries]);

  const latest = useMemo(() => entries.length ? entries[entries.length - 1] : undefined, [entries]);

  return { entries, latest, loading, addOrUpdate, remove, getRange };
}
