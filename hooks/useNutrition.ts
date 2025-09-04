import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { useEffect, useMemo, useState, useCallback } from 'react';
import { LoggedMeal, Meal, MealType, NutritionGoals, PlannedMeal } from '@/types';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { useUserProfile } from '@/hooks/useUserProfile';
import { 
  calculateNutritionGoals, 
  validateNutritionGoals, 
  getDefaultNutritionGoals,
  canCalculateGoals,
  getGoalExplanation,
  ValidationResult
} from '@/utils/goalCalculations';

function isoDate(date = new Date()): string {
  return date.toISOString().split('T')[0];
}

export interface DailyProgress {
  date: string;
  calories: {
    consumed: number;
    goal: number;
    remaining: number;
    percentage: number;
    fromPlanned: number;
    fromLogged: number;
  };
  macros: {
    protein: { consumed: number; goal: number; percentage: number };
    carbs: { consumed: number; goal: number; percentage: number };
    fats: { consumed: number; goal: number; percentage: number };
  };
  status: 'under' | 'met' | 'over';
}

export interface WeeklyTrend {
  weekStartDate: string;
  averageCalories: number;
  goalAdherence: number; // percentage of days meeting goals
  totalDays: number;
  daysMetGoal: number;
}

export interface MealPlanCalories {
  date: string;
  mealType: MealType;
  recipeId: string;
  servings: number;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  recipeName?: string;
}

export const [NutritionProvider, useNutrition] = createContextHook((
  plannedMeals?: PlannedMeal[],
  meals?: Meal[]
) => {
  const [loggedMeals, setLoggedMeals] = useState<LoggedMeal[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [calculatedGoals, setCalculatedGoals] = useState<NutritionGoals | null>(null);
  const [goalCalculationError, setGoalCalculationError] = useState<string | null>(null);
  const { preferences, updateGoals: updatePreferencesGoals } = useUserPreferences();
  const { profile, savePartial } = useUserProfile();

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

  // Calculate goals from profile when possible, with fallbacks
  const calculateGoalsFromProfile = useCallback(async (): Promise<NutritionGoals> => {
    try {
      setGoalCalculationError(null);
      
      // Try to calculate from user profile
      if (profile && canCalculateGoals(profile.basics)) {
        const calculated = calculateNutritionGoals(profile.basics, profile.goals);
        if (calculated) {
          setCalculatedGoals(calculated);
          return calculated;
        }
      }
      
      // Fallback to manual goals from profile
      const g = profile?.goals || {};
      if (g.dailyCalories || g.proteinTargetG || g.carbsTargetG || g.fatsTargetG) {
        const manual: NutritionGoals = {
          dailyCalories: g.dailyCalories ?? 0,
          protein: g.proteinTargetG ?? 0,
          carbs: g.carbsTargetG ?? 0,
          fats: g.fatsTargetG ?? 0,
        };
        setCalculatedGoals(manual);
        return manual;
      }
      
      // Fallback to preferences goals (backward compatibility)
      if (preferences.goals) {
        setCalculatedGoals(preferences.goals);
        return preferences.goals;
      }
      
      // Final fallback to defaults
      const defaults = getDefaultNutritionGoals();
      setCalculatedGoals(defaults);
      return defaults;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to calculate goals';
      setGoalCalculationError(errorMessage);
      console.warn('[Nutrition] Goal calculation error:', errorMessage);
      
      // Return defaults on error
      const defaults = getDefaultNutritionGoals();
      setCalculatedGoals(defaults);
      return defaults;
    }
  }, [profile, preferences.goals]);

  // Recalculate goals when profile changes
  useEffect(() => {
    calculateGoalsFromProfile();
  }, [calculateGoalsFromProfile]);

  // Current goals (calculated or fallback)
  const goals: NutritionGoals | undefined = calculatedGoals || (() => {
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

  // Calculate calories from planned meals
  const calculatePlannedMealCalories = useCallback((date: string): MealPlanCalories[] => {
    if (!plannedMeals || !meals) return [];
    
    const dayPlannedMeals = plannedMeals.filter(pm => pm.date === date);
    
    return dayPlannedMeals.map(plannedMeal => {
      const recipe = meals.find(m => m.id === plannedMeal.recipeId);
      
      if (!recipe || !recipe.nutritionPerServing) {
        // Estimate calories if nutrition data is missing
        const estimatedCalories = estimateCaloriesFromIngredients(recipe?.ingredients || []);
        return {
          date,
          mealType: plannedMeal.mealType,
          recipeId: plannedMeal.recipeId,
          servings: plannedMeal.servings,
          calories: Math.round(estimatedCalories * plannedMeal.servings),
          protein: 0, // Will be estimated in future enhancement
          carbs: 0,
          fats: 0,
          recipeName: recipe?.name || 'Unknown Recipe',
        };
      }
      
      const nutrition = recipe.nutritionPerServing;
      return {
        date,
        mealType: plannedMeal.mealType,
        recipeId: plannedMeal.recipeId,
        servings: plannedMeal.servings,
        calories: Math.round(nutrition.calories * plannedMeal.servings),
        protein: Math.round(nutrition.protein * plannedMeal.servings),
        carbs: Math.round(nutrition.carbs * plannedMeal.servings),
        fats: Math.round(nutrition.fats * plannedMeal.servings),
        recipeName: recipe.name,
      };
    });
  }, [plannedMeals, meals]);

  // Simple calorie estimation from ingredients (fallback)
  const estimateCaloriesFromIngredients = useCallback((ingredients: any[]): number => {
    // Basic calorie estimation based on common ingredient types
    const calorieEstimates: Record<string, number> = {
      // Proteins (per 100g)
      'chicken': 165, 'beef': 250, 'pork': 242, 'fish': 206, 'salmon': 208,
      'eggs': 155, 'tofu': 76, 'beans': 127, 'lentils': 116,
      
      // Carbs (per 100g)
      'rice': 130, 'pasta': 131, 'bread': 265, 'potato': 77, 'quinoa': 120,
      'oats': 389, 'flour': 364,
      
      // Fats (per 100g)
      'oil': 884, 'butter': 717, 'nuts': 607, 'avocado': 160, 'cheese': 402,
      
      // Vegetables (per 100g)
      'spinach': 23, 'broccoli': 34, 'carrot': 41, 'tomato': 18, 'onion': 40,
      'pepper': 31, 'cucumber': 16, 'lettuce': 15,
      
      // Fruits (per 100g)
      'apple': 52, 'banana': 89, 'orange': 47, 'berries': 57,
    };
    
    let totalCalories = 0;
    
    ingredients.forEach(ingredient => {
      const name = ingredient.name.toLowerCase();
      let caloriesPerUnit = 0;
      
      // Find matching calorie estimate
      for (const [key, calories] of Object.entries(calorieEstimates)) {
        if (name.includes(key)) {
          caloriesPerUnit = calories;
          break;
        }
      }
      
      // Default fallback for unknown ingredients
      if (caloriesPerUnit === 0) {
        caloriesPerUnit = 100; // Conservative estimate
      }
      
      // Convert quantity to approximate grams (rough estimation)
      let quantityInGrams = ingredient.quantity;
      const unit = ingredient.unit.toLowerCase();
      
      if (unit.includes('cup')) {
        quantityInGrams *= 240; // 1 cup ≈ 240ml/g
      } else if (unit.includes('tbsp')) {
        quantityInGrams *= 15; // 1 tbsp ≈ 15ml/g
      } else if (unit.includes('tsp')) {
        quantityInGrams *= 5; // 1 tsp ≈ 5ml/g
      } else if (unit.includes('pcs') || unit.includes('piece')) {
        quantityInGrams *= 150; // Average piece weight
      } else if (unit.includes('kg')) {
        quantityInGrams *= 1000;
      } else if (unit.includes('liter')) {
        quantityInGrams *= 1000;
      }
      // Assume grams if no conversion needed
      
      totalCalories += (caloriesPerUnit * quantityInGrams) / 100;
    });
    
    return Math.round(totalCalories);
  }, []);

  // Enhanced daily progress calculation with meal plan integration
  const getDailyProgress = useCallback((date: string): DailyProgress => {
    const dayMeals = loggedMeals.filter(m => m.date === date);
    const loggedTotals = dayMeals.reduce(
      (acc, m) => ({
        calories: acc.calories + m.calories,
        protein: acc.protein + m.protein,
        carbs: acc.carbs + m.carbs,
        fats: acc.fats + m.fats,
      }),
      { calories: 0, protein: 0, carbs: 0, fats: 0 }
    );

    // Calculate planned meal calories
    const plannedCalories = calculatePlannedMealCalories(date);
    const plannedTotals = plannedCalories.reduce(
      (acc, pm) => ({
        calories: acc.calories + pm.calories,
        protein: acc.protein + pm.protein,
        carbs: acc.carbs + pm.carbs,
        fats: acc.fats + pm.fats,
      }),
      { calories: 0, protein: 0, carbs: 0, fats: 0 }
    );

    // Combine logged and planned totals
    const totalConsumed = {
      calories: loggedTotals.calories + plannedTotals.calories,
      protein: loggedTotals.protein + plannedTotals.protein,
      carbs: loggedTotals.carbs + plannedTotals.carbs,
      fats: loggedTotals.fats + plannedTotals.fats,
    };

    const currentGoals = goals || getDefaultNutritionGoals();
    const caloriePercentage = currentGoals.dailyCalories > 0 ? totalConsumed.calories / currentGoals.dailyCalories : 0;
    
    let status: 'under' | 'met' | 'over' = 'under';
    if (caloriePercentage >= 0.95 && caloriePercentage <= 1.05) {
      status = 'met';
    } else if (caloriePercentage > 1.05) {
      status = 'over';
    }

    return {
      date,
      calories: {
        consumed: totalConsumed.calories,
        goal: currentGoals.dailyCalories,
        remaining: Math.max(0, currentGoals.dailyCalories - totalConsumed.calories),
        percentage: Math.min(1, caloriePercentage),
        fromPlanned: plannedTotals.calories,
        fromLogged: loggedTotals.calories,
      },
      macros: {
        protein: {
          consumed: totalConsumed.protein,
          goal: currentGoals.protein,
          percentage: currentGoals.protein > 0 ? Math.min(1, totalConsumed.protein / currentGoals.protein) : 0,
        },
        carbs: {
          consumed: totalConsumed.carbs,
          goal: currentGoals.carbs,
          percentage: currentGoals.carbs > 0 ? Math.min(1, totalConsumed.carbs / currentGoals.carbs) : 0,
        },
        fats: {
          consumed: totalConsumed.fats,
          goal: currentGoals.fats,
          percentage: currentGoals.fats > 0 ? Math.min(1, totalConsumed.fats / currentGoals.fats) : 0,
        },
      },
      status,
    };
  }, [loggedMeals, goals, calculatePlannedMealCalories]);

  // Weekly trends calculation
  const weeklyTrends = useMemo((): WeeklyTrend[] => {
    const trends: WeeklyTrend[] = [];
    const today = new Date();
    
    // Calculate trends for last 4 weeks
    for (let weekOffset = 0; weekOffset < 4; weekOffset++) {
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - (weekOffset * 7) - today.getDay());
      const weekStartISO = isoDate(weekStart);
      
      const weekDays: DailyProgress[] = [];
      for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        const day = new Date(weekStart);
        day.setDate(weekStart.getDate() + dayOffset);
        const dayISO = isoDate(day);
        
        // Only include days that have passed
        if (day <= today) {
          weekDays.push(getDailyProgress(dayISO));
        }
      }
      
      if (weekDays.length > 0) {
        const averageCalories = weekDays.reduce((sum, day) => sum + day.calories.consumed, 0) / weekDays.length;
        const daysMetGoal = weekDays.filter(day => day.status === 'met').length;
        const goalAdherence = weekDays.length > 0 ? (daysMetGoal / weekDays.length) * 100 : 0;
        
        trends.push({
          weekStartDate: weekStartISO,
          averageCalories: Math.round(averageCalories),
          goalAdherence: Math.round(goalAdherence),
          totalDays: weekDays.length,
          daysMetGoal,
        });
      }
    }
    
    return trends.reverse(); // Most recent first
  }, [loggedMeals, getDailyProgress]);

  const last7Days = useMemo(() => {
    const days: { date: string; calories: number; protein: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ds = isoDate(d);
      const progress = getDailyProgress(ds);
      days.push({ 
        date: ds, 
        calories: progress.calories.consumed, 
        protein: progress.macros.protein.consumed 
      });
    }
    return days;
  }, [getDailyProgress]);

  // Update goals with validation
  const updateGoals = useCallback(async (newGoals: Partial<NutritionGoals>): Promise<ValidationResult> => {
    try {
      const validation = validateNutritionGoals(newGoals);
      
      if (!validation.isValid) {
        return validation;
      }
      
      // Update calculated goals state
      const updatedGoals = { ...goals, ...newGoals } as NutritionGoals;
      setCalculatedGoals(updatedGoals);
      
      // Persist to profile if we have one, otherwise to preferences
      if (profile) {
        const profileGoals = {
          dailyCalories: updatedGoals.dailyCalories,
          proteinTargetG: updatedGoals.protein,
          carbsTargetG: updatedGoals.carbs,
          fatsTargetG: updatedGoals.fats,
        };
        await savePartial('goals', profileGoals);
      } else {
        // Fallback to preferences for backward compatibility
        updatePreferencesGoals(updatedGoals);
      }
      
      return validation;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update goals';
      return {
        isValid: false,
        errors: [errorMessage],
        warnings: [],
      };
    }
  }, [goals, profile, savePartial, updatePreferencesGoals]);

  // Get goal explanation for transparency
  const getGoalsExplanation = useCallback((): string => {
    if (!profile || !goals) {
      return 'Using default nutrition goals. Complete your profile for personalized recommendations.';
    }
    
    return getGoalExplanation(profile.basics, profile.goals, goals);
  }, [profile, goals]);

  // Check if goals can be calculated from current profile
  const canCalculateFromProfile = useMemo(() => {
    return profile ? canCalculateGoals(profile.basics) : false;
  }, [profile]);

  // Auto-log planned meals when they're marked as completed
  const logPlannedMeal = useCallback((plannedMeal: PlannedMeal): string | null => {
    if (!meals) return null;
    
    const recipe = meals.find(m => m.id === plannedMeal.recipeId);
    if (!recipe) return null;
    
    return logMealFromRecipe(recipe, plannedMeal.date, plannedMeal.mealType, plannedMeal.servings);
  }, [meals, logMealFromRecipe]);

  // Get planned meal calories for a specific date
  const getPlannedMealCalories = useCallback((date: string): MealPlanCalories[] => {
    return calculatePlannedMealCalories(date);
  }, [calculatePlannedMealCalories]);

  // Get total planned calories for a date range
  const getPlannedCaloriesForRange = useCallback((startDate: string, endDate: string): number => {
    if (!plannedMeals || !meals) return 0;
    
    const rangeCalories = plannedMeals
      .filter(pm => pm.date >= startDate && pm.date <= endDate)
      .reduce((total, pm) => {
        const recipe = meals.find(m => m.id === pm.recipeId);
        if (recipe?.nutritionPerServing) {
          return total + (recipe.nutritionPerServing.calories * pm.servings);
        }
        return total + estimateCaloriesFromIngredients(recipe?.ingredients || []) * pm.servings;
      }, 0);
    
    return Math.round(rangeCalories);
  }, [plannedMeals, meals, estimateCaloriesFromIngredients]);

  // Check if a planned meal has nutrition data
  const hasNutritionData = useCallback((recipeId: string): boolean => {
    if (!meals) return false;
    const recipe = meals.find(m => m.id === recipeId);
    return !!(recipe?.nutritionPerServing);
  }, [meals]);

  return {
    // Existing properties
    isLoading,
    loggedMeals,
    todayTotals,
    goals,
    remainingAgainstGoals,
    last7Days,
    logMealFromRecipe,
    logCustomMeal,
    removeLoggedMeal,
    
    // New goal calculation properties
    calculatedGoals,
    goalCalculationError,
    canCalculateFromProfile,
    
    // New methods
    calculateGoalsFromProfile,
    updateGoals,
    getDailyProgress,
    getGoalsExplanation,
    
    // New meal plan integration
    logPlannedMeal,
    getPlannedMealCalories,
    getPlannedCaloriesForRange,
    hasNutritionData,
    calculatePlannedMealCalories,
    estimateCaloriesFromIngredients,
    
    // New data
    weeklyTrends,
  };
});


