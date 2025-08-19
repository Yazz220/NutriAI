// Types for external recipe data used across the app (dataset-backed)

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

export interface RecipeNutrition {
  nutrients: NutritionNutrient[];
  properties?: NutritionProperty[];
  flavonoids?: NutritionFlavonoid[];
  caloricBreakdown?: CaloricBreakdown;
  weightPerServing?: WeightPerServing;
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
  summary?: string;
}
