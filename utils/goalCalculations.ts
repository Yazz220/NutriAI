import { UserBasics, UserGoals, GoalType, ActivityLevel } from '@/hooks/useUserProfile';
import { NutritionGoals } from '@/types';

/**
 * Activity level multipliers for TDEE calculation
 * Based on research-validated standards used by MyFitnessPal and nutrition professionals
 * Source: Mifflin-St Jeor equation validation studies
 */
export const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,    // Little to no exercise (desk job, minimal movement)
  light: 1.375,      // Light exercise 1-3 days/week
  moderate: 1.55,    // Moderate exercise 3-5 days/week
  active: 1.725,     // Hard exercise 6-7 days/week
  athlete: 1.9,      // Very hard exercise & physical job or 2x/day training
};

/**
 * Goal type calorie adjustments (daily deficit/surplus)
 * Research-backed approach for sustainable weight management
 * Based on 3500 calories = 1 lb fat and safe rate of change
 */
export const GOAL_ADJUSTMENTS: Record<GoalType, number> = {
  lose: -500,        // 1 lb/week loss (safe, sustainable deficit)
  maintain: 0,       // No adjustment
  gain: 350,         // ~0.7 lb/week gain (lean muscle building)
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
 * Calculate macro targets based on calorie goal and body weight
 * Uses evidence-based macro distribution aligned with MyFitnessPal and nutrition research
 * 
 * Research-backed distributions:
 * - Weight Loss: 40% carbs, 30% protein, 30% fat (muscle preservation)
 * - Muscle Gain: Higher protein (1.6-2.2g/kg bodyweight), 40% carbs, 30% fat
 * - Maintenance: 40% carbs, 30% protein, 30% fat (balanced)
 */
export function calculateMacroTargets(
  calorieGoal: number, 
  goalType: GoalType,
  bodyWeightKg?: number
): {
  protein: number;
  carbs: number;
  fats: number;
} {
  // Research-backed macro distributions (MyFitnessPal standard)
  const proteinPercent = 0.30;
  const fatPercent = 0.30;
  const carbPercent = 0.40;
  
  // Convert percentages to grams
  // Protein: 4 cal/g, Carbs: 4 cal/g, Fats: 9 cal/g
  let protein = Math.round((calorieGoal * proteinPercent) / 4);
  const carbs = Math.round((calorieGoal * carbPercent) / 4);
  const fats = Math.round((calorieGoal * fatPercent) / 9);
  
  // For muscle gain, ensure protein meets research recommendation (1.6-2.2g/kg)
  if (goalType === 'gain' && bodyWeightKg) {
    const minProtein = Math.round(bodyWeightKg * 1.6);
    const maxProtein = Math.round(bodyWeightKg * 2.2);
    
    // Adjust protein if below minimum recommendation
    if (protein < minProtein) {
      protein = minProtein;
    }
    // Cap at maximum recommendation for safety
    if (protein > maxProtein) {
      protein = maxProtein;
    }
  }
  
  // Validate macros are within safe bounds
  const validatedProtein = Math.max(
    GOAL_CONSTRAINTS.protein.min,
    Math.min(GOAL_CONSTRAINTS.protein.max, protein)
  );
  const validatedCarbs = Math.max(
    GOAL_CONSTRAINTS.carbs.min,
    Math.min(GOAL_CONSTRAINTS.carbs.max, carbs)
  );
  const validatedFats = Math.max(
    GOAL_CONSTRAINTS.fats.min,
    Math.min(GOAL_CONSTRAINTS.fats.max, fats)
  );
  
  return { 
    protein: validatedProtein, 
    carbs: validatedCarbs, 
    fats: validatedFats 
  };
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
  
  // Calculate macro targets (pass body weight for protein optimization)
  const macros = calculateMacroTargets(dailyCalories, goalType, basics.weightKg);
  
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