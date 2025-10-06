import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { useEffect, useState, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase/functions/_shared/supabaseClient';
import { useAuth } from '@/hooks/useAuth';
import { HealthGoal } from '@/types/onboarding';

export type GoalType = 'maintain' | 'lose' | 'gain';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'athlete';
export type UnitSystem = 'metric' | 'imperial';

export interface UserBasics {
  name?: string;
  age?: number;
  sex?: 'male' | 'female' | 'other';
  heightCm?: number;
  weightKg?: number;
}

export interface UserGoals {
  dailyCalories?: number;
  proteinTargetG?: number;
  carbsTargetG?: number;
  fatsTargetG?: number;
  goalType?: GoalType;
  activityLevel?: ActivityLevel;
  customGoalLabel?: string;
  customGoalMotivation?: string;
  usesCustomCalorieTarget?: boolean;
  recommendedCalories?: number;
  recommendedProteinG?: number;
  recommendedCarbsG?: number;
  recommendedFatsG?: number;
  healthGoalKey?: HealthGoal | null;
}

export interface UserPreferencesProfile {
  allergies: string[];
  dietary?: 'vegan' | 'vegetarian' | 'pescatarian' | 'halal' | 'kosher' | 'gluten_free' | 'keto' | 'paleo' | 'none';
  dislikedIngredients: string[];
  preferredCuisines: string[];
  preferredMealTypes?: string[];
  maxCookingTime?: number;
}

export interface UserProfileState {
  basics: UserBasics;
  goals: UserGoals;
  preferences: UserPreferencesProfile;
  metrics: { unitSystem: UnitSystem };
}

const normalizeGenderFromGoals = (value?: string | null): 'male' | 'female' | 'other' | undefined => {
  if (!value) return undefined;
  if (value === 'prefer-not-to-say') return 'other';
  if (value === 'male' || value === 'female') return value;
  return 'other';
};

const serializeGenderForGoals = (sex?: 'male' | 'female' | 'other'): string | undefined => {
  if (!sex) return undefined;
  if (sex === 'other') return 'prefer-not-to-say';
  return sex;
};

const defaultProfile: UserProfileState = {
  basics: {},
  goals: {},
  preferences: { allergies: [], dislikedIngredients: [], preferredCuisines: [], preferredMealTypes: [], maxCookingTime: undefined },
  metrics: { unitSystem: 'metric' },
};

const STORAGE_KEY = 'userProfile';
const QUERY_KEY = ['profile'];

export const [UserProfileProvider, useUserProfile] = createContextHook(() => {
  const [profile, setProfile] = useState<UserProfileState>(defaultProfile);
  const [isLoading, setIsLoading] = useState(true);
  const { session, user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const cached = { ...defaultProfile, ...JSON.parse(raw) } as UserProfileState;
          setProfile(cached);
          // Seed React Query cache for instant availability
          queryClient.setQueryData(QUERY_KEY, cached);
        }
      } finally {
        setIsLoading(false);
      }
    })();
  }, [queryClient]);

  useEffect(() => {
    if (!isLoading) {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(profile)).catch(() => {});
    }
  }, [profile, isLoading]);

  // React Query: fetch profile from Supabase when authenticated
  const fetchProfile = async (): Promise<UserProfileState | undefined> => {
    if (!user) return undefined;
    // Use nutriai schema per MCP discovery
    const { data, error } = await supabase
      .schema('nutriai')
      .from('profiles')
      .select('user_id, display_name, units, goals, preferences')
      .eq('user_id', user.id)
      .maybeSingle();
    if (error) {
      console.warn('[Profile] Fetch error', error.message);
      return undefined;
    }

    // If no row yet, create a default profile for this user (first login)
    let row = data as any | null;
    if (!row) {
      const insertDefault = {
        user_id: user.id,
        display_name: null,
        units: 'metric',
        goals: {},
        preferences: { allergies: [], disliked_ingredients: [], preferred_cuisines: [] },
      };
      const { data: created, error: insertErr } = await supabase
        .schema('nutriai')
        .from('profiles')
        .insert(insertDefault)
        .select('user_id, display_name, units, goals, preferences')
        .single();
      if (insertErr) {
        console.warn('[Profile] Insert default error', insertErr.message);
        return undefined;
      }
      row = created as any;
    }

    const goals = (row?.goals || {}) as Partial<UserGoals> & Record<string, any>;
    const prefs = (row?.preferences || {}) as Partial<UserPreferencesProfile> & Record<string, any>;

    const rawGender =
      (goals as Record<string, any>).gender ??
      (goals as Record<string, any>)['gender'] ??
      (goals as Record<string, any>)['sex'];

    const mapped: UserProfileState = {
      basics: {
        name: row?.display_name ?? undefined,
        // Extract basic metrics from goals JSONB
        age: goals.age ?? undefined,
        heightCm: goals.height_cm ?? goals.heightCm ?? undefined,
        weightKg: goals.weight_kg ?? goals.weightKg ?? undefined,
        sex: normalizeGenderFromGoals(rawGender),
      },
      goals: {
        dailyCalories: goals.dailyCalories ?? goals.daily_calories ?? undefined,
        proteinTargetG: goals.proteinTargetG ?? goals.protein_target_g ?? undefined,
        carbsTargetG: goals.carbsTargetG ?? goals.carbs_target_g ?? undefined,
        fatsTargetG: goals.fatsTargetG ?? goals.fats_target_g ?? undefined,
        goalType: goals.goalType ?? goals.goal_type ?? undefined,
        activityLevel: goals.activityLevel ?? goals.activity_level ?? undefined,
        customGoalLabel: goals.customGoalLabel ?? goals.custom_goal_label ?? undefined,
        customGoalMotivation: goals.customGoalMotivation ?? goals.custom_goal_motivation ?? undefined,
        usesCustomCalorieTarget: goals.usesCustomCalorieTarget ?? goals.uses_custom_calorie_target ?? undefined,
        recommendedCalories: goals.recommendedCalories ?? goals.recommended_calories ?? undefined,
        recommendedProteinG: goals.recommendedProteinG ?? goals.recommended_protein_g ?? undefined,
        recommendedCarbsG: goals.recommendedCarbsG ?? goals.recommended_carbs_g ?? undefined,
        recommendedFatsG: goals.recommendedFatsG ?? goals.recommended_fats_g ?? undefined,
        healthGoalKey: goals.healthGoalKey ?? goals.health_goal_key ?? undefined,
        targetWeightKg: goals.targetWeightKg ?? goals.target_weight_kg ?? undefined,
      },
      preferences: {
        allergies: prefs.allergies ?? [],
        dietary: prefs.dietary ?? undefined,
        dislikedIngredients: prefs.dislikedIngredients ?? prefs.disliked_ingredients ?? [],
        preferredCuisines: prefs.preferredCuisines ?? prefs.preferred_cuisines ?? [],
        preferredMealTypes: prefs.preferredMealTypes ?? prefs.preferred_meal_types ?? [],
        maxCookingTime: prefs.maxCookingTime ?? prefs.max_cooking_time ?? undefined,
      },
      metrics: { unitSystem: (row?.units as UnitSystem) ?? 'metric' },
    };
    return mapped;
  };

  const { data } = useQuery<UserProfileState | undefined>({
    queryKey: QUERY_KEY,
    queryFn: fetchProfile,
    enabled: !!session && !!user, // only when signed in
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 60, // 1 hour
  });

  useEffect(() => {
    (async () => {
      if (!data) return;
      setProfile((prev) => ({ ...prev, ...data }));
      queryClient.setQueryData(QUERY_KEY, data);
      try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch {}
    })();
  }, [data, queryClient]);

  const updateBasics = useCallback((patch: Partial<UserBasics>) => {
    setProfile((p) => ({ ...p, basics: { ...p.basics, ...patch } }));
  }, []);

  const updateGoals = useCallback((patch: Partial<UserGoals>) => {
    setProfile((p) => ({ ...p, goals: { ...p.goals, ...patch } }));
  }, []);

  const updatePreferences = useCallback((patch: Partial<UserPreferencesProfile>) => {
    setProfile((p) => ({ ...p, preferences: { ...p.preferences, ...patch } }));
  }, []);

  const setUnitSystem = useCallback((unitSystem: UnitSystem) => {
    setProfile((p) => ({ ...p, metrics: { unitSystem } }));
  }, []);

  // Persist profile to Supabase (nutriai.profiles)
  type SaveInput = Partial<UserProfileState>;

  // Validate profile data before saving
  const validateProfile = (profile: Partial<UserProfileState>): string[] => {
    const errors: string[] = [];
    
    // Validate calories
    if (profile.goals?.dailyCalories !== undefined) {
      if (profile.goals.dailyCalories < 1000 || profile.goals.dailyCalories > 5000) {
        errors.push('Daily calories must be between 1000 and 5000');
      }
    }
    
    // Validate age
    if (profile.basics?.age !== undefined) {
      if (profile.basics.age < 13 || profile.basics.age > 120) {
        errors.push('Age must be between 13 and 120');
      }
    }
    
    // Validate height
    if (profile.basics?.heightCm !== undefined) {
      if (profile.basics.heightCm < 100 || profile.basics.heightCm > 250) {
        errors.push('Height must be between 100 and 250 cm');
      }
    }
    
    // Validate weight
    if (profile.basics?.weightKg !== undefined) {
      if (profile.basics.weightKg < 30 || profile.basics.weightKg > 300) {
        errors.push('Weight must be between 30 and 300 kg');
      }
    }
    
    // Validate macros
    if (profile.goals?.proteinTargetG !== undefined && profile.goals.proteinTargetG < 0) {
      errors.push('Protein target cannot be negative');
    }
    if (profile.goals?.carbsTargetG !== undefined && profile.goals.carbsTargetG < 0) {
      errors.push('Carbs target cannot be negative');
    }
    if (profile.goals?.fatsTargetG !== undefined && profile.goals.fatsTargetG < 0) {
      errors.push('Fats target cannot be negative');
    }
    
    return errors;
  };

  const toRow = (state: UserProfileState | SaveInput) => {
    // Merge basic metrics into goals JSONB for database storage
    const goalsData = state.goals ?? (state as any).goals ?? {};
    const basicsData = state.basics ?? {};
    
    return {
      user_id: user?.id,
      display_name: basicsData.name ?? (state as any).display_name ?? null,
      units: state.metrics?.unitSystem ?? (state as any).units ?? 'metric',
      goals: {
        // Nutrition goals (camelCase to snake_case for consistency)
        daily_calories: goalsData.dailyCalories,
        protein_target_g: goalsData.proteinTargetG,
        carbs_target_g: goalsData.carbsTargetG,
        fats_target_g: goalsData.fatsTargetG,
        goal_type: goalsData.goalType,
        activity_level: goalsData.activityLevel,
        custom_goal_label: goalsData.customGoalLabel,
        custom_goal_motivation: goalsData.customGoalMotivation,
        uses_custom_calorie_target: goalsData.usesCustomCalorieTarget,
        recommended_calories: goalsData.recommendedCalories,
        recommended_protein_g: goalsData.recommendedProteinG,
        recommended_carbs_g: goalsData.recommendedCarbsG,
        recommended_fats_g: goalsData.recommendedFatsG,
        health_goal_key: goalsData.healthGoalKey,
        // Basic metrics from onboarding
        age: basicsData.age ?? (goalsData as any).age,
        height_cm: basicsData.heightCm ?? (goalsData as any).heightCm,
        weight_kg: basicsData.weightKg ?? (goalsData as any).weightKg,
        target_weight_kg: (goalsData as any).targetWeightKg,
        gender: serializeGenderForGoals(basicsData.sex) ?? (goalsData as any).gender,
      },
      preferences: {
        allergies: state.preferences?.allergies ?? [],
        dietary: state.preferences?.dietary,
        disliked_ingredients: state.preferences?.dislikedIngredients ?? [],
        preferred_cuisines: state.preferences?.preferredCuisines ?? [],
        preferred_meal_types: state.preferences?.preferredMealTypes ?? [],
        max_cooking_time: state.preferences?.maxCookingTime ?? null,
      },
    };
  };

  const saveMutation = useMutation({
    mutationKey: ['profile:save'],
    mutationFn: async (patch: SaveInput) => {
      if (!user) throw new Error('Not authenticated');
      const next: UserProfileState = {
        ...defaultProfile,
        ...profile,
        ...patch,
        basics: { ...profile.basics, ...(patch.basics ?? {}) },
        goals: { ...profile.goals, ...(patch.goals ?? {}) },
        preferences: { ...profile.preferences, ...(patch.preferences ?? {}) },
        metrics: { unitSystem: patch.metrics?.unitSystem ?? profile.metrics.unitSystem },
      };
      
      // Validate profile data
      const validationErrors = validateProfile(next);
      if (validationErrors.length > 0) {
        console.warn('[Profile] Validation errors:', validationErrors);
        throw new Error(`Invalid profile data: ${validationErrors.join(', ')}`);
      }
      
      const row = toRow(next);
      const { error } = await supabase
        .schema('nutriai')
        .from('profiles')
        .upsert(row, { onConflict: 'user_id' });
      if (error) throw error;
      return next;
    },
    onMutate: async (patch: SaveInput) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEY });
      const previous = queryClient.getQueryData<UserProfileState | undefined>(QUERY_KEY);
      // Optimistic local update
      setProfile((p) => ({
        ...p,
        ...patch,
        basics: { ...p.basics, ...(patch.basics ?? {}) },
        goals: { ...p.goals, ...(patch.goals ?? {}) },
        preferences: { ...p.preferences, ...(patch.preferences ?? {}) },
        metrics: { unitSystem: patch.metrics?.unitSystem ?? p.metrics.unitSystem },
      }));
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) {
        setProfile(ctx.previous);
        queryClient.setQueryData(QUERY_KEY, ctx.previous);
      }
    },
    onSuccess: async (next) => {
      queryClient.setQueryData(QUERY_KEY, next);
      try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {}
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });

  const saveProfile = useCallback((patch: SaveInput) => saveMutation.mutate(patch), [saveMutation]);
  const savePartial = useCallback(
    (path: 'basics' | 'goals' | 'preferences' | 'metrics', value: any) => {
      saveMutation.mutate({ [path]: value } as SaveInput);
    },
    [saveMutation]
  );

  return {
    isLoading,
    profile,
    setProfile,
    updateBasics,
    updateGoals,
    updatePreferences,
    setUnitSystem,
    saveProfile,
    savePartial,
  };
});
