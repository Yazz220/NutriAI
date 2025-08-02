import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { useEffect, useState } from 'react';
import { InventoryItem, ItemCategory } from '@/types';

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

  // Load inventory from AsyncStorage on mount
  useEffect(() => {
    const loadInventory = async () => {
      try {
        const storedInventory = await AsyncStorage.getItem('inventory');
        if (storedInventory) {
          setInventory(JSON.parse(storedInventory));
        } else {
          // Use mock data if no stored inventory
          setInventory(initialInventory);
          await AsyncStorage.setItem('inventory', JSON.stringify(initialInventory));
        }
      } catch (error) {
        console.error('Failed to load inventory:', error);
        setInventory(initialInventory);
      } finally {
        setIsLoading(false);
      }
    };

    loadInventory();
  }, []);

  // Save inventory to AsyncStorage whenever it changes
  useEffect(() => {
    if (!isLoading) {
      AsyncStorage.setItem('inventory', JSON.stringify(inventory))
        .catch(error => console.error('Failed to save inventory:', error));
    }
  }, [inventory, isLoading]);

  // Add a new item to inventory
  const addItem = (item: Omit<InventoryItem, 'id'>) => {
    const newItem: InventoryItem = {
      ...item,
      id: Date.now().toString(),
    };
    setInventory(prev => [...prev, newItem]);
  };

  // Update an existing item
  const updateItem = (updatedItem: InventoryItem) => {
    setInventory(prev => 
      prev.map(item => item.id === updatedItem.id ? updatedItem : item)
    );
  };

  // Remove an item from inventory
  const removeItem = (id: string) => {
    setInventory(prev => prev.filter(item => item.id !== id));
  };

  // Deduct ingredients used in a meal
  const deductMealIngredients = (ingredients: Array<{name: string, quantity: number, unit: string}>) => {
    setInventory(prev => {
      const updated = [...prev];
      
      ingredients.forEach(ingredient => {
        const itemIndex = updated.findIndex(item => 
          item.name.toLowerCase() === ingredient.name.toLowerCase() && 
          item.unit.toLowerCase() === ingredient.unit.toLowerCase()
        );
        
        if (itemIndex !== -1) {
          const newQuantity = updated[itemIndex].quantity - ingredient.quantity;
          
          if (newQuantity <= 0) {
            // Remove item if quantity becomes zero or negative
            updated.splice(itemIndex, 1);
          } else {
            // Update quantity if still positive
            updated[itemIndex] = {
              ...updated[itemIndex],
              quantity: newQuantity
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
      const expiryDate = new Date(item.expiryDate);
      return expiryDate <= threeDaysFromNow;
    });
  };

  // Get freshness status of an item
  const getFreshnessStatus = (expiryDateStr: string): 'fresh' | 'aging' | 'expiring' => {
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
  
  return { fresh, aging, expiring };
}