import { useMemo, useRef, useState } from 'react';
import { useMeals } from '@/hooks/useMealsStore';
import { useInventory } from '@/hooks/useInventoryStore';
import { useMealPlanner } from '@/hooks/useMealPlanner';
import { useShoppingList } from '@/hooks/useShoppingListStore';
import { calculateMultipleRecipeAvailability, getRecipesUsingExpiringIngredients } from '@/utils/recipeAvailability';
import { Meal, PlannedMeal, RecipeWithAvailability } from '@/types';
import { useToast } from '@/contexts/ToastContext';
import { aiChat, ChatMessage as ApiChatMessage, AiContext, createChatCompletion } from '@/utils/aiClient';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useNutrition } from '@/hooks/useNutrition';
import { buildAIContext } from '@/utils/aiContext';
import { buildStructuredSystemPrompt, tryExtractJSON, StructuredResponse } from '@/utils/aiFormat';

export type ChatMessage = {
  id: string;
  role: 'user' | 'coach';
  text?: string;
  meals?: Array<{ recipe: RecipeWithAvailability; mealType?: PlannedMeal['mealType'] }>;
  summary?: string;
  actions?: Array<{ label: string; type: 'ADD_ALL' | 'GENERATE_LIST'; payload?: any }>;
  source?: 'ai' | 'heuristic' | 'builtin';
  structured?: StructuredResponse;
};

const isoToday = () => new Date().toISOString().split('T')[0];

export function useCoachChat() {
  const { meals } = useMeals();
  const { inventory } = useInventory();
  const { addPlannedMeal, plannedMeals } = useMealPlanner();
  const { addMealIngredientsToList, generateShoppingListFromMealPlan } = useShoppingList();
  const { showToast } = useToast();
  const { profile } = useUserProfile();
  const { todayTotals, last7Days, goals } = useNutrition();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const idSeq = useRef(0);
  const newId = () => `${Date.now()}-${idSeq.current++}`;

  const recipesWithAvailability = useMemo(() => calculateMultipleRecipeAvailability(meals as Meal[], inventory), [meals, inventory]);

  function pushCoach(msg: Omit<ChatMessage, 'id' | 'role'>) {
    setMessages(prev => [...prev, { id: newId(), role: 'coach', source: msg.source || 'heuristic', ...msg }]);
  }

  function pushUser(text: string) {
    setMessages(prev => [...prev, { id: newId(), role: 'user', text }]);
  }

  function addAllToPlanner(entries: Array<{ recipe: RecipeWithAvailability; mealType?: PlannedMeal['mealType'] }>) {
    const today = new Date(isoToday());
    entries.forEach((e, idx) => {
      const date = new Date(today);
      date.setDate(today.getDate() + idx);
      addPlannedMeal({ recipeId: e.recipe.id, date: date.toISOString().split('T')[0], mealType: e.mealType || 'dinner', servings: 1, isCompleted: false });
    });
    showToast({ message: `Added ${entries.length} meals to your plan`, type: 'success' });
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
      source: 'heuristic',
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
      source: 'heuristic',
    });
  }

  function generateListFromPlanner() {
    const added = generateShoppingListFromMealPlan(plannedMeals, meals, inventory);
    pushCoach({ text: `Added ${added} missing item(s) to your shopping list.`, summary: 'Open Shopping List to review.', source: 'heuristic' });
  }

  async function sendMessage(text: string) {
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
    // Default -> Ask AI via Supabase Edge Function
    try {
      // Build context for Edge Function
      const ctx: AiContext = {
        profile: profile ? {
          display_name: profile.basics?.name,
          units: profile.metrics?.unitSystem,
          goals: (profile.goals as unknown as Record<string, unknown>) ?? {},
          preferences: (profile.preferences as unknown as Record<string, unknown>) ?? {},
        } : null,
        inventory: inventory.slice(0, 100).map(i => ({
          id: String(i.id),
          name: i.name,
          quantity: i.quantity,
          unit: i.unit,
          category: i.category,
          expiryDate: i.expiryDate ?? null,
        })),
        plannedMeals: plannedMeals.slice(0, 100).map(pm => ({
          id: pm.id,
          recipeId: pm.recipeId,
          date: pm.date,
          mealType: pm.mealType,
          servings: pm.servings,
          notes: pm.notes ?? null,
          isCompleted: !!pm.isCompleted,
        })),
      };

      setIsTyping(true);
      const apiMessages: ApiChatMessage[] = [{ role: 'user', content: text }];
      try {
        // Primary path: Supabase Edge Function (no client key exposure)
        const resp = await aiChat(apiMessages, ctx);
        const replyText = resp?.output?.summary || resp?.output?.blocks?.[0]?.content || '';
        const structured = resp?.output?.blocks?.[0]?.data ? (resp.output.blocks[0].data as any) : undefined;
        pushCoach(structured ? { structured, summary: replyText, source: 'ai' } : { text: replyText, source: 'ai' });
      } catch (edgeErr: any) {
        // Fallback: Direct AI call if configured
        console.warn('[AI] Edge function failed, attempting direct AI fallback:', edgeErr?.message || edgeErr);
        try {
          const reply = await createChatCompletion(apiMessages);
          pushCoach({ text: reply, source: 'ai' });
        } catch (directErr: any) {
          console.warn('[AI] Direct AI fallback also failed:', directErr?.message || directErr);
          pushCoach({ text: "I can plan today or the week, and generate a shopping list. Try 'Plan my day'.", source: 'builtin' });
          showToast({ message: 'AI is unavailable. Using built-in suggestions.', type: 'info' });
        }
      } finally {
        setIsTyping(false);
      }
    } catch (err: any) {
      console.warn('[AI] Unexpected error building context or sending message:', err?.message || err);
      pushCoach({ text: "I can plan today or the week, and generate a shopping list. Try 'Plan my day'.", source: 'builtin' });
      showToast({ message: 'AI is unavailable. Using built-in suggestions.', type: 'info' });
      setIsTyping(false);
    }
  }

  function performInlineAction(
    action: NonNullable<ChatMessage['actions']>[number],
    meals?: NonNullable<ChatMessage['meals']>
  ) {
    if (action.type === 'ADD_ALL' && meals) {
      addAllToPlanner(meals);
    }
    if (action.type === 'GENERATE_LIST') {
      generateListFromPlanner();
    }
  }

  return { messages, sendMessage, performInlineAction, isTyping };
}


