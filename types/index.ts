export interface InventoryItem {
    id: string;
    name: string;
    quantity: number;
    unit: string;
    category: ItemCategory;
    addedDate: string;
    expiryDate: string;
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
    imageUrl?: string;
    tags: string[];
    prepTime: number; // in minutes
    cookTime: number; // in minutes
    servings: number;
  }
  
  export interface MealIngredient {
    name: string;
    quantity: number;
    unit: string;
    optional: boolean;
  }
  
  export interface ShoppingListItem {
    id: string;
    name: string;
    quantity: number;
    unit: string;
    category: ItemCategory;
    checked: boolean;
    addedBy: "user" | "system" | "meal";
    mealId?: string;
  }
  
  export interface UserPreferences {
    dietaryPreferences: string[];
    allergies: string[];
    mealPlanDays: number;
  }