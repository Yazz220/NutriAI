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
  }

  export interface UserPreferences {
    dietaryPreferences: string[];
    allergies: string[];
    mealPlanDays: number;
    goals?: NutritionGoals;
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
    totalCalories?: number;
    totalProtein?: number;
    totalCarbs?: number;
    totalFats?: number;
    missingIngredientsCount: number;
  }

  export interface WeeklyMealPlan {
    weekStartDate: string; // ISO date string (YYYY-MM-DD) - Monday of the week
    days: MealPlanSummary[];
    totalMissingIngredients: MealIngredient[];
    weeklyNutritionSummary?: NutritionSummary;
  }

  export interface NutritionSummary {
    totalCalories: number;
    totalProtein: number;
    totalCarbs: number;
    totalFats: number;
    averageDailyCalories: number;
  }

  export interface NutritionGoals {
    dailyCalories: number;
    protein: number; // grams
    carbs: number;   // grams
    fats: number;    // grams
  }

  export interface LoggedMeal {
    id: string;
    date: string; // YYYY-MM-DD
    mealType: MealType;
    mealId?: string; // reference to Meal if logged from a recipe
    customName?: string;
    servings: number;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
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

  // Recipe Folders
  export interface RecipeFolder {
    id: string;
    name: string;
    recipeIds: string[]; // references Meal.id
    createdAt: string; // ISO datetime
    updatedAt: string; // ISO datetime
  }
  
  export type RecipeFolderMap = Record<string, RecipeFolder>;