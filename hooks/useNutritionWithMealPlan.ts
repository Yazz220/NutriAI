import { useNutrition } from './useNutrition';
import { useMealPlanner } from './useMealPlanner';
import { useMeals } from './useMealsStore';

/**
 * Enhanced nutrition hook that integrates with meal planning data
 * This hook combines nutrition tracking with meal plan calorie calculations
 */
export const useNutritionWithMealPlan = () => {
  const { plannedMeals } = useMealPlanner();
  const { meals } = useMeals();
  
  // Pass meal planning data to nutrition hook
  const nutritionData = useNutrition(plannedMeals, meals);
  
  return {
    ...nutritionData,
    // Additional computed properties for convenience
    hasMealPlanData: plannedMeals.length > 0,
    hasRecipeData: meals.length > 0,
  };
};

export default useNutritionWithMealPlan;