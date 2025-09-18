import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { useEffect, useState } from 'react';
import { PlannedMeal, MealType, MealPlanSummary, WeeklyMealPlan, Meal } from '@/types';
import { supabase } from '../supabase/functions/_shared/supabaseClient';
import { useAuth } from '@/hooks/useAuth';

export const [MealPlannerProvider, useMealPlanner] = createContextHook((meals?: Meal[]) => {
  const [plannedMeals, setPlannedMeals] = useState<PlannedMeal[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { user } = useAuth();
  const OFFLINE_ONLY = process.env.EXPO_PUBLIC_OFFLINE_ONLY === 'true';

  // Simple UUID v4-ish validator (accepts canonical 36-char form)
  const isUuid = (v: any): boolean => {
    return typeof v === 'string' && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(v);
  };

  // Load planned meals from Supabase or AsyncStorage on mount and auth change
  useEffect(() => {
    const loadPlannedMeals = async () => {
      try {
        setIsLoading(true);
        if (user && !OFFLINE_ONLY) {
          let data: any[] | null = null;
          // First attempt: full select including optional columns
          let { data: d1, error: e1 } = await supabase
            .schema('nutriai')
            .from('meal_plans')
            .select('id, recipe_id, date, meal_type, servings, notes, is_completed, completed_at, created_at')
            .eq('user_id', user.id)
            .order('date', { ascending: true })
            .order('meal_type', { ascending: true });
          if (e1 && (e1 as any).code === '42703') {
            // Retry without notes if missing
            const { data: d2, error: e2 } = await supabase
              .schema('nutriai')
              .from('meal_plans')
              .select('id, recipe_id, date, meal_type, servings, is_completed, completed_at, created_at')
              .eq('user_id', user.id)
              .order('date', { ascending: true })
              .order('meal_type', { ascending: true });
            if (e2 && (e2 as any).code === '42703') {
              // Retry minimal set without completion fields
              const { data: d3, error: e3 } = await supabase
                .schema('nutriai')
                .from('meal_plans')
                .select('id, recipe_id, date, meal_type, servings, created_at')
                .eq('user_id', user.id)
                .order('date', { ascending: true })
                .order('meal_type', { ascending: true });
              if (e3) throw e3;
              data = d3 ?? [];
            } else if (e2) {
              throw e2;
            } else {
              data = d2 ?? [];
            }
          } else if (e1) {
            throw e1;
          } else {
            data = d1 ?? [];
          }
          const rows = (data ?? []).map((r: any): PlannedMeal => ({
            id: String(r.id),
            recipeId: r.recipe_id,
            date: typeof r.date === 'string' ? r.date : new Date(r.date).toISOString().split('T')[0],
            mealType: r.meal_type as MealType,
            servings: Number(r.servings ?? 1),
            notes: (r as any).notes ?? undefined,
            isCompleted: !!(r as any).is_completed,
            completedAt: (r as any).completed_at ?? undefined,
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

  // Add a new planned meal (optimistic)
  const addPlannedMeal = async (meal: Omit<PlannedMeal, 'id'>) => {
    // Create a local optimistic item so UI updates immediately
    const local: PlannedMeal = { ...meal, id: `local-${Date.now()}` };
    setPlannedMeals(prev => [...prev, local]);

  // If offline/no user OR recipeId is not a UUID (e.g., numeric string ids),
    // keep the local entry only to avoid Supabase 22P02 errors.
    if (!user || OFFLINE_ONLY || !isUuid(meal.recipeId)) {
      if (user && !OFFLINE_ONLY && !isUuid(meal.recipeId)) {
        console.warn('[MealPlanner] Skipping server sync: non-UUID recipeId', meal.recipeId);
      }
      return;
    }

    try {
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

      // Try insert including notes; if column missing, retry without it
      let ins = await supabase
        .schema('nutriai')
        .from('meal_plans')
        .insert(payload)
        .select('id, recipe_id, date, meal_type, servings, notes, is_completed, completed_at')
        .single();

      if (ins.error && (ins.error as any).code === '42703') {
        // Retry without notes
        let { data: data2, error: err2 } = await supabase
          .schema('nutriai')
          .from('meal_plans')
          .insert({
            user_id: user.id,
            recipe_id: meal.recipeId,
            date: meal.date,
            meal_type: meal.mealType,
            servings: meal.servings ?? 1,
            is_completed: meal.isCompleted ?? false,
            completed_at: meal.completedAt ?? null,
          })
          .select('id, recipe_id, date, meal_type, servings, is_completed, completed_at')
          .single();
        if (err2 && (err2 as any).code === '42703') {
          // Retry minimal without completion fields
          const { data: data3, error: err3 } = await supabase
            .schema('nutriai')
            .from('meal_plans')
            .insert({
              user_id: user.id,
              recipe_id: meal.recipeId,
              date: meal.date,
              meal_type: meal.mealType,
              servings: meal.servings ?? 1,
            })
            .select('id, recipe_id, date, meal_type, servings')
            .single();
          if (err3) throw err3;
          ins = { data: data3, error: null } as any;
        } else if (err2) {
          throw err2;
        } else {
          ins = { data: data2, error: null } as any;
        }
      } else if (ins.error) {
        throw ins.error;
      }

      const d = ins.data as any;
      const created: PlannedMeal = {
        id: String(d.id),
        recipeId: d.recipe_id,
        date: typeof d.date === 'string' ? d.date : new Date(d.date).toISOString().split('T')[0],
        mealType: d.meal_type as MealType,
        servings: Number(d.servings ?? 1),
        notes: (d as any).notes ?? undefined,
        isCompleted: !!d.is_completed,
        completedAt: d.completed_at ?? undefined,
      };

      // Replace the optimistic item with the server-created item
      setPlannedMeals(prev => prev.map(m => (m.id === local.id ? created : m)));
    } catch (error) {
      // Keep the optimistic item; log the error so we can surface later if needed
      console.error('Failed to sync planned meal to server. Keeping local copy.', error);
    }
  };

  // Update an existing planned meal
  const updatePlannedMeal = async (updatedMeal: PlannedMeal) => {
    setPlannedMeals(prev => prev.map(meal => meal.id === updatedMeal.id ? updatedMeal : meal));
    // Skip server sync if recipeId isn't a UUID (local ids), or when offline/no user
    if (user && !OFFLINE_ONLY && isUuid(updatedMeal.recipeId)) {
      // Try update including notes; if missing column, retry without it
      let { error } = await supabase
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
      if (error && (error as any).code === '42703') {
        // Retry without notes
        let r2 = await supabase
          .schema('nutriai')
          .from('meal_plans')
          .update({
            recipe_id: updatedMeal.recipeId,
            date: updatedMeal.date,
            meal_type: updatedMeal.mealType,
            servings: updatedMeal.servings,
            is_completed: updatedMeal.isCompleted ?? false,
            completed_at: updatedMeal.completedAt ?? null,
          })
          .eq('id', updatedMeal.id);
        if (r2.error && (r2.error as any).code === '42703') {
          // Retry minimal without completion fields
          const r3 = await supabase
            .schema('nutriai')
            .from('meal_plans')
            .update({
              recipe_id: updatedMeal.recipeId,
              date: updatedMeal.date,
              meal_type: updatedMeal.mealType,
              servings: updatedMeal.servings,
            })
            .eq('id', updatedMeal.id);
          error = r3.error as any;
        } else {
          error = r2.error as any;
        }
      }
      if (error) console.error('Failed to update planned meal:', error);
    } else if (user && !OFFLINE_ONLY) {
      console.warn('[MealPlanner] Skipping server update: non-UUID recipeId', updatedMeal.recipeId);
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
    const meal = plannedMeals.find(m => m.id === id);
    if (user && !OFFLINE_ONLY && meal && isUuid(meal.recipeId)) {
      let { error } = await supabase
        .schema('nutriai')
        .from('meal_plans')
        .update({ is_completed: true, completed_at: completedAt })
        .eq('id', id);
      if (error && (error as any).code === '42703') {
        // Column not present; ignore completion update gracefully
        error = null as any;
      }
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
