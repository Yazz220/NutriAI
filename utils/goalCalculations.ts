import { UserBasics, UserGoals, GoalType, ActivityLevel } from '@/hooks/useUserProfile';
import { NutritionGoals } from '@/types';

/**
 * Activity level multipliers for TDEE calculation
 * Based on established fitness and nutrition standards
 */
export const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,    // Little to no exercise
  light: 1.375,      // Light exercise 1-3 days/week
  moderate: 1.55,    // Moderate exercise 3-5 days/week
  active: 1.725,     // Heavy exercise 6-7 days/week
  athlete: 1.9,      // Very heavy physical work or 2x/day training
};

/**
 * Goal type calorie adjustments (daily deficit/surplus)
 * Conservative approach for sustainable weight management
 */
export const GOAL_ADJUSTMENTS: Record<GoalType, number> = {
  lose: -500,        // 1 lb/week loss (3500 cal = 1 lb)
  maintain: 0,       // No adjustment
  gain: 300,         // ~0.6 lb/week gain (slower, cleaner bulk)
};

/**
 * Validation constraints for nutrition goals
 */
export const GOAL_CONSTRAINTS = {
  calories: { min: 1200, max: 4000 },
  protein: { min: 50, max: 300 },   // grams
  carbs: { min: 100, max: 500 },    // grams
  fats: { min: 30, max: 200 },      // grams
} as const;

/**
 * Calculate Basal Metabolic Rate using Mifflin-St Jeor equation
 * Most accurate for general population
 */
export function calculateBMR(basics: UserBasics): number | null {
  const { age, sex, heightCm, weightKg } = basics;
  
  // Validate required inputs
  if (!age || !sex || !heightCm || !weightKg) {
    return null;
  }
  
  // Validate reasonable ranges
  if (age < 10 || age > 120) return null;
  if (heightCm < 100 || heightCm > 250) return null;
  if (weightKg < 30 || weightKg > 300) return null;
  
  // Mifflin-St Jeor equation
  let bmr = (10 * weightKg) + (6.25 * heightCm) - (5 * age);
  
  if (sex === 'male') {
    bmr += 5;
  } else if (sex === 'female') {
    bmr -= 161;
  } else {
    // For 'other', use average of male/female
    bmr -= 78; // Average of +5 and -161
  }
  
  return Math.round(bmr);
}

/**
 * Calculate Total Daily Energy Expenditure
 */
export function calculateTDEE(bmr: number, activityLevel: ActivityLevel): number {
  const multiplier = ACTIVITY_MULTIPLIERS[activityLevel];
  return Math.round(bmr * multiplier);
}

/**
 * Calculate daily calorie goal based on TDEE and goal type
 */
export function calculateCalorieGoal(tdee: number, goalType: GoalType): number {
  const adjustment = GOAL_ADJUSTMENTS[goalType];
  const goal = tdee + adjustment;
  
  // Ensure goal stays within safe bounds
  return Math.max(
    GOAL_CONSTRAINTS.calories.min,
    Math.min(GOAL_CONSTRAINTS.calories.max, goal)
  );
}

/**
 * Calculate macro targets based on calorie goal
 * Uses evidence-based macro distribution
 */
export function calculateMacroTargets(calorieGoal: number, goalType: GoalType): {
  protein: number;
  carbs: number;
  fats: number;
} {
  let proteinPercent: number;
  let fatPercent: number;
  
  // Adjust macro ratios based on goal
  switch (goalType) {
    case 'lose':
      proteinPercent = 0.30; // Higher protein for muscle preservation
      fatPercent = 0.25;
      break;
    case 'gain':
      proteinPercent = 0.25; // Moderate protein for muscle building
      fatPercent = 0.30;     // Higher fats for calorie density
      break;
    case 'maintain':
    default:
      proteinPercent = 0.25; // Balanced approach
      fatPercent = 0.25;
      break;
  }
  
  const carbPercent = 1 - proteinPercent - fatPercent;
  
  // Convert percentages to grams
  // Protein: 4 cal/g, Carbs: 4 cal/g, Fats: 9 cal/g
  const protein = Math.round((calorieGoal * proteinPercent) / 4);
  const carbs = Math.round((calorieGoal * carbPercent) / 4);
  const fats = Math.round((calorieGoal * fatPercent) / 9);
  
  return { protein, carbs, fats };
}

/**
 * Calculate complete nutrition goals from user profile
 */
export function calculateNutritionGoals(
  basics: UserBasics,
  goals: UserGoals
): NutritionGoals | null {
  const { activityLevel = 'light', goalType = 'maintain' } = goals;
  
  // Calculate BMR
  const bmr = calculateBMR(basics);
  if (!bmr) return null;
  
  // Calculate TDEE
  const tdee = calculateTDEE(bmr, activityLevel);
  
  // Calculate calorie goal
  const dailyCalories = calculateCalorieGoal(tdee, goalType);
  
  // Calculate macro targets
  const macros = calculateMacroTargets(dailyCalories, goalType);
  
  return {
    dailyCalories,
    protein: macros.protein,
    carbs: macros.carbs,
    fats: macros.fats,
  };
}

/**
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate nutrition goals against constraints and best practices
 */
export function validateNutritionGoals(goals: Partial<NutritionGoals>): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Validate calories
  if (goals.dailyCalories !== undefined) {
    if (goals.dailyCalories < GOAL_CONSTRAINTS.calories.min) {
      errors.push(`Daily calories too low (minimum: ${GOAL_CONSTRAINTS.calories.min})`);
    }
    if (goals.dailyCalories > GOAL_CONSTRAINTS.calories.max) {
      errors.push(`Daily calories too high (maximum: ${GOAL_CONSTRAINTS.calories.max})`);
    }
    if (goals.dailyCalories < 1500) {
      warnings.push('Very low calorie goals may be difficult to sustain');
    }
  }
  
  // Validate protein
  if (goals.protein !== undefined) {
    if (goals.protein < GOAL_CONSTRAINTS.protein.min) {
      errors.push(`Protein target too low (minimum: ${GOAL_CONSTRAINTS.protein.min}g)`);
    }
    if (goals.protein > GOAL_CONSTRAINTS.protein.max) {
      errors.push(`Protein target too high (maximum: ${GOAL_CONSTRAINTS.protein.max}g)`);
    }
  }
  
  // Validate carbs
  if (goals.carbs !== undefined) {
    if (goals.carbs < GOAL_CONSTRAINTS.carbs.min) {
      warnings.push('Low carb intake may affect energy levels');
    }
    if (goals.carbs > GOAL_CONSTRAINTS.carbs.max) {
      warnings.push('Very high carb intake - ensure adequate protein and fats');
    }
  }
  
  // Validate fats
  if (goals.fats !== undefined) {
    if (goals.fats < GOAL_CONSTRAINTS.fats.min) {
      errors.push(`Fat target too low (minimum: ${GOAL_CONSTRAINTS.fats.min}g for hormone production)`);
    }
    if (goals.fats > GOAL_CONSTRAINTS.fats.max) {
      warnings.push('Very high fat intake - monitor overall calorie balance');
    }
  }
  
  // Cross-validation: macro calories vs total calories
  if (goals.dailyCalories && goals.protein && goals.carbs && goals.fats) {
    const macroCalories = (goals.protein * 4) + (goals.carbs * 4) + (goals.fats * 9);
    const difference = Math.abs(macroCalories - goals.dailyCalories);
    const tolerance = goals.dailyCalories * 0.05; // 5% tolerance
    
    if (difference > tolerance) {
      warnings.push(`Macro calories (${macroCalories}) don't match daily target (${goals.dailyCalories})`);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Get default nutrition goals for users without profile data
 */
export function getDefaultNutritionGoals(): NutritionGoals {
  return {
    dailyCalories: 2000,
    protein: 125,    // 25% of 2000 calories
    carbs: 250,      // 50% of 2000 calories  
    fats: 56,        // 25% of 2000 calories
  };
}

/**
 * Check if user profile has sufficient data for goal calculation
 */
export function canCalculateGoals(basics: UserBasics): boolean {
  return !!(basics.age && basics.sex && basics.heightCm && basics.weightKg);
}

/**
 * Get explanation text for goal calculations
 */
export function getGoalExplanation(
  basics: UserBasics,
  goals: UserGoals,
  calculatedGoals: NutritionGoals
): string {
  const { activityLevel = 'light', goalType = 'maintain' } = goals;
  const bmr = calculateBMR(basics);
  
  if (!bmr) return 'Unable to calculate - missing profile information';
  
  const tdee = calculateTDEE(bmr, activityLevel);
  const adjustment = GOAL_ADJUSTMENTS[goalType];
  
  let explanation = `Based on your profile:\n`;
  explanation += `• BMR: ${bmr} calories (basic metabolic needs)\n`;
  explanation += `• TDEE: ${tdee} calories (with ${activityLevel} activity)\n`;
  
  if (adjustment !== 0) {
    explanation += `• Goal adjustment: ${adjustment > 0 ? '+' : ''}${adjustment} calories (${goalType} weight)\n`;
  }
  
  explanation += `• Daily target: ${calculatedGoals.dailyCalories} calories`;
  
  return explanation;
}