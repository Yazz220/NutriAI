import { ItemCategory } from '@/types';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export const validateInventoryItem = (item: {
  name: string;
  category: ItemCategory;
  [key: string]: any;
}): ValidationResult => {
  const errors: string[] = [];

  if (!item.name || item.name.trim().length === 0) {
    errors.push('Item name is required');
  }

  if (item.name && item.name.trim().length > 50) {
    errors.push('Item name must be less than 50 characters');
  }

  if (!item.category) {
    errors.push('Category is required');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

export const validateMealPlan = (meal: {
  recipeId: string;
  date: string;
  servings: number;
}): ValidationResult => {
  const errors: string[] = [];

  if (!meal.recipeId) {
    errors.push('Recipe is required');
  }

  if (!meal.date) {
    errors.push('Date is required');
  }

  const selectedDate = new Date(meal.date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (selectedDate < today) {
    errors.push('Cannot plan meals for past dates');
  }

  if (!meal.servings || meal.servings <= 0) {
    errors.push('Servings must be greater than 0');
  }

  if (meal.servings > 20) {
    errors.push('Servings must be less than 20');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

export const sanitizeInput = (input: string): string => {
  return input.trim().replace(/[<>]/g, '');
};