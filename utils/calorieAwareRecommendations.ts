import { DailyProgress, WeeklyTrend } from '@/hooks/useNutrition';
import { Meal } from '@/types';

export interface CalorieRecommendation {
  type: 'meal_suggestion' | 'portion_adjustment' | 'goal_adjustment' | 'timing_suggestion' | 'macro_balance';
  priority: 'high' | 'medium' | 'low';
  title: string;
  message: string;
  actionable: boolean;
  suggestedMeals?: Meal[];
  suggestedPortion?: number;
  reasoning: string;
}

export interface RecommendationContext {
  dailyProgress: DailyProgress;
  weeklyTrends: WeeklyTrend[];
  availableMeals: Meal[];
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  currentMealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
}

/**
 * Generate calorie-aware recommendations based on current progress and context
 */
export function generateCalorieRecommendations(context: RecommendationContext): CalorieRecommendation[] {
  const { dailyProgress, weeklyTrends, availableMeals, timeOfDay, currentMealType } = context;
  const recommendations: CalorieRecommendation[] = [];
  
  const { calories, macros, status } = dailyProgress;
  const remainingCalories = calories.remaining;
  const caloriePercentage = calories.percentage;
  
  // High priority recommendations based on calorie status
  if (status === 'under' && remainingCalories > 500) {
    recommendations.push(generateUnderGoalRecommendation(remainingCalories, availableMeals, timeOfDay));
  } else if (status === 'over') {
    recommendations.push(generateOverGoalRecommendation(Math.abs(remainingCalories), timeOfDay));
  } else if (status === 'met') {
    recommendations.push(generateOnTrackRecommendation(caloriePercentage));
  }
  
  // Macro balance recommendations
  const macroRecommendations = generateMacroRecommendations(macros, remainingCalories, availableMeals);
  recommendations.push(...macroRecommendations);
  
  // Timing-based recommendations
  const timingRecommendations = generateTimingRecommendations(
    remainingCalories, 
    timeOfDay, 
    currentMealType,
    availableMeals
  );
  recommendations.push(...timingRecommendations);
  
  // Weekly trend-based recommendations
  if (weeklyTrends.length > 0) {
    const trendRecommendations = generateTrendRecommendations(weeklyTrends, dailyProgress);
    recommendations.push(...trendRecommendations);
  }
  
  // Sort by priority and return top recommendations
  return recommendations
    .sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    })
    .slice(0, 5); // Limit to top 5 recommendations
}

function generateUnderGoalRecommendation(
  remainingCalories: number, 
  availableMeals: Meal[], 
  timeOfDay: string
): CalorieRecommendation {
  const suitableMeals = availableMeals.filter(meal => {
    const mealCalories = meal.nutritionPerServing?.calories || 0;
    return mealCalories > 0 && mealCalories <= remainingCalories + 100; // Allow slight overage
  });
  
  const mealSuggestions = suitableMeals
    .sort((a, b) => {
      const aCalories = a.nutritionPerServing?.calories || 0;
      const bCalories = b.nutritionPerServing?.calories || 0;
      return Math.abs(aCalories - remainingCalories) - Math.abs(bCalories - remainingCalories);
    })
    .slice(0, 3);
  
  let message = `You have ${remainingCalories} calories remaining for today. `;
  
  if (timeOfDay === 'evening' || timeOfDay === 'night') {
    message += "Consider a nutritious dinner or healthy snack to meet your goal.";
  } else if (timeOfDay === 'afternoon') {
    message += "A balanced lunch and snack could help you reach your target.";
  } else {
    message += "Plan your remaining meals to include nutrient-dense options.";
  }
  
  return {
    type: 'meal_suggestion',
    priority: 'high',
    title: 'Calories Needed',
    message,
    actionable: true,
    suggestedMeals: mealSuggestions,
    reasoning: `User is ${remainingCalories} calories under their daily goal`,
  };
}

function generateOverGoalRecommendation(
  excessCalories: number, 
  timeOfDay: string
): CalorieRecommendation {
  let message = `You're ${excessCalories} calories over your daily goal. `;
  
  if (timeOfDay === 'morning' || timeOfDay === 'afternoon') {
    message += "Consider lighter options for your remaining meals today.";
  } else {
    message += "Focus on hydration and light activities for the rest of the day.";
  }
  
  return {
    type: 'portion_adjustment',
    priority: 'high',
    title: 'Over Daily Goal',
    message,
    actionable: true,
    reasoning: `User has exceeded daily calorie goal by ${excessCalories} calories`,
  };
}

function generateOnTrackRecommendation(caloriePercentage: number): CalorieRecommendation {
  const percentage = Math.round(caloriePercentage * 100);
  
  return {
    type: 'goal_adjustment',
    priority: 'low',
    title: 'Great Progress!',
    message: `You're at ${percentage}% of your daily calorie goal. Keep up the excellent work with balanced nutrition!`,
    actionable: false,
    reasoning: 'User is meeting their calorie goals consistently',
  };
}

function generateMacroRecommendations(
  macros: DailyProgress['macros'],
  remainingCalories: number,
  availableMeals: Meal[]
): CalorieRecommendation[] {
  const recommendations: CalorieRecommendation[] = [];
  
  // Check for macro imbalances
  const proteinPercentage = macros.protein.percentage;
  const carbsPercentage = macros.carbs.percentage;
  const fatsPercentage = macros.fats.percentage;
  
  if (proteinPercentage < 0.7 && remainingCalories > 100) {
    const proteinNeeded = Math.round(macros.protein.goal - macros.protein.consumed);
    const proteinMeals = availableMeals.filter(meal => 
      (meal.nutritionPerServing?.protein || 0) >= 15
    ).slice(0, 2);
    
    recommendations.push({
      type: 'macro_balance',
      priority: 'medium',
      title: 'Protein Boost Needed',
      message: `You need ${proteinNeeded}g more protein today. Consider adding lean protein sources.`,
      actionable: true,
      suggestedMeals: proteinMeals,
      reasoning: `Protein intake is at ${Math.round(proteinPercentage * 100)}% of goal`,
    });
  }
  
  if (carbsPercentage < 0.6 && remainingCalories > 150) {
    recommendations.push({
      type: 'macro_balance',
      priority: 'medium',
      title: 'Energy from Carbs',
      message: 'Your carb intake is low. Consider adding healthy carbs like fruits, whole grains, or vegetables.',
      actionable: true,
      reasoning: `Carb intake is at ${Math.round(carbsPercentage * 100)}% of goal`,
    });
  }
  
  return recommendations;
}

function generateTimingRecommendations(
  remainingCalories: number,
  timeOfDay: string,
  currentMealType: string | undefined,
  availableMeals: Meal[]
): CalorieRecommendation[] {
  const recommendations: CalorieRecommendation[] = [];
  
  if (timeOfDay === 'evening' && remainingCalories > 300) {
    const dinnerMeals = availableMeals.filter(meal => {
      const calories = meal.nutritionPerServing?.calories || 0;
      return calories >= 300 && calories <= remainingCalories + 50;
    }).slice(0, 2);
    
    recommendations.push({
      type: 'timing_suggestion',
      priority: 'medium',
      title: 'Dinner Planning',
      message: `Plan a satisfying dinner with your remaining ${remainingCalories} calories.`,
      actionable: true,
      suggestedMeals: dinnerMeals,
      reasoning: 'Evening timing with significant calories remaining',
    });
  }
  
  if (timeOfDay === 'afternoon' && remainingCalories < 200) {
    recommendations.push({
      type: 'timing_suggestion',
      priority: 'medium',
      title: 'Light Evening Ahead',
      message: 'You have limited calories left. Plan a light dinner or healthy snack.',
      actionable: true,
      reasoning: 'Afternoon with low remaining calories',
    });
  }
  
  return recommendations;
}

function generateTrendRecommendations(
  weeklyTrends: WeeklyTrend[],
  dailyProgress: DailyProgress
): CalorieRecommendation[] {
  const recommendations: CalorieRecommendation[] = [];
  const latestTrend = weeklyTrends[0];
  
  if (latestTrend.goalAdherence < 50) {
    recommendations.push({
      type: 'goal_adjustment',
      priority: 'medium',
      title: 'Goal Adherence Low',
      message: `Your goal adherence is ${latestTrend.goalAdherence}%. Consider adjusting your daily calorie target or meal planning strategy.`,
      actionable: true,
      reasoning: 'Consistently missing calorie goals over the past week',
    });
  }
  
  if (weeklyTrends.length >= 2) {
    const previousTrend = weeklyTrends[1];
    const calorieChange = latestTrend.averageCalories - previousTrend.averageCalories;
    
    if (Math.abs(calorieChange) > 200) {
      const direction = calorieChange > 0 ? 'increased' : 'decreased';
      recommendations.push({
        type: 'goal_adjustment',
        priority: 'low',
        title: 'Calorie Trend Change',
        message: `Your average daily calories have ${direction} by ${Math.abs(calorieChange)} compared to last week.`,
        actionable: false,
        reasoning: 'Significant change in weekly calorie average',
      });
    }
  }
  
  return recommendations;
}

/**
 * Generate meal suggestions based on calorie budget and preferences
 */
export function suggestMealsForCalorieBudget(
  calorieBudget: number,
  availableMeals: Meal[],
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack',
  preferences?: {
    maxPrep?: number; // max prep time in minutes
    dietary?: string[];
    excludeIngredients?: string[];
  }
): Meal[] {
  let filteredMeals = availableMeals.filter(meal => {
    const mealCalories = meal.nutritionPerServing?.calories || 0;
    
    // Filter by calorie budget (allow 20% variance)
    const calorieVariance = calorieBudget * 0.2;
    if (mealCalories < calorieBudget - calorieVariance || mealCalories > calorieBudget + calorieVariance) {
      return false;
    }
    
    // Filter by prep time if specified
    if (preferences?.maxPrep && meal.prepTime > preferences.maxPrep) {
      return false;
    }
    
    // Filter by dietary preferences
    if (preferences?.dietary) {
      const mealTags = meal.tags.map(tag => tag.toLowerCase());
      const hasRequiredDietary = preferences.dietary.some(diet => 
        mealTags.includes(diet.toLowerCase())
      );
      if (preferences.dietary.length > 0 && !hasRequiredDietary) {
        return false;
      }
    }
    
    // Exclude meals with unwanted ingredients
    if (preferences?.excludeIngredients) {
      const hasExcludedIngredient = meal.ingredients.some(ingredient =>
        preferences.excludeIngredients!.some(excluded =>
          ingredient.name.toLowerCase().includes(excluded.toLowerCase())
        )
      );
      if (hasExcludedIngredient) {
        return false;
      }
    }
    
    return true;
  });
  
  // Sort by how close the calories are to the budget
  filteredMeals.sort((a, b) => {
    const aCalories = a.nutritionPerServing?.calories || 0;
    const bCalories = b.nutritionPerServing?.calories || 0;
    return Math.abs(aCalories - calorieBudget) - Math.abs(bCalories - calorieBudget);
  });
  
  return filteredMeals.slice(0, 5); // Return top 5 matches
}

/**
 * Calculate optimal portion size to meet calorie target
 */
export function calculateOptimalPortion(
  meal: Meal,
  targetCalories: number
): { portion: number; actualCalories: number; recommendation: string } {
  const mealCalories = meal.nutritionPerServing?.calories || 0;
  
  if (mealCalories === 0) {
    return {
      portion: 1,
      actualCalories: 0,
      recommendation: 'Nutrition data not available for portion calculation',
    };
  }
  
  const optimalPortion = targetCalories / mealCalories;
  const roundedPortion = Math.round(optimalPortion * 4) / 4; // Round to nearest 0.25
  const actualCalories = Math.round(mealCalories * roundedPortion);
  
  let recommendation = '';
  if (roundedPortion < 0.5) {
    recommendation = 'Consider a smaller portion or different meal choice';
  } else if (roundedPortion > 2) {
    recommendation = 'Large portion needed - consider adding sides or choosing a higher-calorie meal';
  } else {
    recommendation = `${roundedPortion} serving${roundedPortion !== 1 ? 's' : ''} recommended`;
  }
  
  return {
    portion: roundedPortion,
    actualCalories,
    recommendation,
  };
}