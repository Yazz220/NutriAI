// Recipe Provider Service for external recipe APIs (Spoonacular, Edamam, TheMealDB, etc.)
// This service handles recipe discovery, search, and detailed information
import { Platform } from 'react-native';

export interface RecipeProviderConfig {
  apiKey: string;
  baseUrl: string;
  timeout?: number;
  maxResults?: number;
  providerType: 'spoonacular' | 'edamam' | 'mealdb';
  requiresAuth: boolean; // Indicates if the provider requires an API key
}

// Predefined configs per provider
export const RECIPE_API_CONFIGS: Record<string, Omit<RecipeProviderConfig, 'apiKey'>> = {
  spoonacular: {
    baseUrl: 'https://api.spoonacular.com/recipes',
    timeout: 15000,
    maxResults: 20,
    providerType: 'spoonacular',
    requiresAuth: true,
  },
  edamam: {
    baseUrl: 'https://api.edamam.com/api/recipes/v2',
    timeout: 15000,
    maxResults: 20,
    providerType: 'edamam',
    requiresAuth: true,
  },
  mealdb: {
    baseUrl: 'https://www.themealdb.com/api/json/v1/1',
    timeout: 15000,
    maxResults: 20,
    providerType: 'mealdb',
    requiresAuth: false,
  },
};

export interface RecipeSearchParams {
  query?: string;
  cuisine?: string; // maps to Area in TheMealDB
  diet?: string;
  intolerances?: string[];
  maxReadyTime?: number;
  minProtein?: number;
  maxCalories?: number;
  type?: string; // maps to Category in TheMealDB
  addRecipeInformation?: boolean;
  fillIngredients?: boolean;
  addRecipeNutrition?: boolean;
  offset?: number;
  number?: number;
}

export interface ExternalRecipe {
  id: number;
  title: string;
  image: string;
  imageType?: string;
  servings: number;
  readyInMinutes: number;
  preparationMinutes?: number;
  cookingMinutes?: number;
  sourceName?: string;
  sourceUrl?: string;
  spoonacularSourceUrl?: string;
  aggregateLikes?: number;
  healthScore?: number;
  spoonacularScore?: number;
  pricePerServing?: number;
  analyzedInstructions?: any[];
  cheap?: boolean;
  creditsText?: string;
  cuisines?: string[];
  dairyFree?: boolean;
  diets?: string[];
  gaps?: string;
  glutenFree?: boolean;
  instructions?: string;
  ketogenic?: boolean;
  lowFodmap?: boolean;
  occasions?: string[];
  sustainable?: boolean;
  vegan?: boolean;
  vegetarian?: boolean;
  veryHealthy?: boolean;
  veryPopular?: boolean;
  whole30?: boolean;
  weightWatcherSmartPoints?: number;
  dishTypes?: string[];
  nutrition?: RecipeNutrition;
  ingredients?: RecipeIngredient[];
}

export interface RecipeNutrition {
  nutrients: NutritionNutrient[];
  properties?: NutritionProperty[];
  flavonoids?: NutritionFlavonoid[];
  caloricBreakdown?: CaloricBreakdown;
  weightPerServing?: WeightPerServing;
}

export interface NutritionNutrient {
  name: string;
  amount: number;
  unit: string;
  percentOfDailyNeeds?: number;
}

export interface NutritionProperty {
  name: string;
  amount: number;
  unit: string;
}

export interface NutritionFlavonoid {
  name: string;
  amount: number;
  unit: string;
}

export interface CaloricBreakdown {
  percentProtein: number;
  percentFat: number;
  percentCarbs: number;
}

export interface WeightPerServing {
  amount: number;
  unit: string;
}

export interface RecipeIngredient {
  id?: number;
  aisle?: string;
  amount: number;
  unit: string;
  name: string;
  original?: string;
  originalName?: string;
  meta?: string[];
  image?: string;
}

export interface RecipeSearchResponse {
  results: ExternalRecipe[];
  offset?: number;
  number?: number;
  totalResults?: number;
  processingTimeMs?: number;
  expires?: number;
}

export interface RecipeInformationResponse extends ExternalRecipe {
  // Extended with full recipe details where supported
}

export type RecipeProviderType = 'spoonacular' | 'edamam' | 'mealdb';

export class RecipeProviderService {
  private config: Required<RecipeProviderConfig>;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private readonly proxyBase: string | undefined = process.env.EXPO_PUBLIC_RECIPES_PROXY_BASE;
  private readonly providerType: RecipeProviderType;

  constructor(providerType: RecipeProviderType, config: RecipeProviderConfig) {
    this.providerType = providerType;
    this.config = {
      ...config,
      timeout: config.timeout ?? 15000,
      maxResults: config.maxResults ?? 20,
      requiresAuth: config.requiresAuth ?? true,
    };
    
    // Validate configuration
    if (!this.config.baseUrl) {
      throw new Error(`Invalid configuration for ${providerType}: missing baseUrl`);
    }
    
    if (!this.config.apiKey && this.config.requiresAuth) {
      console.warn(`[RecipeAPI] Warning: ${providerType} requires authentication but no API key provided`);
    }
    
    // Set up proxy for web platform
    if (Platform.OS === 'web') {
      this.proxyBase = 'https://api.allorigins.win/raw';
    }
    
    console.log('[RecipeAPI] Provider initialized', { 
      providerType, 
      baseUrl: this.config.baseUrl,
      hasApiKey: !!this.config.apiKey,
      platform: Platform.OS 
    });
  }

  // Get provider type
  public getProviderType(): RecipeProviderType {
    return this.providerType;
  }

  // Search for recipes with various filters
  async searchRecipes(params: RecipeSearchParams): Promise<RecipeSearchResponse> {
    const cacheKey = `search:${this.providerType}:${JSON.stringify(params)}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    try {
      if (this.providerType === 'mealdb') {
        // TheMealDB: prefer query by name; otherwise try category/area filter
        let url: string | null = null;
        if (params.query) {
          const qp = new URLSearchParams();
          qp.append('s', params.query);
          url = `${this.config.baseUrl}/search.php?${qp.toString()}`;
        } else if (params.type) {
          const qp = new URLSearchParams();
          qp.append('c', params.type);
          url = `${this.config.baseUrl}/filter.php?${qp.toString()}`;
        } else if (params.cuisine) {
          const qp = new URLSearchParams();
          qp.append('a', params.cuisine);
          url = `${this.config.baseUrl}/filter.php?${qp.toString()}`;
        } else {
          // Fallback: random a few to mimic discovery
          const random = await this.getRandomRecipes({ number: params.number || this.config.maxResults });
          const resp = { results: random } as RecipeSearchResponse;
          this.setCached(cacheKey, resp);
          return resp;
        }

        const data = await this.makeRequest(url);
        const meals = data?.meals || [];
        const mapped = meals.map((m: any) => this.mapMealDBMealToExternal(m));
        const resp = { results: mapped } as RecipeSearchResponse;
        this.setCached(cacheKey, resp);
        return resp;
      }

      const queryParams = new URLSearchParams();
      
      // Add search parameters
      if (params.query) queryParams.append('query', params.query);
      if (params.cuisine) queryParams.append('cuisine', params.cuisine);
      if (params.diet) queryParams.append('diet', params.diet);
      if (params.intolerances?.length) queryParams.append('intolerances', params.intolerances.join(','));
      if (params.maxReadyTime) queryParams.append('maxReadyTime', params.maxReadyTime.toString());
      if (params.minProtein) queryParams.append('minProtein', params.minProtein.toString());
      if (params.maxCalories) queryParams.append('maxCalories', params.maxCalories.toString());
      if (params.type) queryParams.append('type', params.type);
      
      // Always include these for better data
      queryParams.append('addRecipeInformation', 'true');
      queryParams.append('fillIngredients', 'true');
      queryParams.append('addRecipeNutrition', 'true');
      queryParams.append('number', (params.number || this.config.maxResults || 20).toString());
      if (params.offset) queryParams.append('offset', params.offset.toString());

      queryParams.append('apiKey', this.config.apiKey);
      const url = `${this.config.baseUrl}/recipes/complexSearch?${queryParams.toString()}`;
      const response = await this.makeRequest(url);
      
      this.setCached(cacheKey, response);
      return response;
    } catch (error) {
      console.error('Recipe search failed:', error);
      throw new Error(`Failed to search recipes: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Get detailed recipe information by ID
  async getRecipeInformation(id: number): Promise<RecipeInformationResponse> {
    const cacheKey = `recipe:${this.providerType}:${id}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    try {
      if (this.providerType === 'mealdb') {
        const url = `${this.config.baseUrl}/lookup.php?i=${encodeURIComponent(String(id))}`;
        const data = await this.makeRequest(url);
        const meal = data?.meals?.[0];
        const mapped = this.mapMealDBMealToExternal(meal);
        this.setCached(cacheKey, mapped);
        return mapped as RecipeInformationResponse;
      }

      const url = `${this.config.baseUrl}/recipes/${id}/information?apiKey=${encodeURIComponent(this.config.apiKey)}`;
      const response = await this.makeRequest(url);
      
      this.setCached(cacheKey, response);
      return response;
    } catch (error) {
      console.error('Recipe information fetch failed:', error);
      throw new Error(`Failed to fetch recipe information: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Get random recipes
  async getRandomRecipes(params: { tags?: string[]; number?: number } = {}): Promise<ExternalRecipe[]> {
    const cacheKey = `random:${this.providerType}:${JSON.stringify(params)}`;
    const cached = this.getCached(cacheKey);
    if (cached) {
      console.log('[RecipeAPI] Returning cached random recipes', { 
        count: cached.length, 
        providerType: this.providerType 
      });
      return cached;
    }

    try {
      console.log('[RecipeAPI] Fetching random recipes', { 
        providerType: this.providerType, 
        params,
        baseUrl: this.config.baseUrl 
      });
      
      if (this.providerType === 'mealdb') {
        const count = Math.max(1, Math.min(params.number || 10, 20));
        console.log('[RecipeAPI] Fetching MealDB random recipes', { count });
        
        const results: ExternalRecipe[] = [];
        for (let i = 0; i < count; i++) {
          const url = `${this.config.baseUrl}/random.php`;
          console.log('[RecipeAPI] Fetching random meal', { index: i + 1, url });
          
          const data = await this.makeRequest(url);
          const meal = data?.meals?.[0];
          
          if (meal) {
            console.log('[RecipeAPI] Random meal received', { 
              id: meal.idMeal, 
              title: meal.strMeal,
              hasImage: !!meal.strMealThumb 
            });
            results.push(this.mapMealDBMealToExternal(meal));
          } else {
            console.warn('[RecipeAPI] No meal data in response', { 
              dataType: typeof data,
              hasMeals: data?.meals ? true : false,
              dataKeys: Object.keys(data || {})
            });
          }
        }
        
        console.log('[RecipeAPI] Random recipes completed', { 
          requested: count, 
          received: results.length,
          providerType: this.providerType 
        });
        
        this.setCached(cacheKey, results);
        return results;
      }

      const queryParams = new URLSearchParams();
      if (params.tags?.length) queryParams.append('tags', params.tags.join(','));
      queryParams.append('number', (params.number || 10).toString());
      queryParams.append('addRecipeInformation', 'true');
      queryParams.append('fillIngredients', 'true');
      queryParams.append('addRecipeNutrition', 'true');

      queryParams.append('apiKey', this.config.apiKey);
      const url = `${this.config.baseUrl}/recipes/random?${queryParams.toString()}`;
      const response = await this.makeRequest(url);
      
      this.setCached(cacheKey, response.recipes || response);
      return response.recipes || response;
    } catch (error) {
      console.error('[RecipeAPI] Random recipes fetch failed', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        providerType: this.providerType,
        params 
      });
      throw new Error(`Failed to fetch random recipes: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Get recipe recommendations based on ingredients
  async getRecipeRecommendations(ingredients: string[]): Promise<ExternalRecipe[]> {
    const cacheKey = `recommendations:${this.providerType}:${ingredients.sort().join(',')}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    try {
      if (this.providerType === 'mealdb') {
        // Free API supports only one ingredient in filter
        const first = ingredients[0] || '';
        const qp = new URLSearchParams();
        if (first) qp.append('i', first);
        const url = `${this.config.baseUrl}/filter.php?${qp.toString()}`;
        const data = await this.makeRequest(url);
        const meals = data?.meals || [];
        const mapped = meals.map((m: any) => this.mapMealDBMealToExternal(m));
        this.setCached(cacheKey, mapped);
        return mapped;
      }

      const queryParams = new URLSearchParams();
      queryParams.append('ingredients', ingredients.join(','));
      queryParams.append('ranking', '2');
      queryParams.append('ignorePantry', 'true');
      queryParams.append('number', '10');
      queryParams.append('addRecipeInformation', 'true');
      queryParams.append('fillIngredients', 'true');
      queryParams.append('addRecipeNutrition', 'true');

      queryParams.append('apiKey', this.config.apiKey);
      const url = `${this.config.baseUrl}/recipes/findByIngredients?${queryParams.toString()}`;
      const response = await this.makeRequest(url);
      
      this.setCached(cacheKey, response);
      return response;
    } catch (error) {
      console.error('Recipe recommendations fetch failed:', error);
      throw new Error(`Failed to fetch recipe recommendations: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Get trending recipes
  async getTrendingRecipes(): Promise<ExternalRecipe[]> {
    const cacheKey = `trending:${this.providerType}`;
    const cached = this.getCached(cacheKey);
    if (cached) {
      console.log('[RecipeAPI] Returning cached trending recipes', { 
        count: cached.length, 
        providerType: this.providerType 
      });
      return cached;
    }

    try {
      console.log('[RecipeAPI] Fetching trending recipes', { providerType: this.providerType });
      
      if (this.providerType === 'mealdb') {
        console.log('[RecipeAPI] Using random recipes as trending for MealDB');
        const random = await this.getRandomRecipes({ number: 10 });
        console.log('[RecipeAPI] Trending recipes completed', { 
          count: random.length, 
          providerType: this.providerType 
        });
        this.setCached(cacheKey, random);
        return random;
      }
      
      console.log('[RecipeAPI] Using random recipes with tags for trending');
      const random = await this.getRandomRecipes({ tags: ['popular', 'healthy'], number: 10 });
      console.log('[RecipeAPI] Trending recipes completed', { 
        count: random.length, 
        providerType: this.providerType 
      });
      this.setCached(cacheKey, random);
      return random;
    } catch (error) {
      console.error('[RecipeAPI] Error fetching trending recipes', { 
        providerType: this.providerType, 
        error: error instanceof Error ? error.message : String(error) 
      });
      throw error;
    }
  }

  // Convert external recipe to internal format
  convertToInternalRecipe(externalRecipe: ExternalRecipe): any {
    return {
      id: externalRecipe.id.toString(),
      name: externalRecipe.title,
      description: (externalRecipe.instructions || '').substring(0, 200) + ((externalRecipe.instructions || '').length > 200 ? '...' : ''),
      imageUrl: externalRecipe.image,
      tags: [
        ...((externalRecipe.cuisines || [])),
        ...((externalRecipe.diets || [])),
        ...((externalRecipe.dishTypes || [])),
        externalRecipe.vegetarian ? 'vegetarian' : '',
        externalRecipe.vegan ? 'vegan' : '',
        externalRecipe.glutenFree ? 'gluten-free' : '',
        externalRecipe.dairyFree ? 'dairy-free' : '',
      ].filter(Boolean),
      prepTime: externalRecipe.preparationMinutes || 0,
      cookTime: externalRecipe.cookingMinutes || 0,
      servings: externalRecipe.servings,
      nutritionPerServing: externalRecipe.nutrition ? {
        calories: this.getNutrientValue(externalRecipe.nutrition.nutrients, 'Calories'),
        protein: this.getNutrientValue(externalRecipe.nutrition.nutrients, 'Protein'),
        carbs: this.getNutrientValue(externalRecipe.nutrition.nutrients, 'Carbohydrates'),
        fats: this.getNutrientValue(externalRecipe.nutrition.nutrients, 'Fat'),
      } : undefined,
      ingredients: externalRecipe.ingredients?.map(ing => ({
        name: ing.name,
        quantity: ing.amount,
        unit: ing.unit,
        optional: false,
      })) || [],
      steps: externalRecipe.analyzedInstructions?.[0]?.steps?.map((step: any) => step.step) || 
             (externalRecipe.instructions ? externalRecipe.instructions.split('\n').filter(Boolean) : []),
      externalData: {
        provider: this.providerType,
        externalId: externalRecipe.id,
        sourceUrl: externalRecipe.sourceUrl,
        spoonacularScore: externalRecipe.spoonacularScore,
        healthScore: externalRecipe.healthScore,
        readyInMinutes: externalRecipe.readyInMinutes,
      },
    };
  }

  // Helper method to map TheMealDB meal to ExternalRecipe
  private mapMealDBMealToExternal(meal: any): ExternalRecipe {
    if (!meal) {
      return {
        id: 0,
        title: '',
        image: '',
        servings: 1,
        readyInMinutes: 0,
      } as ExternalRecipe;
    }

    // Collect ingredients 1..20 with measures
    const ingredients: RecipeIngredient[] = [];
    for (let i = 1; i <= 20; i++) {
      const name = meal[`strIngredient${i}`];
      const measure = meal[`strMeasure${i}`];
      if (name && String(name).trim()) {
        ingredients.push({
          name: String(name).trim(),
          amount: 0,
          unit: (measure || '').toString().trim(),
          original: `${measure || ''} ${name}`.trim(),
        });
      }
    }

    return {
      id: parseInt(meal.idMeal, 10),
      title: meal.strMeal,
      image: meal.strMealThumb || '',
      servings: 1,
      readyInMinutes: 0,
      sourceName: meal.strSource ? 'TheMealDB' : undefined,
      sourceUrl: meal.strSource || undefined,
      instructions: meal.strInstructions || '',
      cuisines: meal.strArea ? [meal.strArea] : [],
      dishTypes: meal.strCategory ? [meal.strCategory] : [],
      vegetarian: undefined,
      vegan: undefined,
      glutenFree: undefined,
      dairyFree: undefined,
      nutrition: undefined,
      ingredients,
      analyzedInstructions: undefined,
    } as ExternalRecipe;
  }

  // Helper method to get nutrient value
  private getNutrientValue(nutrients: NutritionNutrient[] = [], name: string): number {
    const nutrient = nutrients.find(n => n.name === name);
    return nutrient ? Math.round(nutrient.amount) : 0;
  }

  // Public method to get nutrition values
  getNutritionValues(nutrition?: RecipeNutrition) {
    if (!nutrition) {
      return {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
      };
    }

    return {
      calories: this.getNutrientValue(nutrition.nutrients, 'Calories'),
      protein: this.getNutrientValue(nutrition.nutrients, 'Protein'),
      carbs: this.getNutrientValue(nutrition.nutrients, 'Carbohydrates'),
      fat: this.getNutrientValue(nutrition.nutrients, 'Fat'),
    };
  }

  // Make HTTP request with timeout and error handling
  private async makeRequest(url: string): Promise<any> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      // Only use proxy on web to bypass CORS; native should call API directly
      const useProxy = Platform.OS === 'web' && !!this.proxyBase;
      const targetUrl = useProxy ? `${this.proxyBase}?url=${encodeURIComponent(url)}` : url;
      console.log('[RecipeAPI] Making request', { 
        platform: Platform.OS, 
        providerType: this.providerType,
        proxied: useProxy, 
        url: targetUrl.split('?')[0] 
      });
      
      const response = await fetch(targetUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        mode: Platform.OS === 'web' ? 'cors' : undefined,
        credentials: 'omit',
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let body = '';
        try { body = await response.text(); } catch {}
        const err = `HTTP ${response.status} ${response.statusText} for ${targetUrl}${body ? `\nBody: ${body}` : ''}`;
        console.warn('[RecipeAPI] HTTP error', { 
          status: response.status, 
          platform: Platform.OS,
          providerType: this.providerType,
          url: targetUrl.split('?')[0]
        });
        throw new Error(err);
      }

      console.log('[RecipeAPI] Request successful', { 
        status: response.status, 
        platform: Platform.OS,
        providerType: this.providerType,
        url: targetUrl.split('?')[0]
      });
      
      try {
        const data = await response.json();
        console.log('[RecipeAPI] Response data received', { 
          dataType: typeof data,
          hasMeals: data?.meals ? true : false,
          mealsCount: data?.meals?.length || 0,
          providerType: this.providerType
        });
        return data;
      } catch (parseError) {
        console.warn('[RecipeAPI] JSON parse failed, trying text', { 
          error: parseError instanceof Error ? parseError.message : 'Unknown parse error',
          providerType: this.providerType
        });
        const text = await response.text();
        try { 
          return JSON.parse(text); 
        } catch { 
          console.log('[RecipeAPI] Returning text response', { 
            textLength: text.length,
            providerType: this.providerType
          });
          return text; 
        }
      }
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        console.error('[RecipeAPI] Request timed out', { 
          providerType: this.providerType,
          url: url.split('?')[0]
        });
        throw new Error('Request timed out');
      }
      console.error('[RecipeAPI] Request failed', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        providerType: this.providerType,
        url: url.split('?')[0]
      });
      throw error;
    }
  }

  // Simple in-memory cache helpers
  private getCached<T = any>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > this.CACHE_DURATION) {
      this.cache.delete(key);
      return null;
    }
    return entry.data as T;
  }

  private setCached(key: string, data: any) {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  clearCache() {
    this.cache.clear();
  }
}
