// Clean minimal shopping list store stub — replaces corrupted file contents.
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { useEffect, useState } from 'react';
import { ShoppingListItem, ItemCategory } from '@/types';

// Intentionally minimal: implements the small API surface other modules use
// so the app can compile while the full feature is restored from history.
export const [ShoppingListProvider, useShoppingList] = createContextHook(() => {
  const [shoppingList, setShoppingList] = useState<ShoppingListItem[]>([]);
  const [recentlyPurchased, setRecentlyPurchased] = useState<ShoppingListItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const load = async () => {
      try {
        const stored = await AsyncStorage.getItem('shoppingList');
        if (stored) setShoppingList(JSON.parse(stored));
      } catch (e) {
        console.warn('[ShoppingList] failed to load cache', e);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!isLoading) {
      AsyncStorage.setItem('shoppingList', JSON.stringify(shoppingList)).catch(() => {});
    }
  }, [shoppingList, isLoading]);

  const addItem = async (item: Omit<ShoppingListItem, 'id'>) => {
    const newItem: ShoppingListItem = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      ...item,
    } as ShoppingListItem;
    setShoppingList(prev => [...prev, newItem]);
    return newItem.id;
  };

  const removeItem = async (id: string) => {
    setShoppingList(prev => prev.filter(i => i.id !== id));
  };

  // Accept an optional options object for compatibility with callers that move items to inventory
  const toggleItemChecked = async (id: string, options?: { moveToInventory?: boolean; expiryDate?: string }) => {
    setShoppingList(prev => prev.map(i => (i.id === id ? { ...i, checked: !i.checked } : i)));
    // If caller requested moveToInventory, we simply clear the item here as a no-op placeholder.
    if (options?.moveToInventory) {
      // In a full implementation we'd move to inventory and remove from shopping list.
      setShoppingList(prev => prev.filter(i => i.id !== id));
    }
  };

  const clearCheckedItems = async () => {
    setShoppingList(prev => prev.filter(i => !i.checked));
  };

  // Compatibility: clear recently purchased items
  const clearRecentlyPurchased = async () => {
    setRecentlyPurchased([]);
  };

  // Compatibility: add meal ingredients to the shopping list
  // Accepts multiple calling shapes used across the codebase; we normalize to our addItem
  const addMealIngredientsToList = async (...args: any[]) => {
    // args can be (ingredients), (recipeId, meals, inventory), or (ingredients, opts)
    let ingredients: Array<{ name: string; quantity?: number; unit?: string }> = [];
    if (Array.isArray(args[0])) ingredients = args[0];
    else if (typeof args[0] === 'string' && Array.isArray(args[1])) {
      // recipeId, meals, inventory -> try to extract missing ingredients from meals placeholder
      const meals = args[1] as any[];
      ingredients = meals.flatMap(m => (m?.ingredients || []).map((ing: any) => ({ name: ing.name || ing })));
    } else if (args[0] && typeof args[0] === 'object') {
      ingredients = args[0].ingredients || [];
    }

    let added = 0;
    for (const ing of ingredients) {
      await addItem({
        name: ing.name,
        quantity: ing.quantity ?? 1,
        unit: ing.unit ?? 'pcs',
        category: 'Other',
        addedDate: new Date().toISOString(),
        checked: false,
      } as Omit<ShoppingListItem, 'id'>);
      added += 1;
    }
    return added;
  };

  // Compatibility: generate a shopping list from a meal plan (no-op placeholder)
  // Accepts various shapes (plannedMeals, meals, inventory) used by callers
  const generateShoppingListFromMealPlan = async (...args: any[]) => {
    // For now return an empty array; callers expect an array
    return [] as ShoppingListItem[];
  };

  const getItemsByCategory = (category: ItemCategory) => {
    return shoppingList.filter(i => i.category === category);
  };

  return {
    shoppingList,
    recentlyPurchased,
    isLoading,
    addItem,
    removeItem,
    toggleItemChecked,
    clearCheckedItems,
    clearRecentlyPurchased,
    addMealIngredientsToList,
    generateShoppingListFromMealPlan,
    getItemsByCategory,
  };
});
 