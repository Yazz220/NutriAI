// Enhanced Recipe Store Hook
// Now exclusively uses Supabase dataset for discovery/search (legacy external providers removed)

import React, { useState, useEffect, useCallback, useMemo, useContext, createContext, PropsWithChildren, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ExternalRecipe } from '@/types/external';
import { Meal, RecipeWithAvailability } from '@/types';
import { supabase } from '@/utils/supabaseClient';

// Dataset configuration (Supabase)
// Storage bucket for dataset images
const IMAGES_BUCKET = process.env.EXPO_PUBLIC_SUPABASE_IMAGES_BUCKET || 'recipe-images';

// Create a stable numeric hash from a string (for ExternalRecipe.id requirements)
const hashToNumber = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  // Ensure non-zero
  return hash || 1;
};

// Map a Supabase recipe row to ExternalRecipe shape
type DBRecipeRow = {
  id: string;
  provider?: string | null;
  external_id?: string | null;
  title: string;
  image_url?: string | null;
  image?: string | null;
  thumbnail_url?: string | null;
  image_path?: string | null;
  source_url?: string | null;
  ready_in_minutes?: number | null;
  servings?: number | null;
  cuisines?: string[] | null;
  dish_types?: string[] | null;
  vegetarian?: boolean | null;
  vegan?: boolean | null;
  gluten_free?: boolean | null;
  dairy_free?: boolean | null;
  health_score?: number | null;
  spoonacular_score?: number | null;
  nutrition_json?: any | null;
  // Optional rich fields
  instructions?: string | null;
  analyzed_instructions?: any | null;
  steps_json?: any[] | null;
  ingredients_json?: any[] | null;
  summary?: string | null;
};

const normalizeImageUrl = (input?: string | null): string => {
  if (!input) return '';
  let url = String(input).trim();
  // remove accidental surrounding quotes
  if ((url.startsWith('"') && url.endsWith('"')) || (url.startsWith("'") && url.endsWith("'"))) {
    url = url.slice(1, -1);
  }
  if (url.startsWith('//')) return 'https:' + url;
  if (url.startsWith('http://')) return url.replace('http://', 'https://');
  return url;
};

// Convert a storage object path into a public URL if the candidate is missing or not an http(s) URL
const toPublicImageUrl = (candidate: string, row: DBRecipeRow): string => {
  if (candidate && candidate.startsWith('http')) return candidate;
  const path = row.image_path || (candidate && !candidate.startsWith('http') ? candidate : '');
  if (!path) return candidate || '';
  try {
    const { data } = supabase.storage.from(IMAGES_BUCKET).getPublicUrl(path);
    return data.publicUrl || '';
  } catch {
    return candidate || '';
  }
};

const mapDbRowToExternal = (row: DBRecipeRow): ExternalRecipe => {
  const key = `${row.provider || 'dataset'}|${row.external_id || row.id}`;
  const imageCandidate = normalizeImageUrl(
    row.image_url || row.image || row.thumbnail_url || (row.nutrition_json && (row.nutrition_json.image || row.nutrition_json.image_url)) || row.image_path || ''
  );
  const finalImage = toPublicImageUrl(imageCandidate, row);
  // Build analyzedInstructions if provided as steps_json
  const analyzedInstructions = row.analyzed_instructions
    || (Array.isArray(row.steps_json) && row.steps_json.length
      ? [{ name: 'Steps', steps: row.steps_json.map((s: any, i: number) => ({ number: s.number || i + 1, step: s.step || s.text || String(s) })) }]
      : undefined);
  // Ingredients mapping
  const ingredients = Array.isArray(row.ingredients_json)
    ? row.ingredients_json.map((ing: any) => ({
        name: ing.name || ing.ingredient || ing.item || '',
        amount: ing.amount || ing.quantity || 0,
        unit: ing.unit || ing.measure || '',
        original: ing.original || [ing.amount || ing.quantity, ing.unit || ing.measure, ing.name || ing.ingredient || ing.item].filter(Boolean).join(' '),
      }))
    : undefined;
  // Plain instructions fallback (join steps)
  const plainInstructions = row.instructions
    || (Array.isArray(row.steps_json) ? row.steps_json.map((s: any) => s.step || s.text || String(s)).join('\n') : undefined)
    || undefined;
  return {
    id: hashToNumber(key),
    title: row.title || '',
    image: finalImage,
    servings: row.servings ?? 1,
    readyInMinutes: row.ready_in_minutes ?? 0,
    sourceUrl: row.source_url || undefined,
    cuisines: row.cuisines || undefined,
    dishTypes: row.dish_types || undefined,
    vegetarian: row.vegetarian ?? undefined,
    vegan: row.vegan ?? undefined,
    glutenFree: row.gluten_free ?? undefined,
    dairyFree: row.dairy_free ?? undefined,
    healthScore: row.health_score ?? undefined,
    spoonacularScore: row.spoonacular_score ?? undefined,
    nutrition: row.nutrition_json || undefined,
    analyzedInstructions,
    ingredients,
    instructions: plainInstructions,
    // Some datasets include a short summary
    summary: row.summary || undefined,
  } as ExternalRecipe;
};

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
  // Recipe provider removed; dataset-only
}

export interface RecipeStoreActions {
  // Local recipe management
  addLocalRecipe: (recipe: Omit<Meal, 'id'>) => void;
  updateLocalRecipe: (recipe: Meal) => void;
  removeLocalRecipe: (id: string) => void;
  saveExternalRecipe: (externalRecipe: ExternalRecipe) => void;
  
  // External recipe discovery
  searchRecipes: (params: {
    query?: string;
    cuisine?: string;
    type?: string;
    number?: number;
  }) => Promise<void>;
  getTrendingRecipes: () => Promise<void>;
  getRecipeRecommendations: (ingredients: string[]) => Promise<void>;
  getRandomRecipes: (tags?: string[], count?: number, append?: boolean) => Promise<void>;
  
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
  });

  // Keep a live ref of externalRecipes length to avoid stale closures in callbacks
  const externalCountRef = useRef<number>(0);
  useEffect(() => {
    externalCountRef.current = state.externalRecipes.length;
  }, [state.externalRecipes.length]);

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

  // Provider initialization removed — dataset only

  // Search recipes
  const searchRecipes = useCallback(async (params: { query?: string; cuisine?: string; type?: string; number?: number }) => {
    setState(prev => ({ ...prev, isSearching: true, error: null }));
    try {
      // Supabase full-text or title search
      let query = supabase
        .from('recipes')
        .select('*')
        .limit(params.number || 20);

      if (params.query && params.query.trim().length > 0) {
        // Prefer text search if tsv exists; fallback to ilike on title
        query = query.textSearch ? query.textSearch('tsv', params.query.trim(), { type: 'websearch' }) : query.ilike('title', `%${params.query.trim()}%`);
      }
      if (params.cuisine) query = query.contains('cuisines', [params.cuisine]);
      if (params.type) query = query.contains('dish_types', [params.type]);

      const { data, error } = await query;
      if (error) throw error;
      const mapped = (data || []).map(mapDbRowToExternal);
      setState(prev => ({ ...prev, searchResults: mapped, isSearching: false }));
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: `Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        isSearching: false 
      }));
    }
  }, []);

  const getTrendingRecipes = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .limit(12);
      if (error) throw error;
      const mapped = (data || []).map(mapDbRowToExternal);
      setState(prev => ({ ...prev, trendingRecipes: mapped, isLoading: false }));
    } catch (error) {
      console.error('[useRecipeStore] Failed to fetch trending recipes:', error);
      setState(prev => ({ 
        ...prev, 
        error: `Failed to fetch trending recipes: ${error instanceof Error ? error.message : 'Unknown error'}`,
        isLoading: false 
      }));
    }
  }, []);

  const getRecipeRecommendations = useCallback(async (ingredients: string[]) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const q = ingredients[0]?.trim();
      let query = supabase.from('recipes').select('*').limit(10);
      if (q) query = query.ilike('title', `%${q}%`);
      const { data, error } = await query;
      if (error) throw error;
      const mapped = (data || []).map(mapDbRowToExternal);
      setState(prev => ({ ...prev, externalRecipes: mapped, isLoading: false }));
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: `Failed to fetch recommendations: ${error instanceof Error ? error.message : 'Unknown error'}`,
        isLoading: false 
      }));
    }
  }, []);

  const getRandomRecipes = useCallback(async (tags?: string[], count: number = 10, append: boolean = true) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const offset = append ? (externalCountRef.current || 0) : 0;
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .range(offset, offset + count - 1);
      if (error) throw error;
      const mapped = (data || []).map(mapDbRowToExternal);
      setState(prev => ({
        ...prev,
        externalRecipes: append
          ? Array.from(new Map([...(prev.externalRecipes || []), ...mapped].map(r => [r.id, r])).values())
          : mapped,
        isLoading: false,
      }));
    } catch (error) {
      console.error('[useRecipeStore] Failed to fetch random recipes:', error);
      setState(prev => ({ 
        ...prev, 
        error: `Failed to fetch random recipes: ${error instanceof Error ? error.message : 'Unknown error'}`,
        isLoading: false 
      }));
    }
  }, []);

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

  const saveExternalRecipe = useCallback(async (externalRecipe: ExternalRecipe) => {
    const convertedRecipe = ({
      id: String(externalRecipe.id),
      name: externalRecipe.title,
      description: externalRecipe.instructions || externalRecipe.title || '',
      image: externalRecipe.image || undefined,
      tags: [
        ...((externalRecipe.cuisines || [])),
        ...((externalRecipe.diets || [])),
        ...((externalRecipe.dishTypes || [])),
      ].filter(Boolean),
      prepTime: externalRecipe.preparationMinutes || externalRecipe.readyInMinutes || 0,
      cookTime: externalRecipe.cookingMinutes || 0,
      servings: externalRecipe.servings || 1,
      ingredients: externalRecipe.ingredients?.map((ing: any) => ({
        name: ing.name,
        quantity: ing.amount,
        unit: ing.unit,
        optional: false,
      })) || [],
      steps: externalRecipe.analyzedInstructions?.[0]?.steps?.map((s: any) => s.step) || [],
    } as Meal);
    addLocalRecipe(convertedRecipe);

    try {
      const { data: userRes } = await supabase.auth.getUser();
      const userId = userRes?.user?.id;
      if (!userId) {
        console.warn('[Recipes] No authenticated user; skipping Supabase save');
        return;
      }

      const recipeRow = {
        provider: 'dataset',
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

      const { error: linkErr } = await supabase
        .from('user_saved_recipes')
        .insert({ user_id: userId, recipe_id: recipeId });
      if (linkErr && !String(linkErr.message || '').includes('duplicate')) {
        throw linkErr;
      }
    } catch (e) {
      console.warn('[Recipes] Supabase save failed', e);
      setState(prev => ({ ...prev, error: prev.error ?? 'Saved locally. Cloud sync failed.' }));
    }
  }, [addLocalRecipe, setState]);

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
    const externalAsMeals: Meal[] = state.externalRecipes.map((er: any) => ({
      id: String(er.id),
      name: er.title ?? String(er.id),
      description: er.summary ?? er.title ?? '',
      ingredients: Array.isArray(er.ingredients) ? er.ingredients : [],
      steps: Array.isArray(er.analyzedInstructions) ? er.analyzedInstructions : [],
      image: er.image ?? undefined,
      tags: Array.isArray(er.cuisines) ? er.cuisines : (Array.isArray(er.dishTypes) ? er.dishTypes : []),
      prepTime: typeof er.readyInMinutes === 'number' ? er.readyInMinutes : 0,
      cookTime: 0,
      servings: typeof er.servings === 'number' ? er.servings : 1,
    } as Meal));

    const allRecipes: Meal[] = [...state.localRecipes, ...externalAsMeals];
    
    return allRecipes.map((recipe: Meal) => {
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
          recipeId: String((recipe as any).id),
          availableIngredients: ingredientsArr.length - missingCount,
          totalIngredients: ingredientsArr.length,
          availabilityPercentage: Math.round(((ingredientsArr.length - missingCount) / Math.max(ingredientsArr.length, 1)) * 100),
          missingIngredients,
          expiringIngredients: [],
        },
      };
    }).sort((a, b) => {
      if (a.availability.availabilityPercentage === 100 && b.availability.availabilityPercentage !== 100) return -1;
      if (b.availability.availabilityPercentage === 100 && a.availability.availabilityPercentage !== 100) return 1;
      
      return b.availability.availabilityPercentage - a.availability.availabilityPercentage;
    });
  }, [getAllRecipes]);

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
    getRecipeById,
    getAllRecipes,
    getRecipesWithAvailability,
  };
};

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
