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
    sourceUrl?: string;
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
    goals?: NutritionGoals;
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

  export type HealthGoal = 'weight-loss' | 'weight-gain' | 'muscle-gain' | 'maintenance' | 'general-health';

  export interface EnhancedUserProfile {
    id: string;
    email?: string;
    name?: string;
    
    // Personal Information
    age?: number;
    height?: number; // in cm
    weight?: number; // in kg
    gender?: 'male' | 'female' | 'other' | 'prefer-not-to-say';
    activityLevel?: ActivityLevel;
    
    // Dietary Preferences
    dietaryRestrictions: DietaryRestriction[];
    allergies: string[];
    dislikedFoods: string[];
    preferredCuisines: string[];
    
    // Health Goals
    healthGoals: HealthGoal[];
    targetWeight?: number;
    dailyCalorieTarget?: number;
    dailyProteinTarget?: number;
    dailyCarbTarget?: number;
    dailyFatTarget?: number;
    
    // Cooking Preferences
    cookingSkill?: CookingSkill;
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

  // Onboarding Types
  export enum OnboardingStep {
    WELCOME = 0,
    AUTH = 1,
    DIETARY_PREFERENCES = 2,
    COOKING_HABITS = 3,
    INVENTORY_KICKSTART = 4,
    AI_COACH_INTRO = 5,
    COMPLETION = 6,
  }

  export type AuthMethod = 'email' | 'google' | 'apple' | 'guest';
  export type CookingSkill = 'beginner' | 'intermediate' | 'advanced' | 'expert';
  export type CookingTime = '15min' | '30min' | '45min+';
  export type ShoppingFrequency = 'daily' | 'weekly' | 'biweekly';

  export interface OnboardingUserData {
    authMethod?: AuthMethod;
    dietaryPreferences?: string[];
    allergies?: string[];
    goals?: string[];
    cookingSkill?: CookingSkill;
    cookingTime?: CookingTime;
    shoppingFrequency?: ShoppingFrequency;
    initialInventory?: string[];
  }

  export interface OnboardingAnalytics {
    sessionId: string;
    startTime: Date;
    events: AnalyticsEvent[];
    completionRate: number;
    dropOffPoint?: number;
    timeSpentPerStep: Record<number, number>;
  }

  export interface AnalyticsEvent {
    type: 'step_viewed' | 'step_completed' | 'step_skipped' | 'option_selected' | 'error_occurred';
    step: OnboardingStep;
    timestamp: Date;
    data?: Record<string, any>;
  }

  export interface OnboardingState {
    currentStep: OnboardingStep;
    completedSteps: Set<OnboardingStep>;
    userData: OnboardingUserData;
    skippedSteps: Set<OnboardingStep>;
    startTime: Date;
    analytics: OnboardingAnalytics;
    isCompleted: boolean;
  }

  export interface OnboardingContextType {
    state: OnboardingState;
    updateUserData: (data: Partial<OnboardingUserData>) => void;
    nextStep: () => void;
    skipStep: () => void;
    goToStep: (step: OnboardingStep) => void;
    completeOnboarding: () => void;
    trackEvent: (event: Omit<AnalyticsEvent, 'timestamp'>) => void;
  }

  // Extended UserPreferences for onboarding
  export interface OnboardingUserPreferences extends UserPreferences {
    onboardingCompleted: boolean;
    onboardingVersion: string;
    completedAt?: Date;
    skippedSteps: OnboardingStep[];
    initialSetupSource: 'onboarding' | 'manual' | 'import';
  }

  // Inventory starter items for onboarding
  export interface StarterItem {
    id: string;
    name: string;
    category: ItemCategory;
    icon: string;
    commonUnit: string;
    defaultQuantity: number;
    popularity: number; // For sorting
  }

  // Multi-select chip component types
  export interface ChipOption {
    id: string;
    label: string;
    value: string;
    icon?: string;
    description?: string;
  }

  export interface MultiSelectChipsProps {
    options: ChipOption[];
    selectedValues: string[];
    onSelectionChange: (values: string[]) => void;
    maxSelections?: number;
    searchable?: boolean;
    placeholder?: string;
  }

  // Onboarding layout component types
  export interface OnboardingLayoutProps {
    children: React.ReactNode;
    title: string;
    subtitle?: string;
    showProgress?: boolean;
    showSkip?: boolean;
    onSkip?: () => void;
    skipWarning?: string;
    currentStep?: OnboardingStep;
    totalSteps?: number;
  }

  // Canonical recipe model used across Discover/Library/AI detail screens
  export type RecipeDetailMode = 'discover' | 'library' | 'ai';

  export type RecipeProviderType = 'mealdb' | 'tasty' | 'spoonacular' | 'custom' | 'unknown';

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