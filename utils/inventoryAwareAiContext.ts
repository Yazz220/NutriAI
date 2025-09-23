import { InventoryItem } from '@/types';
import { AiContext, InventoryItemCtx, ChatMessage } from '@/utils/aiClient';
import { calculateRecipeAvailability, getExpiringIngredientRecipes } from './inventoryRecipeMatching';

export interface InventoryAwareAiContext {
  inventory: {
    items: InventoryItemCtx[];
    expiringItems: InventoryItemCtx[];
    categories: Record<string, InventoryItemCtx[]>;
    totalItems: number;
    freshnessSummary: {
      fresh: number;
      aging: number;
      expiring: number;
      untracked: number;
    };
  };
  preferences: {
    dietaryRestrictions: string[];
    preferredCuisines: string[];
    timeConstraints: number; // minutes available for cooking
    avoidIngredients: string[];
  };
  recentActivity: {
    recentRecipes: string[];
    frequentIngredients: string[];
    cookingPatterns: CookingPattern[];
  };
  contextSummary: string;
}

export interface CookingPattern {
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  frequency: number; // times per week
  preferredTime: string; // e.g., "30 minutes"
  commonIngredients: string[];
}

export interface UserPreferences {
  dietaryRestrictions: string[];
  preferredCuisines: string[];
  timeConstraints: number;
  avoidIngredients: string[];
}

function mapInventoryToContext(inventory: InventoryItem[]): InventoryItemCtx[] {
  return inventory.map(item => ({
    id: item.id,
    name: item.name,
    quantity: item.quantity,
    unit: item.unit,
    category: item.category,
    expiryDate: item.expiryDate
  }));
}

function getFreshnessStatus(expiryDateStr?: string): 'fresh' | 'aging' | 'expiring' | 'untracked' {
  if (!expiryDateStr) return 'untracked';

  const now = new Date();
  const expiryDate = new Date(expiryDateStr);
  const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysUntilExpiry <= 1) return 'expiring';
  if (daysUntilExpiry <= 3) return 'aging';
  return 'fresh';
}

function categorizeInventory(inventory: InventoryItem[]): Record<string, InventoryItemCtx[]> {
  const categories: Record<string, InventoryItemCtx[]> = {};
  
  inventory.forEach(item => {
    const category = item.category || 'Other';
    if (!categories[category]) {
      categories[category] = [];
    }
    categories[category].push({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      category: item.category,
      expiryDate: item.expiryDate
    });
  });
  
  return categories;
}

function getExpiringItems(inventory: InventoryItem[]): InventoryItemCtx[] {
  const threeDaysFromNow = new Date();
  threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
  
  return inventory
    .filter(item => {
      if (!item.expiryDate) return false;
      const expiryDate = new Date(item.expiryDate);
      return expiryDate <= threeDaysFromNow;
    })
    .map(item => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      category: item.category,
      expiryDate: item.expiryDate
    }))
    .sort((a, b) => {
      // Sort by expiry date (soonest first)
      if (!a.expiryDate || !b.expiryDate) return 0;
      return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
    });
}

function getFreshnessSummary(inventory: InventoryItem[]) {
  const summary = {
    fresh: 0,
    aging: 0,
    expiring: 0,
    untracked: 0
  };
  
  inventory.forEach(item => {
    const status = getFreshnessStatus(item.expiryDate);
    summary[status]++;
  });
  
  return summary;
}

function generateContextSummary(inventory: InventoryItem[], preferences: UserPreferences): string {
  const totalItems = inventory.length;
  const expiringItems = getExpiringItems(inventory);
  const freshnessSummary = getFreshnessSummary(inventory);
  
  let summary = `You have ${totalItems} ingredients in your inventory. `;
  
  if (expiringItems.length > 0) {
    const urgentItems = expiringItems.filter(item => {
      if (!item.expiryDate) return false;
      const daysUntilExpiry = Math.ceil((new Date(item.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      return daysUntilExpiry <= 1;
    });
    
    if (urgentItems.length > 0) {
      summary += `URGENT: ${urgentItems.length} ingredient${urgentItems.length !== 1 ? 's' : ''} expiring today/tomorrow (${urgentItems.map(i => i.name).join(', ')}). `;
    }
    
    if (expiringItems.length > urgentItems.length) {
      const soonExpiring = expiringItems.length - urgentItems.length;
      summary += `${soonExpiring} more ingredient${soonExpiring !== 1 ? 's' : ''} expiring within 3 days. `;
    }
  }
  
  // Add dietary preferences
  if (preferences.dietaryRestrictions.length > 0) {
    summary += `Dietary restrictions: ${preferences.dietaryRestrictions.join(', ')}. `;
  }
  
  // Add time constraints
  if (preferences.timeConstraints > 0) {
    summary += `Available cooking time: ${preferences.timeConstraints} minutes. `;
  }
  
  // Add ingredient categories summary
  const categories = categorizeInventory(inventory);
  const categoryNames = Object.keys(categories).filter(cat => categories[cat].length > 0);
  if (categoryNames.length > 0) {
    summary += `Available categories: ${categoryNames.join(', ')}.`;
  }
  
  return summary;
}

export function buildInventoryAwareAiContext(
  inventory: InventoryItem[],
  preferences: UserPreferences = {
    dietaryRestrictions: [],
    preferredCuisines: [],
    timeConstraints: 30,
    avoidIngredients: []
  },
  recentRecipes: string[] = [],
  frequentIngredients: string[] = []
): InventoryAwareAiContext {
  const inventoryItems = mapInventoryToContext(inventory);
  const expiringItems = getExpiringItems(inventory);
  const categories = categorizeInventory(inventory);
  const freshnessSummary = getFreshnessSummary(inventory);
  const contextSummary = generateContextSummary(inventory, preferences);
  
  // Analyze cooking patterns (simplified for now)
  const cookingPatterns: CookingPattern[] = [
    {
      mealType: 'dinner',
      frequency: 5, // 5 times per week
      preferredTime: `${preferences.timeConstraints} minutes`,
      commonIngredients: frequentIngredients.slice(0, 5)
    }
  ];
  
  return {
    inventory: {
      items: inventoryItems,
      expiringItems,
      categories,
      totalItems: inventory.length,
      freshnessSummary
    },
    preferences,
    recentActivity: {
      recentRecipes,
      frequentIngredients,
      cookingPatterns
    },
    contextSummary
  };
}

export function buildInventoryAwareSystemPrompt(context: InventoryAwareAiContext): string {
  const { inventory, preferences, contextSummary } = context;
  
  let prompt = `You are Chef AI, an intelligent cooking assistant with access to the user's current ingredient inventory. Your goal is to suggest recipes that make the best use of available ingredients, especially those that are expiring soon.

CURRENT INVENTORY CONTEXT:
${contextSummary}

INVENTORY DETAILS:
`;

  // Add expiring ingredients with urgency
  if (inventory.expiringItems.length > 0) {
    prompt += `\nEXPIRING INGREDIENTS (USE FIRST):
`;
    inventory.expiringItems.forEach(item => {
      const daysUntilExpiry = item.expiryDate 
        ? Math.ceil((new Date(item.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
        : 0;
      prompt += `- ${item.name} (${item.quantity} ${item.unit}) - expires in ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? 's' : ''}\n`;
    });
  }

  // Add available ingredients by category
  prompt += `\nAVAILABLE INGREDIENTS BY CATEGORY:
`;
  Object.entries(inventory.categories).forEach(([category, items]) => {
    if (items.length > 0) {
      prompt += `\n${category}:
`;
      items.forEach(item => {
        prompt += `- ${item.name} (${item.quantity} ${item.unit})\n`;
      });
    }
  });

  // Add user preferences and constraints
  prompt += `\nUSER PREFERENCES:
- Available cooking time: ${preferences.timeConstraints} minutes
`;

  if (preferences.dietaryRestrictions.length > 0) {
    prompt += `- Dietary restrictions: ${preferences.dietaryRestrictions.join(', ')}\n`;
  }

  if (preferences.preferredCuisines.length > 0) {
    prompt += `- Preferred cuisines: ${preferences.preferredCuisines.join(', ')}\n`;
  }

  if (preferences.avoidIngredients.length > 0) {
    prompt += `- Ingredients to avoid: ${preferences.avoidIngredients.join(', ')}\n`;
  }

  prompt += `\nINSTRUCTIONS:
1. PRIORITIZE recipes that use expiring ingredients first
2. Suggest recipes that maximize the use of available ingredients
3. Clearly indicate which ingredients the user has vs. needs to buy
4. Respect dietary restrictions and time constraints
5. Adjust recipe complexity based on cooking skill level
6. When suggesting recipes, format your response as JSON with this structure:
{
  "type": "recipe_suggestions",
  "suggestions": [
    {
      "name": "Recipe Name",
      "description": "Brief description",
      "availableIngredients": ["ingredient1", "ingredient2"],
      "neededIngredients": ["ingredient3"],
      "cookingTime": 25,
      "difficulty": "easy|medium|hard",
      "reason": "Why this recipe is recommended",
      "urgency": "high|medium|low"
    }
  ],
  "inventoryTips": ["tip1", "tip2"],
  "shoppingList": ["item1", "item2"]
}

7. If no specific recipe request is made, proactively suggest 2-3 recipes based on expiring ingredients
8. Always be encouraging and helpful, focusing on reducing food waste and making cooking enjoyable
`;

  return prompt;
}

export function createInventoryAwareMessages(
  userMessage: string,
  context: InventoryAwareAiContext
): ChatMessage[] {
  const systemPrompt = buildInventoryAwareSystemPrompt(context);
  
  return [
    {
      role: 'system',
      content: systemPrompt
    },
    {
      role: 'user',
      content: userMessage
    }
  ];
}

// Utility function to extract recipe suggestions from AI response
export function parseRecipeSuggestions(aiResponse: string): any {
  try {
    // Try to extract JSON from the response
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (error) {
    console.warn('Failed to parse AI response as JSON:', error);
  }
  
  // Fallback to plain text response
  return {
    type: 'text_response',
    content: aiResponse
  };
}

// Utility function to get quick suggestion prompts based on inventory
export function getQuickSuggestionPrompts(inventory: InventoryItem[]): string[] {
  const expiringItems = getExpiringItems(inventory);
  const categories = categorizeInventory(inventory);
  
  const prompts: string[] = [];
  
  // Add expiring ingredient prompts
  if (expiringItems.length > 0) {
    const urgentItems = expiringItems.slice(0, 3);
    prompts.push(`Quick recipe using ${urgentItems.map(i => i.name).join(' and ')}`);
    prompts.push('What can I make with expiring ingredients?');
  }
  
  // Add category-based prompts
  if (categories['Produce']?.length > 0) {
    prompts.push('Fresh vegetable recipe');
  }
  
  if (categories['Meat']?.length > 0) {
    prompts.push('Protein-rich dinner');
  }
  
  if (categories['Pantry']?.length > 0) {
    prompts.push('Pantry staple meal');
  }
  
  // Add general prompts
  prompts.push('30-minute dinner with what I have');
  prompts.push('Healthy lunch ideas');
  prompts.push('Use up leftovers creatively');
  
  return prompts.slice(0, 6); // Limit to 6 suggestions
}