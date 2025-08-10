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
  const { initializeRecipeProvider, getTrendingRecipes, recipeProvider } = useRecipeStore();

  useEffect(() => {
    doInitialize();
  }, []);

  // Once provider is available, warm up trending once
  useEffect(() => {
    const warm = async () => {
      if (!recipeProvider || warmedUp) return;
      try {
        console.log('[RecipeProviderInitializer] Warming up trending recipes...');
        await getTrendingRecipes();
        console.log('[RecipeProviderInitializer] Trending fetched successfully');
        setWarmedUp(true);
        setIsInitialized(true);
        setError(null);
        console.log('[RecipeProviderInitializer] Provider fully initialized');
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
  }, [recipeProvider, warmedUp, getTrendingRecipes, onInitialized]);

  const doInitialize = async () => {
    try {
      console.log('[RecipeProviderInitializer] Starting initialization...');
      
      // For now, use a hardcoded API key for TheMealDB (which doesn't actually require one)
      const apiKey = '1'; // TheMealDB uses "1" as a free tier identifier
      const providerType = 'mealdb' as const;
      
      console.log('[RecipeProviderInitializer] Initializing with:', { apiKey, providerType });
      
      initializeRecipeProvider(apiKey, providerType);
      setIsInitialized(true);
      
      console.log('[RecipeProviderInitializer] Provider initialized successfully');
      
      // Wait a bit for the provider to be set in the store
      setTimeout(async () => {
        try {
          console.log('[RecipeProviderInitializer] Warming up provider...');
          await getTrendingRecipes();
          setWarmedUp(true);
          console.log('[RecipeProviderInitializer] Provider warmed up successfully');
        } catch (warmupError) {
          console.error('[RecipeProviderInitializer] Warmup failed:', warmupError);
          setError(warmupError instanceof Error ? warmupError.message : 'Warmup failed');
        }
      }, 1000);
      
      if (onInitialized) {
        onInitialized();
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
