import { UserProfileState } from '@/hooks/useUserProfile';
import { NutritionGoals } from '@/types';
import { DailyProgress, WeeklyTrend } from '@/hooks/useNutrition';

type Totals = { calories: number; protein: number; carbs: number; fats: number };

export interface EnhancedAIContext {
  profile: UserProfileState;
  todayTotals: Totals;
  last7Days: Array<{ date: string; calories: number; protein: number }>;
  goals?: NutritionGoals;
  inventoryCount?: number;
  // Enhanced calorie tracking data
  dailyProgress?: DailyProgress;
  weeklyTrends?: WeeklyTrend[];
  calorieStatus?: 'under' | 'met' | 'over';
  remainingCalories?: number;
  plannedCalories?: number;
  loggedCalories?: number;
  goalAdherence?: number; // percentage over last 7 days
}

export function buildAIContext(input: EnhancedAIContext): string {
  const { 
    profile, 
    todayTotals, 
    last7Days, 
    goals, 
    inventoryCount,
    dailyProgress,
    weeklyTrends,
    calorieStatus,
    remainingCalories,
    plannedCalories,
    loggedCalories,
    goalAdherence
  } = input;

  const basics = profile.basics || {};
  const prefs = profile.preferences || { allergies: [], dislikedIngredients: [], preferredCuisines: [] };
  const goal = goals || undefined;

  const avg7 = last7Days.length
    ? Math.round(last7Days.reduce((a, d) => a + d.calories, 0) / last7Days.length)
    : 0;

  const parts: string[] = [];
  parts.push(`- Name: ${basics.name || 'n/a'} | Age: ${basics.age ?? 'n/a'} | Sex: ${basics.sex || 'n/a'}`);
  parts.push(`- Height: ${basics.heightCm ?? 'n/a'} cm | Weight: ${basics.weightKg ?? 'n/a'} kg | Units: ${profile.metrics?.unitSystem || 'metric'}`);
  if (profile.goals) {
    parts.push(
      `- Goals: calories ${profile.goals.dailyCalories ?? 'n/a'}, protein ${profile.goals.proteinTargetG ?? 'n/a'}g, carbs ${profile.goals.carbsTargetG ?? 'n/a'}g, fats ${profile.goals.fatsTargetG ?? 'n/a'}g, type ${profile.goals.goalType || 'n/a'}, activity ${profile.goals.activityLevel || 'n/a'}`,
    );
  }
  parts.push(`- Preferences: diet ${prefs.dietary || 'none'}, allergies [${(prefs.allergies || []).join(', ') || 'none'}]`);
  parts.push(`- Dislikes: [${(prefs.dislikedIngredients || []).join(', ') || 'none'}] | Cuisines: [${(prefs.preferredCuisines || []).join(', ') || 'none'}]`);

  // Enhanced calorie tracking information
  parts.push(`- Today totals: ${todayTotals.calories} kcal, P ${todayTotals.protein}g, C ${todayTotals.carbs}g, F ${todayTotals.fats}g`);
  
  if (dailyProgress) {
    parts.push(`- Calorie status: ${calorieStatus || dailyProgress.status} (${Math.round(dailyProgress.calories.percentage * 100)}% of goal)`);
    
    if (remainingCalories !== undefined) {
      if (remainingCalories > 0) {
        parts.push(`- Remaining calories: ${remainingCalories} kcal needed to meet goal`);
      } else {
        parts.push(`- Over goal by: ${Math.abs(remainingCalories)} kcal`);
      }
    }
    
    if (plannedCalories !== undefined && loggedCalories !== undefined) {
      parts.push(`- Calorie sources: ${loggedCalories} kcal logged, ${plannedCalories} kcal planned`);
    }
    
    // Macro progress
    const macros = dailyProgress.macros;
    parts.push(`- Macro progress: P ${Math.round(macros.protein.percentage * 100)}%, C ${Math.round(macros.carbs.percentage * 100)}%, F ${Math.round(macros.fats.percentage * 100)}%`);
  }
  
  parts.push(`- 7-day avg calories: ${avg7} kcal`);
  
  if (goalAdherence !== undefined) {
    parts.push(`- Goal adherence: ${Math.round(goalAdherence)}% over last 7 days`);
  }
  
  // Weekly trends summary
  if (weeklyTrends && weeklyTrends.length > 0) {
    const latestTrend = weeklyTrends[0];
    parts.push(`- Recent trend: ${latestTrend.averageCalories} kcal/day avg, ${latestTrend.goalAdherence}% adherence`);
  }
  
  if (goal) {
    parts.push(`- Targets: ${goal.dailyCalories} kcal | P ${goal.protein}g | C ${goal.carbs}g | F ${goal.fats}g`);
  }
  if (typeof inventoryCount === 'number') parts.push(`- Inventory items: ${inventoryCount}`);

  return parts.join('\n');
}
