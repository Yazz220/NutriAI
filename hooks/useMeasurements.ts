import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useState } from 'react';

export type MetricKey = 'weight' | 'waist' | 'bodyFat' | 'chest' | 'arm' | 'bmi';

export interface MeasurementEntry {
  date: string; // ISO date (YYYY-MM-DD)
  value: number;
  unit: string;
}

type Measurements = Partial<Record<MetricKey, MeasurementEntry[]>>;

const STORAGE_KEY = 'measurements_v1';

const DEFAULT_UNITS: Record<MetricKey, string> = {
  weight: 'kg',
  waist: 'cm',
  bodyFat: '%',
  chest: 'cm',
  arm: 'cm',
  bmi: '',
};

export function useMeasurements() {
  const [measurements, setMeasurements] = useState<Measurements>({});
  const [loading, setLoading] = useState(true);

  // Load
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as Measurements;
          // Ensure arrays are sorted ascending by date
          const normalized: Measurements = {};
          (Object.keys(parsed) as MetricKey[]).forEach((k) => {
            const list = Array.isArray(parsed[k]) ? (parsed[k] as MeasurementEntry[]) : [];
            normalized[k] = list
              .filter(e => typeof e?.date === 'string' && typeof e?.value === 'number')
              .sort((a, b) => a.date.localeCompare(b.date));
          });
          setMeasurements(normalized);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Persist
  useEffect(() => {
    if (!loading) {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(measurements)).catch(() => {});
    }
  }, [measurements, loading]);

  const addMeasurement = useCallback((key: MetricKey, value: number, unit?: string, dateISO?: string) => {
    const unitToUse = unit ?? DEFAULT_UNITS[key];
    const date = (dateISO ?? new Date().toISOString()).split('T')[0];
    setMeasurements(prev => {
      const list = prev[key] ? [...prev[key]!] : [];
      list.push({ date, value, unit: unitToUse });
      list.sort((a, b) => a.date.localeCompare(b.date));
      return { ...prev, [key]: list };
    });
  }, []);

  const getEntries = useCallback((key: MetricKey): MeasurementEntry[] => {
    return measurements[key] || [];
  }, [measurements]);

  const latestByMetric = useMemo(() => {
    const out: Partial<Record<MetricKey, MeasurementEntry>> = {};
    (Object.keys(measurements) as MetricKey[]).forEach(k => {
      const list = measurements[k] || [];
      out[k] = list.length ? list[list.length - 1] : undefined;
    });
    return out;
  }, [measurements]);

  const lastUpdated = useMemo(() => {
    let latestDate: string | undefined;
    (Object.keys(measurements) as MetricKey[]).forEach(k => {
      const list = measurements[k] || [];
      if (list.length) {
        const d = list[list.length - 1].date;
        if (!latestDate || d > latestDate) latestDate = d;
      }
    });
    return latestDate;
  }, [measurements]);

  const lastUpdatedLabel = useMemo(() => {
    if (!lastUpdated) return 'No entries yet';
    const d = new Date(lastUpdated);
    const now = new Date();
    const days = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (days <= 0) return 'Today';
    if (days === 1) return 'Yesterday';
    return `${days} days ago`;
  }, [lastUpdated]);

  return {
    loading,
    measurements,
    latestByMetric,
    lastUpdated,
    lastUpdatedLabel,
    addMeasurement,
    getEntries,
    DEFAULT_UNITS,
  } as const;
}

