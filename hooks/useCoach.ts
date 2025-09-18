import { useMemo } from 'react';
import { Alert } from 'react-native';
import { useToast } from '@/contexts/ToastContext';
import { useInventory } from '@/hooks/useInventoryStore';
import { useMeals } from '@/hooks/useMealsStore';
import { useMealPlanner } from '@/hooks/useMealPlanner';
import { useShoppingList } from '@/hooks/useShoppingListStore';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { calculateMultipleRecipeAvailability } from '@/utils/recipeAvailability';
import { Meal, PlannedMeal, RecipeWithAvailability } from '@/types';

export type CoachActionIntent =
  | 'SEE_RECIPE'
  | 'ADD_TO_PLANNER'
  | 'ADD_MISSING_TO_LIST'
  | 'FIND_RECIPES_WITH'
  | 'MARK_USED'
  | 'SNOOZE'
  | 'REGENERATE';

export type CoachSuggestion = {
  id: string;
  type: 'primary_meal' | 'heads_up' | 'goal_pulse';
  title: string;
  subtitle?: string;
  recipe?: RecipeWithAvailability;
  expiringItemName?: string;
  expiringItemId?: string;
  meta?: { readyInMins?: number; highlight?: string; missingCount?: number };
  actions: Array<{
    label: string;
    intent: CoachActionIntent;
    args?: Record<string, any>;
    variant?: 'primary' | 'outline';
  }>;
  score: number;
};

function getIsoToday(): string {
  return new Date().toISOString().split('T')[0];
}

function getCurrentMealTypeByTime(): 'breakfast' | 'lunch' | 'dinner' | 'snack' {
  const hour = new Date().getHours();
  if (hour < 11) return 'breakfast';
  if (hour < 16) return 'lunch';
  if (hour < 21) return 'dinner';
  return 'snack';
}

export function useCoach() {
  const { inventory } = useInventory();
  const { meals } = useMeals();
  const { addPlannedMeal } = useMealPlanner();
  const { addItem: addToShoppingList, addMealIngredientsToList } = useShoppingList();
  const { preferences } = useUserPreferences();
  const { showToast } = useToast();

  const recipesWithAvailability = useMemo(() => {
    return calculateMultipleRecipeAvailability(meals as Meal[], inventory);
  }, [meals, inventory]);

  // Expiration removed; no expiring items

  const primaryMealSuggestion: CoachSuggestion | null = useMemo(() => {
    if (!recipesWithAvailability.length) return null;

    const timeMealType = getCurrentMealTypeByTime();
    const candidates = recipesWithAvailability
      .slice()
      .sort((a, b) => {
        // Prefer higher availability, then shorter prep time
        if (a.availability.availabilityPercentage !== b.availability.availabilityPercentage) {
          return b.availability.availabilityPercentage - a.availability.availabilityPercentage;
        }
        const aPrep = typeof (a as any).prepTime === 'number' ? (a as any).prepTime : 0;
        const bPrep = typeof (b as any).prepTime === 'number' ? (b as any).prepTime : 0;
        return aPrep - bPrep;
      });

    const recipe = candidates[0];
    if (!recipe) return null;

    const missingCount = recipe.availability.missingIngredients.length;

    return {
      id: `primary-${recipe.id}`,
      type: 'primary_meal',
      title: timeMealType === 'dinner' ? "Tonight's Dinner" : `Next ${timeMealType}`,
      subtitle: 'Best match using what you have',
      recipe,
      meta: {
        readyInMins: 'prepTime' in recipe ? (recipe as any).prepTime + (recipe as any).cookTime : undefined,
        highlight: 'High availability',
        missingCount,
      },
      actions: [
        { label: 'See Recipe', intent: 'SEE_RECIPE', args: { recipeId: recipe.id }, variant: 'outline' },
        { label: 'Add to Plan', intent: 'ADD_TO_PLANNER', args: { recipeId: recipe.id, mealType: timeMealType } },
        ...(missingCount > 0 ? [{ label: `Add ${missingCount} missing`, intent: 'ADD_MISSING_TO_LIST', args: { recipeId: recipe.id } } as const] : []),
      ],
      score: 1,
    };
  }, [recipesWithAvailability]);

  const headsUpSuggestion: CoachSuggestion | null = null;

  const goalPulseSuggestion: CoachSuggestion = useMemo(() => {
    // Simple placeholder goal pulse: use mealPlanDays as weekly target
    const daysTarget = preferences.mealPlanDays || 7;
    // Fake progress: number of days with at least one planned meal can be derived on UI if needed
    return {
      id: 'goal-pulse',
      type: 'goal_pulse',
      title: 'Weekly Goal Check',
      subtitle: `You set ${daysTarget} meal days this week. Keep momentum going!`,
      actions: [
        { label: 'See My Progress', intent: 'SEE_RECIPE', args: {} as any, variant: 'outline' },
      ],
      score: 0.5,
    };
  }, [preferences.mealPlanDays]);

  const suggestions: CoachSuggestion[] = useMemo(() => {
    return [primaryMealSuggestion, headsUpSuggestion, goalPulseSuggestion].filter(Boolean) as CoachSuggestion[];
  }, [primaryMealSuggestion, headsUpSuggestion, goalPulseSuggestion]);

  function performAction(intent: CoachActionIntent, args?: Record<string, any>) {
    switch (intent) {
      case 'ADD_TO_PLANNER': {
        const recipeId = args?.recipeId as string;
        const mealType = (args?.mealType as PlannedMeal['mealType']) || 'dinner';
        const today = getIsoToday();
        const planned: Omit<PlannedMeal, 'id'> = { recipeId, date: today, mealType, servings: 1, isCompleted: false };
        addPlannedMeal(planned);
        showToast({
          message: 'Added to plan for today',
          type: 'success',
          action: {
            label: 'Undo',
            onPress: () => {
              // Not tracked id; for MVP, inform user to remove manually
              Alert.alert('Tip', 'You can remove it from the plan if needed.');
            },
          },
        });
        return;
      }
      case 'ADD_MISSING_TO_LIST': {
        const recipeId = args?.recipeId as string;
        const added = addMealIngredientsToList(recipeId, meals, inventory);
        showToast({
          message: `Added ${added} missing ingredient(s)`,
          type: 'success',
        });
        return;
      }
      case 'FIND_RECIPES_WITH': {
        const ingredient = args?.ingredient as string;
        showToast({ message: `Find recipes with ${ingredient} in Recipes tab`, type: 'info' });
        return;
      }
      case 'MARK_USED': {
        showToast({ message: 'Marked. Update quantity in Inventory if needed.', type: 'info' });
        return;
      }
      default:
        return;
    }
  }

  return { suggestions, performAction };
}


