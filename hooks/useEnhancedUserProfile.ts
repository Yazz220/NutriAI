import { useMemo, useCallback } from 'react';
import { EnhancedUserProfile, DietaryRestriction, HealthGoal, ActivityLevel, GoalDirection } from '../types';
import { useUserProfile } from './useUserProfile';

const mapGender = (sex?: 'male' | 'female' | 'other'): 'male' | 'female' | 'other' | 'prefer-not-to-say' | undefined => {
  if (!sex) return undefined;
  if (sex === 'other') return 'prefer-not-to-say';
  return sex;
};

const mapGenderBack = (gender?: 'male' | 'female' | 'other' | 'prefer-not-to-say'): 'male' | 'female' | 'other' | undefined => {
  if (!gender) return undefined;
  if (gender === 'prefer-not-to-say') return 'other';
  return gender as 'male' | 'female' | 'other';
};

const mapActivityLevel = (activityLevel?: 'sedentary' | 'light' | 'moderate' | 'active' | 'athlete'): ActivityLevel | undefined => {
  if (!activityLevel) return undefined;
  const mapping: Record<'sedentary' | 'light' | 'moderate' | 'active' | 'athlete', ActivityLevel> = {
    sedentary: 'sedentary',
    light: 'lightly-active',
    moderate: 'moderately-active',
    active: 'very-active',
    athlete: 'extremely-active',
  };
  return mapping[activityLevel];
};

const mapActivityLevelBack = (activityLevel?: ActivityLevel): 'sedentary' | 'light' | 'moderate' | 'active' | 'athlete' | undefined => {
  if (!activityLevel) return undefined;
  const mapping: Record<ActivityLevel, 'sedentary' | 'light' | 'moderate' | 'active' | 'athlete'> = {
    'sedentary': 'sedentary',
    'lightly-active': 'light',
    'moderately-active': 'moderate',
    'very-active': 'active',
    'extremely-active': 'athlete',
  };
  return mapping[activityLevel];
};

const dietaryStringToRestrictions = (dietary?: string): DietaryRestriction[] => {
  if (!dietary || dietary === 'none') return [];
  const map: Record<string, DietaryRestriction> = {
    vegan: 'vegan',
    vegetarian: 'vegetarian',
    pescatarian: 'pescatarian',
    halal: 'halal',
    kosher: 'kosher',
    gluten_free: 'gluten-free',
    keto: 'keto',
    paleo: 'paleo',
  };
  const normalized = map[dietary];
  return normalized ? [normalized] : [];
};

const restrictionsToDietaryString = (restrictions: DietaryRestriction[]): 'vegan' | 'vegetarian' | 'pescatarian' | 'halal' | 'kosher' | 'gluten_free' | 'keto' | 'paleo' | 'none' => {
  if (restrictions.includes('vegan')) return 'vegan';
  if (restrictions.includes('vegetarian')) return 'vegetarian';
  if (restrictions.includes('pescatarian')) return 'pescatarian';
  if (restrictions.includes('halal')) return 'halal';
  if (restrictions.includes('kosher')) return 'kosher';
  if (restrictions.includes('gluten-free')) return 'gluten_free';
  if (restrictions.includes('keto')) return 'keto';
  if (restrictions.includes('paleo')) return 'paleo';
  return 'none';
};

const healthGoalToArray = (goal?: HealthGoal | null): HealthGoal[] => (goal ? [goal] : []);

const directionToGoal = (direction: GoalDirection): HealthGoal => {
  switch (direction) {
    case 'lose':
      return 'lose-weight';
    case 'gain':
      return 'gain-weight';
    default:
      return 'maintain-weight';
  }
};

export const useUserProfileStore = () => {
  const { profile, isLoading, savePartial } = useUserProfile();

  const enhancedProfile: EnhancedUserProfile = useMemo(() => {
    const basics = profile.basics ?? {};
    const goals = profile.goals ?? {};
    const prefs = profile.preferences ?? {};

    const healthGoal = (goals.healthGoalKey as HealthGoal | null | undefined) ?? null;
    const goalDirection = (goals.goalType as GoalDirection | undefined) ?? 'maintain';

    return {
      id: 'core-profile',
      email: undefined,
      name: basics.name,
      age: basics.age,
      height: basics.heightCm,
      weight: basics.weightKg,
      gender: mapGender(basics.sex),
      activityLevel: mapActivityLevel(goals.activityLevel),
      dietaryRestrictions: dietaryStringToRestrictions(prefs.dietary),
      allergies: prefs.allergies ?? [],
      dislikedFoods: prefs.dislikedIngredients ?? [],
      preferredCuisines: prefs.preferredCuisines ?? [],
      healthGoals: healthGoalToArray(healthGoal),
      goalDirection,
      customGoalTitle: goals.customGoalLabel ?? undefined,
      customGoalMotivation: goals.customGoalMotivation ?? undefined,
      targetWeight: goals.targetWeightKg ?? undefined,
      dailyCalorieTarget: goals.dailyCalories ?? undefined,
      dailyProteinTarget: goals.proteinTargetG ?? undefined,
      dailyCarbTarget: goals.carbsTargetG ?? undefined,
      dailyFatTarget: goals.fatsTargetG ?? undefined,
      maxCookingTime: prefs.maxCookingTime ?? undefined,
      preferredMealTypes: prefs.preferredMealTypes ?? [],
      preferredMealTypesNormalized: undefined,
      createdAt: '1970-01-01T00:00:00.000Z',
      updatedAt: '1970-01-01T00:00:00.000Z',
    } as EnhancedUserProfile;
  }, [profile]);

  const setPersonalInfo = useCallback(async (info: {
    name?: string;
    age?: number;
    height?: number;
    weight?: number;
    gender?: 'male' | 'female' | 'other' | 'prefer-not-to-say';
    activityLevel?: ActivityLevel;
  }) => {
    const { activityLevel, ...basics } = info;
    savePartial('basics', {
      name: basics.name,
      age: basics.age,
      heightCm: basics.height,
      weightKg: basics.weight,
      sex: mapGenderBack(info.gender),
    });
    if (activityLevel) {
      savePartial('goals', { activityLevel: mapActivityLevelBack(activityLevel) });
    }
  }, [savePartial]);

  const setDietaryPreferences = useCallback(async (preferences: {
    dietaryRestrictions: DietaryRestriction[];
    allergies: string[];
    dislikedFoods: string[];
    preferredCuisines: string[];
  }) => {
    savePartial('preferences', {
      dietary: restrictionsToDietaryString(preferences.dietaryRestrictions),
      allergies: preferences.allergies,
      dislikedIngredients: preferences.dislikedFoods,
      preferredCuisines: preferences.preferredCuisines,
    });
  }, [savePartial]);

  const setHealthGoals = useCallback(async (goals: {
    healthGoals: HealthGoal[];
    goalDirection: GoalDirection;
    customGoalTitle?: string;
    customGoalMotivation?: string;
    targetWeight?: number;
    dailyCalorieTarget?: number;
    dailyProteinTarget?: number;
    dailyCarbTarget?: number;
    dailyFatTarget?: number;
  }) => {
    const primaryGoal = goals.healthGoals?.[0] ?? null;
    const goalKey = primaryGoal ?? directionToGoal(goals.goalDirection);
    const customSelected = goalKey === 'custom';

    savePartial('goals', {
      goalType: goals.goalDirection,
      healthGoalKey: goalKey,
      customGoalLabel: customSelected ? goals.customGoalTitle ?? null : null,
      customGoalMotivation: customSelected ? goals.customGoalMotivation ?? null : null,
      dailyCalories: goals.dailyCalorieTarget,
      proteinTargetG: goals.dailyProteinTarget,
      carbsTargetG: goals.dailyCarbTarget,
      fatsTargetG: goals.dailyFatTarget,
      targetWeightKg: goals.targetWeight,
    });
  }, [savePartial]);

  const setCookingPreferences = useCallback(async (preferences: {
    maxCookingTime?: number;
    preferredMealTypes: string[];
  }) => {
    savePartial('preferences', {
      maxCookingTime: preferences.maxCookingTime,
      preferredMealTypes: preferences.preferredMealTypes,
    });
  }, [savePartial]);

  return {
    profile: enhancedProfile,
    isLoading,
    setPersonalInfo,
    setDietaryPreferences,
    setHealthGoals,
    setCookingPreferences,
  };
};
