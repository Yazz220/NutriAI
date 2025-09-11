import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { useEffect, useState } from 'react';
import { InventoryItem, ItemCategory } from '@/types';
import { useAuth } from '@/hooks/useAuth';

// Minimal, robust inventory store to satisfy callers while restoring API surface.
export const [InventoryProvider, useInventory] = createContextHook(() => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { user } = useAuth();

  const load = async () => {
    try {
      setIsLoading(true);
      const stored = await AsyncStorage.getItem('inventory');
      if (stored) {
        setInventory(JSON.parse(stored));
        return;
      }
      setInventory([]);
    } catch (e) {
      console.warn('[Inventory] load failed', e);
      setInventory([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [user?.id]);

  useEffect(() => {
    if (!isLoading) AsyncStorage.setItem('inventory', JSON.stringify(inventory)).catch(() => {});
  }, [inventory, isLoading]);

  const addItem = async (item: Omit<InventoryItem, 'id'>): Promise<string> => {
    const newItem: InventoryItem = { ...item, id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}` };
    setInventory(prev => [newItem, ...prev]);
    return newItem.id;
  };

  const updateItem = async (updatedItem: InventoryItem) => {
    setInventory(prev => prev.map(i => (i.id === updatedItem.id ? updatedItem : i)));
  };

  const removeItem = async (id: string) => {
    setInventory(prev => prev.filter(i => i.id !== id));
  };

  const getExpiringItems = () => {
    const threeDays = new Date();
    threeDays.setDate(threeDays.getDate() + 3);
    return inventory.filter(i => i.expiryDate && new Date(i.expiryDate) <= threeDays);
  };

  const getFreshnessStatus = (expiryDateStr?: string): 'fresh' | 'aging' | 'expiring' | 'untracked' => {
    if (!expiryDateStr) return 'untracked';
    const now = new Date();
    const expiry = new Date(expiryDateStr);
    const days = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (days <= 1) return 'expiring';
    if (days <= 3) return 'aging';
    return 'fresh';
  };

  const getItemsByCategory = (category: ItemCategory) => inventory.filter(i => i.category === category);

  const deductMealIngredients = (ingredients: Array<{ name: string; quantity: number; unit?: string }>) => {
    setInventory(prev => {
      const updated = [...prev];
      ingredients.forEach(ing => {
        const idx = updated.findIndex(it => it.name.toLowerCase() === ing.name.toLowerCase());
        if (idx !== -1) {
          const existing = updated[idx];
          const newQty = (existing.quantity || 0) - (ing.quantity || 0);
          if (newQty <= 0) updated.splice(idx, 1); else updated[idx] = { ...existing, quantity: newQty };
        }
      });
      return updated;
    });
  };

  const refresh = async () => {
    await load();
  };

  return {
    inventory,
    isLoading,
    addItem,
    updateItem,
    removeItem,
    refresh,
    getExpiringItems,
    getFreshnessStatus,
    getItemsByCategory,
    deductMealIngredients,
  };
});

export function useInventoryByFreshness() {
  const { inventory, getFreshnessStatus } = useInventory();
  const fresh = inventory.filter(i => getFreshnessStatus(i.expiryDate) === 'fresh');
  const aging = inventory.filter(i => getFreshnessStatus(i.expiryDate) === 'aging');
  const expiring = inventory.filter(i => getFreshnessStatus(i.expiryDate) === 'expiring');
  const untracked = inventory.filter(i => getFreshnessStatus(i.expiryDate) === 'untracked');
  return { fresh, aging, expiring, untracked };
}
