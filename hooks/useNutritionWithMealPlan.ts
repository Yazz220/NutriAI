import { useNutrition } from './useNutrition';
import { useMealPlanner } from './useMealPlanner';
import { useMeals } from './useMealsStore';

/**
 * Enhanced nutrition hook that integrates with meal planning data
 * This hook combines nutrition tracking with meal plan calorie calculations
 */
export const useNutritionWithMealPlan = () => {
  const { meals } = useMeals();
  const mealPlannerData = useMealPlanner();
  const nutritionData = useNutrition(mealPlannerData.plannedMeals, meals);

  return {
    ...nutritionData,
    ...mealPlannerData,
    hasMealPlanData: mealPlannerData.plannedMeals.length > 0,
    hasRecipeData: meals.length > 0,
  };
};

export default useNutritionWithMealPlan;