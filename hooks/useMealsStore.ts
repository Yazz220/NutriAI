import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { useEffect, useState } from 'react';
import { Meal, MealIngredient } from '@/types';

// Mock data for initial meals (default)
let initialMeals: Meal[] = [
  {
    id: '1',
    name: 'Chicken Stir Fry',
    description: 'A quick and healthy stir fry with fresh vegetables',
    ingredients: [
      { name: 'Chicken Breast', quantity: 1, unit: 'pcs', optional: false },
      { name: 'Rice', quantity: 0.25, unit: 'kg', optional: false },
      { name: 'Bell Pepper', quantity: 1, unit: 'pcs', optional: false },
      { name: 'Broccoli', quantity: 1, unit: 'cup', optional: false },
      { name: 'Soy Sauce', quantity: 2, unit: 'tbsp', optional: false },
    ],
    steps: [
      'Cut chicken into small pieces',
      'Cook rice according to package instructions',
      'Stir fry chicken until cooked through',
      'Add vegetables and stir fry for 3-4 minutes',
      'Add soy sauce and mix well',
      'Serve over rice'
    ],
    image: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?q=80&w=2072&auto=format&fit=crop',
    tags: ['quick', 'healthy', 'dinner'],
    prepTime: 15,
    cookTime: 20,
    servings: 2,
    nutritionPerServing: {
      calories: 420,
      protein: 35,
      carbs: 45,
      fats: 12
    }
  },
  {
    id: '2',
    name: 'Apple Spinach Salad',
    description: 'Fresh and crisp salad with apples and spinach',
    ingredients: [
      { name: 'Spinach', quantity: 1, unit: 'bunch', optional: false },
      { name: 'Apples', quantity: 1, unit: 'pcs', optional: false },
      { name: 'Walnuts', quantity: 0.25, unit: 'cup', optional: true },
      { name: 'Olive Oil', quantity: 1, unit: 'tbsp', optional: false },
      { name: 'Lemon Juice', quantity: 1, unit: 'tbsp', optional: false },
    ],
    steps: [
      'Wash and dry spinach',
      'Slice apples into thin pieces',
      'Toast walnuts lightly',
      'Mix olive oil and lemon juice for dressing',
      'Combine all ingredients in a bowl',
      'Toss with dressing and serve'
    ],
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=2070&auto=format&fit=crop',
    tags: ['salad', 'healthy', 'quick', 'vegetarian'],
    prepTime: 10,
    cookTime: 0,
    servings: 2,
    nutritionPerServing: {
      calories: 180,
      protein: 4,
      carbs: 22,
      fats: 10
    }
  },
  {
    id: '3',
    name: 'Scrambled Eggs on Toast',
    description: 'Simple and nutritious breakfast',
    ingredients: [
      { name: 'Eggs', quantity: 2, unit: 'pcs', optional: false },
      { name: 'Milk', quantity: 0.05, unit: 'liter', optional: true },
      { name: 'Bread', quantity: 2, unit: 'slices', optional: false },
      { name: 'Butter', quantity: 1, unit: 'tbsp', optional: false },
      { name: 'Salt', quantity: 1, unit: 'pinch', optional: false },
    ],
    steps: [
      'Beat eggs with milk, salt, and pepper',
      'Melt butter in a pan over medium heat',
      'Pour in egg mixture and stir gently',
      'Cook until eggs are set but still moist',
      'Toast bread and butter it',
      'Serve eggs over toast'
    ],
    image: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?q=80&w=2080&auto=format&fit=crop',
    tags: ['breakfast', 'quick', 'vegetarian'],
    prepTime: 5,
    cookTime: 5,
    servings: 1,
    nutritionPerServing: {
      calories: 320,
      protein: 18,
      carbs: 28,
      fats: 16
    }
  },
  {
    id: '4',
    name: 'Turkey Chili',
    description: 'Lean ground turkey simmered with beans, tomatoes, and spices',
    ingredients: [
      { name: 'Ground Turkey', quantity: 0.5, unit: 'kg', optional: false },
      { name: 'Kidney Beans', quantity: 1, unit: 'can', optional: false },
      { name: 'Tomatoes (diced)', quantity: 1, unit: 'can', optional: false },
      { name: 'Onion', quantity: 1, unit: 'pcs', optional: false },
      { name: 'Chili Powder', quantity: 2, unit: 'tbsp', optional: false },
    ],
    steps: [
      'Sauté onion until translucent',
      'Brown turkey in pot',
      'Add tomatoes, beans, and spices',
      'Simmer for 20–30 minutes',
      'Adjust seasoning and serve'
    ],
    image: 'https://images.unsplash.com/photo-1604908554007-29f7f1b2b5bf?q=80&w=1600&auto=format&fit=crop',
    tags: ['dinner', 'high-protein'],
    prepTime: 10,
    cookTime: 30,
    servings: 4,
    nutritionPerServing: {
      calories: 420,
      protein: 35,
      carbs: 38,
      fats: 14
    }
  },
  {
    id: '5',
    name: 'Quinoa Veggie Bowl',
    description: 'Colorful bowl with quinoa, roasted veggies, and tahini dressing',
    ingredients: [
      { name: 'Quinoa', quantity: 1, unit: 'cup', optional: false },
      { name: 'Sweet Potato', quantity: 1, unit: 'pcs', optional: false },
      { name: 'Chickpeas', quantity: 1, unit: 'can', optional: false },
      { name: 'Spinach', quantity: 2, unit: 'cups', optional: false },
      { name: 'Tahini', quantity: 2, unit: 'tbsp', optional: false },
    ],
    steps: [
      'Cook quinoa according to package',
      'Roast diced sweet potato and chickpeas',
      'Whisk tahini with lemon and water',
      'Assemble bowl with spinach, quinoa, roasted veg',
      'Drizzle dressing and serve'
    ],
    image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?q=80&w=1600&auto=format&fit=crop',
    tags: ['vegetarian', 'lunch', 'healthy'],
    prepTime: 15,
    cookTime: 25,
    servings: 2,
    nutritionPerServing: {
      calories: 520,
      protein: 18,
      carbs: 78,
      fats: 16
    }
  },
  {
    id: '6',
    name: 'Pasta Marinara',
    description: 'Classic spaghetti with simple marinara sauce and basil',
    ingredients: [
      { name: 'Spaghetti', quantity: 200, unit: 'g', optional: false },
      { name: 'Tomato Sauce', quantity: 2, unit: 'cups', optional: false },
      { name: 'Garlic', quantity: 2, unit: 'cloves', optional: false },
      { name: 'Olive Oil', quantity: 1, unit: 'tbsp', optional: false },
      { name: 'Basil', quantity: 5, unit: 'leaves', optional: true },
    ],
    steps: [
      'Boil pasta until al dente',
      'Sauté garlic in olive oil',
      'Add tomato sauce and simmer',
      'Toss pasta with sauce and garnish with basil'
    ],
    image: 'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?q=80&w=1600&auto=format&fit=crop',
    tags: ['dinner', 'vegetarian'],
    prepTime: 10,
    cookTime: 15,
    servings: 2,
    nutritionPerServing: {
      calories: 460,
      protein: 14,
      carbs: 75,
      fats: 10
    }
  },
  {
    id: '7',
    name: 'Shrimp Tacos',
    description: 'Zesty shrimp tacos with cabbage slaw and lime crema',
    ingredients: [
      { name: 'Shrimp', quantity: 300, unit: 'g', optional: false },
      { name: 'Tortillas', quantity: 6, unit: 'pcs', optional: false },
      { name: 'Cabbage', quantity: 2, unit: 'cups', optional: false },
      { name: 'Lime', quantity: 1, unit: 'pcs', optional: false },
      { name: 'Yogurt', quantity: 0.5, unit: 'cup', optional: true },
    ],
    steps: [
      'Season and sauté shrimp until pink',
      'Mix cabbage with lime and yogurt for slaw',
      'Warm tortillas',
      'Assemble tacos with shrimp and slaw'
    ],
    image: 'https://images.unsplash.com/photo-1601050690597-9d34a5a6bfb9?q=80&w=1600&auto=format&fit=crop',
    tags: ['dinner', 'seafood'],
    prepTime: 10,
    cookTime: 10,
    servings: 3,
    nutritionPerServing: {
      calories: 380,
      protein: 28,
      carbs: 38,
      fats: 12
    }
  }
];

// If a developer sample file exists at data/sampleRecipes.json, use it as the initial seed.
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const samplePath = require('../data/sampleRecipes.json');
  if (Array.isArray(samplePath) && samplePath.length > 0) {
    const mapped = (samplePath as any[]).map((r: any) => ({
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

    if (mapped.length) {
      initialMeals = mapped;
      console.log('[Meals] Loaded developer sampleRecipes.json as initial seed (count=' + mapped.length + ')');
    }
  }
} catch (e) {
  // No sample file present — that's fine for production
}

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
              console.log('[Meals] Loaded', { count: parsed.length });
              if (parsed.length === 0) {
                console.warn('[Meals] Stored meals is empty array, reseeding initialMeals');
                setMeals(initialMeals);
                await AsyncStorage.setItem('meals', JSON.stringify(initialMeals));
              } else {
                setMeals(parsed);
              }
            } else {
              console.warn('[Meals] Stored data not an array, resetting to initialMeals');
              setMeals(initialMeals);
              await AsyncStorage.setItem('meals', JSON.stringify(initialMeals));
            }
          } catch (e) {
            console.warn('[Meals] Failed to parse stored meals, resetting to initialMeals', e);
            setMeals(initialMeals);
            await AsyncStorage.setItem('meals', JSON.stringify(initialMeals));
          }
        } else {
          // Use mock data if no stored meals
          console.log('[Meals] No stored meals found, seeding initialMeals');
          setMeals(initialMeals);
          await AsyncStorage.setItem('meals', JSON.stringify(initialMeals));
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

  // Save meals to AsyncStorage whenever it changes
  useEffect(() => {
    if (!isLoading) {
      AsyncStorage.setItem('meals', JSON.stringify(meals))
        .then(() => console.log('[Meals] Saved', { count: meals.length }))
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
    cookMeal,
    checkIngredientsAvailability,
    getRecommendedMeals
  };
});