import { UserProfileState } from '@/hooks/useUserProfile';
import { NutritionGoals } from '@/types';

type Totals = { calories: number; protein: number; carbs: number; fats: number };

export function buildAIContext(input: {
  profile: UserProfileState;
  todayTotals: Totals;
  last7Days: Array<{ date: string; calories: number; protein: number }>;
  goals?: NutritionGoals;
  inventoryCount?: number;
}): string {
  const { profile, todayTotals, last7Days, goals, inventoryCount } = input;

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

  parts.push(`- Today totals: ${todayTotals.calories} kcal, P ${todayTotals.protein}g, C ${todayTotals.carbs}g, F ${todayTotals.fats}g`);
  parts.push(`- 7-day avg calories: ${avg7} kcal`);
  if (goal) {
    parts.push(`- Targets: ${goal.dailyCalories} kcal | P ${goal.protein}g | C ${goal.carbs}g | F ${goal.fats}g`);
  }
  if (typeof inventoryCount === 'number') parts.push(`- Inventory items: ${inventoryCount}`);

  return parts.join('\n');
}
