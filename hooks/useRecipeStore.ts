// Enhanced Recipe Store Hook
// Manages both local and external recipes with search and discovery capabilities

import React, { useState, useEffect, useCallback, useMemo, useContext, createContext, PropsWithChildren } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  RecipeProviderService, 
  RecipeSearchParams, 
  ExternalRecipe,
  RECIPE_API_CONFIGS 
} from '@/utils/recipeProvider';
import { Meal, RecipeWithAvailability } from '@/types';
import { supabase } from '@/utils/supabaseClient';

export interface RecipeStoreState {
  // Local recipes (user's saved recipes)
  localRecipes: Meal[];
  // External recipes (from API)
  externalRecipes: ExternalRecipe[];
  // Search results
  searchResults: ExternalRecipe[];
  // Trending/featured recipes
  trendingRecipes: ExternalRecipe[];
  // Loading states
  isLoading: boolean;
  isSearching: boolean;
  isInitializing: boolean;
  // Error state
  error: string | null;
  // Recipe provider service
  recipeProvider: RecipeProviderService | null;
}

export interface RecipeStoreActions {
  // Local recipe management
  addLocalRecipe: (recipe: Omit<Meal, 'id'>) => void;
  updateLocalRecipe: (recipe: Meal) => void;
  removeLocalRecipe: (id: string) => void;
  saveExternalRecipe: (externalRecipe: ExternalRecipe) => void;
  
  // External recipe discovery
  searchRecipes: (params: RecipeSearchParams) => Promise<void>;
  getTrendingRecipes: () => Promise<void>;
  getRecipeRecommendations: (ingredients: string[]) => Promise<void>;
  getRandomRecipes: (tags?: string[], count?: number, append?: boolean) => Promise<void>;
  
  // Recipe provider management
  initializeRecipeProvider: (apiKey: string, providerType?: 'spoonacular' | 'edamam' | 'mealdb') => void;
  clearCache: () => void;
  
  // Utility methods
  getRecipeById: (id: string, type?: 'local' | 'external') => Meal | ExternalRecipe | null;
  getAllRecipes: () => (Meal | ExternalRecipe)[];
  getRecipesWithAvailability: (inventory: any[]) => RecipeWithAvailability[];
}

// Internal provider implementation
const useProvideRecipeStore = (): RecipeStoreState & RecipeStoreActions => {
  const [state, setState] = useState<RecipeStoreState>({
    localRecipes: [],
    externalRecipes: [],
    searchResults: [],
    trendingRecipes: [],
    isLoading: true,
    isSearching: false,
    isInitializing: false,
    error: null,
    recipeProvider: null,
  });

  // Load local recipes from storage on mount
  useEffect(() => {
    const loadLocalRecipes = async () => {
      try {
        const stored = await AsyncStorage.getItem('localRecipes');
        if (stored) {
          setState(prev => ({ ...prev, localRecipes: JSON.parse(stored) }));
        }
      } catch (error) {
        console.error('Failed to load local recipes:', error);
        setState(prev => ({ ...prev, error: 'Failed to load saved recipes' }));
      } finally {
        setState(prev => ({ ...prev, isLoading: false }));
      }
    };

    loadLocalRecipes();
  }, []);

  // Save local recipes to storage whenever they change
  useEffect(() => {
    if (!state.isLoading) {
      AsyncStorage.setItem('localRecipes', JSON.stringify(state.localRecipes))
        .catch(error => console.error('Failed to save local recipes:', error));
    }
  }, [state.localRecipes, state.isLoading]);

  // Initialize recipe provider with API key
  const initializeRecipeProvider = useCallback((apiKey: string, providerType: 'spoonacular' | 'edamam' | 'mealdb' = 'spoonacular') => {
    console.log('[useRecipeStore] Initializing recipe provider:', { apiKey, providerType });
    setState(prev => ({ ...prev, isInitializing: true, error: null }));
    
    try {
      const config = RECIPE_API_CONFIGS[providerType];
      console.log('[useRecipeStore] Using config:', config);
      
      const provider = new RecipeProviderService(providerType, {
        ...config,
        apiKey,
      });
      
      console.log('[useRecipeStore] Provider created successfully:', provider);
      
      setState(prev => ({ 
        ...prev, 
        recipeProvider: provider, 
        isInitializing: false 
      }));
      
      console.log('[useRecipeStore] Provider set in state successfully');
    } catch (error) {
      console.error('[useRecipeStore] Failed to initialize recipe provider:', error);
      setState(prev => ({ 
        ...prev, 
        error: `Failed to initialize recipe provider: ${error instanceof Error ? error.message : 'Unknown error'}`,
        isInitializing: false 
      }));
    }
  }, []);

  // Search recipes
  const searchRecipes = useCallback(async (params: RecipeSearchParams) => {
    if (!state.recipeProvider) {
      setState(prev => ({ ...prev, error: 'Recipe provider not initialized' }));
      return;
    }

    setState(prev => ({ ...prev, isSearching: true, error: null }));
    
    try {
      const results = await state.recipeProvider.searchRecipes(params);
      setState(prev => ({ 
        ...prev, 
        searchResults: results.results,
        isSearching: false 
      }));
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: `Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        isSearching: false 
      }));
    }
  }, [state.recipeProvider]);

  // Get trending recipes
  const getTrendingRecipes = useCallback(async () => {
    console.log('[useRecipeStore] getTrendingRecipes called, provider:', !!state.recipeProvider);
    
    if (!state.recipeProvider) {
      console.error('[useRecipeStore] No recipe provider available');
      setState(prev => ({ ...prev, error: 'Recipe provider not initialized' }));
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      console.log('[useRecipeStore] Calling provider.getTrendingRecipes()...');
      const trending = await state.recipeProvider.getTrendingRecipes();
      console.log('[useRecipeStore] Trending recipes received:', trending.length);
      
      setState(prev => ({ 
        ...prev, 
        trendingRecipes: trending,
        isLoading: false 
      }));
      
      console.log('[useRecipeStore] Trending recipes set in state');
    } catch (error) {
      console.error('[useRecipeStore] Failed to fetch trending recipes:', error);
      setState(prev => ({ 
        ...prev, 
        error: `Failed to fetch trending recipes: ${error instanceof Error ? error.message : 'Unknown error'}`,
        isLoading: false 
      }));
    }
  }, [state.recipeProvider]);

  // Get recipe recommendations based on ingredients
  const getRecipeRecommendations = useCallback(async (ingredients: string[]) => {
    if (!state.recipeProvider) {
      setState(prev => ({ ...prev, error: 'Recipe provider not initialized' }));
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const recommendations = await state.recipeProvider.getRecipeRecommendations(ingredients);
      setState(prev => ({ 
        ...prev, 
        externalRecipes: recommendations,
        isLoading: false 
      }));
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: `Failed to fetch recommendations: ${error instanceof Error ? error.message : 'Unknown error'}`,
        isLoading: false 
      }));
    }
  }, [state.recipeProvider]);

  // Get random recipes
  const getRandomRecipes = useCallback(async (tags?: string[], count: number = 10, append: boolean = true) => {
    console.log('[useRecipeStore] getRandomRecipes called:', { tags, count, append, hasProvider: !!state.recipeProvider });
    
    if (!state.recipeProvider) {
      console.error('[useRecipeStore] No recipe provider available for random recipes');
      setState(prev => ({ ...prev, error: 'Recipe provider not initialized' }));
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      console.log('[useRecipeStore] Calling provider.getRandomRecipes()...');
      const random = await state.recipeProvider.getRandomRecipes({ tags, number: count });
      console.log('[useRecipeStore] Random recipes received:', random.length);
      
      setState(prev => ({ 
        ...prev,
        externalRecipes: append
          ? Array.from(new Map([...(prev.externalRecipes || []), ...random].map(r => [r.id, r])).values())
          : random,
        isLoading: false 
      }));
      
      console.log('[useRecipeStore] Random recipes set in state');
    } catch (error) {
      console.error('[useRecipeStore] Failed to fetch random recipes:', error);
      setState(prev => ({ 
        ...prev, 
        error: `Failed to fetch random recipes: ${error instanceof Error ? error.message : 'Unknown error'}`,
        isLoading: false 
      }));
    }
  }, [state.recipeProvider]);

  // Local recipe management
  const addLocalRecipe = useCallback((recipe: Omit<Meal, 'id'>) => {
    const newRecipe: Meal = {
      ...recipe,
      id: Date.now().toString(),
    };
    setState(prev => ({ ...prev, localRecipes: [...prev.localRecipes, newRecipe] }));
  }, []);

  const updateLocalRecipe = useCallback((recipe: Meal) => {
    setState(prev => ({
      ...prev,
      localRecipes: prev.localRecipes.map(r => r.id === recipe.id ? recipe : r)
    }));
  }, []);

  const removeLocalRecipe = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      localRecipes: prev.localRecipes.filter(r => r.id !== id)
    }));
  }, []);

  // Save external recipe to local collection
  const saveExternalRecipe = useCallback(async (externalRecipe: ExternalRecipe) => {
    if (!state.recipeProvider) return;

    // 1) Optimistic local save
    const convertedRecipe = state.recipeProvider.convertToInternalRecipe(externalRecipe);
    addLocalRecipe(convertedRecipe);

    // 2) Persist snapshot to Supabase (best-effort). Do not block UI on errors.
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const userId = userRes?.user?.id;
      if (!userId) {
        console.warn('[Recipes] No authenticated user; skipping Supabase save');
        return;
      }

      // Upsert recipe snapshot
      const recipeRow = {
        provider: state.recipeProvider.getProviderType?.() || 'spoonacular',
        external_id: String(externalRecipe.id),
        title: externalRecipe.title,
        image_url: (externalRecipe as any).image || null,
        source_url: externalRecipe.sourceUrl || null,
        ready_in_minutes: externalRecipe.readyInMinutes ?? null,
        servings: externalRecipe.servings ?? null,
        cuisines: externalRecipe.cuisines ?? [],
        dish_types: externalRecipe.dishTypes ?? [],
        vegetarian: externalRecipe.vegetarian ?? null,
        vegan: externalRecipe.vegan ?? null,
        gluten_free: (externalRecipe as any).glutenFree ?? null,
        dairy_free: (externalRecipe as any).dairyFree ?? null,
        health_score: (externalRecipe as any).healthScore ?? null,
        spoonacular_score: (externalRecipe as any).spoonacularScore ?? null,
        nutrition_json: (externalRecipe as any).nutrition ?? null,
      };

      const { data: upserted, error: upsertErr } = await supabase
        .from('recipes')
        .upsert(recipeRow, { onConflict: 'provider,external_id' })
        .select('id')
        .single();

      if (upsertErr) throw upsertErr;
      const recipeId = upserted?.id;
      if (!recipeId) throw new Error('Upsert returned no id');

      // Link to user_saved_recipes (ignore dup errors)
      const { error: linkErr } = await supabase
        .from('user_saved_recipes')
        .insert({ user_id: userId, recipe_id: recipeId });
      if (linkErr && !String(linkErr.message || '').includes('duplicate')) {
        throw linkErr;
      }
    } catch (e) {
      console.warn('[Recipes] Supabase save failed', e);
      // Do not unset local save; surface a non-blocking error
      setState(prev => ({ ...prev, error: prev.error ?? 'Saved locally. Cloud sync failed.' }));
    }
  }, [state.recipeProvider, addLocalRecipe, setState]);

  // Utility methods
  const getRecipeById = useCallback((id: string, type?: 'local' | 'external'): Meal | ExternalRecipe | null => {
    if (type === 'local' || !type) {
      const local = state.localRecipes.find(r => r.id === id);
      if (local) return local;
    }
    
    if (type === 'external' || !type) {
      const external = state.externalRecipes.find(r => r.id.toString() === id);
      if (external) return external;
      
      const search = state.searchResults.find(r => r.id.toString() === id);
      if (search) return search;
      
      const trending = state.trendingRecipes.find(r => r.id.toString() === id);
      if (trending) return trending;
    }
    
    return null;
  }, [state.localRecipes, state.externalRecipes, state.searchResults, state.trendingRecipes]);

  const getAllRecipes = useCallback((): (Meal | ExternalRecipe)[] => {
    return [...state.localRecipes, ...state.externalRecipes];
  }, [state.localRecipes, state.externalRecipes]);

  const getRecipesWithAvailability = useCallback((inventory: any[]): RecipeWithAvailability[] => {
    const allRecipes = getAllRecipes();
    
    return allRecipes.map(recipe => {
      // Handle both Meal and ExternalRecipe types; default to empty list
      const ingredients = 'ingredients' in recipe ? (recipe.ingredients ?? []) : [];
      const ingredientsArr: any[] = Array.isArray(ingredients) ? ingredients : [];
      
      let missingCount = 0;
      const missingIngredients: any[] = [];
      
      ingredientsArr.forEach((ingredient: any) => {
        const inventoryItem = inventory.find((item: any) => 
          item.name.toLowerCase() === ingredient.name.toLowerCase()
        );
        
        if (!inventoryItem || inventoryItem.quantity < ingredient.quantity) {
          missingCount++;
          missingIngredients.push(ingredient);
        }
      });
      
      return {
        ...recipe,
        availability: {
          recipeId: recipe.id,
          availableIngredients: ingredientsArr.length - missingCount,
          totalIngredients: ingredientsArr.length,
          availabilityPercentage: Math.round(((ingredientsArr.length - missingCount) / Math.max(ingredientsArr.length, 1)) * 100),
          missingIngredients,
          expiringIngredients: [],
        },
      };
    }).sort((a, b) => {
      // Sort by availability first
      if (a.availability.availabilityPercentage === 100 && b.availability.availabilityPercentage !== 100) return -1;
      if (b.availability.availabilityPercentage === 100 && a.availability.availabilityPercentage !== 100) return 1;
      
      // Then by availability percentage
      return b.availability.availabilityPercentage - a.availability.availabilityPercentage;
    });
  }, [getAllRecipes]);

  const clearCache = useCallback(() => {
    if (state.recipeProvider) {
      state.recipeProvider.clearCache();
    }
  }, [state.recipeProvider]);

  return {
    ...state,
    addLocalRecipe,
    updateLocalRecipe,
    removeLocalRecipe,
    saveExternalRecipe,
    searchRecipes,
    getTrendingRecipes,
    getRecipeRecommendations,
    getRandomRecipes,
    initializeRecipeProvider,
    clearCache,
    getRecipeById,
    getAllRecipes,
    getRecipesWithAvailability,
  };
};

// React Context to hold a single shared instance
const RecipeStoreContext = createContext<(RecipeStoreState & RecipeStoreActions) | undefined>(undefined);

export const RecipeStoreProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const store = useProvideRecipeStore();
  return React.createElement(RecipeStoreContext.Provider, { value: store }, children);
};

// Consumer hook
export const useRecipeStore = (): RecipeStoreState & RecipeStoreActions => {
  const ctx = useContext(RecipeStoreContext);
  if (!ctx) {
    throw new Error('useRecipeStore must be used within a RecipeStoreProvider');
  }
  return ctx;
};
