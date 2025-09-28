import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { EnhancedUserProfile, DietaryRestriction, HealthGoal, ActivityLevel, GoalDirection } from '../types';
import { useUserProfile } from './useUserProfile';

const STORAGE_KEY = 'enhanced_user_profile';

const createDefaultProfile = (): EnhancedUserProfile => ({
  id: Date.now().toString(),
  dietaryRestrictions: [],
  allergies: [],
  dislikedFoods: [],
  preferredCuisines: [],
  healthGoals: [],
  goalDirection: 'maintain',
  customGoalTitle: undefined,
  customGoalMotivation: undefined,
  preferredMealTypes: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

export const useUserProfileStore = () => {
  const [profile, setProfile] = useState<EnhancedUserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Get the main profile system to sync data
  const mainProfile = useUserProfile();

  const loadProfile = async (options?: { showSpinner?: boolean }) => {
    const showSpinner = options?.showSpinner ?? profile === null;
    if (showSpinner) {
      setIsLoading(true);
    }

    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      let enhancedProfile: EnhancedUserProfile;

      if (stored) {
        enhancedProfile = JSON.parse(stored);
      } else {
        enhancedProfile = createDefaultProfile();
      }

      // Sync with main profile system
      if (mainProfile.profile) {
        const coreGoals = mainProfile.profile.goals ?? {};
        const existingGoal = enhancedProfile.healthGoals?.[0] ?? null;
        const normalizedGoal = normalizeHealthGoalKey(
          (coreGoals.healthGoalKey as string | null | undefined) ?? existingGoal,
          (coreGoals.goalType as GoalDirection | undefined) ?? enhancedProfile.goalDirection
        );
        const nextGoalList = normalizedGoal ? [normalizedGoal] : enhancedProfile.healthGoals ?? [];
        const goalDirection = mapHealthGoalsToGoalType(
          nextGoalList,
          (coreGoals.goalType as GoalDirection | undefined) ?? enhancedProfile.goalDirection
        );
        const isCustomGoal = nextGoalList[0] === 'custom';
        const nextCustomTitle = isCustomGoal
          ? (coreGoals.customGoalLabel as string | undefined) ?? enhancedProfile.customGoalTitle
          : undefined;
        const nextCustomMotivation = isCustomGoal
          ? (coreGoals.customGoalMotivation as string | undefined) ?? enhancedProfile.customGoalMotivation
          : undefined;

        enhancedProfile = {
          ...enhancedProfile,
          name: mainProfile.profile.basics.name || enhancedProfile.name,
          age: mainProfile.profile.basics.age || enhancedProfile.age,
          height: mainProfile.profile.basics.heightCm || enhancedProfile.height,
          weight: mainProfile.profile.basics.weightKg || enhancedProfile.weight,
          gender: mapGender(mainProfile.profile.basics.sex) || enhancedProfile.gender,
          activityLevel: mapActivityLevel(mainProfile.profile.goals.activityLevel) || enhancedProfile.activityLevel,
          dailyCalorieTarget: mainProfile.profile.goals.dailyCalories || enhancedProfile.dailyCalorieTarget,
          dailyProteinTarget: mainProfile.profile.goals.proteinTargetG || enhancedProfile.dailyProteinTarget,
          dailyCarbTarget: mainProfile.profile.goals.carbsTargetG || enhancedProfile.dailyCarbTarget,
          dailyFatTarget: mainProfile.profile.goals.fatsTargetG || enhancedProfile.dailyFatTarget,
          healthGoals: nextGoalList,
          goalDirection: goalDirection ?? 'maintain',
          customGoalTitle: nextCustomTitle,
          customGoalMotivation: nextCustomMotivation,
          allergies: mainProfile.profile.preferences.allergies || enhancedProfile.allergies,
          dislikedFoods: mainProfile.profile.preferences.dislikedIngredients || enhancedProfile.dislikedFoods,
          preferredCuisines: mainProfile.profile.preferences.preferredCuisines || enhancedProfile.preferredCuisines,
          updatedAt: new Date().toISOString(),
        };
      }

      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(enhancedProfile));
      setProfile(enhancedProfile);
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<EnhancedUserProfile>) => {
    if (!profile) return;

    const updatedProfile = {
      ...profile,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedProfile));
      setProfile(updatedProfile);
      
      // Sync back to main profile system
      await syncToMainProfile(updatedProfile);
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  const syncToMainProfile = async (enhancedProfile: EnhancedUserProfile) => {
    try {
      // Update basics
      if (enhancedProfile.name || enhancedProfile.age || enhancedProfile.height || enhancedProfile.weight || enhancedProfile.gender) {
        await mainProfile.savePartial('basics', {
          name: enhancedProfile.name,
          age: enhancedProfile.age,
          heightCm: enhancedProfile.height,
          weightKg: enhancedProfile.weight,
          sex: mapGenderBack(enhancedProfile.gender),
        });
      }

      // Update goals
      if (
        enhancedProfile.dailyCalorieTarget ||
        enhancedProfile.dailyProteinTarget ||
        enhancedProfile.dailyCarbTarget ||
        enhancedProfile.dailyFatTarget ||
        enhancedProfile.activityLevel ||
        (enhancedProfile.healthGoals?.length ?? 0) > 0 ||
        enhancedProfile.goalDirection
      ) {
        const goalType = mapHealthGoalsToGoalType(enhancedProfile.healthGoals ?? [], enhancedProfile.goalDirection);
        const primaryGoal = enhancedProfile.healthGoals?.[0] ?? null;
        const goalKey = primaryGoal ?? (goalType ? directionToHealthGoal(goalType) : null);
        const isCustom = goalKey === 'custom';

        await mainProfile.savePartial('goals', {
          dailyCalories: enhancedProfile.dailyCalorieTarget,
          proteinTargetG: enhancedProfile.dailyProteinTarget,
          carbsTargetG: enhancedProfile.dailyCarbTarget,
          fatsTargetG: enhancedProfile.dailyFatTarget,
          activityLevel: mapActivityLevelBack(enhancedProfile.activityLevel),
          goalType,
          healthGoalKey: goalKey,
          customGoalLabel: isCustom ? enhancedProfile.customGoalTitle ?? null : null,
          customGoalMotivation: isCustom ? enhancedProfile.customGoalMotivation ?? null : null,
        });
      }

      // Update preferences
      await mainProfile.savePartial('preferences', {
        allergies: enhancedProfile.allergies,
        dislikedIngredients: enhancedProfile.dislikedFoods,
        preferredCuisines: enhancedProfile.preferredCuisines,
        dietary: mapDietaryRestrictions(enhancedProfile.dietaryRestrictions),
      });
    } catch (error) {
      console.error('Error syncing to main profile:', error);
    }
  };

  const setPersonalInfo = async (info: {
    name?: string;
    age?: number;
    height?: number;
    weight?: number;
    gender?: 'male' | 'female' | 'other' | 'prefer-not-to-say';
    activityLevel?: ActivityLevel;
  }) => {
    await updateProfile(info);
  };

  const setDietaryPreferences = async (preferences: {
    dietaryRestrictions: DietaryRestriction[];
    allergies: string[];
    dislikedFoods: string[];
    preferredCuisines: string[];
  }) => {
    await updateProfile(preferences);
  };

  const setHealthGoals = async (goals: {
    healthGoals: HealthGoal[];
    goalDirection?: GoalDirection;
    customGoalTitle?: string;
    customGoalMotivation?: string;
    targetWeight?: number;
    dailyCalorieTarget?: number;
    dailyProteinTarget?: number;
    dailyCarbTarget?: number;
    dailyFatTarget?: number;
  }) => {
    const {
      healthGoals,
      goalDirection,
      customGoalTitle,
      customGoalMotivation,
      ...rest
    } = goals;

    const selectedGoal = healthGoals?.[0];
    const inferredDirection = selectedGoal
      ? healthGoalToDirection(selectedGoal, goalDirection ?? profile?.goalDirection ?? 'maintain')
      : goalDirection ?? profile?.goalDirection ?? 'maintain';

    const nextCustomTitle = selectedGoal === 'custom'
      ? customGoalTitle ?? profile?.customGoalTitle
      : undefined;
    const nextCustomMotivation = selectedGoal === 'custom'
      ? customGoalMotivation ?? profile?.customGoalMotivation
      : undefined;

    await updateProfile({
      healthGoals: healthGoals ?? profile?.healthGoals ?? [],
      goalDirection: inferredDirection,
      customGoalTitle: nextCustomTitle,
      customGoalMotivation: nextCustomMotivation,
      ...rest,
    });
  };

  const setCookingPreferences = async (preferences: {
    cookingSkill?: string;
    maxCookingTime?: number;
    preferredMealTypes: string[];
  }) => {
    await updateProfile(preferences);
  };

  useEffect(() => {
    loadProfile({ showSpinner: true });
  }, []);

  useEffect(() => {
    if (mainProfile.profile) {
      loadProfile({ showSpinner: false });
    }
  }, [mainProfile.profile]); // Reload when main profile changes

  return {
    profile,
    isLoading,
    updateProfile,
    setPersonalInfo,
    setDietaryPreferences,
    setHealthGoals,
    setCookingPreferences,
  };
};

// Helper functions to map between profile systems
function mapGender(sex?: 'male' | 'female' | 'other'): 'male' | 'female' | 'other' | 'prefer-not-to-say' | undefined {
  if (!sex) return undefined;
  if (sex === 'other') return 'prefer-not-to-say';
  return sex;
}

function mapGenderBack(gender?: 'male' | 'female' | 'other' | 'prefer-not-to-say'): 'male' | 'female' | 'other' | undefined {
  if (!gender) return undefined;
  if (gender === 'prefer-not-to-say') return 'other';
  return gender as 'male' | 'female' | 'other';
}

function mapActivityLevel(activityLevel?: 'sedentary' | 'light' | 'moderate' | 'active' | 'athlete'): ActivityLevel | undefined {
  if (!activityLevel) return undefined;
  const mapping: Record<string, ActivityLevel> = {
    'sedentary': 'sedentary',
    'light': 'lightly-active',
    'moderate': 'moderately-active',
    'active': 'very-active',
    'athlete': 'extremely-active'
  };
  return mapping[activityLevel];
}

function mapActivityLevelBack(activityLevel?: ActivityLevel): 'sedentary' | 'light' | 'moderate' | 'active' | 'athlete' | undefined {
  if (!activityLevel) return undefined;
  const mapping: Record<ActivityLevel, 'sedentary' | 'light' | 'moderate' | 'active' | 'athlete'> = {
    'sedentary': 'sedentary',
    'lightly-active': 'light',
    'moderately-active': 'moderate',
    'very-active': 'active',
    'extremely-active': 'athlete'
  };
  return mapping[activityLevel];
}

function mapHealthGoalsToGoalType(healthGoals: HealthGoal[] = [], fallback?: GoalDirection | null): GoalDirection {
  if (!healthGoals || healthGoals.length === 0) {
    return fallback ?? 'maintain';
  }
  if (healthGoals.some(goal => goal === 'lose-weight')) {
    return 'lose';
  }
  if (healthGoals.some(goal => goal === 'gain-weight')) {
    return 'gain';
  }
  if (healthGoals.some(goal => goal === 'custom')) {
    return fallback ?? 'maintain';
  }
  return 'maintain';
}

const LEGACY_HEALTH_GOAL_MAP: Record<string, HealthGoal> = {
  'weight-loss': 'lose-weight',
  'weight-gain': 'gain-weight',
  'muscle-gain': 'gain-weight',
  'build-muscle': 'gain-weight',
  'maintenance': 'maintain-weight',
  'general-health': 'maintain-weight',
  'improve-health': 'maintain-weight',
  'manage-restrictions': 'maintain-weight',
};

function directionToHealthGoal(direction: GoalDirection): HealthGoal {
  switch (direction) {
    case 'lose':
      return 'lose-weight';
    case 'gain':
      return 'gain-weight';
    default:
      return 'maintain-weight';
  }
}

function healthGoalToDirection(goal: HealthGoal, fallback?: GoalDirection | null): GoalDirection {
  switch (goal) {
    case 'lose-weight':
      return 'lose';
    case 'gain-weight':
      return 'gain';
    case 'custom':
      return fallback ?? 'maintain';
    default:
      return 'maintain';
  }
}

function normalizeHealthGoalKey(
  goal: string | HealthGoal | null | undefined,
  fallbackDirection?: GoalDirection | null
): HealthGoal | null {
  if (!goal) {
    return fallbackDirection ? directionToHealthGoal(fallbackDirection) : null;
  }

  if (goal === 'custom' || goal === 'lose-weight' || goal === 'gain-weight' || goal === 'maintain-weight') {
    return goal as HealthGoal;
  }

  const mapped = LEGACY_HEALTH_GOAL_MAP[String(goal).toLowerCase()] || LEGACY_HEALTH_GOAL_MAP[String(goal)];
  if (mapped) {
    return mapped;
  }

  return fallbackDirection ? directionToHealthGoal(fallbackDirection) : null;
}

function mapDietaryRestrictions(restrictions: DietaryRestriction[]): 'vegan' | 'vegetarian' | 'pescatarian' | 'halal' | 'kosher' | 'gluten_free' | 'keto' | 'paleo' | 'none' {
  if (restrictions.includes('vegan')) return 'vegan';
  if (restrictions.includes('vegetarian')) return 'vegetarian';
  if (restrictions.includes('pescatarian')) return 'pescatarian';
  if (restrictions.includes('halal')) return 'halal';
  if (restrictions.includes('kosher')) return 'kosher';
  if (restrictions.includes('gluten-free')) return 'gluten_free';
  if (restrictions.includes('keto')) return 'keto';
  if (restrictions.includes('paleo')) return 'paleo';
  return 'none';
}

