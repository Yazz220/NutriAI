  const generateId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { useEffect, useState } from 'react';
import { ShoppingListItem, ItemCategory } from '@/types';
// Avoid importing useInventory here to prevent hook order/provider dependency issues
import { supabase } from '@/utils/supabaseClient';
import { useAuth } from '@/hooks/useAuth';

export const [ShoppingListProvider, useShoppingList] = createContextHook(() => {
  const [shoppingList, setShoppingList] = useState<ShoppingListItem[]>([]);
  const [recentlyPurchased, setRecentlyPurchased] = useState<ShoppingListItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { user } = useAuth();

  const OFFLINE_ONLY = process.env.EXPO_PUBLIC_OFFLINE_ONLY === 'true';
  
  // Placeholder for inventory - used in generators; kept as empty array by default
  const inventory: any[] = [];

  // Move a purchased item into Inventory
  const moveToInventory = async (item: ShoppingListItem & { expiryDate?: string }): Promise<string | undefined> => {
    try {
      let newId: string | undefined = undefined;
      const addedDate = item.addedDate || new Date().toISOString();
      if (user && !OFFLINE_ONLY) {
        const payload = {
          user_id: user.id,
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          category: item.category,
          added_date: addedDate,
          expiry_date: item.expiryDate ?? null,
          notes: null,
        } as const;
        const { data, error } = await supabase
          .schema('nutriai')
          .from('inventory_items')
          .insert(payload)
          .select('id')
          .single();
        if (error) throw error;
        newId = String(data.id);
      } else {
        // Offline-only: create a local ID; inventory store will pick up from cache later
        newId = `${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
      }
      // Remove from recently purchased if present
      setRecentlyPurchased(prev => prev.filter(i => i.id !== item.id));
      return newId;
    } catch (e) {
      console.error('Failed to move to inventory', e);
      return undefined;
    }
  };

  // Load shopping list and recently purchased from Supabase or cache
  useEffect(() => {
    const loadShoppingData = async () => {
      try {
        setIsLoading(true);
        if (user && !OFFLINE_ONLY) {
          const { data, error } = await supabase
            .schema('nutriai')
            .from('shopping_list_items')
            .select('id, name, quantity, unit, checked, created_at')
            .eq('user_id', user.id)
            .order('created_at', { ascending: true });
          if (error) throw error;
          const rows = (data ?? []).map((r: any): ShoppingListItem => ({
            id: String(r.id),
            name: r.name,
            quantity: Number(r.quantity),
            unit: r.unit,
            category: determineCategory(r.name),
            addedDate: r.created_at,
            checked: !!r.checked,
            addedBy: 'user',
          }));
          setShoppingList(rows);
          await AsyncStorage.setItem('shoppingList', JSON.stringify(rows));
        } else {
          const [storedList, storedRecent] = await Promise.all([
            AsyncStorage.getItem('shoppingList'),
            AsyncStorage.getItem('recentlyPurchased'),
          ]);
          if (storedList) setShoppingList(JSON.parse(storedList));
          if (storedRecent) setRecentlyPurchased(JSON.parse(storedRecent));
        }
      } catch (error) {
        console.error('Failed to load shopping data:', error);
        const [storedList, storedRecent] = await Promise.all([
          AsyncStorage.getItem('shoppingList'),
          AsyncStorage.getItem('recentlyPurchased'),
        ]).catch(() => [null, null] as any);
        if (storedList) setShoppingList(JSON.parse(storedList as string));
        if (storedRecent) setRecentlyPurchased(JSON.parse(storedRecent as string));
      } finally {
        setIsLoading(false);
      }
    };

    loadShoppingData();
  }, [user?.id]);

  // Save shopping data to AsyncStorage whenever it changes
  useEffect(() => {
    if (!isLoading) {
      Promise.all([
        AsyncStorage.setItem('shoppingList', JSON.stringify(shoppingList)),
        AsyncStorage.setItem('recentlyPurchased', JSON.stringify(recentlyPurchased))
      ]).catch(error => console.error('Failed to save shopping data:', error));
    }
  }, [shoppingList, recentlyPurchased, isLoading]);

  // Add a new item to shopping list
  const addItem = async (item: Omit<ShoppingListItem, 'id'>) => {
    // Check if item already exists in the list
    const existingItem = shoppingList.find(
      i => i.name.toLowerCase() === item.name.toLowerCase() && i.unit === item.unit
    );

    if (existingItem) {
      // Update quantity if item exists
      await updateItem({
        ...existingItem,
        quantity: existingItem.quantity + item.quantity,
        checked: false // Uncheck when updating quantity
      });
    } else {
      // Add new item if it doesn't exist
      if (user && !OFFLINE_ONLY) {
        const payload = {
          user_id: user.id,
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          checked: !!item.checked,
          created_at: item.addedDate ?? new Date().toISOString(),
        };
        const { data, error } = await supabase
          .schema('nutriai')
          .from('shopping_list_items')
          .insert(payload)
          .select('id, name, quantity, unit, checked, created_at')
          .single();
        if (error) throw error;
        const created: ShoppingListItem = {
          id: String(data.id),
          name: data.name,
          quantity: Number(data.quantity),
          unit: data.unit,
          category: determineCategory(data.name),
          addedDate: data.created_at,
          checked: !!data.checked,
          addedBy: item.addedBy ?? 'user',
        };
        setShoppingList(prev => [...prev, created]);
      } else {
        const newItem: ShoppingListItem = {
          ...item,
          id: generateId(),
        };
        setShoppingList(prev => [...prev, newItem]);
      }
    }
  };

  // Update an existing item
  const updateItem = async (updatedItem: ShoppingListItem) => {
    setShoppingList(prev => prev.map(item => item.id === updatedItem.id ? updatedItem : item));
    if (user && !OFFLINE_ONLY) {
      const { error } = await supabase
        .schema('nutriai')
        .from('shopping_list_items')
        .update({
          name: updatedItem.name,
          quantity: updatedItem.quantity,
          unit: updatedItem.unit,
          checked: !!updatedItem.checked,
        })
        .eq('id', updatedItem.id);
      if (error) console.error('Failed to update shopping item:', error);
    }
  };

  // Remove an item from shopping list
  const removeItem = async (id: string) => {
    setShoppingList(prev => prev.filter(item => item.id !== id));
    if (user && !OFFLINE_ONLY) {
      const { error } = await supabase.schema('nutriai').from('shopping_list_items').delete().eq('id', id);
      if (error) console.error('Failed to delete shopping item:', error);
    }
  };

  // Toggle checked status of an item and handle transfer to inventory
  const toggleItemChecked = async (id: string) => {
    const itemToMove = shoppingList.find(i => i.id === id) || recentlyPurchased.find(i => i.id === id);
    if (!itemToMove) return;

    if (!itemToMove.checked) {
      // Mark purchased → move to Inventory
      setShoppingList(prev => prev.filter(item => item.id !== id));
      const updated = { ...itemToMove, checked: true };
      setRecentlyPurchased(prev => [...prev, updated]);
      if (user && !OFFLINE_ONLY) {
        const { error } = await supabase
          .schema('nutriai')
          .from('shopping_list_items')
          .update({ checked: true })
          .eq('id', id);
        if (error) console.error('Failed to toggle shopping item:', error);
      }
      // Immediately transfer to inventory
      try {
        await moveToInventory({ ...updated, expiryDate: undefined });
      } catch (e) {
        console.error('Failed auto-move to inventory:', e);
      }
    } else {
      // Moving back to shopping list
      setRecentlyPurchased(prev => prev.filter(item => item.id !== id));
      const updated = { ...itemToMove, checked: false };
      setShoppingList(prev => [...prev, updated]);
      if (user && !OFFLINE_ONLY) {
        const { error } = await supabase
          .schema('nutriai')
          .from('shopping_list_items')
          .update({ checked: false })
          .eq('id', id);
        if (error) console.error('Failed to toggle shopping item:', error);
      }
    }
  };

  // Clear all checked items
  const clearCheckedItems = () => {
    setShoppingList(prev => prev.filter(item => !item.checked));
  };

  // Add missing ingredients from a meal to shopping list
  const addMealIngredientsToList = (
    mealId: string,
    meals: any[],
    inventory: any[]
  ) => {
    const meal = meals.find(m => m.id === mealId);
    if (!meal) return 0;
    
    let addedCount = 0;
    meal.ingredients.forEach((ingredient: any) => {
      if (ingredient.optional) return;
      
      const inventoryItem = inventory.find((item: any) => 
        item.name.toLowerCase() === ingredient.name.toLowerCase() && 
        item.unit.toLowerCase() === ingredient.unit.toLowerCase()
      );
      
      const availableQuantity = inventoryItem ? inventoryItem.quantity : 0;
      const neededQuantity = ingredient.quantity;
      
      if (availableQuantity < neededQuantity) {
        const shortfall = neededQuantity - availableQuantity;
        addItem({
          name: ingredient.name,
          quantity: shortfall,
          unit: ingredient.unit,
          category: determineCategory(ingredient.name),
          addedDate: new Date().toISOString(),
          checked: false,
          addedBy: 'meal',
          mealId,
        });
        addedCount++;
      }
    });
    
    return addedCount;
  };

  // Generate shopping list from meal plan
  const generateShoppingListFromMealPlan = (
    plannedMeals: any[], 
    meals: any[], 
    inventory: any[]
  ): number => {
    const missingIngredients = new Map<string, any>();
    
    plannedMeals.forEach(plannedMeal => {
      const meal = meals.find(m => m.id === plannedMeal.recipeId);
      if (!meal) return;
      
      meal.ingredients.forEach((ingredient: any) => {
        if (ingredient.optional) return;
        
        // Calculate total needed quantity (considering servings)
        const neededQuantity = ingredient.quantity * plannedMeal.servings;
        
        // Check if we have enough in inventory
        const inventoryItem = inventory.find((item: any) => 
          item.name.toLowerCase() === ingredient.name.toLowerCase() && 
          item.unit.toLowerCase() === ingredient.unit.toLowerCase()
        );
        
        const availableQuantity = inventoryItem ? inventoryItem.quantity : 0;
        const shortfall = Math.max(0, neededQuantity - availableQuantity);
        
        if (shortfall > 0) {
          const key = `${ingredient.name.toLowerCase()}-${ingredient.unit.toLowerCase()}`;
          
          if (missingIngredients.has(key)) {
            const existing = missingIngredients.get(key);
            existing.quantity += shortfall;
          } else {
            missingIngredients.set(key, {
              name: ingredient.name,
              quantity: shortfall,
              unit: ingredient.unit,
              category: determineCategory(ingredient.name),
              addedDate: new Date().toISOString(),
              checked: false,
              addedBy: 'mealPlan' as const,
              plannedMealId: plannedMeal.id,
            });
          }
        }
      });
    });
    
    // Add all missing ingredients to shopping list
    Array.from(missingIngredients.values()).forEach(ingredient => {
      addItem(ingredient);
    });
    
    return Array.from(missingIngredients.values()).length;
  };

  // Generate smart shopping list based on inventory levels
  const generateSmartList = () => {
    // Logic to identify items running low
    const lowItems = inventory.filter((item: any) => {
      // Simple logic: if less than 2 units for countable items or less than 0.25 for measurable items
      if (item.unit === 'pcs' || item.unit === 'pieces') {
        return item.quantity < 2;
      } else {
        return item.quantity < 0.25;
      }
    });
    
    // Add low items to shopping list
    lowItems.forEach((item: any) => {
      addItem({
        name: item.name,
        quantity: item.unit === 'pcs' || item.unit === 'pieces' ? 5 : 1,
        unit: item.unit,
        category: item.category,
        addedDate: new Date().toISOString(),
        checked: false,
        addedBy: 'system'
      });
    });
  };

  // Group items by category
  const getItemsByCategory = () => {
    const grouped: Record<string, ShoppingListItem[]> = {};
    
    shoppingList.forEach(item => {
      if (!grouped[item.category]) {
        grouped[item.category] = [];
      }
      grouped[item.category].push(item);
    });
    
    return grouped;
  };

  // Helper function to determine category based on item name
  const determineCategory = (name: string): ItemCategory => {
    if (!name) return 'Other';
    name = name.toLowerCase();
    
    if (/apple|banana|vegetable|fruit|lettuce|spinach|tomato|carrot|onion|potato|pepper/.test(name)) {
      return 'Produce';
    } else if (/milk|cheese|yogurt|butter|cream|egg/.test(name)) {
      return 'Dairy';
    } else if (/chicken|beef|pork|turkey|sausage/.test(name)) {
      return 'Meat';
    } else if (/fish|shrimp|salmon|tuna|seafood/.test(name)) {
      return 'Seafood';
    } else if (/frozen|ice cream/.test(name)) {
      return 'Frozen';
    } else if (/bread|bagel|muffin|pastry/.test(name)) {
      return 'Bakery';
    } else if (/water|juice|soda|coffee|tea|drink/.test(name)) {
      return 'Beverages';
    } else if (/rice|pasta|cereal|flour|sugar|oil|spice|can|jar|sauce/.test(name)) {
      return 'Pantry';
    } else {
      return 'Other';
    }
  };

  return {
    shoppingList,
    recentlyPurchased,
    isLoading,
    addItem,
    updateItem,
    removeItem,
    toggleItemChecked,
    clearCheckedItems,
    addMealIngredientsToList,
    generateShoppingListFromMealPlan,
    generateSmartList,
    getItemsByCategory,
    moveToInventory,
    clearRecentlyPurchased: () => setRecentlyPurchased([]),
  };
});