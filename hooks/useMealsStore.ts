import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { useEffect, useState } from 'react';
import { Meal, MealIngredient } from '@/types';
import { computeFromIngredients, estimateServingsFromIngredients } from '@/utils/nutrition/compute';

// Start with no initial meals; user-added or saved items will populate
let initialMeals: Meal[] = [];

// Remove legacy/placeholder entries: require a name and at least one of (ingredients, steps)
function sanitizeMeals(list: Meal[]): Meal[] {
  const seen = new Set<string>();
  const cleaned: Meal[] = [];
  for (const m of list) {
    if (!m || typeof m !== 'object') continue;
    const id = String((m as any).id || '').trim();
    const name = typeof (m as any).name === 'string' ? (m as any).name.trim() : '';
    const ingredients = Array.isArray((m as any).ingredients) ? (m as any).ingredients : [];
    const steps = Array.isArray((m as any).steps) ? (m as any).steps : [];
    const description = typeof (m as any).description === 'string' ? (m as any).description.trim() : '';
    const meaningful = name.length > 0 && (ingredients.length > 0 || steps.length > 0);
    if (!meaningful) continue;
    const finalId = id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    if (seen.has(finalId)) continue;
    seen.add(finalId);
    cleaned.push({ ...(m as any), id: finalId });
  }
  return cleaned;
}

// Developer sample seed removed to avoid placeholder clutter in production

export const [MealsProvider, useMeals] = createContextHook(() => {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load meals from AsyncStorage on mount
  useEffect(() => {
    const loadMeals = async () => {
      try {
        console.log('[Meals] Loading from storage…');
        const storedMeals = await AsyncStorage.getItem('meals');
        if (storedMeals) {
          try {
            const parsed = JSON.parse(storedMeals);
            if (Array.isArray(parsed)) {
              const cleaned = sanitizeMeals(parsed as Meal[]);
              // Backfill nutrition for meals missing it (computed from ingredients)
              const enriched = cleaned.map((m) => {
                if ((m as any).nutritionPerServing) return m;
                const ings = Array.isArray((m as any).ingredients) ? (m as any).ingredients : [];
                if (!ings.length) return m;
                // Map to external-like ingredients with original string to help parser
                const extIngs = ings.map((ing: any) => ({
                  name: ing.name,
                  amount: ing.quantity || 0,
                  unit: ing.unit || '',
                  original: `${ing.quantity ?? ''} ${ing.unit ?? ''} ${ing.name}`.trim(),
                }));
                const servings = (m.servings && m.servings > 0) ? m.servings : estimateServingsFromIngredients(extIngs as any);
                const computed = computeFromIngredients(extIngs as any, servings || 1);
                if (!computed) return m;
                return {
                  ...m,
                  nutritionPerServing: {
                    calories: computed.calories,
                    protein: computed.protein,
                    carbs: computed.carbs,
                    fats: computed.fats,
                  },
                } as Meal;
              });
              console.log('[Meals] Loaded', { count: parsed.length, cleaned: cleaned.length, enriched: enriched.length });
              setMeals(enriched);
              if (enriched.length !== parsed.length) {
                await AsyncStorage.setItem('meals', JSON.stringify(enriched));
              }
            } else {
              console.warn('[Meals] Stored data not an array, resetting to empty');
              setMeals([]);
              await AsyncStorage.setItem('meals', JSON.stringify([]));
            }
          } catch (e) {
            console.warn('[Meals] Failed to parse stored meals, resetting to empty', e);
            setMeals([]);
            await AsyncStorage.setItem('meals', JSON.stringify([]));
          }
        } else {
          // Start clean when nothing stored
          console.log('[Meals] No stored meals found, starting empty');
          setMeals([]);
          await AsyncStorage.setItem('meals', JSON.stringify([]));
        }
      } catch (error) {
        console.error('[Meals] Failed to load meals:', error);
        setMeals(initialMeals);
      } finally {
        setIsLoading(false);
      }
    };

    loadMeals();
  }, []);

  // Save meals to AsyncStorage whenever it changes (and sanitize)
  useEffect(() => {
    if (!isLoading) {
      const cleaned = sanitizeMeals(meals);
      const toPersist = cleaned;
      const changed = cleaned.length !== meals.length || cleaned.some((m, i) => meals[i]?.id !== m.id);
      if (changed) {
        setMeals(cleaned);
      }
      AsyncStorage.setItem('meals', JSON.stringify(toPersist))
        .then(() => console.log('[Meals] Saved', { count: toPersist.length }))
        .catch(error => console.error('[Meals] Failed to save meals:', error));
    }
  }, [meals, isLoading]);

  // Add a new meal (returns new id)
  const addMeal = (meal: Omit<Meal, 'id'>): string => {
    const newMeal: Meal = {
      ...meal,
      id: Date.now().toString(),
    };
    setMeals(prev => [...prev, newMeal]);
    return newMeal.id;
  };

  // Update an existing meal
  const updateMeal = (updatedMeal: Meal) => {
    setMeals(prev => 
      prev.map(meal => meal.id === updatedMeal.id ? updatedMeal : meal)
    );
  };

  // Remove a meal
  const removeMeal = (id: string) => {
    setMeals(prev => prev.filter(meal => meal.id !== id));
  };

  // Reset meals to defaults (useful if storage got corrupted)
  const resetMeals = async () => {
    try {
      console.log('[Meals] Resetting to initialMeals');
      setMeals(initialMeals);
      await AsyncStorage.setItem('meals', JSON.stringify(initialMeals));
    } catch (e) {
      console.error('[Meals] Failed to reset meals', e);
    }
  };

  // Developer helper: import sampleRecipes.json (if present in project data) at runtime
  const importSampleRecipes = async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const sample = require('../data/sampleRecipes.json');
      if (!Array.isArray(sample) || sample.length === 0) {
        console.warn('[Meals] sampleRecipes.json is empty or not an array');
        return;
      }

      const mapped = (sample as any[]).map((r: any) => ({
        id: r.id || Date.now().toString(),
        name: r.title || r.name || 'Imported Recipe',
        description: r.description || '',
        ingredients: (r.ingredients || []).map((ing: any) => ({
          name: ing.name || ing.original || 'Ingredient',
          quantity: typeof ing.amount === 'number' ? ing.amount : 1,
          unit: ing.unit || 'pcs',
          optional: !!ing.optional,
        })),
        steps: r.steps || [],
        image: r.image || undefined,
        tags: r.tags || [],
        prepTime: r.prepTimeMinutes || r.prepTime || 0,
        cookTime: r.cookTimeMinutes || r.cookTime || 0,
        servings: r.servings || 1,
        nutritionPerServing: r.nutritionPerServing || undefined,
      } as Meal));

      setMeals(mapped);
      await AsyncStorage.setItem('meals', JSON.stringify(mapped));
      console.log('[Meals] Imported', mapped.length, 'recipes from sampleRecipes.json');
    } catch (e) {
      console.error('[Meals] Failed to import sampleRecipes.json', e);
    }
  };

  // Cook a meal (deduct ingredients from inventory)
  const cookMeal = (mealId: string) => {
    const meal = meals.find(m => m.id === mealId);
    if (!meal) return false;
    
    // Note: Ingredient deduction should be handled by the component using both hooks
    return true;
  };

  // Check if all ingredients for a meal are available
  const checkIngredientsAvailability = (mealId: string, inventory: any[] = []) => {
    const meal = meals.find(m => m.id === mealId);
    if (!meal) return { available: false, missingIngredients: [] };
    
    const missingIngredients: MealIngredient[] = [];
    
    meal.ingredients.forEach(ingredient => {
      if (ingredient.optional) return;
      
      const inventoryItem = inventory.find((item: any) => 
        item.name.toLowerCase() === ingredient.name.toLowerCase() && 
        item.unit.toLowerCase() === ingredient.unit.toLowerCase()
      );
      
      if (!inventoryItem || inventoryItem.quantity < ingredient.quantity) {
        missingIngredients.push(ingredient);
      }
    });
    
    return {
      available: missingIngredients.length === 0,
      missingIngredients
    };
  };

  // Get recommended meals based on available ingredients
  const getRecommendedMeals = () => {
    return meals.map(meal => ({
      meal,
      availability: checkIngredientsAvailability(meal.id)
    }))
    .sort((a, b) => {
      // Sort by availability first
      if (a.availability.available && !b.availability.available) return -1;
      if (!a.availability.available && b.availability.available) return 1;
      
      // Then by number of missing ingredients
      return a.availability.missingIngredients.length - b.availability.missingIngredients.length;
    });
  };

  return {
    meals,
    isLoading,
    addMeal,
    updateMeal,
    removeMeal,
    resetMeals,
    setMeals,
    cookMeal,
    checkIngredientsAvailability,
    getRecommendedMeals
  };
});