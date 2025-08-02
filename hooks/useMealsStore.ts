import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { useEffect, useState } from 'react';
import { Meal, MealIngredient } from '@/types';
import { useInventory } from './useInventoryStore';

// Mock data for initial meals
const initialMeals: Meal[] = [
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
    imageUrl: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?q=80&w=2072&auto=format&fit=crop',
    tags: ['quick', 'healthy', 'dinner'],
    prepTime: 15,
    cookTime: 20,
    servings: 2
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
    imageUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=2070&auto=format&fit=crop',
    tags: ['salad', 'healthy', 'quick', 'vegetarian'],
    prepTime: 10,
    cookTime: 0,
    servings: 2
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
    imageUrl: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?q=80&w=2080&auto=format&fit=crop',
    tags: ['breakfast', 'quick', 'vegetarian'],
    prepTime: 5,
    cookTime: 5,
    servings: 1
  }
];

export const [MealsProvider, useMeals] = createContextHook(() => {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { inventory, deductMealIngredients } = useInventory();

  // Load meals from AsyncStorage on mount
  useEffect(() => {
    const loadMeals = async () => {
      try {
        const storedMeals = await AsyncStorage.getItem('meals');
        if (storedMeals) {
          setMeals(JSON.parse(storedMeals));
        } else {
          // Use mock data if no stored meals
          setMeals(initialMeals);
          await AsyncStorage.setItem('meals', JSON.stringify(initialMeals));
        }
      } catch (error) {
        console.error('Failed to load meals:', error);
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
        .catch(error => console.error('Failed to save meals:', error));
    }
  }, [meals, isLoading]);

  // Add a new meal
  const addMeal = (meal: Omit<Meal, 'id'>) => {
    const newMeal: Meal = {
      ...meal,
      id: Date.now().toString(),
    };
    setMeals(prev => [...prev, newMeal]);
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

  // Cook a meal (deduct ingredients from inventory)
  const cookMeal = (mealId: string) => {
    const meal = meals.find(m => m.id === mealId);
    if (!meal) return false;
    
    deductMealIngredients(meal.ingredients);
    return true;
  };

  // Check if all ingredients for a meal are available
  const checkIngredientsAvailability = (mealId: string) => {
    const meal = meals.find(m => m.id === mealId);
    if (!meal) return { available: false, missingIngredients: [] };
    
    const missingIngredients: MealIngredient[] = [];
    
    meal.ingredients.forEach(ingredient => {
      if (ingredient.optional) return;
      
      const inventoryItem = inventory.find(item => 
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
    cookMeal,
    checkIngredientsAvailability,
    getRecommendedMeals
  };
});