import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { useEffect, useState, useCallback } from 'react';

export type GoalType = 'maintain' | 'lose' | 'gain';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'athlete';
export type UnitSystem = 'metric' | 'imperial';

export interface UserBasics {
  name?: string;
  age?: number;
  sex?: 'male' | 'female' | 'other';
  heightCm?: number;
  weightKg?: number;
}

export interface UserGoals {
  dailyCalories?: number;
  proteinTargetG?: number;
  carbsTargetG?: number;
  fatsTargetG?: number;
  goalType?: GoalType;
  activityLevel?: ActivityLevel;
}

export interface UserPreferencesProfile {
  allergies: string[];
  dietary?: 'vegan' | 'vegetarian' | 'pescatarian' | 'halal' | 'kosher' | 'gluten_free' | 'keto' | 'paleo' | 'none';
  dislikedIngredients: string[];
  preferredCuisines: string[];
}

export interface UserProfileState {
  basics: UserBasics;
  goals: UserGoals;
  preferences: UserPreferencesProfile;
  metrics: { unitSystem: UnitSystem };
}

const defaultProfile: UserProfileState = {
  basics: {},
  goals: {},
  preferences: { allergies: [], dislikedIngredients: [], preferredCuisines: [] },
  metrics: { unitSystem: 'metric' },
};

const STORAGE_KEY = 'userProfile';

export const [UserProfileProvider, useUserProfile] = createContextHook(() => {
  const [profile, setProfile] = useState<UserProfileState>(defaultProfile);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) setProfile({ ...defaultProfile, ...JSON.parse(raw) });
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!isLoading) {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(profile)).catch(() => {});
    }
  }, [profile, isLoading]);

  const updateBasics = useCallback((patch: Partial<UserBasics>) => {
    setProfile((p) => ({ ...p, basics: { ...p.basics, ...patch } }));
  }, []);

  const updateGoals = useCallback((patch: Partial<UserGoals>) => {
    setProfile((p) => ({ ...p, goals: { ...p.goals, ...patch } }));
  }, []);

  const updatePreferences = useCallback((patch: Partial<UserPreferencesProfile>) => {
    setProfile((p) => ({ ...p, preferences: { ...p.preferences, ...patch } }));
  }, []);

  const setUnitSystem = useCallback((unitSystem: UnitSystem) => {
    setProfile((p) => ({ ...p, metrics: { unitSystem } }));
  }, []);

  return {
    isLoading,
    profile,
    setProfile,
    updateBasics,
    updateGoals,
    updatePreferences,
    setUnitSystem,
  };
});
