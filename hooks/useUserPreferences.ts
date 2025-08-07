import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { useEffect, useState } from 'react';
import { UserPreferences, NutritionGoals } from '@/types';

const defaultPreferences: UserPreferences = {
  dietaryPreferences: [],
  allergies: [],
  mealPlanDays: 7,
  goals: {
    dailyCalories: 2000,
    protein: 120,
    carbs: 220,
    fats: 70,
  }
};

export const [UserPreferencesProvider, useUserPreferences] = createContextHook(() => {
  const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load preferences from AsyncStorage on mount
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const storedPreferences = await AsyncStorage.getItem('userPreferences');
        if (storedPreferences) {
          setPreferences(JSON.parse(storedPreferences));
        }
      } catch (error) {
        console.error('Failed to load user preferences:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadPreferences();
  }, []);

  // Save preferences to AsyncStorage whenever it changes
  useEffect(() => {
    if (!isLoading) {
      AsyncStorage.setItem('userPreferences', JSON.stringify(preferences))
        .catch(error => console.error('Failed to save user preferences:', error));
    }
  }, [preferences, isLoading]);

  // Update dietary preferences
  const updateDietaryPreferences = (dietaryPreferences: string[]) => {
    setPreferences(prev => ({
      ...prev,
      dietaryPreferences
    }));
  };

  // Update allergies
  const updateAllergies = (allergies: string[]) => {
    setPreferences(prev => ({
      ...prev,
      allergies
    }));
  };

  // Update meal plan days
  const updateMealPlanDays = (days: number) => {
    setPreferences(prev => ({
      ...prev,
      mealPlanDays: days
    }));
  };

  const updateGoals = (goals: NutritionGoals) => {
    setPreferences(prev => ({
      ...prev,
      goals,
    }));
  };

  return {
    preferences,
    isLoading,
    updateDietaryPreferences,
    updateAllergies,
    updateMealPlanDays,
    updateGoals,
  };
});