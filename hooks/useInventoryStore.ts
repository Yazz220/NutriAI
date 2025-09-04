import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { useEffect, useState } from 'react';
import { InventoryItem, ItemCategory } from '@/types';
import { supabase } from '../supabase/functions/_shared/supabaseClient';
import { useAuth } from '@/hooks/useAuth';

// Dev toggle: force offline cache only, never call Supabase
const OFFLINE_ONLY = process.env.EXPO_PUBLIC_OFFLINE_ONLY === 'true';

// Mock data for initial inventory
const initialInventory: InventoryItem[] = [
  {
    id: '1',
    name: 'Apples',
    quantity: 5,
    unit: 'pcs',
    category: 'Produce',
    addedDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    expiryDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
    imageUrl: 'https://images.unsplash.com/photo-1570913149827-d2ac84ab3f9a?q=80&w=2070&auto=format&fit=crop'
  },
  {
    id: '2',
    name: 'Milk',
    quantity: 1,
    unit: 'liter',
    category: 'Dairy',
    addedDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    expiryDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    imageUrl: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?q=80&w=2072&auto=format&fit=crop'
  },
  {
    id: '3',
    name: 'Chicken Breast',
    quantity: 2,
    unit: 'pcs',
    category: 'Meat',
    addedDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    expiryDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    imageUrl: 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?q=80&w=2187&auto=format&fit=crop'
  },
  {
    id: '4',
    name: 'Rice',
    quantity: 1,
    unit: 'kg',
    category: 'Pantry',
    addedDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    expiryDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
    imageUrl: 'https://images.unsplash.com/photo-1586201375761-83865001e8ac?q=80&w=2070&auto=format&fit=crop'
  },
  {
    id: '5',
    name: 'Spinach',
    quantity: 1,
    unit: 'bunch',
    category: 'Produce',
    addedDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    expiryDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
    imageUrl: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?q=80&w=2080&auto=format&fit=crop'
  },
  {
    id: '6',
    name: 'Eggs',
    quantity: 12,
    unit: 'pcs',
    category: 'Dairy',
    addedDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    expiryDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    imageUrl: 'https://images.unsplash.com/photo-1506976785307-8732e854ad03?q=80&w=2069&auto=format&fit=crop'
  }
];

export const [InventoryProvider, useInventory] = createContextHook(() => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { user } = useAuth();

  // Normalization helpers to avoid duplicates (align with shopping list)
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
  const toBaseQty = (qty: number, unit: string): { qtyBase: number; base: string; kind: UnitKind } => {
    const key = (unit || '').trim().toLowerCase();
    const u = unitMap[key];
    if (!u) return { qtyBase: qty, base: key, kind: 'other' };
    return { qtyBase: u.toBase(qty), base: u.base, kind: u.kind };
  };
  const fromBaseQty = (qtyBase: number, base: string): number => {
    const any = Object.values(unitMap).find((v) => v.base === base);
    return any ? any.fromBase(qtyBase) : qtyBase;
  };

  function rowToItem(r: any): InventoryItem {
    return {
      id: String(r.id),
      name: r.name,
      quantity: r.quantity,
      unit: r.unit,
      category: r.category as ItemCategory,
      addedDate: r.added_date,
      expiryDate: r.expiry_date ?? undefined,
      imageUrl: undefined,
    };
  }

  function itemToRow(i: Omit<InventoryItem, 'id'>) {
    return {
      name: i.name,
      quantity: i.quantity,
      unit: i.unit,
      category: i.category,
      added_date: i.addedDate,
      expiry_date: i.expiryDate ?? null,
      notes: null,
    } as const;
  }

  // Load inventory from AsyncStorage on mount
  useEffect(() => {
    const loadInventory = async () => {
      try {
        setIsLoading(true);
        console.log('[InventoryStore] loadInventory start. OFFLINE_ONLY =', OFFLINE_ONLY, 'user?', !!user);
        if (user && !OFFLINE_ONLY) {
          const { data, error } = await supabase
            .schema('nutriai')
            .from('inventory_items')
            .select('id, name, quantity, unit, category, added_date, expiry_date')
            .eq('user_id', user.id)
            .order('added_date', { ascending: false });
          if (error) throw error;
          const rows = (data ?? []).map(rowToItem);
          setInventory(rows);
          // cache
          await AsyncStorage.setItem('inventory', JSON.stringify(rows));
        } else {
          // Not authenticated yet — use cached or mock
          const stored = await AsyncStorage.getItem('inventory');
          if (stored) setInventory(JSON.parse(stored));
          else setInventory(initialInventory);
        }
      } catch (error) {
        console.error('Failed to load inventory:', error);
        console.log('[InventoryStore] Falling back to cache/mock. OFFLINE_ONLY =', OFFLINE_ONLY, 'user?', !!user);
        // fallback to cache/mock
        const stored = await AsyncStorage.getItem('inventory').catch(() => null);
        if (stored) setInventory(JSON.parse(stored as string));
        else setInventory(initialInventory);
      } finally {
        setIsLoading(false);
      }
    };

    loadInventory();
    // re-run on auth user change
  }, [user?.id]);

  // Save inventory to AsyncStorage whenever it changes
  useEffect(() => {
    if (!isLoading) {
      AsyncStorage.setItem('inventory', JSON.stringify(inventory))
        .catch(error => console.error('Failed to save inventory:', error));
    }
  }, [inventory, isLoading]);

  // One-time dedupe pass by name
  useEffect(() => {
    const runOnce = async () => {
      try {
        const flag = await AsyncStorage.getItem('inventory_dedupe_v1');
        if (flag === 'done') return;
        await dedupeByName();
        await AsyncStorage.setItem('inventory_dedupe_v1', 'done');
      } catch (e) {
        console.warn('[Inventory] dedupe pass skipped', e);
      }
    };
    if (!isLoading) runOnce();
  }, [isLoading]);

  const dedupeByName = async () => {
    const seen = new Set<string>();
    const keep: InventoryItem[] = [];
    const drop: InventoryItem[] = [];
    for (const i of inventory) {
      const key = normalizeName(i.name);
      if (seen.has(key)) drop.push(i); else { seen.add(key); keep.push(i); }
    }
    if (drop.length === 0) return;
    setInventory(keep);
    if (user && !OFFLINE_ONLY) {
      try {
        const ids = drop.map(d => d.id);
        if (ids.length) {
          await supabase.schema('nutriai').from('inventory_items').delete().in('id', ids as any);
        }
      } catch (e) {
        console.warn('[Inventory] server dedupe delete failed', e);
      }
    }
  };

  // Add a new item to inventory
  const addItem = async (item: Omit<InventoryItem, 'id'>): Promise<string> => {
    // Merge with existing by normalized name + convertible unit
    const nameNorm = normalizeName(item.name);
    const incoming = toBaseQty(Number(item.quantity) || 0, item.unit);
    const idx = inventory.findIndex((it) => normalizeName(it.name) === nameNorm && toBaseQty(it.quantity, it.unit).base === incoming.base);

    if (idx >= 0) {
      const existing = inventory[idx];
      const base = toBaseQty(existing.quantity, existing.unit).base;
      const mergedBase = toBaseQty(existing.quantity, existing.unit).qtyBase + incoming.qtyBase;
      const newQty = fromBaseQty(mergedBase, base);
      const updated: InventoryItem = { ...existing, quantity: newQty, unit: base };
      await updateItem(updated);
      return updated.id;
    }

    if (!user || OFFLINE_ONLY) {
      const newItem: InventoryItem = { ...item, id: Date.now().toString(), unit: toBaseQty(1, item.unit).base || item.unit, quantity: incoming.qtyBase };
      setInventory(prev => [newItem, ...prev]);
      return newItem.id;
    }
    const payload = { ...itemToRow({ ...item, unit: toBaseQty(1, item.unit).base || item.unit, quantity: incoming.qtyBase }), user_id: user.id } as any;
    const { data, error } = await supabase
      .schema('nutriai')
      .from('inventory_items')
      .insert(payload)
      .select('id, name, quantity, unit, category, added_date, expiry_date')
      .single();
    if (error) throw error;
    const created = rowToItem(data);
    setInventory(prev => [created, ...prev]);
    return created.id;
  };

  // Update an existing item
  const updateItem = async (updatedItem: InventoryItem) => {
    setInventory(prev => prev.map(item => item.id === updatedItem.id ? updatedItem : item));
    if (user && !OFFLINE_ONLY) {
      const { error } = await supabase
        .schema('nutriai')
        .from('inventory_items')
        .update({
          name: updatedItem.name,
          quantity: updatedItem.quantity,
          unit: updatedItem.unit,
          category: updatedItem.category,
          added_date: updatedItem.addedDate,
          expiry_date: updatedItem.expiryDate ?? null,
        })
        .eq('id', updatedItem.id);
      if (error) {
        console.error('Failed to update inventory item:', error);
      }
    }
  };

  // Remove an item from inventory
  const removeItem = async (id: string) => {
    setInventory(prev => prev.filter(item => item.id !== id));
    if (user && !OFFLINE_ONLY) {
      const { error } = await supabase.schema('nutriai').from('inventory_items').delete().eq('id', id);
      if (error) {
        console.error('Failed to delete inventory item:', error);
      }
    }
  };

  // Deduct ingredients used in a meal
  const deductMealIngredients = (ingredients: Array<{name: string, quantity: number, unit: string}>) => {
    setInventory(prev => {
      const updated = [...prev];
      
      ingredients.forEach(ingredient => {
        const need = toBaseQty(ingredient.quantity, ingredient.unit);
        const itemIndex = updated.findIndex(item => {
          const sameName = item.name.toLowerCase() === ingredient.name.toLowerCase();
          const have = toBaseQty(item.quantity, item.unit);
          return sameName && have.base === need.base;
        });
        
        if (itemIndex !== -1) {
          const have = toBaseQty(updated[itemIndex].quantity, updated[itemIndex].unit);
          const newBaseQty = have.qtyBase - need.qtyBase;
          const base = have.base;
          const newQuantity = fromBaseQty(newBaseQty, base);
          
          if (newQuantity <= 0) {
            // Remove item if quantity becomes zero or negative
            updated.splice(itemIndex, 1);
          } else {
            // Update quantity if still positive
            updated[itemIndex] = {
              ...updated[itemIndex],
              quantity: newQuantity,
              unit: base
            };
          }
        }
      });
      
      return updated;
    });
  };

  // Get items that are expiring soon (within 3 days)
  const getExpiringItems = () => {
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    
    return inventory.filter(item => {
      if (!item.expiryDate) return false;
      const expiryDate = new Date(item.expiryDate);
      return expiryDate <= threeDaysFromNow;
    });
  };

  // Get freshness status of an item
  const getFreshnessStatus = (expiryDateStr?: string): 'fresh' | 'aging' | 'expiring' | 'untracked' => {
    if (!expiryDateStr) return 'untracked';

    const now = new Date();
    const expiryDate = new Date(expiryDateStr);
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry <= 1) return 'expiring';
    if (daysUntilExpiry <= 3) return 'aging';
    return 'fresh';
  };

  // Group items by category
  const getItemsByCategory = () => {
    const grouped: Record<ItemCategory, InventoryItem[]> = {
      'Produce': [],
      'Dairy': [],
      'Meat': [],
      'Seafood': [],
      'Frozen': [],
      'Pantry': [],
      'Bakery': [],
      'Beverages': [],
      'Other': []
    };
    
    inventory.forEach(item => {
      grouped[item.category].push(item);
    });
    
    return grouped;
  };

  return {
    inventory,
    isLoading,
    refresh: async () => {
      // manual pull-to-refresh
      try {
        if (user && !OFFLINE_ONLY) {
          const { data, error } = await supabase
            .schema('nutriai')
            .from('inventory_items')
            .select('id, name, quantity, unit, category, added_date, expiry_date')
            .eq('user_id', user.id)
            .order('added_date', { ascending: false });
          if (error) throw error;
          const rows = (data ?? []).map(rowToItem);
          setInventory(rows);
          await AsyncStorage.setItem('inventory', JSON.stringify(rows));
        }
      } catch (e) {
        console.error('Refresh inventory failed:', e);
      }
    },
    addItem,
    updateItem,
    removeItem,
    deductMealIngredients,
    getExpiringItems,
    getFreshnessStatus,
    getItemsByCategory,
  };
});

// Hook to get items by freshness status
export function useInventoryByFreshness() {
  const { inventory, getFreshnessStatus } = useInventory();
  
  const fresh = inventory.filter((item: InventoryItem) => getFreshnessStatus(item.expiryDate) === 'fresh');
  const aging = inventory.filter((item: InventoryItem) => getFreshnessStatus(item.expiryDate) === 'aging');
  const expiring = inventory.filter((item: InventoryItem) => getFreshnessStatus(item.expiryDate) === 'expiring');
  const untracked = inventory.filter((item: InventoryItem) => getFreshnessStatus(item.expiryDate) === 'untracked');
  
  return { fresh, aging, expiring, untracked };
}
