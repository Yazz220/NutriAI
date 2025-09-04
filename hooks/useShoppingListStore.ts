  const generateId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { useEffect, useState } from 'react';
import { ShoppingListItem, ItemCategory } from '@/types';
import { useInventory } from '@/hooks/useInventoryStore';
import { supabase } from '../supabase/functions/_shared/supabaseClient';
import { useAuth } from '@/hooks/useAuth';

export const [ShoppingListProvider, useShoppingList] = createContextHook(() => {
  const [shoppingList, setShoppingList] = useState<ShoppingListItem[]>([]);
  const [recentlyPurchased, setRecentlyPurchased] = useState<ShoppingListItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { user } = useAuth();
  const { addItem: addInventoryItem } = useInventory();

  const OFFLINE_ONLY = process.env.EXPO_PUBLIC_OFFLINE_ONLY === 'true';
  
  // Placeholder for inventory - used in generators; kept as empty array by default
  const inventory: any[] = [];

  // --- Normalization & unit helpers to reduce duplicates ---
  const normalizeName = (name: string) => (name || '').trim().toLowerCase();
  type UnitKind = 'count' | 'weight' | 'volume' | 'other';
  const unitMap: Record<string, { base: string; kind: UnitKind; toBase: (n: number) => number; fromBase: (n: number) => number } > = {
    pcs: { base: 'pcs', kind: 'count', toBase: (n) => n, fromBase: (n) => n },
    piece: { base: 'pcs', kind: 'count', toBase: (n) => n, fromBase: (n) => n },
    pieces: { base: 'pcs', kind: 'count', toBase: (n) => n, fromBase: (n) => n },
    pc: { base: 'pcs', kind: 'count', toBase: (n) => n, fromBase: (n) => n },

    g: { base: 'g', kind: 'weight', toBase: (n) => n, fromBase: (n) => n },
    gram: { base: 'g', kind: 'weight', toBase: (n) => n, fromBase: (n) => n },
    grams: { base: 'g', kind: 'weight', toBase: (n) => n, fromBase: (n) => n },
    kg: { base: 'g', kind: 'weight', toBase: (n) => n * 1000, fromBase: (n) => n / 1000 },
    kilogram: { base: 'g', kind: 'weight', toBase: (n) => n * 1000, fromBase: (n) => n / 1000 },
    kilograms: { base: 'g', kind: 'weight', toBase: (n) => n * 1000, fromBase: (n) => n / 1000 },

    ml: { base: 'ml', kind: 'volume', toBase: (n) => n, fromBase: (n) => n },
    milliliter: { base: 'ml', kind: 'volume', toBase: (n) => n, fromBase: (n) => n },
    milliliters: { base: 'ml', kind: 'volume', toBase: (n) => n, fromBase: (n) => n },
    l: { base: 'ml', kind: 'volume', toBase: (n) => n * 1000, fromBase: (n) => n / 1000 },
    liter: { base: 'ml', kind: 'volume', toBase: (n) => n * 1000, fromBase: (n) => n / 1000 },
    liters: { base: 'ml', kind: 'volume', toBase: (n) => n * 1000, fromBase: (n) => n / 1000 },
  };
  const normalizeUnit = (u: string): { base: string; kind: UnitKind } => {
    const key = (u || '').trim().toLowerCase();
    const found = unitMap[key];
    if (found) return { base: found.base, kind: found.kind };
    return { base: key, kind: 'other' };
  };
  const toBaseQty = (qty: number, unit: string): { qtyBase: number; base: string; kind: UnitKind } => {
    const key = (unit || '').trim().toLowerCase();
    const u = unitMap[key];
    if (!u) return { qtyBase: qty, base: key, kind: 'other' };
    return { qtyBase: u.toBase(qty), base: u.base, kind: u.kind };
  };
  const fromBaseQty = (qtyBase: number, base: string): number => {
    // choose any mapping that has this base and return in that base
    const any = Object.values(unitMap).find((v) => v.base === base);
    return any ? any.fromBase(qtyBase) : qtyBase;
  };

  // Move a purchased item into Inventory
  const moveToInventory = async (item: ShoppingListItem & { expiryDate?: string }): Promise<string | undefined> => {
    try {
      const id = await addInventoryItem({
        name: item.name,
        quantity: Number(item.quantity) || 0,
        unit: item.unit,
        category: item.category,
        addedDate: item.addedDate || new Date().toISOString(),
        expiryDate: item.expiryDate,
        imageUrl: undefined,
      });
      // Remove from recently purchased if present
      setRecentlyPurchased(prev => prev.filter(i => i.id !== item.id));
      return id;
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

  // One-time dedupe pass by name
  useEffect(() => {
    const runOnce = async () => {
      try {
        const flag = await AsyncStorage.getItem('shopping_dedupe_v1');
        if (flag === 'done') return;
        await dedupeByName();
        await AsyncStorage.setItem('shopping_dedupe_v1', 'done');
      } catch (e) {
        console.warn('[ShoppingList] dedupe pass skipped', e);
      }
    };
    if (!isLoading) runOnce();
  }, [isLoading]);

  const dedupeByName = async () => {
    const seen = new Set<string>();
    const keep: ShoppingListItem[] = [];
    const drop: ShoppingListItem[] = [];
    for (const i of shoppingList) {
      const key = normalizeName(i.name);
      if (seen.has(key)) drop.push(i); else { seen.add(key); keep.push(i); }
    }
    if (drop.length === 0) return;
    setShoppingList(keep);
    if (user && !OFFLINE_ONLY) {
      try {
        const ids = drop.map(d => d.id);
        if (ids.length) {
          await supabase.schema('nutriai').from('shopping_list_items').delete().in('id', ids as any);
        }
      } catch (e) {
        console.warn('[ShoppingList] server dedupe delete failed', e);
      }
    }
  };

  // Add a new item to shopping list
  const addItem = async (item: Omit<ShoppingListItem, 'id'>) => {
    // Normalize name and unit to reduce duplicates
    const nameNorm = normalizeName(item.name);
    const unitNorm = normalizeUnit(item.unit);

    // Try to find an existing item with same normalized name and convertible unit
    let existingIndex = -1;
    let mergedQtyBase = 0;
    const incoming = toBaseQty(Number(item.quantity) || 0, item.unit);

    shoppingList.forEach((i, idx) => {
      if (normalizeName(i.name) !== nameNorm) return;
      const u = toBaseQty(Number(i.quantity) || 0, i.unit);
      if (u.base === incoming.base && u.kind === incoming.kind) {
        existingIndex = idx;
        mergedQtyBase = u.qtyBase + incoming.qtyBase;
      }
    });

    if (existingIndex >= 0) {
      const existingItem = shoppingList[existingIndex];
      const base = toBaseQty(existingItem.quantity, existingItem.unit).base;
      const newQty = fromBaseQty(mergedQtyBase, base);
      await updateItem({
        ...existingItem,
        name: existingItem.name, // keep original casing
        unit: base, // store in base to keep list consistent
        quantity: newQty,
        checked: false,
      });
    } else {
      // Add new item if it doesn't exist
      if (user && !OFFLINE_ONLY) {
        const payload = {
          user_id: user.id,
          name: item.name,
          quantity: incoming.qtyBase,
          unit: toBaseQty(1, item.unit).base || item.unit,
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
          unit: toBaseQty(1, item.unit).base || item.unit,
          quantity: incoming.qtyBase,
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
      // Presence-based: if not present in inventory by name, add name-only generic entry
      const present = inventory.some((it: any) => normalizeName(it.name) === normalizeName(ingredient.name));
      if (!present) {
        addItem({
          name: ingredient.name,
          quantity: 1,
          unit: 'pcs',
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
    // Presence-based unique names across plan
    const names = new Set<string>();
    
    plannedMeals.forEach(plannedMeal => {
      const meal = meals.find(m => m.id === plannedMeal.recipeId);
      if (!meal) return;
      meal.ingredients.forEach((ingredient: any) => {
        if (ingredient.optional) return;
        names.add(normalizeName(ingredient.name));
      });
    });

    // Compute names not present in inventory
    const toAdd: string[] = [];
    names.forEach((nm) => {
      const present = inventory.some((it: any) => normalizeName(it.name) === nm);
      if (!present) toAdd.push(nm);
    });

    // Add as generic entries (no amounts)
    toAdd.forEach((nm) => {
      addItem({
        name: nm,
        quantity: 1,
        unit: 'pcs',
        category: determineCategory(nm),
        addedDate: new Date().toISOString(),
        checked: false,
        addedBy: 'mealPlan',
      } as any);
    });

    return toAdd.length;
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
