import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUserProfile } from '@/hooks/useUserProfile';

export interface WeightEntry {
  id: string;
  weight: number; // in kg
  date: string; // ISO date string
  timestamp: number;
}

export interface WeightGoal {
  targetWeight: number;
  targetDate: string;
  startWeight: number;
  startDate: string;
}

const WEIGHT_ENTRIES_KEY = 'weight_entries';
const WEIGHT_GOAL_KEY = 'weight_goal';

export const useWeightTracking = () => {
  const [entries, setEntries] = useState<WeightEntry[]>([]);
  const [goal, setGoal] = useState<WeightGoal | null>(null);
  const [loading, setLoading] = useState(true);
  const { profile, updateBasics } = useUserProfile();

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  // Initialize from profile weight if no entries exist
  useEffect(() => {
    if (!loading && entries.length === 0 && profile.basics.weightKg) {
      const profileEntry: WeightEntry = {
        id: 'profile-initial',
        weight: profile.basics.weightKg,
        date: new Date().toISOString().split('T')[0],
        timestamp: Date.now(),
      };
      setEntries([profileEntry]);
    }
  }, [loading, entries.length, profile.basics.weightKg]);

  const loadData = async () => {
    try {
      const [entriesData, goalData] = await Promise.all([
        AsyncStorage.getItem(WEIGHT_ENTRIES_KEY),
        AsyncStorage.getItem(WEIGHT_GOAL_KEY),
      ]);

      if (entriesData) {
        const parsed = JSON.parse(entriesData);
        setEntries(parsed.sort((a: WeightEntry, b: WeightEntry) => b.timestamp - a.timestamp));
      }

      if (goalData) {
        setGoal(JSON.parse(goalData));
      }
    } catch (error) {
      console.error('Failed to load weight data:', error);
    } finally {
      setLoading(false);
    }
  };

  const addWeightEntry = async (weight: number, date?: string) => {
    const entry: WeightEntry = {
      id: Date.now().toString(),
      weight,
      date: date || new Date().toISOString().split('T')[0],
      timestamp: Date.now(),
    };

    const newEntries = [entry, ...entries].sort((a, b) => b.timestamp - a.timestamp);
    setEntries(newEntries);

    // Update profile with latest weight
    updateBasics({ weightKg: weight });

    try {
      await AsyncStorage.setItem(WEIGHT_ENTRIES_KEY, JSON.stringify(newEntries));
    } catch (error) {
      console.error('Failed to save weight entry:', error);
    }

    return entry;
  };

  const updateWeightGoal = async (newGoal: WeightGoal) => {
    setGoal(newGoal);
    try {
      await AsyncStorage.setItem(WEIGHT_GOAL_KEY, JSON.stringify(newGoal));
    } catch (error) {
      console.error('Failed to save weight goal:', error);
    }
  };

  const removeWeightEntry = async (id: string) => {
    const newEntries = entries.filter(entry => entry.id !== id);
    setEntries(newEntries);
    try {
      await AsyncStorage.setItem(WEIGHT_ENTRIES_KEY, JSON.stringify(newEntries));
    } catch (error) {
      console.error('Failed to remove weight entry:', error);
    }
  };

  // Get current weight (most recent entry)
  const getCurrentWeight = () => {
    return entries.length > 0 ? entries[0] : null;
  };

  // Get weight progress vs goal
  const getProgressStats = () => {
    const current = getCurrentWeight();
    if (!current || !goal) {
      return { progress: 0, remaining: 0, onTrack: false };
    }

    const totalToLose = goal.startWeight - goal.targetWeight;
    const lostSoFar = goal.startWeight - current.weight;
    const progress = totalToLose > 0 ? (lostSoFar / totalToLose) * 100 : 0;
    const remaining = goal.targetWeight - current.weight;

    // Calculate if on track based on time
    const startDate = new Date(goal.startDate);
    const targetDate = new Date(goal.targetDate);
    const currentDate = new Date();
    const totalDays = (targetDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    const daysPassed = (currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    const expectedProgress = totalDays > 0 ? (daysPassed / totalDays) * 100 : 0;
    const onTrack = progress >= expectedProgress * 0.8; // 80% tolerance

    return {
      progress: Math.max(0, Math.min(100, progress)),
      remaining,
      onTrack,
      expectedProgress: Math.max(0, Math.min(100, expectedProgress)),
    };
  };

  // Get weight trend (last 14 days)
  const getWeightTrend = () => {
    if (entries.length < 2) return null;

    const last14Days = entries.filter(entry => {
      const entryDate = new Date(entry.date);
      const fourteenDaysAgo = new Date();
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
      return entryDate >= fourteenDaysAgo;
    });

    if (last14Days.length < 2) return null;

    const oldest = last14Days[last14Days.length - 1];
    const newest = last14Days[0];
    const weightChange = newest.weight - oldest.weight;
    const days = (newest.timestamp - oldest.timestamp) / (1000 * 60 * 60 * 24);
    const ratePerWeek = days > 0 ? (weightChange / days) * 7 : 0;

    return {
      weightChange,
      ratePerWeek,
      trend: weightChange < -0.1 ? 'losing' : weightChange > 0.1 ? 'gaining' : 'stable',
    };
  };

  return {
    entries,
    goal,
    loading,
    addWeightEntry,
    updateWeightGoal,
    removeWeightEntry,
    getCurrentWeight,
    getProgressStats,
    getWeightTrend,
  };
};
