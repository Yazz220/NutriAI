// Enhanced Recipe Store Hook
// Wired to TheMealDB (free API) for discovery and search

import React, { useState, useEffect, useCallback, useContext, createContext, PropsWithChildren, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ExternalRecipe } from '@/types/external';
import { computeForExternalRecipe, estimateServingsForExternalRecipe } from '@/utils/nutrition/compute';
import { mealdbRandomSelection, mealdbSearch, mealdbFilterByIngredient } from '@/utils/providers/mealdb';
import { Meal, RecipeWithAvailability } from '@/types';

// External source
const RECIPE_SOURCE = 'mealdb';

// External dataset/backend disabled

// Create a stable numeric hash from a string (for ExternalRecipe.id requirements)
const hashToNumber = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  // Ensure non-zero
  return hash || 1;
}

// Map a minimal Canonical-like recipe (from Edamam mapper) to ExternalRecipe
const mapEdamamCanonicalToExternal = (r: any): ExternalRecipe => {
  // r is CanonicalRecipe from utils/providers/edamam.ts
  const servings = typeof r.servings === 'number' && r.servings > 0 ? r.servings : 1;
  return {
    id: typeof r.id === 'number' ? r.id : (r.id ? Math.abs(hashCode(String(r.id))) : Date.now()),
    title: r.title || '',
    image: r.image || '',
    servings,
    readyInMinutes: r.totalTimeMinutes || 0,
    sourceUrl: r.sourceUrl,
    cuisines: [],
    dishTypes: r.tags || [],
    nutrition: r.nutritionPerServing
      ? {
          nutrients: [
            { name: 'Calories', amount: r.nutritionPerServing.calories || 0, unit: 'kcal' },
            { name: 'Protein', amount: r.nutritionPerServing.protein || 0, unit: 'g' },
            { name: 'Carbohydrates', amount: r.nutritionPerServing.carbs || 0, unit: 'g' },
            { name: 'Fat', amount: r.nutritionPerServing.fats || 0, unit: 'g' },
          ],
        }
      : undefined,
    ingredients: Array.isArray(r.ingredients)
      ? r.ingredients.map((ing: any) => ({
          name: ing.name || ing.original || '',
          amount: ing.quantity || ing.amount || 0,
          unit: ing.unit || '',
          original: ing.original || undefined,
        }))
      : undefined,
    analyzedInstructions: Array.isArray(r.steps)
      ? [{ name: 'Steps', steps: r.steps.map((s: string, i: number) => ({ number: i + 1, step: s })) }]
      : undefined,
    summary: r.description || undefined,
  } as ExternalRecipe;
};

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
}

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

// Convert a storage object path into a public URL
// Clean slate: no external storage resolution; return candidate as-is
const toPublicImageUrl = (candidate: string, _row: DBRecipeRow): string => {
  return candidate || '';
};

const mapDbRowToExternal = async (_row: DBRecipeRow): Promise<ExternalRecipe> => {
  // Clean slate: no DB mapping
  return {
    id: Date.now(),
    title: '',
    image: '',
    servings: 1,
    readyInMinutes: 0,
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
  clearSearchResults: () => void;
  
  // Utility methods
  getRecipeById: (id: string, type?: 'local' | 'external') => Meal | ExternalRecipe | null;
  getAllRecipes: () => (Meal | ExternalRecipe)[];
  getRecipesWithAvailability: (inventory: any[]) => RecipeWithAvailability[];
}

// TheMealDB-powered provider implementation

function useProvideRecipeStore(): RecipeStoreState & RecipeStoreActions {
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

  // cooldown for repeated failing random fetches (timestamp ms)
  const lastRandomFailureRef = useRef<number | null>(null);

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

  // Helper: merge unique by id
  const mergeUnique = (a: ExternalRecipe[], b: ExternalRecipe[]): ExternalRecipe[] => {
    const map = new Map<string, ExternalRecipe>();
    a.forEach(r => map.set(String(r.id), r));
    b.forEach(r => { const k = String(r.id); if (!map.has(k)) map.set(k, r); });
    return Array.from(map.values());
  };

  // Search recipes via TheMealDB
  const searchRecipes = useCallback(async (params: { query?: string; cuisine?: string; type?: string; number?: number }) => {
    setState(prev => ({ ...prev, isSearching: true, error: null }));
    try {
      const q = (params.query || '').trim();
      const results = q ? await mealdbSearch(q) : await mealdbRandomSelection();
      const limited = typeof params.number === 'number' ? results.slice(0, params.number) : results;
      setState(prev => ({ ...prev, searchResults: limited, isSearching: false }));
    } catch (e) {
      console.error('[RecipeStore] searchRecipes failed', e);
      setState(prev => ({ ...prev, error: 'Search failed', searchResults: [], isSearching: false }));
    }
  }, []);

  const getTrendingRecipes = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      // TheMealDB doesn't provide trending; use random selection as a stand-in
      const list = await mealdbRandomSelection();
      setState(prev => ({ ...prev, trendingRecipes: list, isLoading: false }));
    } catch (e) {
      console.error('[RecipeStore] getTrendingRecipes failed', e);
      setState(prev => ({ ...prev, error: 'Failed to load trending recipes', trendingRecipes: [], isLoading: false }));
    }
  }, []);

  const getRecipeRecommendations = useCallback(async (ingredients: string[]) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      // Use first ingredient to filter; TheMealDB supports single-ingredient filter
      const first = (ingredients || []).find(Boolean);
      const list = first ? await mealdbFilterByIngredient(first) : await mealdbRandomSelection();
      setState(prev => ({ ...prev, externalRecipes: list, isLoading: false }));
    } catch (e) {
      console.error('[RecipeStore] getRecipeRecommendations failed', e);
      setState(prev => ({ ...prev, error: 'Failed to get recommendations', isLoading: false }));
    }
  }, []);

  const getRandomRecipes = useCallback(async (_tags?: string[], count: number = 10, append: boolean = true) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const list = await mealdbRandomSelection();
      const limited = list.slice(0, Math.max(1, count));
      setState(prev => ({
        ...prev,
        externalRecipes: append ? mergeUnique(prev.externalRecipes, limited) : limited,
        isLoading: false,
      }));
    } catch (e) {
      console.error('[RecipeStore] getRandomRecipes failed', e);
      setState(prev => ({ ...prev, error: 'Failed to load recipes', isLoading: false }));
    }
  }, []);

  const clearSearchResults = useCallback(() => {
    setState(prev => ({ ...prev, searchResults: [] }));
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
    // Improve serving default for external recipes lacking servings
    const estServings = estimateServingsForExternalRecipe(externalRecipe);
    const withServings = { ...externalRecipe, servings: estServings } as ExternalRecipe;
    // Compute nutrition if possible (per-serving based on estimated servings)
    const computed = computeForExternalRecipe(withServings);
    const convertedRecipe = ({
      id: String(withServings.id),
      name: withServings.title,
      description: withServings.instructions || withServings.title || '',
      image: withServings.image || undefined,
      tags: [
        ...((withServings.cuisines || [])),
        ...((withServings.diets || [])),
        ...((withServings.dishTypes || [])),
      ].filter(Boolean),
      prepTime: withServings.preparationMinutes || withServings.readyInMinutes || 0,
      cookTime: withServings.cookingMinutes || 0,
      servings: withServings.servings || 1,
      ingredients: withServings.ingredients?.map((ing: any) => ({
        name: ing.name,
        quantity: ing.amount,
        unit: ing.unit,
        optional: false,
      })) || [],
      steps: withServings.analyzedInstructions?.[0]?.steps?.map((s: any) => s.step) || [],
      nutritionPerServing: computed ? {
        calories: computed.calories,
        protein: computed.protein,
        carbs: computed.carbs,
        fats: computed.fats,
      } : undefined,
    } as Meal);
    addLocalRecipe(convertedRecipe);

    // Clean slate: skip cloud save
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
  clearSearchResults,
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
