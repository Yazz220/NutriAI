/**
 * Context-Aware Quick Prompts
 * 
 * Generates smart, personalized quick action prompts based on:
 * - Time of day
 * - User's dietary restrictions & preferences
 * - Current nutrition progress
 * - Health goals
 */

import { AIProfileContext } from './profileContextBuilder';

export interface PromptContext {
  timeOfDay: 'morning' | 'afternoon' | 'evening';
  caloriesRemaining: number;
  proteinRemaining: number;
  userContext: AIProfileContext;
}

/**
 * Generate context-aware quick prompts for Nutrition Coach
 */
export function generateContextAwarePrompts(context: PromptContext): string[] {
  const prompts: string[] = [];
  const { timeOfDay, caloriesRemaining, proteinRemaining, userContext } = context;
  
  // Time-based meal prompts (respecting dietary restrictions)
  if (timeOfDay === 'morning') {
    prompts.push(generateBreakfastPrompt(userContext));
  } else if (timeOfDay === 'afternoon') {
    prompts.push(generateLunchPrompt(userContext));
  } else {
    prompts.push(generateDinnerPrompt(userContext));
  }
  
  // Nutrition-specific prompts
  if (proteinRemaining > 30) {
    prompts.push(generateProteinPrompt(userContext));
  }
  
  if (caloriesRemaining > 500) {
    prompts.push(generateHighCaloriePrompt(userContext, timeOfDay));
  } else if (caloriesRemaining < 200 && timeOfDay !== 'evening') {
    prompts.push("Light snack ideas to finish my day?");
  }
  
  // Cuisine-specific prompts
  if (userContext.preferredCuisines.length > 0) {
    const favCuisine = userContext.preferredCuisines[0];
    prompts.push(`Quick ${favCuisine} recipe idea?`);
  }
  
  // Goal-oriented prompts
  if (userContext.healthGoal) {
    prompts.push(generateGoalPrompt(userContext));
  }
  
  // General helpful prompts
  prompts.push("What should I meal prep this week?");
  prompts.push("Analyze my eating patterns");
  
  // Limit to 6 most relevant prompts
  return prompts.slice(0, 6);
}

/**
 * Generate breakfast prompt based on dietary restrictions
 */
function generateBreakfastPrompt(context: AIProfileContext): string {
  const restriction = context.dietaryRestriction;
  
  if (restriction === 'vegan') {
    return "Quick vegan breakfast under 30 min?";
  } else if (restriction === 'vegetarian') {
    return "Protein-rich vegetarian breakfast?";
  } else if (restriction === 'keto') {
    return "Low-carb keto breakfast ideas?";
  } else if (restriction === 'gluten-free') {
    return "Gluten-free breakfast options?";
  }
  
  return context.maxCookingTime 
    ? `Breakfast in ${context.maxCookingTime} minutes?`
    : "Quick breakfast ideas?";
}

/**
 * Generate lunch prompt based on preferences
 */
function generateLunchPrompt(context: AIProfileContext): string {
  const restriction = context.dietaryRestriction;
  const cuisine = context.preferredCuisines[0];
  
  if (restriction && cuisine) {
    return `${capitalizeFirst(restriction)} ${cuisine} lunch?`;
  } else if (restriction) {
    return `Healthy ${restriction} lunch ideas?`;
  } else if (cuisine) {
    return `Quick ${cuisine} lunch recipe?`;
  }
  
  return "Healthy lunch ideas?";
}

/**
 * Generate dinner prompt based on time constraints and diet
 */
function generateDinnerPrompt(context: AIProfileContext): string {
  const restriction = context.dietaryRestriction;
  const maxTime = context.maxCookingTime;
  
  if (restriction && maxTime) {
    return `${capitalizeFirst(restriction)} dinner in ${maxTime} min?`;
  } else if (maxTime && maxTime <= 30) {
    return `Quick ${maxTime}-minute dinner?`;
  } else if (restriction) {
    return `${capitalizeFirst(restriction)} dinner ideas?`;
  }
  
  return "What's for dinner tonight?";
}

/**
 * Generate protein-focused prompt
 */
function generateProteinPrompt(context: AIProfileContext): string {
  const restriction = context.dietaryRestriction;
  
  if (restriction === 'vegan') {
    return "High-protein vegan options?";
  } else if (restriction === 'vegetarian') {
    return "Vegetarian protein sources?";
  }
  
  return "I need more protein today";
}

/**
 * Generate high-calorie meal prompt
 */
function generateHighCaloriePrompt(context: AIProfileContext, timeOfDay: string): string {
  const restriction = context.dietaryRestriction;
  
  if (timeOfDay === 'evening' && restriction) {
    return `Filling ${restriction} dinner ideas?`;
  } else if (restriction) {
    return `Calorie-dense ${restriction} meals?`;
  }
  
  return "I'm still hungry, what can I eat?";
}

/**
 * Generate goal-specific prompt
 */
function generateGoalPrompt(context: AIProfileContext): string {
  const goal = context.healthGoal;
  
  if (goal === 'lose-weight') {
    return "Filling low-calorie meal ideas?";
  } else if (goal === 'gain-weight') {
    return "Calorie-dense healthy meals?";
  } else if (goal === 'maintain-weight') {
    return "Balanced meal suggestions?";
  }
  
  return "Help me reach my health goal";
}

/**
 * Generate recipe-specific context prompts
 */
export function generateRecipeQuickPrompts(
  recipe: { name: string; ingredients: Array<{ name: string }> },
  context: AIProfileContext
): string[] {
  const prompts: string[] = [];
  
  // Check for allergens
  const hasAllergens = recipe.ingredients.some(ing =>
    context.allergies.some(allergen =>
      ing.name.toLowerCase().includes(allergen.toLowerCase())
    )
  );
  
  if (hasAllergens) {
    prompts.push("What are safe substitutes for my allergies?");
  }
  
  // Standard recipe prompts
  prompts.push("Substitute missing ingredients");
  prompts.push("Scale to 1 serving");
  prompts.push("Give me step-by-step guidance");
  
  // Dietary adaptation
  if (context.dietaryRestriction && context.dietaryRestriction !== 'none') {
    prompts.push(`Make this ${context.dietaryRestriction}`);
  }
  
  // Time adaptation
  if (context.maxCookingTime) {
    prompts.push(`Can I make this in ${context.maxCookingTime} min?`);
  }
  
  return prompts.slice(0, 6);
}

/**
 * Helper to capitalize first letter
 */
function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
