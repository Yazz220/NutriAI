// Recipe Provider Initializer
// Manages the initialization and configuration of external recipe APIs

import React, { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { useRecipeStore } from '../hooks/useRecipeStore';

interface RecipeProviderInitializerProps {
  onInitialized?: () => void;
}

export const RecipeProviderInitializer: React.FC<RecipeProviderInitializerProps> = ({ 
  onInitialized 
}) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warmedUp, setWarmedUp] = useState(false);
  // The recipe store was refactored to use dataset-only and no longer
  // exposes initializeRecipeProvider or recipeProvider. Use available
  // methods from the store instead.
  const { getTrendingRecipes } = useRecipeStore();
  const IS_DATASET = (process.env.EXPO_PUBLIC_RECIPE_SOURCE || 'mealdb') === 'dataset';

  useEffect(() => {
    doInitialize();
  }, []);

  // Warm up trending once. In dataset mode, do not require provider.
  useEffect(() => {
    const warm = async () => {
      if (warmedUp) return;
      try {
        console.log('[RecipeProviderInitializer] Warming up trending recipes...');
        await getTrendingRecipes();
        console.log('[RecipeProviderInitializer] Trending fetched successfully');
        setWarmedUp(true);
        setIsInitialized(true);
        setError(null);
        onInitialized?.();
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to warm up trending';
        setError(errorMessage);
        console.error('[RecipeProviderInitializer] Warmup error:', err);
        // Show user-friendly error but don't block the app
        Alert.alert(
          'Recipe Service Warning',
          'Recipes may take a moment to load. Please check your internet connection.',
          [{ text: 'OK' }]
        );
      }
    };
    warm();
  }, [warmedUp, getTrendingRecipes, onInitialized, IS_DATASET]);

  const doInitialize = async () => {
    try {
      console.log('[RecipeProviderInitializer] Starting initialization...');
      if (IS_DATASET) {
        // No external provider needed; trigger a warmup fetch directly
        await getTrendingRecipes();
        setIsInitialized(true);
        setWarmedUp(true);
        console.log('[RecipeProviderInitializer] Dataset mode warmed up successfully');
        onInitialized?.();
        return;
      }

      // Dataset-only mode: no external provider initialization is required.
      // Still attempt to warm up trending data for a responsive UX.
      console.log('[RecipeProviderInitializer] Skipping external provider initialization; using dataset mode');
      try {
        await getTrendingRecipes();
        setWarmedUp(true);
        setIsInitialized(true);
        onInitialized?.();
      } catch (warmupError) {
        console.error('[RecipeProviderInitializer] Warmup failed:', warmupError);
        setError(warmupError instanceof Error ? warmupError.message : 'Warmup failed');
      }
    } catch (error) {
      console.error('[RecipeProviderInitializer] Initialization failed:', error);
      setError(error instanceof Error ? error.message : 'Unknown error');
      Alert.alert(
        'Recipe Provider Error',
        'Failed to initialize recipe provider. Some features may not work properly.',
        [{ text: 'OK' }]
      );
    }
  };

  // Per request: do not render any UI (no banners/buttons)
  return null;
};
