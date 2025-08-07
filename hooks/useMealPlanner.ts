import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { useEffect, useState } from 'react';
import { PlannedMeal, MealType, MealPlanSummary, WeeklyMealPlan } from '@/types';

export const [MealPlannerProvider, useMealPlanner] = createContextHook(() => {
  const [plannedMeals, setPlannedMeals] = useState<PlannedMeal[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load planned meals from AsyncStorage on mount
  useEffect(() => {
    const loadPlannedMeals = async () => {
      try {
        const storedMeals = await AsyncStorage.getItem('plannedMeals');
        if (storedMeals) {
          setPlannedMeals(JSON.parse(storedMeals));
        }
      } catch (error) {
        console.error('Failed to load planned meals:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadPlannedMeals();
  }, []);

  // Save planned meals to AsyncStorage whenever it changes
  useEffect(() => {
    if (!isLoading) {
      AsyncStorage.setItem('plannedMeals', JSON.stringify(plannedMeals))
        .catch(error => console.error('Failed to save planned meals:', error));
    }
  }, [plannedMeals, isLoading]);

  // Add a new planned meal
  const addPlannedMeal = (meal: Omit<PlannedMeal, 'id'>) => {
    const newMeal: PlannedMeal = {
      ...meal,
      id: Date.now().toString(),
    };
    setPlannedMeals(prev => [...prev, newMeal]);
  };

  // Update an existing planned meal
  const updatePlannedMeal = (updatedMeal: PlannedMeal) => {
    setPlannedMeals(prev => 
      prev.map(meal => meal.id === updatedMeal.id ? updatedMeal : meal)
    );
  };

  // Remove a planned meal
  const removePlannedMeal = (id: string) => {
    setPlannedMeals(prev => prev.filter(meal => meal.id !== id));
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
  const completeMeal = (id: string) => {
    setPlannedMeals(prev => 
      prev.map(meal => 
        meal.id === id 
          ? { ...meal, isCompleted: true, completedAt: new Date().toISOString() }
          : meal
      )
    );
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
  const moveMeal = (mealId: string, newDate: string, newMealType: MealType) => {
    setPlannedMeals(prev => 
      prev.map(meal => 
        meal.id === mealId 
          ? { ...meal, date: newDate, mealType: newMealType }
          : meal
      )
    );
  };

  // Duplicate a meal to another date/time
  const duplicateMeal = (mealId: string, newDate: string, newMealType: MealType) => {
    const mealToDuplicate = plannedMeals.find(meal => meal.id === mealId);
    if (mealToDuplicate) {
      addPlannedMeal({
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