import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { useEffect, useMemo, useState } from 'react';
import { LoggedMeal, Meal, MealType, NutritionGoals } from '@/types';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { useUserProfile } from '@/hooks/useUserProfile';

function isoDate(date = new Date()): string {
  return date.toISOString().split('T')[0];
}

export const [NutritionProvider, useNutrition] = createContextHook(() => {
  const [loggedMeals, setLoggedMeals] = useState<LoggedMeal[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { preferences } = useUserPreferences();
  const { profile } = useUserProfile();

  useEffect(() => {
    const load = async () => {
      try {
        const data = await AsyncStorage.getItem('loggedMeals');
        if (data) setLoggedMeals(JSON.parse(data));
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!isLoading) {
      AsyncStorage.setItem('loggedMeals', JSON.stringify(loggedMeals)).catch(() => {});
    }
  }, [loggedMeals, isLoading]);

  const logMealFromRecipe = (meal: Meal, date: string, mealType: MealType, servings: number = 1) => {
    const per = meal.nutritionPerServing || { calories: 0, protein: 0, carbs: 0, fats: 0 };
    const entry: LoggedMeal = {
      id: Date.now().toString(),
      date,
      mealType,
      mealId: meal.id,
      servings,
      calories: Math.round(per.calories * servings),
      protein: Math.round(per.protein * servings),
      carbs: Math.round(per.carbs * servings),
      fats: Math.round(per.fats * servings),
    };
    setLoggedMeals(prev => [...prev, entry]);
    return entry.id;
  };

  const logCustomMeal = (
    name: string,
    date: string,
    mealType: MealType,
    macros: { calories: number; protein: number; carbs: number; fats: number },
  ) => {
    const entry: LoggedMeal = {
      id: Date.now().toString(),
      date,
      mealType,
      customName: name,
      servings: 1,
      calories: macros.calories,
      protein: macros.protein,
      carbs: macros.carbs,
      fats: macros.fats,
    };
    setLoggedMeals(prev => [...prev, entry]);
    return entry.id;
  };

  const removeLoggedMeal = (id: string) => {
    setLoggedMeals(prev => prev.filter(m => m.id !== id));
  };

  const today = isoDate();
  const todayMeals = useMemo(() => loggedMeals.filter(m => m.date === today), [loggedMeals, today]);

  const todayTotals = useMemo(() => {
    return todayMeals.reduce(
      (acc, m) => ({
        calories: acc.calories + m.calories,
        protein: acc.protein + m.protein,
        carbs: acc.carbs + m.carbs,
        fats: acc.fats + m.fats,
      }),
      { calories: 0, protein: 0, carbs: 0, fats: 0 },
    );
  }, [todayMeals]);

  // Prefer goals from User Profile; fallback to existing preferences.goals for backward-compat
  const goals: NutritionGoals | undefined = (() => {
    const g = profile?.goals || {};
    const mapped: NutritionGoals | undefined =
      g.dailyCalories || g.proteinTargetG || g.carbsTargetG || g.fatsTargetG
        ? {
            dailyCalories: g.dailyCalories ?? 0,
            protein: g.proteinTargetG ?? 0,
            carbs: g.carbsTargetG ?? 0,
            fats: g.fatsTargetG ?? 0,
          }
        : undefined;
    return mapped ?? preferences.goals;
  })();

  const remainingAgainstGoals = useMemo(() => {
    if (!goals) return undefined;
    return {
      calories: Math.max(0, goals.dailyCalories - todayTotals.calories),
      protein: Math.max(0, goals.protein - todayTotals.protein),
      carbs: Math.max(0, goals.carbs - todayTotals.carbs),
      fats: Math.max(0, goals.fats - todayTotals.fats),
    };
  }, [goals, todayTotals]);

  const last7Days = useMemo(() => {
    const days: { date: string; calories: number; protein: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ds = isoDate(d);
      const totals = loggedMeals
        .filter(m => m.date === ds)
        .reduce((acc, m) => ({ calories: acc.calories + m.calories, protein: acc.protein + m.protein }), { calories: 0, protein: 0 });
      days.push({ date: ds, calories: totals.calories, protein: totals.protein });
    }
    return days;
  }, [loggedMeals]);

  return {
    isLoading,
    loggedMeals,
    todayTotals,
    goals,
    remainingAgainstGoals,
    last7Days,
    logMealFromRecipe,
    logCustomMeal,
    removeLoggedMeal,
  };
});


