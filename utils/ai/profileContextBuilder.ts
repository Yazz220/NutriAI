/**
 * AI Profile Context Builder
 * 
 * Creates unified, safety-first context about user preferences for AI agents.
 * Prioritizes allergies, dietary restrictions, and health concerns.
 */

import { UserProfileState } from '@/hooks/useUserProfile';
import { HealthGoal } from '@/types/onboarding';

export interface AIProfileContext {
  // Safety-Critical (ALWAYS include)
  allergies: string[];
  dietaryRestriction: string | null;
  healthConcerns: string[];
  
  // Personalization
  preferredCuisines: string[];
  dislikedIngredients: string[];
  maxCookingTime?: number;
  preferredMealTypes?: string[];
  
  // Goals & Motivation
  healthGoal?: HealthGoal | null;
  customGoalMotivation?: string;
  goalType?: 'maintain' | 'lose' | 'gain';
  
  // Lifestyle
  activityLevel?: string;
  age?: number;
  sex?: 'male' | 'female' | 'other';
  name?: string;
}

/**
 * Build AI-safe profile context from user profile
 */
export function buildAIProfileContext(profile: UserProfileState | null): AIProfileContext {
  if (!profile) {
    return {
      allergies: [],
      dietaryRestriction: null,
      healthConcerns: [],
      preferredCuisines: [],
      dislikedIngredients: [],
    };
  }

  return {
    // Safety-critical fields
    allergies: profile.preferences?.allergies || [],
    dietaryRestriction: profile.preferences?.dietary || null,
    healthConcerns: [], // Will be populated from onboarding data when available
    
    // Personalization
    preferredCuisines: profile.preferences?.preferredCuisines || [],
    dislikedIngredients: profile.preferences?.dislikedIngredients || [],
    maxCookingTime: profile.preferences?.maxCookingTime,
    preferredMealTypes: profile.preferences?.preferredMealTypes || [],
    
    // Goals
    healthGoal: profile.goals?.healthGoalKey,
    customGoalMotivation: profile.goals?.customGoalMotivation,
    goalType: profile.goals?.goalType,
    
    // Lifestyle
    activityLevel: profile.goals?.activityLevel,
    age: profile.basics?.age,
    sex: profile.basics?.sex,
    name: profile.basics?.name,
  };
}

/**
 * Generate safety warnings section for AI prompts
 */
export function buildSafetyWarningsPrompt(context: AIProfileContext): string {
  const warnings: string[] = [];
  
  if (context.allergies.length > 0) {
    warnings.push(`🚨 CRITICAL: User is allergic to: ${context.allergies.join(', ')}`);
    warnings.push('   → NEVER recommend foods containing these allergens');
    warnings.push('   → Always check ingredients before suggesting recipes');
  }
  
  if (context.dietaryRestriction && context.dietaryRestriction !== 'none') {
    const restrictionDetails = getDietaryRestrictionDetails(context.dietaryRestriction);
    warnings.push(`🚨 DIETARY RESTRICTION: ${restrictionDetails.name}`);
    warnings.push(`   → ${restrictionDetails.description}`);
    warnings.push(`   → Excluded foods: ${restrictionDetails.excludedFoods.join(', ')}`);
  }
  
  if (context.healthConcerns.length > 0) {
    warnings.push(`⚠️  Health concerns: ${context.healthConcerns.join(', ')}`);
    warnings.push('   → Tailor recommendations to be safe for these conditions');
  }
  
  return warnings.length > 0 ? `CRITICAL SAFETY RULES:\n${warnings.join('\n')}` : '';
}

/**
 * Generate preferences section for AI prompts
 */
export function buildPreferencesPrompt(context: AIProfileContext): string {
  const prefs: string[] = [];
  
  if (context.name) {
    prefs.push(`User's name: ${context.name}`);
  }
  
  if (context.dislikedIngredients.length > 0) {
    prefs.push(`Foods user dislikes: ${context.dislikedIngredients.join(', ')} (avoid when possible)`);
  }
  
  if (context.preferredCuisines.length > 0) {
    prefs.push(`Favorite cuisines: ${context.preferredCuisines.join(', ')} (prioritize these)`);
  }
  
  if (context.maxCookingTime) {
    prefs.push(`Cooking time preference: ${context.maxCookingTime} minutes maximum`);
  }
  
  if (context.preferredMealTypes && context.preferredMealTypes.length > 0) {
    prefs.push(`Preferred meal types: ${context.preferredMealTypes.join(', ')}`);
  }
  
  return prefs.length > 0 ? `USER PREFERENCES:\n${prefs.map(p => `- ${p}`).join('\n')}` : '';
}

/**
 * Generate goals & motivation section for AI prompts
 */
export function buildGoalsPrompt(context: AIProfileContext): string {
  const goals: string[] = [];
  
  if (context.healthGoal) {
    goals.push(`Health goal: ${formatHealthGoal(context.healthGoal)}`);
  }
  
  if (context.customGoalMotivation) {
    goals.push(`Personal motivation: "${context.customGoalMotivation}"`);
    goals.push('   → Reference this to make encouragement more personal');
  }
  
  if (context.goalType) {
    goals.push(`Weight goal: ${context.goalType} weight`);
  }
  
  if (context.activityLevel) {
    goals.push(`Activity level: ${context.activityLevel}`);
  }
  
  return goals.length > 0 ? `USER'S HEALTH JOURNEY:\n${goals.map(g => `- ${g}`).join('\n')}` : '';
}

/**
 * Get detailed info about dietary restrictions
 */
function getDietaryRestrictionDetails(restriction: string): {
  name: string;
  description: string;
  excludedFoods: string[];
} {
  const details: Record<string, { name: string; description: string; excludedFoods: string[] }> = {
    vegan: {
      name: 'Vegan',
      description: 'No animal products whatsoever',
      excludedFoods: ['meat', 'poultry', 'fish', 'seafood', 'eggs', 'dairy', 'milk', 'cheese', 'butter', 'honey'],
    },
    vegetarian: {
      name: 'Vegetarian',
      description: 'No meat or fish, but dairy and eggs are okay',
      excludedFoods: ['meat', 'poultry', 'fish', 'seafood', 'gelatin'],
    },
    pescatarian: {
      name: 'Pescatarian',
      description: 'Fish and seafood okay, but no other meat',
      excludedFoods: ['meat', 'poultry', 'beef', 'pork', 'chicken'],
    },
    'gluten-free': {
      name: 'Gluten-Free',
      description: 'No wheat, barley, rye, or gluten-containing grains',
      excludedFoods: ['wheat', 'barley', 'rye', 'bread', 'pasta (regular)', 'flour (regular)'],
    },
    'dairy-free': {
      name: 'Dairy-Free',
      description: 'No milk or dairy products',
      excludedFoods: ['milk', 'cheese', 'butter', 'cream', 'yogurt', 'ice cream'],
    },
    'nut-free': {
      name: 'Nut-Free',
      description: 'No tree nuts or peanuts',
      excludedFoods: ['almonds', 'walnuts', 'cashews', 'peanuts', 'pecans', 'pistachios', 'hazelnuts'],
    },
    keto: {
      name: 'Keto',
      description: 'Very low carb (under 50g/day), high fat diet',
      excludedFoods: ['bread', 'pasta', 'rice', 'potatoes', 'sugar', 'most fruits'],
    },
    paleo: {
      name: 'Paleo',
      description: 'Whole foods only, no processed items',
      excludedFoods: ['grains', 'legumes', 'dairy', 'processed foods', 'refined sugar'],
    },
    halal: {
      name: 'Halal',
      description: 'Following Islamic dietary laws',
      excludedFoods: ['pork', 'alcohol', 'non-halal meat'],
    },
    kosher: {
      name: 'Kosher',
      description: 'Following Jewish dietary laws',
      excludedFoods: ['pork', 'shellfish', 'mixing meat and dairy'],
    },
    'low-carb': {
      name: 'Low-Carb',
      description: 'Reduced carbohydrate intake',
      excludedFoods: ['bread', 'pasta', 'rice', 'potatoes', 'sugar'],
    },
    'low-sodium': {
      name: 'Low-Sodium',
      description: 'Reduced salt intake',
      excludedFoods: ['processed foods', 'canned goods', 'salty snacks'],
    },
  };

  return details[restriction] || {
    name: restriction,
    description: `Following ${restriction} diet`,
    excludedFoods: [],
  };
}

/**
 * Format health goal for display
 */
function formatHealthGoal(goal: HealthGoal): string {
  const goalMap: Record<string, string> = {
    'lose-weight': 'Lose Weight',
    'gain-weight': 'Gain Weight',
    'maintain-weight': 'Maintain Current Weight',
    'custom': 'Custom Goal',
  };
  
  return goalMap[goal] || goal;
}

/**
 * Check if ingredient name contains any allergens
 */
export function containsAllergen(ingredientName: string, allergies: string[]): string | null {
  const lowerIngredient = ingredientName.toLowerCase();
  
  for (const allergen of allergies) {
    const lowerAllergen = allergen.toLowerCase();
    if (lowerIngredient.includes(lowerAllergen)) {
      return allergen;
    }
  }
  
  return null;
}

/**
 * Check if ingredient violates dietary restriction
 */
export function violatesDietaryRestriction(ingredientName: string, restriction: string | null): string | null {
  if (!restriction || restriction === 'none') return null;
  
  const details = getDietaryRestrictionDetails(restriction);
  const lowerIngredient = ingredientName.toLowerCase();
  
  for (const excluded of details.excludedFoods) {
    if (lowerIngredient.includes(excluded.toLowerCase())) {
      return excluded;
    }
  }
  
  return null;
}
