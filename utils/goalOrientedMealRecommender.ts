import { NutritionGoals, MealType, Meal } from '@/types';
import { NutritionCoachAiContext } from './nutritionCoachAiContext';

export interface MealRecommendation {
  type: 'meal' | 'snack' | 'adjustment';
  name: string;
  description: string;
  nutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  };
  reasoning: string;
  urgency: 'high' | 'medium' | 'low';
  timeRelevant: boolean;
  recipeId?: string;
  portionGuidance?: string;
  ingredients?: string[];
  preparationTime?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
}

export interface MealRecommendationRequest {
  remainingTargets: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  };
  timeOfDay: 'morning' | 'afternoon' | 'evening';
  mealType?: MealType;
  preferences?: {
    dietaryRestrictions: string[];
    avoidIngredients: string[];
    preferredCuisines: string[];
    maxPrepTime?: number;
    difficulty?: 'easy' | 'medium' | 'hard';
  };
  context?: {
    recentMeals: string[];
    goalType: 'lose' | 'maintain' | 'gain';
    activityLevel: string;
  };
}

// Meal templates organized by macro focus and meal type
const MEAL_TEMPLATES = {
  'high-protein': {
    breakfast: [
      {
        name: 'Greek Yogurt Protein Bowl',
        baseCalories: 300,
        baseProtein: 25,
        baseCarbs: 20,
        baseFats: 8,
        ingredients: ['Greek yogurt', 'berries', 'nuts', 'protein powder'],
        prepTime: 5,
        difficulty: 'easy' as const,
        description: 'Creamy Greek yogurt topped with fresh berries and nuts'
      },
      {
        name: 'Veggie Scrambled Eggs',
        baseCalories: 250,
        baseProtein: 20,
        baseCarbs: 8,
        baseFats: 15,
        ingredients: ['eggs', 'spinach', 'bell peppers', 'cheese'],
        prepTime: 10,
        difficulty: 'easy' as const,
        description: 'Fluffy scrambled eggs with fresh vegetables'
      },
      {
        name: 'Protein Smoothie',
        baseCalories: 280,
        baseProtein: 30,
        baseCarbs: 25,
        baseFats: 6,
        ingredients: ['protein powder', 'banana', 'spinach', 'almond milk'],
        prepTime: 5,
        difficulty: 'easy' as const,
        description: 'Nutrient-packed smoothie with protein powder and greens'
      }
    ],
    lunch: [
      {
        name: 'Grilled Chicken Salad',
        baseCalories: 350,
        baseProtein: 35,
        baseCarbs: 15,
        baseFats: 12,
        ingredients: ['chicken breast', 'mixed greens', 'cherry tomatoes', 'olive oil'],
        prepTime: 15,
        difficulty: 'easy' as const,
        description: 'Fresh salad with lean grilled chicken breast'
      },
      {
        name: 'Tuna and White Bean Bowl',
        baseCalories: 320,
        baseProtein: 28,
        baseCarbs: 25,
        baseFats: 8,
        ingredients: ['canned tuna', 'white beans', 'cucumber', 'lemon'],
        prepTime: 8,
        difficulty: 'easy' as const,
        description: 'Protein-rich bowl with tuna and fiber-packed beans'
      }
    ],
    dinner: [
      {
        name: 'Baked Salmon with Vegetables',
        baseCalories: 400,
        baseProtein: 35,
        baseCarbs: 20,
        baseFats: 18,
        ingredients: ['salmon fillet', 'broccoli', 'sweet potato', 'olive oil'],
        prepTime: 25,
        difficulty: 'medium' as const,
        description: 'Omega-3 rich salmon with roasted vegetables'
      },
      {
        name: 'Lean Beef Stir-fry',
        baseCalories: 380,
        baseProtein: 32,
        baseCarbs: 25,
        baseFats: 15,
        ingredients: ['lean beef', 'mixed vegetables', 'brown rice', 'soy sauce'],
        prepTime: 20,
        difficulty: 'medium' as const,
        description: 'Quick stir-fry with lean protein and colorful vegetables'
      }
    ],
    snack: [
      {
        name: 'Cottage Cheese with Fruit',
        baseCalories: 150,
        baseProtein: 15,
        baseCarbs: 12,
        baseFats: 4,
        ingredients: ['cottage cheese', 'berries', 'almonds'],
        prepTime: 2,
        difficulty: 'easy' as const,
        description: 'High-protein snack with fresh fruit'
      }
    ]
  },
  'balanced': {
    breakfast: [
      {
        name: 'Overnight Oats',
        baseCalories: 320,
        baseProtein: 12,
        baseCarbs: 45,
        baseFats: 10,
        ingredients: ['oats', 'milk', 'chia seeds', 'banana'],
        prepTime: 5,
        difficulty: 'easy' as const,
        description: 'Creamy overnight oats with natural sweetness'
      },
      {
        name: 'Avocado Toast with Egg',
        baseCalories: 350,
        baseProtein: 15,
        baseCarbs: 30,
        baseFats: 18,
        ingredients: ['whole grain bread', 'avocado', 'egg', 'tomato'],
        prepTime: 8,
        difficulty: 'easy' as const,
        description: 'Nutritious toast topped with creamy avocado and protein'
      }
    ],
    lunch: [
      {
        name: 'Quinoa Buddha Bowl',
        baseCalories: 380,
        baseProtein: 16,
        baseCarbs: 50,
        baseFats: 12,
        ingredients: ['quinoa', 'chickpeas', 'roasted vegetables', 'tahini'],
        prepTime: 20,
        difficulty: 'medium' as const,
        description: 'Colorful bowl with complete protein and healthy fats'
      },
      {
        name: 'Turkey and Hummus Wrap',
        baseCalories: 340,
        baseProtein: 22,
        baseCarbs: 35,
        baseFats: 12,
        ingredients: ['whole wheat tortilla', 'turkey', 'hummus', 'vegetables'],
        prepTime: 5,
        difficulty: 'easy' as const,
        description: 'Satisfying wrap with lean protein and fiber'
      }
    ],
    dinner: [
      {
        name: 'Chicken and Rice Bowl',
        baseCalories: 420,
        baseProtein: 28,
        baseCarbs: 45,
        baseFats: 12,
        ingredients: ['chicken thigh', 'brown rice', 'steamed broccoli', 'sesame oil'],
        prepTime: 30,
        difficulty: 'medium' as const,
        description: 'Balanced meal with lean protein and complex carbs'
      }
    ],
    snack: [
      {
        name: 'Apple with Almond Butter',
        baseCalories: 180,
        baseProtein: 6,
        baseCarbs: 20,
        baseFats: 8,
        ingredients: ['apple', 'almond butter'],
        prepTime: 2,
        difficulty: 'easy' as const,
        description: 'Classic combination of fiber and healthy fats'
      }
    ]
  },
  'low-calorie': {
    breakfast: [
      {
        name: 'Veggie Egg White Scramble',
        baseCalories: 150,
        baseProtein: 18,
        baseCarbs: 8,
        baseFats: 3,
        ingredients: ['egg whites', 'spinach', 'mushrooms', 'bell peppers'],
        prepTime: 8,
        difficulty: 'easy' as const,
        description: 'Light and protein-rich breakfast with vegetables'
      }
    ],
    lunch: [
      {
        name: 'Large Garden Salad with Chicken',
        baseCalories: 250,
        baseProtein: 25,
        baseCarbs: 15,
        baseFats: 8,
        ingredients: ['mixed greens', 'grilled chicken', 'cucumber', 'light dressing'],
        prepTime: 10,
        difficulty: 'easy' as const,
        description: 'Filling salad with lean protein and lots of vegetables'
      }
    ],
    dinner: [
      {
        name: 'Zucchini Noodles with Turkey Meatballs',
        baseCalories: 280,
        baseProtein: 25,
        baseCarbs: 12,
        baseFats: 12,
        ingredients: ['zucchini', 'lean ground turkey', 'marinara sauce', 'herbs'],
        prepTime: 25,
        difficulty: 'medium' as const,
        description: 'Low-carb alternative with spiralized vegetables'
      }
    ],
    snack: [
      {
        name: 'Cucumber with Hummus',
        baseCalories: 80,
        baseProtein: 4,
        baseCarbs: 8,
        baseFats: 4,
        ingredients: ['cucumber', 'hummus'],
        prepTime: 2,
        difficulty: 'easy' as const,
        description: 'Refreshing and light snack with plant protein'
      }
    ]
  }
};

function determineRecommendationType(request: MealRecommendationRequest): 'high-protein' | 'balanced' | 'low-calorie' {
  const { remainingTargets, context } = request;
  const totalRemaining = remainingTargets.calories;
  
  // If protein needs are high relative to calories
  const proteinCaloriesNeeded = remainingTargets.protein * 4;
  const proteinRatio = proteinCaloriesNeeded / Math.max(totalRemaining, 1);
  
  if (proteinRatio > 0.4 || remainingTargets.protein > 20) {
    return 'high-protein';
  }
  
  // If calories are very low, suggest low-calorie options
  if (totalRemaining < 300 && context?.goalType === 'lose') {
    return 'low-calorie';
  }
  
  return 'balanced';
}

function getMealTypeForTimeOfDay(timeOfDay: 'morning' | 'afternoon' | 'evening', mealType?: MealType): MealType {
  if (mealType) return mealType;
  
  switch (timeOfDay) {
    case 'morning': return 'breakfast';
    case 'afternoon': return 'lunch';
    case 'evening': return 'dinner';
    default: return 'snack';
  }
}

function calculatePortionMultiplier(targetCalories: number, baseCalories: number): number {
  if (baseCalories === 0) return 1;
  const multiplier = targetCalories / baseCalories;
  return Math.max(0.5, Math.min(2.0, multiplier)); // Keep portions reasonable
}

function adjustNutritionForPortion(
  base: { calories: number; protein: number; carbs: number; fats: number },
  multiplier: number
) {
  return {
    calories: Math.round(base.calories * multiplier),
    protein: Math.round(base.protein * multiplier),
    carbs: Math.round(base.carbs * multiplier),
    fats: Math.round(base.fats * multiplier)
  };
}

function generatePortionGuidance(multiplier: number, baseIngredients: string[]): string {
  if (multiplier < 0.8) {
    return 'Use smaller portions than typical serving sizes';
  } else if (multiplier > 1.3) {
    return 'Use larger portions or add extra ingredients';
  } else {
    return 'Use standard serving sizes';
  }
}

function filterByDietaryRestrictions(
  templates: any[],
  restrictions: string[]
): any[] {
  if (restrictions.length === 0) return templates;
  
  return templates.filter(template => {
    const ingredients = template.ingredients.map((ing: string) => ing.toLowerCase());
    
    return !restrictions.some(restriction => {
      const restrictionLower = restriction.toLowerCase();
      
      // Common dietary restriction mappings
      if (restrictionLower.includes('vegetarian')) {
        return ingredients.some((ing: string) => 
          ing.includes('chicken') || ing.includes('beef') || 
          ing.includes('turkey') || ing.includes('salmon') || 
          ing.includes('tuna') || ing.includes('meat')
        );
      }
      
      if (restrictionLower.includes('vegan')) {
        return ingredients.some((ing: string) => 
          ing.includes('chicken') || ing.includes('beef') || 
          ing.includes('turkey') || ing.includes('salmon') || 
          ing.includes('tuna') || ing.includes('meat') ||
          ing.includes('egg') || ing.includes('cheese') || 
          ing.includes('yogurt') || ing.includes('milk')
        );
      }
      
      if (restrictionLower.includes('dairy')) {
        return ingredients.some((ing: string) => 
          ing.includes('cheese') || ing.includes('yogurt') || 
          ing.includes('milk') || ing.includes('cottage cheese')
        );
      }
      
      if (restrictionLower.includes('gluten')) {
        return ingredients.some((ing: string) => 
          ing.includes('bread') || ing.includes('oats') || 
          ing.includes('tortilla') || ing.includes('wheat')
        );
      }
      
      // Direct ingredient matching
      return ingredients.some((ing: string) => ing.toLowerCase().includes(restrictionLower));
    });
  });
}

export function generateMealRecommendations(request: MealRecommendationRequest): MealRecommendation[] {
  const recommendations: MealRecommendation[] = [];
  const recommendationType = determineRecommendationType(request);
  const mealType = getMealTypeForTimeOfDay(request.timeOfDay, request.mealType);
  
  // Get appropriate templates
  const templates = MEAL_TEMPLATES[recommendationType][mealType] || MEAL_TEMPLATES[recommendationType]['snack'];
  
  // Filter by dietary restrictions
  const filteredTemplates = filterByDietaryRestrictions(
    templates, 
    request.preferences?.dietaryRestrictions || []
  );
  
  // Generate recommendations from templates
  filteredTemplates.slice(0, 3).forEach((template, index) => {
    const targetCalories = Math.min(request.remainingTargets.calories, template.baseCalories * 1.5);
    const portionMultiplier = calculatePortionMultiplier(targetCalories, template.baseCalories);
    
    const adjustedNutrition = adjustNutritionForPortion({
      calories: template.baseCalories,
      protein: template.baseProtein,
      carbs: template.baseCarbs,
      fats: template.baseFats
    }, portionMultiplier);
    
    // Calculate how well this meets remaining targets
    const proteinMatch = Math.min(1, adjustedNutrition.protein / Math.max(request.remainingTargets.protein, 1));
    const calorieMatch = Math.min(1, adjustedNutrition.calories / Math.max(request.remainingTargets.calories, 1));
    
    let reasoning = `This ${mealType} provides ${adjustedNutrition.protein}g protein and ${adjustedNutrition.calories} calories. `;
    
    if (recommendationType === 'high-protein') {
      reasoning += `High in protein to help you reach your ${request.remainingTargets.protein}g protein target.`;
    } else if (recommendationType === 'low-calorie') {
      reasoning += `Light option that fits well within your remaining ${request.remainingTargets.calories} calories.`;
    } else {
      reasoning += `Balanced nutrition to support your goals while staying within your calorie target.`;
    }
    
    // Determine urgency based on time and targets
    let urgency: 'high' | 'medium' | 'low' = 'medium';
    if (request.remainingTargets.calories < 200 && adjustedNutrition.calories > 300) {
      urgency = 'low';
    } else if (request.remainingTargets.protein > 25 && adjustedNutrition.protein > 20) {
      urgency = 'high';
    }
    
    recommendations.push({
      type: mealType === 'snack' ? 'snack' : 'meal',
      name: template.name,
      description: template.description,
      nutrition: adjustedNutrition,
      reasoning,
      urgency,
      timeRelevant: true,
      ingredients: template.ingredients,
      preparationTime: template.prepTime,
      difficulty: template.difficulty,
      portionGuidance: generatePortionGuidance(portionMultiplier, template.ingredients)
    });
  });
  
  // Add adjustment recommendations if needed
  if (request.remainingTargets.calories < 100 && request.timeOfDay === 'evening') {
    recommendations.push({
      type: 'adjustment',
      name: 'Light Evening Option',
      description: 'Consider a small, protein-rich snack or herbal tea',
      nutrition: { calories: 50, protein: 5, carbs: 5, fats: 2 },
      reasoning: 'You\'re close to your calorie goal. A light option will help you stay on track.',
      urgency: 'medium',
      timeRelevant: true,
      ingredients: ['Greek yogurt', 'berries', 'herbal tea'],
      preparationTime: 2,
      difficulty: 'easy'
    });
  }
  
  return recommendations.sort((a, b) => {
    const urgencyOrder = { high: 3, medium: 2, low: 1 };
    return urgencyOrder[b.urgency] - urgencyOrder[a.urgency];
  });
}

export function generateQuickMealSuggestions(
  remainingTargets: { calories: number; protein: number; carbs: number; fats: number },
  timeOfDay: 'morning' | 'afternoon' | 'evening'
): string[] {
  const suggestions: string[] = [];
  
  if (remainingTargets.protein > 20) {
    suggestions.push(`Add ${Math.round(remainingTargets.protein)}g protein to your next meal`);
    suggestions.push('Consider a protein-rich snack');
  }
  
  if (remainingTargets.calories > 500) {
    suggestions.push('You have room for a substantial meal');
    if (timeOfDay === 'evening') {
      suggestions.push('Perfect time for a balanced dinner');
    }
  } else if (remainingTargets.calories < 200) {
    suggestions.push('Choose a light snack or small portion');
    suggestions.push('Focus on nutrient-dense options');
  }
  
  // Time-specific suggestions
  if (timeOfDay === 'morning') {
    suggestions.push('Start with a protein-rich breakfast');
  } else if (timeOfDay === 'afternoon') {
    suggestions.push('Consider a balanced lunch');
  } else {
    suggestions.push('End the day with a satisfying dinner');
  }
  
  return suggestions.slice(0, 4);
}

export function getMealRecommendationsForContext(context: NutritionCoachAiContext): MealRecommendation[] {
  const request: MealRecommendationRequest = {
    remainingTargets: context.remainingTargets,
    timeOfDay: context.remainingTargets.timeOfDay,
    preferences: {
      dietaryRestrictions: [], // Would come from user profile
      avoidIngredients: [],
      preferredCuisines: [],
      maxPrepTime: 30,
      difficulty: 'easy'
    },
    context: {
      recentMeals: context.eatingPatterns.recentMeals.map(m => m.customName || 'meal').slice(-5),
      goalType: context.userProfile.goals.goalType || 'maintain',
      activityLevel: context.userProfile.goals.activityLevel || 'light'
    }
  };
  
  return generateMealRecommendations(request);
}

// Utility function to format meal recommendations for AI responses
export function formatMealRecommendationsForAI(recommendations: MealRecommendation[]): string {
  if (recommendations.length === 0) {
    return 'I don\'t have specific meal recommendations right now, but I can help you make good choices based on your remaining targets.';
  }
  
  let formatted = 'Here are some meal suggestions based on your current nutrition targets:\n\n';
  
  recommendations.forEach((rec, index) => {
    formatted += `${index + 1}. **${rec.name}** (${rec.nutrition.calories} cal, ${rec.nutrition.protein}g protein)\n`;
    formatted += `   ${rec.description}\n`;
    formatted += `   ${rec.reasoning}\n`;
    if (rec.preparationTime) {
      formatted += `   ⏱️ ${rec.preparationTime} minutes • 🔧 ${rec.difficulty}\n`;
    }
    if (rec.portionGuidance) {
      formatted += `   📏 ${rec.portionGuidance}\n`;
    }
    formatted += '\n';
  });
  
  return formatted;
}