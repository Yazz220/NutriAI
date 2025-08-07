import { useMemo, useState } from 'react';
import { useMeals } from '@/hooks/useMealsStore';
import { useInventory } from '@/hooks/useInventoryStore';
import { useMealPlanner } from '@/hooks/useMealPlanner';
import { useShoppingList } from '@/hooks/useShoppingListStore';
import { calculateMultipleRecipeAvailability, getRecipesUsingExpiringIngredients } from '@/utils/recipeAvailability';
import { Meal, PlannedMeal, RecipeWithAvailability } from '@/types';
import { useToast } from '@/contexts/ToastContext';

export type ChatMessage = {
  id: string;
  role: 'user' | 'coach';
  text?: string;
  meals?: Array<{ recipe: RecipeWithAvailability; mealType?: PlannedMeal['mealType'] }>;
  summary?: string;
  actions?: Array<{ label: string; type: 'ADD_ALL' | 'GENERATE_LIST'; payload?: any }>;
};

const isoToday = () => new Date().toISOString().split('T')[0];

export function useCoachChat() {
  const { meals } = useMeals();
  const { inventory } = useInventory();
  const { addPlannedMeal, plannedMeals } = useMealPlanner();
  const { addMealIngredientsToList, generateShoppingListFromMealPlan } = useShoppingList();
  const { showToast } = useToast();

  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const recipesWithAvailability = useMemo(() => calculateMultipleRecipeAvailability(meals as Meal[], inventory), [meals, inventory]);

  function pushCoach(msg: Omit<ChatMessage, 'id' | 'role'>) {
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'coach', ...msg }]);
  }

  function pushUser(text: string) {
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', text }]);
  }

  function addAllToPlanner(entries: Array<{ recipe: RecipeWithAvailability; mealType?: PlannedMeal['mealType'] }>) {
    const today = new Date(isoToday());
    entries.forEach((e, idx) => {
      const date = new Date(today);
      date.setDate(today.getDate() + idx);
      addPlannedMeal({ recipeId: e.recipe.id, date: date.toISOString().split('T')[0], mealType: e.mealType || 'dinner', servings: 1, isCompleted: false });
    });
    showToast({ message: `Added ${entries.length} meals to planner`, type: 'success' });
  }

  function planDay() {
    // Prefer recipes that use expiring ingredients and high availability
    const candidates = getRecipesUsingExpiringIngredients(recipesWithAvailability);
    const pool = (candidates.length ? candidates : recipesWithAvailability).slice().sort((a, b) => {
      if (a.availability.availabilityPercentage !== b.availability.availabilityPercentage) {
        return b.availability.availabilityPercentage - a.availability.availabilityPercentage;
      }
      const aPrep = 'prepTime' in a ? (a as any).prepTime : 0;
      const bPrep = 'prepTime' in b ? (b as any).prepTime : 0;
      return aPrep - bPrep;
    });
    const picked = pool.slice(0, 3);
    const mealsForDay = picked.map((r, i) => ({ recipe: r, mealType: (['breakfast', 'lunch', 'dinner'] as const)[Math.min(i, 2)] }));
    pushCoach({
      text: "Here's a draft for today",
      meals: mealsForDay,
      summary: 'Balanced options using what you have. You can add all or swap any.',
      actions: [{ label: 'Add All', type: 'ADD_ALL' }],
    });
  }

  function planWeek() {
    const pool = recipesWithAvailability.slice().sort((a, b) => {
      if (a.availability.availabilityPercentage !== b.availability.availabilityPercentage) {
        return b.availability.availabilityPercentage - a.availability.availabilityPercentage;
      }
      return (a as any).prepTime - (b as any).prepTime;
    });
    const picked = pool.slice(0, 5);
    const dinners = picked.map((r) => ({ recipe: r, mealType: 'dinner' as const }));
    const totalMissing = picked.reduce((acc, r) => acc + r.availability.missingIngredients.length, 0);
    pushCoach({
      text: "Here's your week of dinners",
      meals: dinners,
      summary: `I selected high-availability meals. Total missing ingredients across plan: ${totalMissing}.`,
      actions: [
        { label: 'Add All', type: 'ADD_ALL' },
      ],
    });
  }

  function generateListFromPlanner() {
    const added = generateShoppingListFromMealPlan(plannedMeals, meals, inventory);
    pushCoach({ text: `Added ${added} missing item(s) to your shopping list.`, summary: 'Open Shopping List to review.' });
  }

  function sendMessage(text: string) {
    const lower = text.trim().toLowerCase();
    pushUser(text);
    if (/plan (my )?day|plan today|plan the day/.test(lower)) {
      planDay();
      return;
    }
    if (/plan (my )?week|plan the week|fill my week/.test(lower)) {
      planWeek();
      return;
    }
    if (/shopping list|generate list|build list/.test(lower)) {
      generateListFromPlanner();
      return;
    }
    // Default
    pushCoach({ text: "I can plan today or the week, and generate a shopping list. Try 'Plan my day'." });
  }

  function performInlineAction(action: ChatMessage['actions'][number], meals?: ChatMessage['meals']) {
    if (action.type === 'ADD_ALL' && meals) {
      addAllToPlanner(meals);
    }
    if (action.type === 'GENERATE_LIST') {
      generateListFromPlanner();
    }
  }

  return { messages, sendMessage, performInlineAction };
}


