import { LoggedMeal, NutritionGoals, MealType } from '@/types';
import { DailyProgress, WeeklyTrend } from '@/hooks/useNutrition';
import { EatingPattern, ProgressTrend, CoachingInsight, NutritionCoachAiContext } from './nutritionCoachAiContext';

export interface ProgressAnalysisResult {
  eatingPatterns: EatingPattern[];
  adherenceScore: number;
  trends: ProgressTrend[];
  insights: CoachingInsight[];
  recommendations: AnalysisRecommendation[];
}

export interface AnalysisRecommendation {
  type: 'immediate' | 'daily' | 'weekly' | 'lifestyle';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  actionSteps: string[];
  expectedImpact: string;
  timeframe: string;
}

export interface MealTimingAnalysis {
  mealType: MealType;
  averageTime: number; // Hours since midnight
  consistency: number; // 0-1 scale
  optimalWindow: { start: number; end: number };
  deviation: number; // Average deviation from optimal
}

export interface MacroDistributionAnalysis {
  currentDistribution: {
    proteinPercent: number;
    carbsPercent: number;
    fatsPercent: number;
  };
  optimalDistribution: {
    proteinPercent: number;
    carbsPercent: number;
    fatsPercent: number;
  };
  deviations: {
    protein: number;
    carbs: number;
    fats: number;
  };
  recommendations: string[];
}

export interface ConsistencyAnalysis {
  dailyCalorieVariation: number; // Coefficient of variation
  weekdayVsWeekend: {
    weekdayAverage: number;
    weekendAverage: number;
    variance: number;
    significance: 'high' | 'medium' | 'low';
  };
  mealSkipping: {
    frequency: number;
    mostSkippedMeal: MealType;
    impact: string;
  };
}

// Core analysis functions
export function analyzeEatingPatterns(meals: LoggedMeal[], goals: NutritionGoals): EatingPattern[] {
  const patterns: EatingPattern[] = [];
  
  if (meals.length < 7) {
    return [{
      type: 'meal_frequency',
      description: 'Insufficient data for pattern analysis',
      frequency: 0,
      impact: 'neutral',
      suggestion: 'Log meals consistently for better insights',
      confidence: 0.1
    }];
  }

  // Analyze meal timing patterns
  const timingPatterns = analyzeMealTiming(meals);
  patterns.push(...timingPatterns);

  // Analyze calorie consistency
  const consistencyPatterns = analyzeCalorieConsistency(meals, goals);
  patterns.push(...consistencyPatterns);

  // Analyze macro distribution patterns
  const macroPatterns = analyzeMacroDistribution(meals, goals);
  patterns.push(...macroPatterns);

  // Analyze meal frequency patterns
  const frequencyPatterns = analyzeMealFrequency(meals);
  patterns.push(...frequencyPatterns);

  // Analyze weekend vs weekday patterns
  const weekendPatterns = analyzeWeekendVariance(meals);
  patterns.push(...weekendPatterns);

  return patterns.filter(p => p.confidence > 0.3); // Only return confident patterns
}

function analyzeMealTiming(meals: LoggedMeal[]): EatingPattern[] {
  const patterns: EatingPattern[] = [];
  const mealsByType = groupMealsByType(meals);

  Object.entries(mealsByType).forEach(([mealType, typeMeals]) => {
    if (typeMeals.length < 3) return; // Need at least 3 instances

    const analysis = analyzeMealTimingForType(typeMeals, mealType as MealType);
    
    if (analysis.consistency > 0.7) {
      patterns.push({
        type: 'meal_timing',
        description: `Consistent ${mealType} timing`,
        frequency: analysis.consistency,
        impact: 'positive',
        suggestion: `Great job maintaining regular ${mealType} schedule!`,
        confidence: analysis.consistency
      });
    } else if (analysis.consistency < 0.4) {
      patterns.push({
        type: 'meal_timing',
        description: `Irregular ${mealType} timing`,
        frequency: 1 - analysis.consistency,
        impact: 'concerning',
        suggestion: `Try eating ${mealType} at more consistent times to support your metabolism`,
        confidence: 1 - analysis.consistency
      });
    }
  });

  return patterns;
}

function analyzeCalorieConsistency(meals: LoggedMeal[], goals: NutritionGoals): EatingPattern[] {
  const patterns: EatingPattern[] = [];
  const dailyCalories = calculateDailyCalories(meals);
  
  if (dailyCalories.length < 5) return patterns;

  const consistency = calculateConsistencyScore(dailyCalories);
  const averageCalories = dailyCalories.reduce((sum, cal) => sum + cal, 0) / dailyCalories.length;
  const targetCalories = goals.dailyCalories;

  if (consistency > 0.8) {
    patterns.push({
      type: 'calorie_consistency',
      description: 'Very consistent daily calorie intake',
      frequency: consistency,
      impact: 'positive',
      suggestion: 'Excellent calorie consistency! This supports steady progress toward your goals.',
      confidence: consistency
    });
  } else if (consistency < 0.5) {
    const variation = calculateCoefficientOfVariation(dailyCalories);
    patterns.push({
      type: 'calorie_consistency',
      description: `High calorie variability (${Math.round(variation * 100)}% variation)`,
      frequency: 1 - consistency,
      impact: 'concerning',
      suggestion: 'Try meal planning to maintain more consistent daily calories for better results.',
      confidence: 1 - consistency
    });
  }

  // Analyze calorie accuracy vs goals
  const accuracyScore = 1 - Math.abs(averageCalories - targetCalories) / targetCalories;
  if (accuracyScore > 0.9) {
    patterns.push({
      type: 'calorie_consistency',
      description: 'Excellent calorie goal accuracy',
      frequency: accuracyScore,
      impact: 'positive',
      suggestion: 'You\'re hitting your calorie targets consistently - keep it up!',
      confidence: accuracyScore
    });
  } else if (accuracyScore < 0.7) {
    const deviation = averageCalories > targetCalories ? 'over' : 'under';
    const amount = Math.abs(averageCalories - targetCalories);
    patterns.push({
      type: 'calorie_consistency',
      description: `Consistently ${deviation} calorie target by ~${Math.round(amount)} calories`,
      frequency: 1 - accuracyScore,
      impact: 'concerning',
      suggestion: `Consider adjusting portion sizes to get closer to your ${targetCalories} calorie target.`,
      confidence: 1 - accuracyScore
    });
  }

  return patterns;
}

function analyzeMacroDistribution(meals: LoggedMeal[], goals: NutritionGoals): EatingPattern[] {
  const patterns: EatingPattern[] = [];
  const macroTotals = calculateMacroTotals(meals);
  
  if (macroTotals.totalCalories === 0) return patterns;

  const currentDistribution = {
    protein: (macroTotals.protein * 4) / macroTotals.totalCalories,
    carbs: (macroTotals.carbs * 4) / macroTotals.totalCalories,
    fats: (macroTotals.fats * 9) / macroTotals.totalCalories
  };

  const targetDistribution = {
    protein: (goals.protein * 4) / goals.dailyCalories,
    carbs: (goals.carbs * 4) / goals.dailyCalories,
    fats: (goals.fats * 9) / goals.dailyCalories
  };

  // Analyze protein distribution
  const proteinDeviation = Math.abs(currentDistribution.protein - targetDistribution.protein);
  if (proteinDeviation < 0.05) {
    patterns.push({
      type: 'macro_distribution',
      description: 'Excellent protein distribution',
      frequency: 1 - proteinDeviation * 10,
      impact: 'positive',
      suggestion: 'Your protein intake is well-balanced throughout your meals.',
      confidence: 0.8
    });
  } else if (currentDistribution.protein < targetDistribution.protein - 0.05) {
    patterns.push({
      type: 'macro_distribution',
      description: 'Low protein distribution',
      frequency: proteinDeviation * 10,
      impact: 'concerning',
      suggestion: 'Consider adding more protein-rich foods to your meals and snacks.',
      confidence: 0.8
    });
  }

  return patterns;
}

function analyzeMealFrequency(meals: LoggedMeal[]): EatingPattern[] {
  const patterns: EatingPattern[] = [];
  const dailyMealCounts = calculateDailyMealCounts(meals);
  
  if (dailyMealCounts.length < 5) return patterns;

  const averageMealsPerDay = dailyMealCounts.reduce((sum, count) => sum + count, 0) / dailyMealCounts.length;
  const consistency = calculateConsistencyScore(dailyMealCounts);

  if (averageMealsPerDay < 2.5) {
    patterns.push({
      type: 'meal_frequency',
      description: 'Low meal frequency (skipping meals)',
      frequency: 1 - (averageMealsPerDay / 3),
      impact: 'concerning',
      suggestion: 'Try to eat regular meals to maintain steady energy and metabolism.',
      confidence: 0.7
    });
  } else if (averageMealsPerDay > 5) {
    patterns.push({
      type: 'meal_frequency',
      description: 'High meal frequency (frequent eating)',
      frequency: (averageMealsPerDay - 3) / 3,
      impact: 'neutral',
      suggestion: 'Frequent meals can work well if they help you meet your goals consistently.',
      confidence: 0.6
    });
  }

  if (consistency > 0.8) {
    patterns.push({
      type: 'meal_frequency',
      description: 'Consistent meal frequency',
      frequency: consistency,
      impact: 'positive',
      suggestion: 'Great job maintaining a consistent eating schedule!',
      confidence: consistency
    });
  }

  return patterns;
}

function analyzeWeekendVariance(meals: LoggedMeal[]): EatingPattern[] {
  const patterns: EatingPattern[] = [];
  const { weekdayCalories, weekendCalories } = separateWeekdayWeekend(meals);
  
  if (weekdayCalories.length < 3 || weekendCalories.length < 2) return patterns;

  const weekdayAvg = weekdayCalories.reduce((sum, cal) => sum + cal, 0) / weekdayCalories.length;
  const weekendAvg = weekendCalories.reduce((sum, cal) => sum + cal, 0) / weekendCalories.length;
  const variance = Math.abs(weekendAvg - weekdayAvg) / weekdayAvg;

  if (variance > 0.2) {
    const direction = weekendAvg > weekdayAvg ? 'higher' : 'lower';
    patterns.push({
      type: 'weekend_variance',
      description: `Significant weekend variance (${Math.round(variance * 100)}% ${direction})`,
      frequency: variance,
      impact: variance > 0.3 ? 'concerning' : 'neutral',
      suggestion: `Try to maintain more consistent eating patterns on weekends for better overall progress.`,
      confidence: Math.min(variance * 2, 0.9)
    });
  } else {
    patterns.push({
      type: 'weekend_variance',
      description: 'Consistent weekday/weekend eating',
      frequency: 1 - variance,
      impact: 'positive',
      suggestion: 'Excellent consistency between weekdays and weekends!',
      confidence: 1 - variance
    });
  }

  return patterns;
}

// Utility functions
function groupMealsByType(meals: LoggedMeal[]): Record<MealType, LoggedMeal[]> {
  return meals.reduce((acc, meal) => {
    if (!acc[meal.mealType]) acc[meal.mealType] = [];
    acc[meal.mealType].push(meal);
    return acc;
  }, {} as Record<MealType, LoggedMeal[]>);
}

function analyzeMealTimingForType(meals: LoggedMeal[], mealType: MealType): MealTimingAnalysis {
  // Mock implementation - in real app, would analyze actual timestamps
  const optimalWindows = {
    breakfast: { start: 6, end: 10 },
    lunch: { start: 11, end: 14 },
    dinner: { start: 17, end: 20 },
    snack: { start: 14, end: 16 }
  };

  return {
    mealType,
    averageTime: optimalWindows[mealType]?.start + 1 || 12,
    consistency: 0.7, // Mock value
    optimalWindow: optimalWindows[mealType] || { start: 12, end: 13 },
    deviation: 0.5 // Mock value
  };
}

function calculateDailyCalories(meals: LoggedMeal[]): number[] {
  const dailyTotals = new Map<string, number>();
  
  meals.forEach(meal => {
    const existing = dailyTotals.get(meal.date) || 0;
    dailyTotals.set(meal.date, existing + meal.calories);
  });
  
  return Array.from(dailyTotals.values());
}

function calculateConsistencyScore(values: number[]): number {
  if (values.length < 2) return 1;
  
  const coefficientOfVariation = calculateCoefficientOfVariation(values);
  return Math.max(0, 1 - coefficientOfVariation);
}

function calculateCoefficientOfVariation(values: number[]): number {
  if (values.length < 2) return 0;
  
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  const standardDeviation = Math.sqrt(variance);
  
  return mean > 0 ? standardDeviation / mean : 0;
}

function calculateMacroTotals(meals: LoggedMeal[]): { protein: number; carbs: number; fats: number; totalCalories: number } {
  return meals.reduce((totals, meal) => ({
    protein: totals.protein + meal.protein,
    carbs: totals.carbs + meal.carbs,
    fats: totals.fats + meal.fats,
    totalCalories: totals.totalCalories + meal.calories
  }), { protein: 0, carbs: 0, fats: 0, totalCalories: 0 });
}

function calculateDailyMealCounts(meals: LoggedMeal[]): number[] {
  const dailyCounts = new Map<string, number>();
  
  meals.forEach(meal => {
    const existing = dailyCounts.get(meal.date) || 0;
    dailyCounts.set(meal.date, existing + 1);
  });
  
  return Array.from(dailyCounts.values());
}

function separateWeekdayWeekend(meals: LoggedMeal[]): { weekdayCalories: number[]; weekendCalories: number[] } {
  const weekdayTotals = new Map<string, number>();
  const weekendTotals = new Map<string, number>();
  
  meals.forEach(meal => {
    const date = new Date(meal.date);
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    
    const targetMap = isWeekend ? weekendTotals : weekdayTotals;
    const existing = targetMap.get(meal.date) || 0;
    targetMap.set(meal.date, existing + meal.calories);
  });
  
  return {
    weekdayCalories: Array.from(weekdayTotals.values()),
    weekendCalories: Array.from(weekendTotals.values())
  };
}

// Advanced analysis functions
export function calculateGoalAdherenceScore(dailyProgress: DailyProgress[], goals: NutritionGoals): number {
  if (dailyProgress.length === 0) return 0;
  
  const adherentDays = dailyProgress.filter(day => {
    const calorieAdherence = day.calories.percentage >= 0.8 && day.calories.percentage <= 1.2;
    const proteinAdherence = day.macros.protein.percentage >= 0.8;
    const overallBalance = Math.abs(day.calories.percentage - 1) < 0.2;
    
    return calorieAdherence && proteinAdherence && overallBalance;
  }).length;
  
  return adherentDays / dailyProgress.length;
}

export function identifyProgressTrends(weeklyData: WeeklyTrend[], dailyData: DailyProgress[]): ProgressTrend[] {
  const trends: ProgressTrend[] = [];
  
  if (weeklyData.length < 2) return trends;
  
  const recent = weeklyData[weeklyData.length - 1];
  const previous = weeklyData[weeklyData.length - 2];
  
  // Analyze each metric
  const metrics = [
    { key: 'averageCalories', name: 'calories' },
    { key: 'goalAdherence', name: 'adherence' }
  ] as const;
  
  metrics.forEach(({ key, name }) => {
    const recentValue = recent[key];
    const previousValue = previous[key];
    
    if (previousValue > 0) {
      const change = ((recentValue - previousValue) / previousValue) * 100;
      const magnitude = Math.abs(change);
      
      if (magnitude > 5) {
        trends.push({
          metric: name as any,
          direction: change > 0 ? 'improving' : 'declining',
          magnitude,
          timeframe: 'week',
          significance: magnitude > 20 ? 'high' : magnitude > 10 ? 'medium' : 'low',
          description: `${name.charAt(0).toUpperCase() + name.slice(1)} ${change > 0 ? 'increased' : 'decreased'} by ${Math.round(magnitude)}% this week`
        });
      }
    }
  });
  
  return trends;
}

export function generateCoachingInsights(context: NutritionCoachAiContext): CoachingInsight[] {
  const insights: CoachingInsight[] = [];
  const { currentProgress, remainingTargets, eatingPatterns } = context;
  
  // Advanced daily progress analysis
  insights.push(...analyzeDailyProgressAdvanced(context));
  
  // Advanced weekly pattern analysis
  insights.push(...analyzeWeeklyPatternsAdvanced(context));
  
  // Macro balance and timing insights
  insights.push(...analyzeMacroBalanceInsights(context));
  
  // Behavioral pattern insights
  insights.push(...analyzeBehavioralPatterns(context));
  
  // Predictive insights based on trends
  insights.push(...generatePredictiveInsights(context));
  
  // Legacy insights for compatibility
  insights.push(...generateLegacyInsights(context));
  
  return insights
    .sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      
      // Secondary sort by confidence if available
      const aConfidence = (a as any).confidence || 0.5;
      const bConfidence = (b as any).confidence || 0.5;
      return bConfidence - aConfidence;
    })
    .slice(0, 8); // Return top 8 insights
}

function analyzeDailyProgressAdvanced(context: NutritionCoachAiContext): CoachingInsight[] {
  const insights: CoachingInsight[] = [];
  const { currentProgress, remainingTargets, userProfile } = context;
  const today = currentProgress.today;
  
  // Precision tracking analysis
  const calorieAccuracy = Math.abs(today.calories.percentage - 1.0);
  if (calorieAccuracy < 0.05) {
    insights.push({
      type: 'celebration',
      priority: 'high',
      message: 'Incredible precision! You\'re within 5% of your calorie target - this level of accuracy drives excellent results.',
      actionable: false,
      timeframe: 'immediate',
      relatedGoal: 'dailyCalories'
    });
  }
  
  // Protein timing optimization
  const proteinDeficit = remainingTargets.protein;
  const timeOfDay = remainingTargets.timeOfDay;
  
  if (proteinDeficit > 20 && timeOfDay === 'evening') {
    insights.push({
      type: 'suggestion',
      priority: 'high',
      message: `You need ${Math.round(proteinDeficit)}g more protein today. Evening protein intake is crucial for overnight muscle recovery.`,
      actionable: true,
      relatedGoal: 'protein',
      timeframe: 'today'
    });
  } else if (proteinDeficit < 5 && timeOfDay !== 'evening') {
    insights.push({
      type: 'encouragement',
      priority: 'medium',
      message: 'Excellent protein pacing! You\'re ahead of schedule, which helps with satiety throughout the day.',
      actionable: false,
      relatedGoal: 'protein',
      timeframe: 'today'
    });
  }
  
  // Calorie distribution analysis
  const remainingCalorieRatio = remainingTargets.calories / userProfile.calculatedGoals.dailyCalories;
  if (remainingCalorieRatio > 0.4 && timeOfDay === 'evening') {
    insights.push({
      type: 'suggestion',
      priority: 'medium',
      message: 'You have a large portion of calories remaining. Consider spreading meals more evenly for better energy levels.',
      actionable: true,
      relatedGoal: 'dailyCalories',
      timeframe: 'today'
    });
  }
  
  return insights;
}

function analyzeWeeklyPatternsAdvanced(context: NutritionCoachAiContext): CoachingInsight[] {
  const insights: CoachingInsight[] = [];
  const { currentProgress } = context;
  
  const adherenceScore = currentProgress.adherenceScore || 0;
  
  // Exceptional consistency recognition
  if (adherenceScore > 0.9) {
    insights.push({
      type: 'celebration',
      priority: 'high',
      message: `Outstanding! You've maintained ${Math.round(adherenceScore * 100)}% adherence. You're building sustainable habits!`,
      actionable: false,
      timeframe: 'week'
    });
  } else if (adherenceScore > 0.8) {
    insights.push({
      type: 'encouragement',
      priority: 'medium',
      message: `Great consistency at ${Math.round(adherenceScore * 100)}% adherence. You're on the right track!`,
      actionable: false,
      timeframe: 'week'
    });
  } else if (adherenceScore < 0.6) {
    insights.push({
      type: 'encouragement',
      priority: 'high',
      message: `Your adherence is ${Math.round(adherenceScore * 100)}%. Remember, progress isn't about perfection - every healthy choice counts!`,
      actionable: true,
      timeframe: 'week'
    });
  }
  
  // Weekend variance analysis (placeholder - would need actual data)
  const weekendVariance = 0.2; // Mock value
  if (weekendVariance > 0.3) {
    insights.push({
      type: 'education',
      priority: 'medium',
      message: 'Your nutrition varies significantly on weekends. Planning weekend meals can help maintain consistency.',
      actionable: true,
      timeframe: 'week'
    });
  }
  
  return insights;
}

function analyzeMacroBalanceInsights(context: NutritionCoachAiContext): CoachingInsight[] {
  const insights: CoachingInsight[] = [];
  const { currentProgress } = context;
  const today = currentProgress.today;
  
  // Macro balance analysis
  const proteinRatio = today.macros.protein.percentage;
  const carbRatio = today.macros.carbs.percentage;
  const fatRatio = today.macros.fats.percentage;
  
  const isBalanced = proteinRatio >= 0.8 && proteinRatio <= 1.2 &&
                   carbRatio >= 0.8 && carbRatio <= 1.2 &&
                   fatRatio >= 0.8 && fatRatio <= 1.2;
  
  if (isBalanced) {
    insights.push({
      type: 'encouragement',
      priority: 'medium',
      message: 'Your macronutrient distribution is well-balanced today, supporting both energy and satiety.',
      actionable: false,
      timeframe: 'today'
    });
  }
  
  // Specific macro insights
  if (proteinRatio < 0.7) {
    insights.push({
      type: 'suggestion',
      priority: 'high',
      message: 'Your protein intake is low today. Protein helps with satiety and muscle maintenance.',
      actionable: true,
      relatedGoal: 'protein',
      timeframe: 'today'
    });
  }
  
  if (carbRatio > 1.3) {
    insights.push({
      type: 'education',
      priority: 'medium',
      message: 'You\'re over your carb target today. Consider balancing with more protein and healthy fats.',
      actionable: true,
      relatedGoal: 'carbs',
      timeframe: 'today'
    });
  }
  
  return insights;
}

function analyzeBehavioralPatterns(context: NutritionCoachAiContext): CoachingInsight[] {
  const insights: CoachingInsight[] = [];
  const { eatingPatterns } = context;
  
  // Pattern-based insights
  const concerningPatterns = eatingPatterns.commonPatterns.filter(p => p.impact === 'concerning');
  if (concerningPatterns.length > 0) {
    const pattern = concerningPatterns[0];
    insights.push({
      type: 'education',
      priority: 'medium',
      message: pattern.suggestion || 'I\'ve noticed some patterns in your eating that we could optimize for better results.',
      actionable: true,
      timeframe: 'ongoing'
    });
  }
  
  // Positive reinforcement
  const positivePatterns = eatingPatterns.commonPatterns.filter(p => p.impact === 'positive');
  if (positivePatterns.length > 0) {
    insights.push({
      type: 'encouragement',
      priority: 'low',
      message: `Great job with your ${positivePatterns[0].description.toLowerCase()}! Keep up these healthy habits.`,
      actionable: false,
      timeframe: 'ongoing'
    });
  }
  
  return insights;
}

function generatePredictiveInsights(context: NutritionCoachAiContext): CoachingInsight[] {
  const insights: CoachingInsight[] = [];
  const { currentProgress, remainingTargets } = context;
  
  // Predict daily outcome based on current progress
  const currentTime = new Date().getHours();
  const progressRatio = currentProgress.today.calories.percentage;
  const expectedProgressByTime = currentTime / 24; // Simple linear expectation
  
  if (progressRatio > expectedProgressByTime * 1.2) {
    insights.push({
      type: 'encouragement',
      priority: 'medium',
      message: 'You\'re ahead of pace today! This puts you in a great position to meet your goals.',
      actionable: false,
      timeframe: 'today'
    });
  } else if (progressRatio < expectedProgressByTime * 0.6 && currentTime > 12) {
    insights.push({
      type: 'suggestion',
      priority: 'high',
      message: 'You\'re behind pace for today. Consider having a substantial meal to get back on track.',
      actionable: true,
      timeframe: 'immediate'
    });
  }
  
  // Weekly trajectory prediction
  const adherenceScore = currentProgress.adherenceScore || 0;
  if (adherenceScore > 0.8) {
    insights.push({
      type: 'celebration',
      priority: 'medium',
      message: 'Based on your current trajectory, you\'re on track for an excellent week! Keep up the momentum.',
      actionable: false,
      timeframe: 'week'
    });
  } else if (adherenceScore < 0.5) {
    insights.push({
      type: 'encouragement',
      priority: 'high',
      message: 'Your recent pattern suggests you might miss weekly goals. Let\'s focus on getting back on track today.',
      actionable: true,
      timeframe: 'week'
    });
  }
  
  return insights;
}

function generateLegacyInsights(context: NutritionCoachAiContext): CoachingInsight[] {
  const insights: CoachingInsight[] = [];
  const { currentProgress, remainingTargets } = context;
  
  // Legacy progress-based insights for compatibility
  if (currentProgress.today.status === 'met') {
    insights.push({
      type: 'celebration',
      priority: 'high',
      message: 'Fantastic! You\'re hitting your nutrition goals perfectly today. This consistency is what leads to lasting results!',
      actionable: false,
      timeframe: 'immediate'
    });
  } else if (currentProgress.today.status === 'over') {
    insights.push({
      type: 'suggestion',
      priority: 'medium',
      message: 'You\'ve exceeded your calorie goal today. Consider lighter options for remaining meals and focus on hydration.',
      actionable: true,
      relatedGoal: 'dailyCalories',
      timeframe: 'today'
    });
  } else if (remainingTargets.calories > 500) {
    insights.push({
      type: 'suggestion',
      priority: 'medium',
      message: `You have ${remainingTargets.calories} calories remaining. This is a good opportunity for a balanced meal or nutritious snack.`,
      actionable: true,
      relatedGoal: 'dailyCalories',
      timeframe: 'today'
    });
  }
  
  // Time-based insights
  if (remainingTargets.timeOfDay === 'evening' && remainingTargets.calories > 300) {
    insights.push({
      type: 'suggestion',
      priority: 'medium',
      message: 'It\'s evening and you still have calories to work with. Consider a balanced dinner that includes protein and vegetables.',
      actionable: true,
      timeframe: 'immediate'
    });
  }
  
  return insights;
}

export function generateAnalysisRecommendations(
  patterns: EatingPattern[],
  trends: ProgressTrend[],
  context: NutritionCoachAiContext
): AnalysisRecommendation[] {
  const recommendations: AnalysisRecommendation[] = [];
  
  // Pattern-based recommendations
  const concerningPatterns = patterns.filter(p => p.impact === 'concerning');
  concerningPatterns.forEach(pattern => {
    if (pattern.type === 'calorie_consistency') {
      recommendations.push({
        type: 'weekly',
        priority: 'high',
        title: 'Improve Calorie Consistency',
        description: 'Your daily calorie intake varies significantly, which can impact your progress.',
        actionSteps: [
          'Plan your meals in advance',
          'Use a food scale for accurate portions',
          'Prepare consistent meal templates',
          'Track your intake throughout the day'
        ],
        expectedImpact: 'More predictable progress and better hunger management',
        timeframe: '2-3 weeks'
      });
    } else if (pattern.type === 'meal_timing') {
      recommendations.push({
        type: 'daily',
        priority: 'medium',
        title: 'Establish Regular Meal Times',
        description: 'Irregular meal timing can affect your metabolism and energy levels.',
        actionSteps: [
          'Set consistent meal times',
          'Use phone reminders for meals',
          'Prepare meals in advance',
          'Listen to your hunger cues'
        ],
        expectedImpact: 'Better energy levels and improved metabolism',
        timeframe: '1-2 weeks'
      });
    }
  });
  
  // Trend-based recommendations
  const decliningTrends = trends.filter(t => t.direction === 'declining' && t.significance !== 'low');
  decliningTrends.forEach(trend => {
    if (trend.metric === 'adherence') {
      recommendations.push({
        type: 'immediate',
        priority: 'high',
        title: 'Refocus on Goal Adherence',
        description: 'Your goal adherence has declined recently. Let\'s get back on track.',
        actionSteps: [
          'Review your current goals and adjust if needed',
          'Identify specific challenges you\'re facing',
          'Simplify your approach temporarily',
          'Focus on one habit at a time'
        ],
        expectedImpact: 'Renewed motivation and clearer path forward',
        timeframe: 'This week'
      });
    }
  });
  
  // Context-based recommendations
  if (context.remainingTargets.protein > context.userProfile.calculatedGoals.protein * 0.5) {
    recommendations.push({
      type: 'immediate',
      priority: 'high',
      title: 'Increase Protein Intake',
      description: 'You\'re consistently under your protein target, which is important for your goals.',
      actionSteps: [
        'Add protein to each meal and snack',
        'Keep protein-rich snacks available',
        'Consider a protein supplement if needed',
        'Plan protein sources in advance'
      ],
      expectedImpact: 'Better satiety, muscle preservation, and goal achievement',
      timeframe: 'Today and ongoing'
    });
  }
  
  return recommendations.sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    return priorityOrder[b.priority] - priorityOrder[a.priority];
  });
}

// Advanced pattern recognition functions
export function detectEatingPatternTrends(context: NutritionCoachAiContext): {
  mealTimingConsistency: number;
  weekendVariance: number;
  proteinDistribution: 'optimal' | 'front-loaded' | 'back-loaded' | 'uneven';
  calorieDistribution: 'even' | 'front-loaded' | 'back-loaded';
  adherenceTrend: 'improving' | 'stable' | 'declining';
} {
  const { currentProgress, eatingPatterns } = context;
  
  // Calculate meal timing consistency (placeholder implementation)
  const mealTimingConsistency = 0.7; // Would analyze actual meal times
  
  // Calculate weekend variance (placeholder)
  const weekendVariance = 0.2; // Would compare weekend vs weekday patterns
  
  // Analyze protein distribution throughout the day (placeholder)
  const proteinDistribution: 'optimal' | 'front-loaded' | 'back-loaded' | 'uneven' = 'optimal';
  
  // Analyze calorie distribution (placeholder)
  const calorieDistribution: 'even' | 'front-loaded' | 'back-loaded' = 'even';
  
  // Determine adherence trend
  const adherenceScore = currentProgress.adherenceScore || 0;
  let adherenceTrend: 'improving' | 'stable' | 'declining' = 'stable';
  
  if (adherenceScore > 0.8) {
    adherenceTrend = 'improving';
  } else if (adherenceScore < 0.6) {
    adherenceTrend = 'declining';
  }
  
  return {
    mealTimingConsistency,
    weekendVariance,
    proteinDistribution,
    calorieDistribution,
    adherenceTrend
  };
}

export function generatePersonalizedRecommendations(context: NutritionCoachAiContext): {
  immediate: string[];
  daily: string[];
  weekly: string[];
  longTerm: string[];
} {
  const { currentProgress, remainingTargets, userProfile } = context;
  const trends = detectEatingPatternTrends(context);
  
  const recommendations = {
    immediate: [] as string[],
    daily: [] as string[],
    weekly: [] as string[],
    longTerm: [] as string[]
  };
  
  // Immediate recommendations based on current state
  if (remainingTargets.protein > 20) {
    recommendations.immediate.push(`Add ${Math.round(remainingTargets.protein)}g protein to your next meal`);
  }
  
  if (remainingTargets.calories > 500 && remainingTargets.timeOfDay === 'evening') {
    recommendations.immediate.push('Plan a substantial dinner to meet your calorie goals');
  }
  
  // Daily recommendations based on patterns
  if (trends.proteinDistribution === 'back-loaded') {
    recommendations.daily.push('Try to include more protein in your breakfast and lunch');
  }
  
  if (trends.calorieDistribution === 'back-loaded') {
    recommendations.daily.push('Spread your calories more evenly throughout the day');
  }
  
  // Weekly recommendations based on consistency
  if (trends.weekendVariance > 0.3) {
    recommendations.weekly.push('Plan your weekend meals in advance to maintain consistency');
  }
  
  if (trends.mealTimingConsistency < 0.6) {
    recommendations.weekly.push('Establish more regular meal times to support your metabolism');
  }
  
  // Long-term recommendations based on goals and trends
  if (trends.adherenceTrend === 'declining') {
    recommendations.longTerm.push('Consider simplifying your approach and focusing on one habit at a time');
  }
  
  if (currentProgress.adherenceScore > 0.8) {
    recommendations.longTerm.push('You\'re ready to add more advanced nutrition strategies');
  }
  
  return recommendations;
}

export function calculateNutritionQualityScore(context: NutritionCoachAiContext): {
  overall: number;
  macroBalance: number;
  consistency: number;
  timing: number;
  adherence: number;
  breakdown: {
    strengths: string[];
    improvements: string[];
  };
} {
  const { currentProgress } = context;
  const trends = detectEatingPatternTrends(context);
  
  // Calculate individual scores
  const macroBalance = calculateMacroBalanceScore(currentProgress);
  const consistency = trends.mealTimingConsistency;
  const timing = 1 - Math.min(trends.weekendVariance, 0.5) * 2; // Convert variance to score
  const adherence = currentProgress.adherenceScore || 0;
  
  // Calculate overall score (weighted average)
  const overall = (macroBalance * 0.3 + consistency * 0.2 + timing * 0.2 + adherence * 0.3);
  
  // Identify strengths and improvements
  const strengths: string[] = [];
  const improvements: string[] = [];
  
  if (adherence > 0.8) strengths.push('Excellent goal adherence');
  else if (adherence < 0.6) improvements.push('Improve goal consistency');
  
  if (macroBalance > 0.8) strengths.push('Well-balanced macronutrients');
  else if (macroBalance < 0.6) improvements.push('Better macro distribution');
  
  if (consistency > 0.8) strengths.push('Consistent meal timing');
  else if (consistency < 0.6) improvements.push('More regular meal schedule');
  
  if (timing > 0.8) strengths.push('Consistent eating patterns');
  else if (timing < 0.6) improvements.push('Reduce weekend variance');
  
  return {
    overall,
    macroBalance,
    consistency,
    timing,
    adherence,
    breakdown: {
      strengths,
      improvements
    }
  };
}

function calculateMacroBalanceScore(currentProgress: any): number {
  const today = currentProgress.today;
  const proteinRatio = today.macros.protein.percentage;
  const carbRatio = today.macros.carbs.percentage;
  const fatRatio = today.macros.fats.percentage;
  
  // Calculate how close each macro is to the target (1.0)
  const proteinScore = 1 - Math.abs(proteinRatio - 1.0);
  const carbScore = 1 - Math.abs(carbRatio - 1.0);
  const fatScore = 1 - Math.abs(fatRatio - 1.0);
  
  // Return average score, clamped between 0 and 1
  return Math.max(0, Math.min(1, (proteinScore + carbScore + fatScore) / 3));
}

export function performComprehensiveAnalysis(
  meals: LoggedMeal[],
  dailyProgress: DailyProgress[],
  weeklyTrends: WeeklyTrend[],
  goals: NutritionGoals,
  context: NutritionCoachAiContext
): ProgressAnalysisResult {
  const eatingPatterns = analyzeEatingPatterns(meals, goals);
  const adherenceScore = calculateGoalAdherenceScore(dailyProgress, goals);
  const trends = identifyProgressTrends(weeklyTrends, dailyProgress);
  const insights = generateCoachingInsights(context);
  const recommendations = generateAnalysisRecommendations(eatingPatterns, trends, context);
  
  return {
    eatingPatterns,
    adherenceScore,
    trends,
    insights,
    recommendations
  };
}

// Export additional analysis functions for use in coaching system
// Note: named exports for functions above are already declared; no re-export block needed to avoid conflicts.