import { EnhancedUserProfile } from '../types';
import { InventoryItem } from '../types';

export interface UserAwareAIContext {
  profile: EnhancedUserProfile | null;
  inventory: InventoryItem[];
  availableRecipes?: any[];
}

export const createUserAwareSystemPrompt = (
  profile: EnhancedUserProfile | null,
  inventory: InventoryItem[],
  availableRecipes: any[] = []
): string => {
  let prompt = `You are NutriAI, a helpful cooking and nutrition assistant. You have access to the user's inventory and available recipes.`;

  // Add user profile context
  if (profile) {
    prompt += `\n\nUSER PROFILE:`;
    
    if (profile.name) {
      prompt += `\n- Name: ${profile.name}`;
    }
    
    if (profile.age || profile.height || profile.weight || profile.activityLevel) {
      prompt += `\n- Physical: `;
      const physical = [];
      if (profile.age) physical.push(`${profile.age} years old`);
      if (profile.height) physical.push(`${profile.height}cm tall`);
      if (profile.weight) physical.push(`${profile.weight}kg`);
      if (profile.activityLevel) physical.push(`${profile.activityLevel} activity level`);
      prompt += physical.join(', ');
    }

    if (profile.healthGoals && profile.healthGoals.length > 0) {
      prompt += `\n- Health Goals: ${profile.healthGoals.join(', ')}`;
    }

    if (profile.dietaryRestrictions && profile.dietaryRestrictions.length > 0) {
      prompt += `\n- Dietary Restrictions: ${profile.dietaryRestrictions.join(', ')}`;
    }

    if (profile.allergies && profile.allergies.length > 0) {
      prompt += `\n- ALLERGIES (CRITICAL): ${profile.allergies.join(', ')} - Never suggest recipes containing these ingredients!`;
    }

    if (profile.dislikedFoods && profile.dislikedFoods.length > 0) {
      prompt += `\n- Dislikes: ${profile.dislikedFoods.join(', ')}`;
    }

    if (profile.preferredCuisines && profile.preferredCuisines.length > 0) {
      prompt += `\n- Preferred Cuisines: ${profile.preferredCuisines.join(', ')}`;
    }

    if (profile.cookingSkill) {
      prompt += `\n- Cooking Skill: ${profile.cookingSkill}`;
    }

    if (profile.maxCookingTime) {
      prompt += `\n- Max Cooking Time: ${profile.maxCookingTime} minutes`;
    }

    if (profile.dailyCalorieTarget || profile.dailyProteinTarget) {
      prompt += `\n- Daily Targets: `;
      const targets = [];
      if (profile.dailyCalorieTarget) targets.push(`${profile.dailyCalorieTarget} calories`);
      if (profile.dailyProteinTarget) targets.push(`${profile.dailyProteinTarget}g protein`);
      if (profile.dailyCarbTarget) targets.push(`${profile.dailyCarbTarget}g carbs`);
      if (profile.dailyFatTarget) targets.push(`${profile.dailyFatTarget}g fat`);
      prompt += targets.join(', ');
    }
  }

  // Add inventory context
  if (inventory.length > 0) {
    const inventoryList = inventory.map(item => `- ${item.name} (${item.category})`).join('\n');
    prompt += `\n\nUSER'S CURRENT INVENTORY:\n${inventoryList}`;
  }

  // Add available recipes context
  if (availableRecipes.length > 0) {
    const recipeList = availableRecipes.slice(0, 10).map(recipe => 
      `- ${recipe.title || recipe.name}: ${recipe.ingredients?.slice(0, 3).map((ing: any) => ing.name || ing).join(', ')}...`
    ).join('\n');
    prompt += `\n\nAVAILABLE RECIPES (sample):\n${recipeList}`;
  }

  prompt += `\n\nIMPORTANT GUIDELINES:
- Always consider the user's dietary restrictions and allergies when making suggestions
- Personalize advice based on their health goals and activity level
- Respect their cooking skill level and time constraints
- Suggest recipes that use available inventory items when possible
- Provide nutritional information relevant to their goals
- Be encouraging and supportive of their health journey
- If user has allergies, NEVER suggest ingredients they're allergic to`;

  return prompt;
};

export const filterRecipesByProfile = (recipes: any[], profile: EnhancedUserProfile | null): any[] => {
  if (!profile) return recipes;

  return recipes.filter(recipe => {
    // Filter by dietary restrictions
    if (profile.dietaryRestrictions.includes('vegetarian') && recipe.tags?.includes('meat')) {
      return false;
    }
    
    if (profile.dietaryRestrictions.includes('vegan') && (recipe.tags?.includes('meat') || recipe.tags?.includes('dairy'))) {
      return false;
    }

    // Filter by allergies
    if (profile.allergies.length > 0) {
      const recipeIngredients = recipe.ingredients?.map((ing: any) => 
        (ing.name || ing).toLowerCase()
      ) || [];
      
      for (const allergy of profile.allergies) {
        if (recipeIngredients.some((ingredient: string) => 
          ingredient.includes(allergy.toLowerCase())
        )) {
          return false;
        }
      }
    }

    // Filter by disliked foods
    if (profile.dislikedFoods.length > 0) {
      const recipeIngredients = recipe.ingredients?.map((ing: any) => 
        (ing.name || ing).toLowerCase()
      ) || [];
      
      for (const disliked of profile.dislikedFoods) {
        if (recipeIngredients.some((ingredient: string) => 
          ingredient.includes(disliked.toLowerCase())
        )) {
          return false;
        }
      }
    }

    // Filter by cooking time if specified
    if (profile.maxCookingTime && recipe.prepTime && recipe.cookTime) {
      const totalTime = (parseInt(recipe.prepTime) || 0) + (parseInt(recipe.cookTime) || 0);
      if (totalTime > profile.maxCookingTime) {
        return false;
      }
    }

    return true;
  });
};