export interface InventoryItem {
    id: string;
    name: string;
    quantity: number;
    unit: string;
    category: ItemCategory;
    addedDate: string;
    expiryDate?: string;
    imageUrl?: string;
  }

  export type ItemCategory =
    | "Produce"
    | "Dairy"
    | "Meat"
    | "Seafood"
    | "Frozen"
    | "Pantry"
    | "Bakery"
    | "Beverages"
    | "Other";

  export type MealCategory =
    | 'breakfast'
    | 'lunch'
    | 'dinner'
    | 'snacks'
    | 'appetizers'
    | 'desserts'
    | 'drinks'
    | 'sides';

  export const MEAL_CATEGORIES: MealCategory[] = [
    'breakfast', 'lunch', 'dinner', 'snacks', 'appetizers', 'desserts', 'drinks', 'sides',
  ];

  export const MEAL_CATEGORY_LABELS: Record<MealCategory, string> = {
    breakfast: 'Breakfast',
    lunch: 'Lunch',
    dinner: 'Dinner',
    snacks: 'Snacks',
    appetizers: 'Appetizers',
    desserts: 'Desserts',
    drinks: 'Drinks',
    sides: 'Sides',
  };

  export interface Meal {
    id: string;
    name: string;
    description: string;
    ingredients: MealIngredient[];
    steps: string[];
    image?: string;
    tags: string[];
    prepTime: number; // in minutes
    cookTime: number; // in minutes
    servings: number;
    sourceUrl?: string;
    category?: MealCategory;
    nutritionPerServing?: {
      calories: number;
      protein: number; // grams
      carbs: number;   // grams
      fats: number;    // grams
    };
  }

  export interface MealIngredient {
    name: string;
    quantity: number;
    unit: string;
    optional?: boolean;
  }

  export interface ShoppingListItem extends Omit<InventoryItem, 'expiryDate' | 'imageUrl'> {
    checked: boolean;
    addedBy: "user" | "system" | "meal" | "mealPlan";
    mealId?: string;
    plannedMealId?: string;
  }

  export interface RecipeIngredient {
    name: string;
    quantity: number;
    unit: string;
  }

  export interface Recipe {
    id: string;
    name: string;
    image: string; // URL or local asset
    tags: string[];
    prepTime: string; // e.g., '30 mins'
    cookTime: string; // e.g., '45 mins'
    servings: number;
    ingredients: RecipeIngredient[];
    instructions: string[];
    notes?: string;
    sourceUrl?: string;
  }

  export interface UserPreferences {
    dietaryPreferences: string[];
    allergies: string[];
    mealPlanDays: number;
    autoAddPurchasedToInventory?: boolean;
  }

  // Enhanced User Profile Types
  export type DietaryRestriction =
    | 'vegetarian'
    | 'vegan'
    | 'pescatarian'
    | 'keto'
    | 'paleo'
    | 'gluten-free'
    | 'dairy-free'
    | 'nut-free'
    | 'low-carb'
    | 'low-sodium'
    | 'halal'
    | 'kosher'
    | 'none';

  export type ActivityLevel = 'sedentary' | 'lightly-active' | 'moderately-active' | 'very-active' | 'extremely-active';

  export type HealthGoal = 'lose-weight' | 'maintain-weight' | 'gain-weight' | 'custom';

  export type GoalDirection = 'lose' | 'maintain' | 'gain';

  export interface EnhancedUserProfile {
    id: string;
    email?: string;
    name?: string;

    // Dietary Preferences
    dietaryRestrictions: DietaryRestriction[];
    allergies: string[];
    dislikedFoods: string[];
    preferredCuisines: string[];

    // Cooking Preferences
    maxCookingTime?: number; // in minutes
    preferredMealTypes: string[];

    // Timestamps
    createdAt: string;
    updatedAt: string;
  }

  // Meal Planning Types
  export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

  export interface PlannedMeal {
    id: string;
    recipeId: string;
    date: string; // ISO date string (YYYY-MM-DD)
    mealType: MealType;
    servings: number;
    notes?: string;
    isCompleted: boolean;
    completedAt?: string;
  }

  export interface RecipeAvailability {
    recipeId: string;
    availableIngredients: number;
    totalIngredients: number;
    availabilityPercentage: number;
    missingIngredients: MealIngredient[];
    expiringIngredients: MealIngredient[];
  }

  export interface MealPlanSummary {
    date: string; // ISO date string (YYYY-MM-DD)
    meals: PlannedMeal[];
    missingIngredientsCount: number;
  }

  export interface WeeklyMealPlan {
    weekStartDate: string; // ISO date string (YYYY-MM-DD) - Monday of the week
    days: MealPlanSummary[];
    totalMissingIngredients: MealIngredient[];
  }

  // Recipe filtering and sorting types
  export type RecipeFilterType = 'all' | 'canMakeNow' | 'missingFew';

  export interface RecipeFilter {
    type: RecipeFilterType;
    searchQuery: string;
    tags: string[];
    maxMissingIngredients?: number;
  }

  export type RecipeSortType = 'relevance' | 'prepTime' | 'availability' | 'name';

  export type RecipeWithAvailability = (Recipe | Meal) & {
    availability: RecipeAvailability;
  };

  // Canonical recipe model used across Discover/Library/AI detail screens
  export type RecipeDetailMode = 'discover' | 'library' | 'ai';

  export type RecipeProviderType = 'tasty' | 'spoonacular' | 'custom' | 'unknown';

  export interface RecipeSource {
    providerType: RecipeProviderType;
    providerId?: string; // id from external provider if applicable
  }

  export interface CanonicalIngredient {
    name: string;
    amount?: number; // numeric amount if parsed
    unit?: string;   // standardized unit if parsed
    original?: string; // human readable fallback
    optional?: boolean;
  }

  export interface CanonicalRecipeNutritionPerServing {
    calories?: number; // kcal
    protein?: number;  // g
    carbs?: number;    // g
    fats?: number;     // g
    fiber?: number;    // g
    sugar?: number;    // g
    sodium?: number;   // mg
  }

  export interface CanonicalRecipe {
    id: string; // stable id within the app
    title: string;
    image?: string;
    description?: string;
    servings?: number;
    prepTimeMinutes?: number;
    cookTimeMinutes?: number;
    totalTimeMinutes?: number;
    ingredients: CanonicalIngredient[];
    steps: string[];
    nutritionPerServing?: CanonicalRecipeNutritionPerServing;
    source?: RecipeSource;
    sourceUrl?: string;
    tags?: string[];
  }

  // Nosh Chat Types
  export interface NoshChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
    recipeCard?: Meal;
    isProcessing?: boolean;
  }

  // Re-export onboarding types
  export * from './onboarding';
  export * from './cookbook';
