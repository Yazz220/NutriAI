import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { EnhancedUserProfile, DietaryRestriction, HealthGoal, ActivityLevel, CookingSkill } from '../types';
import { useUserProfile } from './useUserProfile';

const STORAGE_KEY = 'enhanced_user_profile';

const createDefaultProfile = (): EnhancedUserProfile => ({
  id: Date.now().toString(),
  dietaryRestrictions: [],
  allergies: [],
  dislikedFoods: [],
  preferredCuisines: [],
  healthGoals: [],
  preferredMealTypes: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

export const useUserProfileStore = () => {
  const [profile, setProfile] = useState<EnhancedUserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Get the main profile system to sync data
  const mainProfile = useUserProfile();

  const loadProfile = async () => {
    setIsLoading(true);
    
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
      if (enhancedProfile.dailyCalorieTarget || enhancedProfile.dailyProteinTarget || enhancedProfile.dailyCarbTarget || enhancedProfile.dailyFatTarget || enhancedProfile.activityLevel) {
        await mainProfile.savePartial('goals', {
          dailyCalories: enhancedProfile.dailyCalorieTarget,
          proteinTargetG: enhancedProfile.dailyProteinTarget,
          carbsTargetG: enhancedProfile.dailyCarbTarget,
          fatsTargetG: enhancedProfile.dailyFatTarget,
          activityLevel: mapActivityLevelBack(enhancedProfile.activityLevel),
          goalType: mapHealthGoalsToGoalType(enhancedProfile.healthGoals),
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
    targetWeight?: number;
    dailyCalorieTarget?: number;
    dailyProteinTarget?: number;
    dailyCarbTarget?: number;
    dailyFatTarget?: number;
  }) => {
    await updateProfile(goals);
  };

  const setCookingPreferences = async (preferences: {
    cookingSkill?: CookingSkill;
    maxCookingTime?: number;
    preferredMealTypes: string[];
  }) => {
    await updateProfile(preferences);
  };

  useEffect(() => {
    loadProfile();
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

function mapHealthGoalsToGoalType(healthGoals: HealthGoal[]): 'maintain' | 'lose' | 'gain' {
  if (healthGoals.includes('weight-loss')) return 'lose';
  if (healthGoals.includes('weight-gain') || healthGoals.includes('muscle-gain')) return 'gain';
  return 'maintain';
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