import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { useEffect, useState } from 'react';
import { PlannedMeal, MealType, MealPlanSummary, WeeklyMealPlan } from '@/types';
import { supabase } from '@/utils/supabaseClient';
import { useAuth } from '@/hooks/useAuth';

export const [MealPlannerProvider, useMealPlanner] = createContextHook(() => {
  const [plannedMeals, setPlannedMeals] = useState<PlannedMeal[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { user } = useAuth();
  const OFFLINE_ONLY = process.env.EXPO_PUBLIC_OFFLINE_ONLY === 'true';

  // Load planned meals from Supabase or AsyncStorage on mount and auth change
  useEffect(() => {
    const loadPlannedMeals = async () => {
      try {
        setIsLoading(true);
        if (user && !OFFLINE_ONLY) {
          const { data, error } = await supabase
            .schema('nutriai')
            .from('meal_plans')
            .select('id, recipe_id, date, meal_type, servings, notes, is_completed, completed_at, created_at')
            .eq('user_id', user.id)
            .order('date', { ascending: true })
            .order('meal_type', { ascending: true });
          if (error) throw error;
          const rows = (data ?? []).map((r: any): PlannedMeal => ({
            id: String(r.id),
            recipeId: r.recipe_id,
            date: typeof r.date === 'string' ? r.date : new Date(r.date).toISOString().split('T')[0],
            mealType: r.meal_type as MealType,
            servings: Number(r.servings ?? 1),
            notes: r.notes ?? undefined,
            isCompleted: !!r.is_completed,
            completedAt: r.completed_at ?? undefined,
            // created_at unused by UI but fetched for ordering predictability
          }));
          setPlannedMeals(rows);
          await AsyncStorage.setItem('plannedMeals', JSON.stringify(rows));
        } else {
          const storedMeals = await AsyncStorage.getItem('plannedMeals');
          if (storedMeals) setPlannedMeals(JSON.parse(storedMeals));
        }
      } catch (error) {
        console.error('Failed to load planned meals:', error);
        const storedMeals = await AsyncStorage.getItem('plannedMeals').catch(() => null);
        if (storedMeals) setPlannedMeals(JSON.parse(storedMeals as string));
      } finally {
        setIsLoading(false);
      }
    };

    loadPlannedMeals();
  }, [user?.id]);

  // Save planned meals to AsyncStorage whenever it changes
  useEffect(() => {
    if (!isLoading) {
      AsyncStorage.setItem('plannedMeals', JSON.stringify(plannedMeals))
        .catch(error => console.error('Failed to save planned meals:', error));
    }
  }, [plannedMeals, isLoading]);

  // Add a new planned meal
  const addPlannedMeal = async (meal: Omit<PlannedMeal, 'id'>) => {
    const local: PlannedMeal = { ...meal, id: Date.now().toString() };
    if (user && !OFFLINE_ONLY) {
      const payload = {
        user_id: user.id,
        recipe_id: meal.recipeId,
        date: meal.date, // ISO YYYY-MM-DD
        meal_type: meal.mealType,
        servings: meal.servings ?? 1,
        notes: meal.notes ?? null,
        is_completed: meal.isCompleted ?? false,
        completed_at: meal.completedAt ?? null,
      } as const;
      const { data, error } = await supabase
        .schema('nutriai')
        .from('meal_plans')
        .insert(payload)
        .select('id, recipe_id, date, meal_type, servings, notes, is_completed, completed_at')
        .single();
      if (error) throw error;
      const created: PlannedMeal = {
        id: String(data.id),
        recipeId: data.recipe_id,
        date: typeof data.date === 'string' ? data.date : new Date(data.date).toISOString().split('T')[0],
        mealType: data.meal_type as MealType,
        servings: Number(data.servings ?? 1),
        notes: data.notes ?? undefined,
        isCompleted: !!data.is_completed,
        completedAt: data.completed_at ?? undefined,
      };
      setPlannedMeals(prev => [...prev, created]);
    } else {
      setPlannedMeals(prev => [...prev, local]);
    }
  };

  // Update an existing planned meal
  const updatePlannedMeal = async (updatedMeal: PlannedMeal) => {
    setPlannedMeals(prev => prev.map(meal => meal.id === updatedMeal.id ? updatedMeal : meal));
    if (user && !OFFLINE_ONLY) {
      const { error } = await supabase
        .schema('nutriai')
        .from('meal_plans')
        .update({
          recipe_id: updatedMeal.recipeId,
          date: updatedMeal.date,
          meal_type: updatedMeal.mealType,
          servings: updatedMeal.servings,
          notes: updatedMeal.notes ?? null,
          is_completed: updatedMeal.isCompleted ?? false,
          completed_at: updatedMeal.completedAt ?? null,
        })
        .eq('id', updatedMeal.id);
      if (error) console.error('Failed to update planned meal:', error);
    }
  };

  // Remove a planned meal
  const removePlannedMeal = async (id: string) => {
    setPlannedMeals(prev => prev.filter(meal => meal.id !== id));
    if (user && !OFFLINE_ONLY) {
      const { error } = await supabase.schema('nutriai').from('meal_plans').delete().eq('id', id);
      if (error) console.error('Failed to delete planned meal:', error);
    }
  };

  // Get planned meals for a specific date
  const getMealsForDate = (date: string): PlannedMeal[] => {
    return plannedMeals.filter(meal => meal.date === date);
  };

  // Get planned meals for a specific date and meal type
  const getMealForDateAndType = (date: string, mealType: MealType): PlannedMeal | undefined => {
    return plannedMeals.find(meal => meal.date === date && meal.mealType === mealType);
  };

  // Get planned meals for a date range
  const getMealsForDateRange = (startDate: string, endDate: string): PlannedMeal[] => {
    return plannedMeals.filter(meal => meal.date >= startDate && meal.date <= endDate);
  };

  // Mark a meal as completed
  const completeMeal = async (id: string) => {
    const completedAt = new Date().toISOString();
    setPlannedMeals(prev => prev.map(meal => meal.id === id ? { ...meal, isCompleted: true, completedAt } : meal));
    if (user && !OFFLINE_ONLY) {
      const { error } = await supabase
        .schema('nutriai')
        .from('meal_plans')
        .update({ is_completed: true, completed_at: completedAt })
        .eq('id', id);
      if (error) console.error('Failed to complete planned meal:', error);
    }
  };

  // Get meal plan summary for a specific date
  const getMealPlanSummary = (date: string): MealPlanSummary => {
    const mealsForDate = getMealsForDate(date);
    
    return {
      date,
      meals: mealsForDate,
      missingIngredientsCount: 0, // Will be calculated with recipe availability
      // Nutrition data will be added when nutrition functionality is implemented
    };
  };

  // Get weekly meal plan starting from a specific Monday
  const getWeeklyMealPlan = (weekStartDate: string): WeeklyMealPlan => {
    const days: MealPlanSummary[] = [];
    
    // Generate 7 days starting from the week start date
    for (let i = 0; i < 7; i++) {
      const currentDate = new Date(weekStartDate);
      currentDate.setDate(currentDate.getDate() + i);
      const dateString = currentDate.toISOString().split('T')[0];
      
      days.push(getMealPlanSummary(dateString));
    }

    return {
      weekStartDate,
      days,
      totalMissingIngredients: [], // Will be calculated with recipe availability
    };
  };

  // Get the start of the week (Monday) for a given date
  const getWeekStartDate = (date: string): string => {
    const targetDate = new Date(date);
    const dayOfWeek = targetDate.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Handle Sunday (0) as last day of week
    
    const monday = new Date(targetDate);
    monday.setDate(targetDate.getDate() + mondayOffset);
    
    return monday.toISOString().split('T')[0];
  };

  // Move a meal to a different date/time
  const moveMeal = async (mealId: string, newDate: string, newMealType: MealType) => {
    setPlannedMeals(prev => prev.map(meal => meal.id === mealId ? { ...meal, date: newDate, mealType: newMealType } : meal));
    if (user && !OFFLINE_ONLY) {
      const { error } = await supabase
        .schema('nutriai')
        .from('meal_plans')
        .update({ date: newDate, meal_type: newMealType })
        .eq('id', mealId);
      if (error) console.error('Failed to move planned meal:', error);
    }
  };

  // Duplicate a meal to another date/time
  const duplicateMeal = async (mealId: string, newDate: string, newMealType: MealType) => {
    const mealToDuplicate = plannedMeals.find(meal => meal.id === mealId);
    if (mealToDuplicate) {
      await addPlannedMeal({
        recipeId: mealToDuplicate.recipeId,
        date: newDate,
        mealType: newMealType,
        servings: mealToDuplicate.servings,
        notes: mealToDuplicate.notes,
        isCompleted: false,
      });
    }
  };

  // Clear completed meals older than a specified number of days
  const clearOldCompletedMeals = (daysOld: number = 30) => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    const cutoffString = cutoffDate.toISOString().split('T')[0];

    setPlannedMeals(prev => 
      prev.filter(meal => 
        !meal.isCompleted || meal.date >= cutoffString
      )
    );
  };

  return {
    plannedMeals,
    isLoading,
    addPlannedMeal,
    updatePlannedMeal,
    removePlannedMeal,
    getMealsForDate,
    getMealForDateAndType,
    getMealsForDateRange,
    completeMeal,
    getMealPlanSummary,
    getWeeklyMealPlan,
    getWeekStartDate,
    moveMeal,
    duplicateMeal,
    clearOldCompletedMeals,
  };
});