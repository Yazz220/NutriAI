import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { NutritionGoals, LoggedMeal } from '@/types';

export interface SyncQueueItem {
  id: string;
  type: 'goal_update' | 'meal_log' | 'meal_delete' | 'custom_food';
  data: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
}

export interface SyncStatus {
  isOnline: boolean;
  lastSyncTime: number | null;
  pendingItems: number;
  syncInProgress: boolean;
  lastError: string | null;
}

class NutritionSyncManager {
  private static instance: NutritionSyncManager;
  private syncQueue: SyncQueueItem[] = [];
  private syncInProgress = false;
  private listeners: ((status: SyncStatus) => void)[] = [];
  private retryTimeouts: Map<string, NodeJS.Timeout> = new Map();
  
  private constructor() {
    this.initializeSync();
  }

  static getInstance(): NutritionSyncManager {
    if (!NutritionSyncManager.instance) {
      NutritionSyncManager.instance = new NutritionSyncManager();
    }
    return NutritionSyncManager.instance;
  }

  private async initializeSync() {
    try {
      // Load pending sync items from storage
      const storedQueue = await AsyncStorage.getItem('nutritionSyncQueue');
      if (storedQueue) {
        this.syncQueue = JSON.parse(storedQueue);
      }

      // Listen for network changes
      NetInfo.addEventListener((state: any) => {
        if (state.isConnected && !this.syncInProgress && this.syncQueue.length > 0) {
          this.processSyncQueue();
        }
        this.notifyListeners();
      });

      // Process any pending items
      const netInfo = await NetInfo.fetch();
      if (netInfo.isConnected && this.syncQueue.length > 0) {
        this.processSyncQueue();
      }
    } catch (error) {
      console.error('Failed to initialize nutrition sync:', error);
    }
  }

  // Add item to sync queue
  async queueSync(
    type: SyncQueueItem['type'],
    data: any,
    maxRetries: number = 3
  ): Promise<void> {
    const item: SyncQueueItem = {
      id: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      data,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries,
    };

    this.syncQueue.push(item);
    await this.saveSyncQueue();
    this.notifyListeners();

    // Try to sync immediately if online
    const netInfo = await NetInfo.fetch();
    if (netInfo.isConnected && !this.syncInProgress) {
      this.processSyncQueue();
    }
  }

  // Process sync queue
  private async processSyncQueue(): Promise<void> {
    if (this.syncInProgress || this.syncQueue.length === 0) {
      return;
    }

    this.syncInProgress = true;
    this.notifyListeners();

    const itemsToProcess = [...this.syncQueue];
    const successfulItems: string[] = [];

    for (const item of itemsToProcess) {
      try {
        await this.syncItem(item);
        successfulItems.push(item.id);
      } catch (error) {
        console.error(`Failed to sync item ${item.id}:`, error);
        
        item.retryCount++;
        if (item.retryCount >= item.maxRetries) {
          // Remove item after max retries
          successfulItems.push(item.id);
          console.warn(`Removing item ${item.id} after ${item.maxRetries} failed attempts`);
        } else {
          // Schedule retry with exponential backoff
          this.scheduleRetry(item);
        }
      }
    }

    // Remove successfully synced items
    this.syncQueue = this.syncQueue.filter(item => !successfulItems.includes(item.id));
    await this.saveSyncQueue();

    this.syncInProgress = false;
    this.notifyListeners();
  }

  // Sync individual item
  private async syncItem(item: SyncQueueItem): Promise<void> {
    switch (item.type) {
      case 'goal_update':
        await this.syncGoalUpdate(item.data);
        break;
      case 'meal_log':
        await this.syncMealLog(item.data);
        break;
      case 'meal_delete':
        await this.syncMealDelete(item.data);
        break;
      case 'custom_food':
        await this.syncCustomFood(item.data);
        break;
      default:
        throw new Error(`Unknown sync type: ${item.type}`);
    }
  }

  // Sync goal update to server
  private async syncGoalUpdate(goals: NutritionGoals): Promise<void> {
    // This would integrate with your actual backend API
    // For now, we'll simulate the API call
    const response = await fetch('/api/nutrition/goals', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Add authentication headers
      },
      body: JSON.stringify(goals),
    });

    if (!response.ok) {
      throw new Error(`Goal sync failed: ${response.statusText}`);
    }
  }

  // Sync meal log to server
  private async syncMealLog(meal: LoggedMeal): Promise<void> {
    const response = await fetch('/api/nutrition/meals', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Add authentication headers
      },
      body: JSON.stringify(meal),
    });

    if (!response.ok) {
      throw new Error(`Meal log sync failed: ${response.statusText}`);
    }
  }

  // Sync meal deletion to server
  private async syncMealDelete(mealId: string): Promise<void> {
    const response = await fetch(`/api/nutrition/meals/${mealId}`, {
      method: 'DELETE',
      headers: {
        // Add authentication headers
      },
    });

    if (!response.ok) {
      throw new Error(`Meal delete sync failed: ${response.statusText}`);
    }
  }

  // Sync custom food to server
  private async syncCustomFood(foodData: any): Promise<void> {
    const response = await fetch('/api/nutrition/custom-foods', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Add authentication headers
      },
      body: JSON.stringify(foodData),
    });

    if (!response.ok) {
      throw new Error(`Custom food sync failed: ${response.statusText}`);
    }
  }

  // Schedule retry with exponential backoff
  private scheduleRetry(item: SyncQueueItem): void {
    const delay = Math.min(1000 * Math.pow(2, item.retryCount), 30000); // Max 30 seconds
    
    const timeoutId = setTimeout(() => {
      this.retryTimeouts.delete(item.id);
      this.processSyncQueue();
    }, delay);
    
    this.retryTimeouts.set(item.id, timeoutId);
  }

  // Save sync queue to storage
  private async saveSyncQueue(): Promise<void> {
    try {
      await AsyncStorage.setItem('nutritionSyncQueue', JSON.stringify(this.syncQueue));
    } catch (error) {
      console.error('Failed to save sync queue:', error);
    }
  }

  // Get current sync status
  async getSyncStatus(): Promise<SyncStatus> {
    const netInfo = await NetInfo.fetch();
    const lastSyncTime = await this.getLastSyncTime();

    return {
      isOnline: netInfo.isConnected || false,
      lastSyncTime,
      pendingItems: this.syncQueue.length,
      syncInProgress: this.syncInProgress,
      lastError: null, // You could track this
    };
  }

  // Get last successful sync time
  private async getLastSyncTime(): Promise<number | null> {
    try {
      const lastSync = await AsyncStorage.getItem('nutritionLastSync');
      return lastSync ? parseInt(lastSync, 10) : null;
    } catch {
      return null;
    }
  }

  // Update last sync time
  private async updateLastSyncTime(): Promise<void> {
    try {
      await AsyncStorage.setItem('nutritionLastSync', Date.now().toString());
    } catch (error) {
      console.error('Failed to update last sync time:', error);
    }
  }

  // Add status listener
  addStatusListener(listener: (status: SyncStatus) => void): () => void {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  // Notify all listeners
  private async notifyListeners(): Promise<void> {
    const status = await this.getSyncStatus();
    this.listeners.forEach(listener => listener(status));
  }

  // Force sync (for manual retry)
  async forceSync(): Promise<void> {
    if (this.syncInProgress) {
      return;
    }

    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) {
      throw new Error('No internet connection');
    }

    await this.processSyncQueue();
  }

  // Clear sync queue (for testing or reset)
  async clearSyncQueue(): Promise<void> {
    this.syncQueue = [];
    await this.saveSyncQueue();
    
    // Clear any pending retries
    this.retryTimeouts.forEach(timeout => clearTimeout(timeout));
    this.retryTimeouts.clear();
    
    this.notifyListeners();
  }

  // Get pending items count
  getPendingItemsCount(): number {
    return this.syncQueue.length;
  }

  // Check if specific item type is pending
  hasPendingItemOfType(type: SyncQueueItem['type']): boolean {
    return this.syncQueue.some(item => item.type === type);
  }
}

// Export singleton instance
export const nutritionSyncManager = NutritionSyncManager.getInstance();

// Hook for using sync status in components
export const useNutritionSync = () => {
  const [syncStatus, setSyncStatus] = React.useState<SyncStatus>({
    isOnline: true,
    lastSyncTime: null,
    pendingItems: 0,
    syncInProgress: false,
    lastError: null,
  });

  React.useEffect(() => {
    // Get initial status
    nutritionSyncManager.getSyncStatus().then(setSyncStatus);

    // Subscribe to status updates
    const unsubscribe = nutritionSyncManager.addStatusListener(setSyncStatus);

    return unsubscribe;
  }, []);

  const forceSync = React.useCallback(async () => {
    try {
      await nutritionSyncManager.forceSync();
    } catch (error) {
      console.error('Force sync failed:', error);
      throw error;
    }
  }, []);

  const queueSync = React.useCallback(
    (type: SyncQueueItem['type'], data: any, maxRetries?: number) => {
      return nutritionSyncManager.queueSync(type, data, maxRetries);
    },
    []
  );

  return {
    syncStatus,
    forceSync,
    queueSync,
    pendingItems: syncStatus.pendingItems,
    isOnline: syncStatus.isOnline,
    syncInProgress: syncStatus.syncInProgress,
  };
};

// Utility functions for common sync operations
export const syncNutritionGoals = (goals: NutritionGoals) => {
  return nutritionSyncManager.queueSync('goal_update', goals);
};

export const syncLoggedMeal = (meal: LoggedMeal) => {
  return nutritionSyncManager.queueSync('meal_log', meal);
};

export const syncMealDeletion = (mealId: string) => {
  return nutritionSyncManager.queueSync('meal_delete', mealId);
};

export const syncCustomFood = (foodData: any) => {
  return nutritionSyncManager.queueSync('custom_food', foodData);
};