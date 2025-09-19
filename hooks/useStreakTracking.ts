import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNutritionWithMealPlan } from './useNutritionWithMealPlan';

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastLoggedDate: string | null;
  streakStartDate: string | null;
  totalDaysLogged: number;
}

const STORAGE_KEY = 'nutrition_streak_data';
const STREAK_GOAL_CALORIES_THRESHOLD = 0.8; // 80% of goal to count as a "successful" day

export function useStreakTracking() {
  const { getDailyProgress, goals } = useNutritionWithMealPlan();
  const [streakData, setStreakData] = useState<StreakData>({
    currentStreak: 0,
    longestStreak: 0,
    lastLoggedDate: null,
    streakStartDate: null,
    totalDaysLogged: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Load streak data from storage
  useEffect(() => {
    const loadStreakData = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const data = JSON.parse(stored) as StreakData;
          setStreakData(data);
        }
      } catch (error) {
        console.error('Failed to load streak data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadStreakData();
  }, []);

  // Save streak data to storage
  const saveStreakData = useCallback(async (data: StreakData) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      setStreakData(data);
    } catch (error) {
      console.error('Failed to save streak data:', error);
    }
  }, []);

  // Check if a day meets the streak criteria
  const isDaySuccessful = useCallback((date: string): boolean => {
    const progress = getDailyProgress(date);
    if (!goals) return false;
    
    // Day is successful if user reached at least 80% of their calorie goal
    const caloriePercentage = progress.calories.consumed / Math.max(progress.calories.goal, 1);
    return caloriePercentage >= STREAK_GOAL_CALORIES_THRESHOLD;
  }, [getDailyProgress, goals]);

  // Update streak based on current nutrition data
  const updateStreak = useCallback(async () => {
    if (!goals || isLoading) return;

    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    // Check if today is successful
    const todaySuccessful = isDaySuccessful(today);
    
    let newStreakData = { ...streakData };

    // If today is successful and we haven't logged it yet
    if (todaySuccessful && streakData.lastLoggedDate !== today) {
      // If yesterday was also our last logged date, continue the streak
      if (streakData.lastLoggedDate === yesterday) {
        newStreakData.currentStreak += 1;
      } else if (streakData.lastLoggedDate === null || streakData.currentStreak === 0) {
        // Starting a new streak
        newStreakData.currentStreak = 1;
        newStreakData.streakStartDate = today;
      } else {
        // Gap in streak, start over
        newStreakData.currentStreak = 1;
        newStreakData.streakStartDate = today;
      }
      
      newStreakData.lastLoggedDate = today;
      newStreakData.totalDaysLogged += 1;
      
      // Update longest streak if current is longer
      if (newStreakData.currentStreak > newStreakData.longestStreak) {
        newStreakData.longestStreak = newStreakData.currentStreak;
      }
      
      await saveStreakData(newStreakData);
    } else if (!todaySuccessful && streakData.lastLoggedDate === yesterday) {
      // Today is not successful but yesterday was - check if we need to break the streak
      // We'll be lenient and not break the streak immediately, but if they miss 2 days, break it
      const dayBeforeYesterday = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      if (!isDaySuccessful(yesterday) && streakData.lastLoggedDate === dayBeforeYesterday) {
        // Two consecutive unsuccessful days, break the streak
        newStreakData.currentStreak = 0;
        newStreakData.streakStartDate = null;
        await saveStreakData(newStreakData);
      }
    }
  }, [streakData, goals, isDaySuccessful, saveStreakData, isLoading]);

  // Auto-update streak when nutrition data changes
  useEffect(() => {
    updateStreak();
  }, [updateStreak]);

  // Get streak status for today
  const getTodayStatus = useCallback((): 'success' | 'pending' | 'missed' => {
    const today = new Date().toISOString().split('T')[0];
    const progress = getDailyProgress(today);
    
    if (!goals) return 'pending';
    
    const caloriePercentage = progress.calories.consumed / Math.max(progress.calories.goal, 1);
    
    if (caloriePercentage >= STREAK_GOAL_CALORIES_THRESHOLD) {
      return 'success';
    } else if (caloriePercentage > 0) {
      return 'pending';
    } else {
      return 'missed';
    }
  }, [getDailyProgress, goals]);

  // Get progress towards today's goal
  const getTodayProgress = useCallback((): number => {
    const today = new Date().toISOString().split('T')[0];
    const progress = getDailyProgress(today);
    
    if (!goals) return 0;
    
    const caloriePercentage = progress.calories.consumed / Math.max(progress.calories.goal, 1);
    return Math.min(1, caloriePercentage / STREAK_GOAL_CALORIES_THRESHOLD);
  }, [getDailyProgress, goals]);

  // Reset streak (for testing or user request)
  const resetStreak = useCallback(async () => {
    const resetData: StreakData = {
      currentStreak: 0,
      longestStreak: streakData.longestStreak, // Keep longest streak record
      lastLoggedDate: null,
      streakStartDate: null,
      totalDaysLogged: streakData.totalDaysLogged, // Keep total days logged
    };
    await saveStreakData(resetData);
  }, [streakData.longestStreak, streakData.totalDaysLogged, saveStreakData]);

  return {
    streakData,
    isLoading,
    updateStreak,
    resetStreak,
    getTodayStatus,
    getTodayProgress,
    isDaySuccessful,
  };
}
