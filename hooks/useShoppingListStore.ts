import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { useEffect, useState } from 'react';
import { ShoppingListItem, ItemCategory } from '@/types';
import { useInventory } from '@/hooks/useInventoryStore';

export const [ShoppingListProvider, useShoppingList] = createContextHook(() => {
  const [shoppingList, setShoppingList] = useState<ShoppingListItem[]>([]);
  const [recentlyPurchased, setRecentlyPurchased] = useState<ShoppingListItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { addItem: addInventoryItem } = useInventory();
  
  // Placeholder for inventory - used in generators; kept as empty array by default
  const inventory: any[] = [];

  // Move a purchased item into Inventory
  const moveToInventory = (item: ShoppingListItem & { expiryDate?: string }): string | undefined => {
    try {
      const newId = addInventoryItem({
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        category: item.category,
        addedDate: item.addedDate || new Date().toISOString(),
        expiryDate: item.expiryDate,
        imageUrl: undefined,
      });
      // Remove from recently purchased if present
      setRecentlyPurchased(prev => prev.filter(i => i.id !== item.id));
      return newId;
    } catch (e) {
      console.error('Failed to move to inventory', e);
      return undefined;
    }
  };

  // Load shopping list and recently purchased from AsyncStorage on mount
  useEffect(() => {
    const loadShoppingData = async () => {
      try {
        const [storedList, storedRecent] = await Promise.all([
          AsyncStorage.getItem('shoppingList'),
          AsyncStorage.getItem('recentlyPurchased')
        ]);
        
        if (storedList) {
          setShoppingList(JSON.parse(storedList));
        }
        if (storedRecent) {
          setRecentlyPurchased(JSON.parse(storedRecent));
        }
      } catch (error) {
        console.error('Failed to load shopping data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadShoppingData();
  }, []);

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
  const addItem = (item: Omit<ShoppingListItem, 'id'>) => {
    // Check if item already exists in the list
    const existingItem = shoppingList.find(
      i => i.name.toLowerCase() === item.name.toLowerCase() && i.unit === item.unit
    );

    if (existingItem) {
      // Update quantity if item exists
      updateItem({
        ...existingItem,
        quantity: existingItem.quantity + item.quantity,
        checked: false // Uncheck when updating quantity
      });
    } else {
      // Add new item if it doesn't exist
      const newItem: ShoppingListItem = {
        ...item,
        id: Date.now().toString(),
      };
      setShoppingList(prev => [...prev, newItem]);
    }
  };

  // Update an existing item
  const updateItem = (updatedItem: ShoppingListItem) => {
    setShoppingList(prev => 
      prev.map(item => item.id === updatedItem.id ? updatedItem : item)
    );
  };

  // Remove an item from shopping list
  const removeItem = (id: string) => {
    setShoppingList(prev => prev.filter(item => item.id !== id));
  };

  // Toggle checked status of an item and handle transfer to inventory
  const toggleItemChecked = (id: string) => {
    const itemToMove = shoppingList.find(i => i.id === id) || recentlyPurchased.find(i => i.id === id);
    if (!itemToMove) return;

    if (!itemToMove.checked) {
      // Moving to recently purchased
      setShoppingList(prev => prev.filter(item => item.id !== id));
      setRecentlyPurchased(prev => [...prev, { ...itemToMove, checked: true }]);
    } else {
      // Moving back to shopping list
      setRecentlyPurchased(prev => prev.filter(item => item.id !== id));
      setShoppingList(prev => [...prev, { ...itemToMove, checked: false }]);
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