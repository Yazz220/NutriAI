import { NutritionGoals } from '@/types';
import { NOSH_SYSTEM_RULES } from '@/constants/brand';

export type CoachProfile = {
  name?: string | null;
  dietaryRestrictions?: string[];
  allergies?: string[];
  preferences?: Record<string, unknown> | null;
  units?: string | null;
};

export type DayMacro = {
  calories: { consumed: number; goal: number; remaining: number };
  protein: { consumed: number; goal: number };
  carbs: { consumed: number; goal: number };
  fats: { consumed: number; goal: number };
};

export type SevenDaySummary = {
  avgCalories: number;
  daysMetGoal: number;
  totalDays: number;
};

export type CoachContext = {
  profile: CoachProfile;
  goals: NutritionGoals | null;
  today: DayMacro;
  sevenDay: SevenDaySummary;
};

export function buildCoachContext(params: CoachContext) {
  const { profile, goals, today, sevenDay } = params;
  const lines: string[] = [];
  lines.push('USER SUMMARY:');
  if (profile.name) lines.push(`- Name: ${profile.name}`);
  if (profile.units) lines.push(`- Units: ${profile.units}`);
  if (goals) {
    lines.push(`- Daily Goals: ${goals.dailyCalories} kcal, P${goals.protein}g / C${goals.carbs}g / F${goals.fats}g`);
  }
  if (profile.dietaryRestrictions?.length) lines.push(`- Restrictions: ${profile.dietaryRestrictions.join(', ')}`);
  if (profile.allergies?.length) lines.push(`- Allergies: ${profile.allergies.join(', ')}`);

  lines.push('TODAY:');
  lines.push(`- Calories: ${today.calories.consumed}/${today.calories.goal} (rem ${today.calories.remaining})`);
  lines.push(`- Protein: ${today.protein.consumed}/${today.protein.goal}g`);
  lines.push(`- Carbs: ${today.carbs.consumed}/${today.carbs.goal}g`);
  lines.push(`- Fats: ${today.fats.consumed}/${today.fats.goal}g`);

  lines.push('LAST 7 DAYS:');
  lines.push(`- Avg calories: ${Math.round(sevenDay.avgCalories)} kcal`);
  lines.push(`- Days on track: ${sevenDay.daysMetGoal}/${sevenDay.totalDays}`);

  return lines.join('\n');
}

export function buildCoachSystemPrompt(ctx: CoachContext) {
  const contextText = buildCoachContext(ctx);
  return `${NOSH_SYSTEM_RULES}\n\n${contextText}`;
}

