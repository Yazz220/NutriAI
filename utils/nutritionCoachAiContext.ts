import { LoggedMeal, NutritionGoals, MealType } from '@/types';
import { UserBasics, UserGoals } from '@/hooks/useUserProfile';
import { DailyProgress, WeeklyTrend } from '@/hooks/useNutrition';
import { calculateBMR, calculateTDEE, calculateNutritionGoals, getGoalExplanation } from '@/utils/goalCalculations';
import { ChatMessage } from '@/utils/aiClient';
import {
  analyzeEatingPatterns,
  analyzeMealTimingForType,
  calculateDailyCalories,
  calculateConsistencyScore
} from './progressAnalysis';

export interface NutritionCoachAiContext {
  userProfile: {
    basics: UserBasics;
    goals: UserGoals;
    calculatedGoals: NutritionGoals;
    bmr: number;
    tdee: number;
    goalExplanation: string;
  };
  currentProgress: {
    today: DailyProgress;
    week: WeeklyProgress;
    trends: ProgressTrend[];
    adherenceScore: number;
  };
  remainingTargets: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    timeOfDay: 'morning' | 'afternoon' | 'evening';
    percentageComplete: {
      calories: number;
      protein: number;
      carbs: number;
      fats: number;
    };
  };
  eatingPatterns: {
    recentMeals: LoggedMeal[];
    commonPatterns: EatingPattern[];
    mealTiming: MealTimingPattern[];
    weekendVariance: number;
  };
  coachingContext: {
    lastInteraction?: string;
    userMood?: 'motivated' | 'struggling' | 'neutral';
    priorityFocus?: 'calories' | 'protein' | 'consistency' | 'education';
    challengeAreas: string[];
    strengths: string[];
  };
  contextSummary: string;
}

export interface WeeklyProgress {
  weekStartDate: string;
  averageCalories: number;
  averageProtein: number;
  averageCarbs: number;
  averageFats: number;
  goalAdherence: number;
  consistencyScore: number;
  daysLogged: number;
  totalDays: number;
}

export interface ProgressTrend {
  metric: 'calories' | 'protein' | 'carbs' | 'fats' | 'adherence' | 'consistency';
  direction: 'improving' | 'stable' | 'declining';
  magnitude: number; // percentage change
  timeframe: 'week' | 'month';
  significance: 'high' | 'medium' | 'low';
  description: string;
}

export interface EatingPattern {
  type: 'meal_timing' | 'macro_distribution' | 'calorie_consistency' | 'weekend_variance' | 'meal_frequency';
  description: string;
  frequency: number; // 0-1 scale
  impact: 'positive' | 'neutral' | 'concerning';
  suggestion?: string;
  confidence: number; // 0-1 scale
}

export interface MealTimingPattern {
  mealType: MealType;
  averageTime: string; // HH:MM format
  consistency: number; // 0-1 scale
  calorieDistribution: number; // percentage of daily calories
}

export interface CoachingInsight {
  type: 'encouragement' | 'suggestion' | 'education' | 'warning' | 'celebration';
  priority: 'high' | 'medium' | 'low';
  message: string;
  actionable: boolean;
  relatedGoal?: keyof NutritionGoals;
  timeframe?: 'immediate' | 'today' | 'week' | 'ongoing';
}

function getTimeOfDay(): 'morning' | 'afternoon' | 'evening' {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

function calculateAdherenceScore(dailyProgress: DailyProgress[]): number {
  if (dailyProgress.length === 0) return 0;

  const adherentDays = dailyProgress.filter(day => {
    const calorieAdherence = day.calories.percentage >= 0.8 && day.calories.percentage <= 1.2;
    const proteinAdherence = day.macros.protein.percentage >= 0.8;
    return calorieAdherence && proteinAdherence;
  }).length;

  return adherentDays / dailyProgress.length;
}

function analyzeProgressTrends(weeklyData: WeeklyTrend[], dailyData: DailyProgress[]): ProgressTrend[] {
  const trends: ProgressTrend[] = [];

  if (weeklyData.length < 2) return trends;

  const recent = weeklyData[weeklyData.length - 1];
  const previous = weeklyData[weeklyData.length - 2];

  // Analyze calorie trend
  const calorieChange = ((recent.averageCalories - previous.averageCalories) / previous.averageCalories) * 100;
  if (Math.abs(calorieChange) > 5) {
    trends.push({
      metric: 'calories',
      direction: calorieChange > 0 ? 'improving' : 'declining',
      magnitude: Math.abs(calorieChange),
      timeframe: 'week',
      significance: Math.abs(calorieChange) > 15 ? 'high' : 'medium',
      description: `Calorie intake ${calorieChange > 0 ? 'increased' : 'decreased'} by ${Math.round(Math.abs(calorieChange))}% this week`
    });
  }

  // Analyze adherence trend
  const adherenceChange = ((recent.goalAdherence - previous.goalAdherence) / previous.goalAdherence) * 100;
  if (Math.abs(adherenceChange) > 10) {
    trends.push({
      metric: 'adherence',
      direction: adherenceChange > 0 ? 'improving' : 'declining',
      magnitude: Math.abs(adherenceChange),
      timeframe: 'week',
      significance: Math.abs(adherenceChange) > 25 ? 'high' : 'medium',
      description: `Goal adherence ${adherenceChange > 0 ? 'improved' : 'declined'} by ${Math.round(Math.abs(adherenceChange))}% this week`
    });
  }

  return trends;
}

function analyzeMealTimingPatterns(recentMeals: LoggedMeal[]): MealTimingPattern[] {
  const patterns: MealTimingPattern[] = [];
  const mealsByType = recentMeals.reduce((acc, meal) => {
    if (!acc[meal.mealType]) acc[meal.mealType] = [];
    acc[meal.mealType].push(meal);
    return acc;
  }, {} as Record<MealType, LoggedMeal[]>);

  const totalCalories = recentMeals.reduce((sum, meal) => sum + meal.calories, 0);

  Object.entries(mealsByType).forEach(([type, meals]) => {
    const mealType = type as MealType;
    const analysis = analyzeMealTimingForType(meals, mealType);

    // Calculate calorie distribution
    const typeCalories = meals.reduce((sum, m) => sum + m.calories, 0);
    const distribution = totalCalories > 0 ? typeCalories / totalCalories : 0;

    // Convert decimal hours to HH:MM
    const hours = Math.floor(analysis.averageTime);
    const minutes = Math.round((analysis.averageTime - hours) * 60);
    const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

    patterns.push({
      mealType,
      averageTime: timeString,
      consistency: analysis.consistency,
      calorieDistribution: distribution
    });
  });

  return patterns;
}

function generateDailyInsights(context: NutritionCoachAiContext): CoachingInsight[] {
  const insights: CoachingInsight[] = [];
  const { remainingTargets, currentProgress, eatingPatterns } = context;

  // Immediate needs
  if (remainingTargets.calories < 0) {
    insights.push({
      type: 'warning',
      priority: 'high',
      message: 'You\'ve exceeded your calorie goal for today. Focus on nutrient-dense, low-calorie foods for the rest of the day.',
      actionable: true,
      relatedGoal: 'dailyCalories',
      timeframe: 'immediate'
    });
  } else if (remainingTargets.calories < 200 && remainingTargets.timeOfDay !== 'evening') {
    insights.push({
      type: 'warning',
      priority: 'medium',
      message: 'You\'re running low on calories for the day. Plan your remaining meals carefully.',
      actionable: true,
      relatedGoal: 'dailyCalories',
      timeframe: 'today'
    });
  } else if (remainingTargets.calories > 0 && remainingTargets.timeOfDay === 'evening' && remainingTargets.percentageComplete.calories > 0.9) {
    insights.push({
      type: 'celebration',
      priority: 'high',
      message: 'Fantastic! You\'re right on track with your nutrition goals today.',
      actionable: false,
      timeframe: 'immediate'
    });
  } else if (remainingTargets.calories > 500 && remainingTargets.timeOfDay === 'evening') {
    insights.push({
      type: 'suggestion',
      priority: 'medium',
      message: `You have ${Math.round(remainingTargets.calories)} calories remaining. Consider a balanced meal or snack.`,
      actionable: true,
      relatedGoal: 'dailyCalories',
      timeframe: 'today'
    });
  }

  // Pattern-based insights
  const concerningPatterns = eatingPatterns.commonPatterns.filter(p => p.impact === 'concerning');
  if (concerningPatterns.length > 0) {
    insights.push({
      type: 'suggestion',
      priority: 'medium',
      message: concerningPatterns[0].suggestion || 'Consider adjusting your eating patterns for better results.',
      actionable: true,
      timeframe: 'ongoing'
    });
  }

  // Adherence-based insights
  if (currentProgress.adherenceScore < 0.6) {
    insights.push({
      type: 'encouragement',
      priority: 'high',
      message: 'Don\'t worry about perfect adherence - focus on progress, not perfection!',
      actionable: false,
      timeframe: 'ongoing'
    });
  }

  return insights;
}

function generateContextSummary(context: NutritionCoachAiContext): string {
  const { userProfile, currentProgress, remainingTargets } = context;
  const timeOfDay = getTimeOfDay();

  let summary = `It's ${timeOfDay} and you're `;

  // Progress summary
  const calorieProgress = currentProgress.today.calories.percentage;
  if (calorieProgress < 0.5) {
    summary += `getting started with your nutrition today. You have ${Math.round(remainingTargets.calories)} calories remaining to reach your ${userProfile.calculatedGoals.dailyCalories} calorie goal. `;
  } else if (calorieProgress >= 0.8 && calorieProgress <= 1.2) {
    summary += `doing great with your nutrition today! You're right on track with your calorie goal. `;
  } else if (calorieProgress > 1.2) {
    summary += `over your calorie goal for today. Let's focus on lighter options for the rest of the day. `;
  } else {
    summary += `making progress. You have ${Math.round(remainingTargets.calories)} calories remaining. `;
  }

  // Goal context
  const goalType = userProfile.goals.goalType || 'maintain';
  summary += `Your ${goalType} goal requires ${userProfile.calculatedGoals.dailyCalories} calories daily. `;

  // Macro status
  const proteinProgress = currentProgress.today.macros.protein.percentage;
  if (proteinProgress < 0.7) {
    summary += `You could use more protein today (${Math.round(remainingTargets.protein)}g remaining). `;
  } else if (proteinProgress >= 1.0) {
    summary += `Great job hitting your protein target! `;
  }

  // Weekly context
  if (context.currentProgress.adherenceScore > 0.8) {
    summary += `You've been very consistent this week with ${Math.round(context.currentProgress.adherenceScore * 100)}% goal adherence.`;
  } else if (context.currentProgress.adherenceScore < 0.6) {
    summary += `This week has been challenging with ${Math.round(context.currentProgress.adherenceScore * 100)}% goal adherence. Let's focus on getting back on track.`;
  }

  return summary;
}

// Helper to calculate weekend variance
function calculateWeekendVariance(meals: LoggedMeal[]): number {
  const weekdayTotals: number[] = [];
  const weekendTotals: number[] = [];
  const dailyTotals = new Map<string, number>();

  meals.forEach(meal => {
    const existing = dailyTotals.get(meal.date) || 0;
    dailyTotals.set(meal.date, existing + meal.calories);
  });

  dailyTotals.forEach((calories, dateStr) => {
    const date = new Date(dateStr);
    const day = date.getDay();
    if (day === 0 || day === 6) {
      weekendTotals.push(calories);
    } else {
      weekdayTotals.push(calories);
    }
  });

  if (weekdayTotals.length === 0 || weekendTotals.length === 0) return 0;

  const weekdayAvg = weekdayTotals.reduce((a, b) => a + b, 0) / weekdayTotals.length;
  const weekendAvg = weekendTotals.reduce((a, b) => a + b, 0) / weekendTotals.length;

  return Math.abs(weekendAvg - weekdayAvg) / weekdayAvg;
}

export function buildNutritionCoachAiContext(
  userProfile: { basics: UserBasics; goals: UserGoals } | null,
  todayProgress: DailyProgress,
  weeklyTrends: WeeklyTrend[],
  recentMeals: LoggedMeal[],
  calculatedGoals?: NutritionGoals
): NutritionCoachAiContext {
  // Calculate or use provided nutrition goals
  const goals = calculatedGoals || (userProfile ? calculateNutritionGoals(userProfile.basics, userProfile.goals) : null);
  const bmr = userProfile ? calculateBMR(userProfile.basics) : null;
  const tdee = bmr && userProfile ? calculateTDEE(bmr, userProfile.goals.activityLevel || 'light') : null;

  // Default values if profile is incomplete
  const defaultGoals: NutritionGoals = {
    dailyCalories: 2000,
    protein: 125,
    carbs: 250,
    fats: 56
  };

  const finalGoals = goals || defaultGoals;
  const finalBmr = bmr || 1500;
  const finalTdee = tdee || 1800;

  // Calculate remaining targets
  const remainingCalories = Math.max(0, finalGoals.dailyCalories - todayProgress.calories.consumed);
  const remainingProtein = Math.max(0, finalGoals.protein - todayProgress.macros.protein.consumed);
  const remainingCarbs = Math.max(0, finalGoals.carbs - todayProgress.macros.carbs.consumed);
  const remainingFats = Math.max(0, finalGoals.fats - todayProgress.macros.fats.consumed);

  // Calculate weekly progress
  const dailyCalories = calculateDailyCalories(recentMeals);
  const consistencyScore = calculateConsistencyScore(dailyCalories);

  const weeklyProgress: WeeklyProgress = {
    weekStartDate: new Date().toISOString().split('T')[0], // Simplified
    averageCalories: weeklyTrends.length > 0 ? weeklyTrends[weeklyTrends.length - 1].averageCalories : todayProgress.calories.consumed,
    averageProtein: 0, // Would calculate from weekly data
    averageCarbs: 0,
    averageFats: 0,
    goalAdherence: weeklyTrends.length > 0 ? weeklyTrends[weeklyTrends.length - 1].goalAdherence : 0,
    consistencyScore: consistencyScore,
    daysLogged: 7,
    totalDays: 7
  };

  // Analyze patterns and trends
  const eatingPatterns = analyzeEatingPatterns(recentMeals, finalGoals);
  const mealTimingPatterns = analyzeMealTimingPatterns(recentMeals);
  const progressTrends = analyzeProgressTrends(weeklyTrends, [todayProgress]);
  const adherenceScore = calculateAdherenceScore([todayProgress]);
  const weekendVariance = calculateWeekendVariance(recentMeals);

  const context: NutritionCoachAiContext = {
    userProfile: {
      basics: userProfile?.basics || { age: 30, sex: 'other', heightCm: 170, weightKg: 70 },
      goals: userProfile?.goals || { goalType: 'maintain', activityLevel: 'light' },
      calculatedGoals: finalGoals,
      bmr: finalBmr,
      tdee: finalTdee,
      goalExplanation: userProfile ? getGoalExplanation(userProfile.basics, userProfile.goals, finalGoals) : 'Using default nutrition goals'
    },
    currentProgress: {
      today: todayProgress,
      week: weeklyProgress,
      trends: progressTrends,
      adherenceScore
    },
    remainingTargets: {
      calories: remainingCalories,
      protein: remainingProtein,
      carbs: remainingCarbs,
      fats: remainingFats,
      timeOfDay: getTimeOfDay(),
      percentageComplete: {
        calories: finalGoals.dailyCalories > 0 ? todayProgress.calories.consumed / finalGoals.dailyCalories : 0,
        protein: finalGoals.protein > 0 ? todayProgress.macros.protein.consumed / finalGoals.protein : 0,
        carbs: finalGoals.carbs > 0 ? todayProgress.macros.carbs.consumed / finalGoals.carbs : 0,
        fats: finalGoals.fats > 0 ? todayProgress.macros.fats.consumed / finalGoals.fats : 0
      }
    },
    eatingPatterns: {
      recentMeals,
      commonPatterns: eatingPatterns,
      mealTiming: mealTimingPatterns,
      weekendVariance
    },
    coachingContext: {
      challengeAreas: [],
      strengths: []
    },
    contextSummary: ''
  };

  // Generate context summary
  context.contextSummary = generateContextSummary(context);

  return context;
}

export function buildNutritionCoachSystemPrompt(context: NutritionCoachAiContext): string {
  const { userProfile, currentProgress, remainingTargets, eatingPatterns, coachingContext } = context;

  let prompt = `You are a certified nutrition coach and wellness expert. Your role is to provide personalized, evidence-based nutrition guidance to help users achieve their health goals.

COACHING PERSONALITY:
- Be supportive, encouraging, and never judgmental
- Provide evidence-based advice with clear explanations
- Celebrate progress and normalize setbacks
- Focus on sustainable, healthy approaches
- Include appropriate medical disclaimers when needed
- Adapt your tone to the user's current situation and mood

USER PROFILE:
- Age: ${userProfile.basics.age}, Sex: ${userProfile.basics.sex}
- Height: ${userProfile.basics.heightCm}cm, Weight: ${userProfile.basics.weightKg}kg
- Goal: ${userProfile.goals.goalType} weight
- Activity Level: ${userProfile.goals.activityLevel}
- BMR: ${userProfile.bmr} calories, TDEE: ${userProfile.tdee} calories
- Daily Targets: ${userProfile.calculatedGoals.dailyCalories} cal, ${userProfile.calculatedGoals.protein}g protein, ${userProfile.calculatedGoals.carbs}g carbs, ${userProfile.calculatedGoals.fats}g fats

CURRENT PROGRESS (TODAY):
${context.contextSummary}

DETAILED TODAY'S PROGRESS:
- Calories: ${currentProgress.today.calories.consumed}/${userProfile.calculatedGoals.dailyCalories} (${Math.round(remainingTargets.percentageComplete.calories * 100)}%)
- Protein: ${currentProgress.today.macros.protein.consumed}/${userProfile.calculatedGoals.protein}g (${Math.round(remainingTargets.percentageComplete.protein * 100)}%)
- Carbs: ${currentProgress.today.macros.carbs.consumed}/${userProfile.calculatedGoals.carbs}g (${Math.round(remainingTargets.percentageComplete.carbs * 100)}%)
- Fats: ${currentProgress.today.macros.fats.consumed}/${userProfile.calculatedGoals.fats}g (${Math.round(remainingTargets.percentageComplete.fats * 100)}%)

REMAINING TARGETS FOR TODAY:
- Calories: ${Math.round(remainingTargets.calories)}
- Protein: ${Math.round(remainingTargets.protein)}g
- Carbs: ${Math.round(remainingTargets.carbs)}g  
- Fats: ${Math.round(remainingTargets.fats)}g
- Time of day: ${remainingTargets.timeOfDay}

WEEKLY CONTEXT:
- Goal adherence: ${Math.round(currentProgress.adherenceScore * 100)}%
- User mood: ${coachingContext.userMood || 'Unknown'}
- Priority focus: ${coachingContext.priorityFocus || 'General'}
`;

  if (coachingContext.strengths.length > 0) {
    prompt += `\nSTRENGTHS TO REINFORCE:
${coachingContext.strengths.map(s => `- ${s}`).join('\n')}`;
  }

  if (coachingContext.challengeAreas.length > 0) {
    prompt += `\nAREAS FOR GENTLE IMPROVEMENT:
${coachingContext.challengeAreas.map(c => `- ${c}`).join('\n')}`;
  }

  if (currentProgress.trends.length > 0) {
    prompt += `\nRECENT TRENDS:
${currentProgress.trends.map(t => `- ${t.description}`).join('\n')}`;
  }

  prompt += `

RESPONSE GUIDELINES:
1. Always acknowledge the user's current progress and situation
2. Provide specific, actionable advice based on remaining targets
3. Explain the "why" behind your recommendations
4. Be encouraging and focus on progress, not perfection
5. Suggest specific foods/meals when appropriate
6. Include portion guidance when relevant
7. Address any concerning patterns gently and constructively
8. Celebrate achievements and milestones
9. Provide appropriate medical disclaimers for health conditions
10. Keep responses conversational and supportive

RESPONSE FORMAT:
Provide responses as natural conversation, not as structured data. Be warm, personal, and coaching-focused. Include specific numbers and recommendations when helpful, but present them in a conversational way.

MEDICAL BOUNDARIES:
- You provide nutrition education and coaching, not medical advice
- Always recommend consulting healthcare providers for medical conditions
- Focus on general healthy eating principles
- Avoid diagnosing or treating medical conditions
- Emphasize sustainable, moderate approaches to nutrition

Remember: You're a supportive coach helping someone on their health journey. Be encouraging, knowledgeable, and always focused on their success and wellbeing.`;

  return prompt;
}

export function createNutritionCoachMessages(
  userMessage: string,
  context: NutritionCoachAiContext
): ChatMessage[] {
  const systemPrompt = buildNutritionCoachSystemPrompt(context);

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

// Utility function to get quick coaching prompts based on context
export function getCoachingQuickPrompts(context: NutritionCoachAiContext): string[] {
  const { remainingTargets, currentProgress, coachingContext } = context;
  const prompts: string[] = [];

  // Time-based prompts
  if (remainingTargets.timeOfDay === 'morning') {
    prompts.push('What should I eat for breakfast?');
    prompts.push('Help me plan my day');
  } else if (remainingTargets.timeOfDay === 'afternoon') {
    prompts.push('Healthy lunch ideas?');
    prompts.push('I need a snack suggestion');
  } else {
    prompts.push('What\'s for dinner?');
    prompts.push('Evening snack ideas');
  }

  // Progress-based prompts
  if (remainingTargets.protein > context.userProfile.calculatedGoals.protein * 0.3) {
    prompts.push('I need more protein today');
  }

  if (remainingTargets.calories > 500) {
    prompts.push('I\'m still hungry, what can I eat?');
  } else if (remainingTargets.calories < 200) {
    prompts.push('I\'m close to my calorie goal');
  }

  // Mood-based prompts
  if (coachingContext.userMood === 'struggling') {
    prompts.push('I\'m having a tough day');
    prompts.push('Help me get back on track');
  } else if (coachingContext.userMood === 'motivated') {
    prompts.push('How am I doing this week?');
    prompts.push('What\'s my next goal?');
  }

  // General prompts
  prompts.push('Analyze my eating patterns');
  prompts.push('Explain my nutrition goals');
  prompts.push('Tips for meal prep');

  return prompts.slice(0, 6); // Limit to 6 suggestions
}