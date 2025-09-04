import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { useEffect, useState, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase/functions/_shared/supabaseClient';
import { useAuth } from '@/hooks/useAuth';

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
}

export interface UserPreferencesProfile {
  allergies: string[];
  dietary?: 'vegan' | 'vegetarian' | 'pescatarian' | 'halal' | 'kosher' | 'gluten_free' | 'keto' | 'paleo' | 'none';
  dislikedIngredients: string[];
  preferredCuisines: string[];
}

export interface UserProfileState {
  basics: UserBasics;
  goals: UserGoals;
  preferences: UserPreferencesProfile;
  metrics: { unitSystem: UnitSystem };
}

const defaultProfile: UserProfileState = {
  basics: {},
  goals: {},
  preferences: { allergies: [], dislikedIngredients: [], preferredCuisines: [] },
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

    const mapped: UserProfileState = {
      basics: {
        name: row?.display_name ?? undefined,
      },
      goals: {
        dailyCalories: goals.dailyCalories ?? goals.daily_calories ?? undefined,
        proteinTargetG: goals.proteinTargetG ?? goals.protein_target_g ?? undefined,
        carbsTargetG: goals.carbsTargetG ?? goals.carbs_target_g ?? undefined,
        fatsTargetG: goals.fatsTargetG ?? goals.fats_target_g ?? undefined,
        goalType: goals.goalType ?? goals.goal_type ?? undefined,
        activityLevel: goals.activityLevel ?? goals.activity_level ?? undefined,
      },
      preferences: {
        allergies: prefs.allergies ?? [],
        dietary: prefs.dietary ?? undefined,
        dislikedIngredients: prefs.dislikedIngredients ?? prefs.disliked_ingredients ?? [],
        preferredCuisines: prefs.preferredCuisines ?? prefs.preferred_cuisines ?? [],
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

  const toRow = (state: UserProfileState | SaveInput) => ({
    user_id: user?.id,
    display_name: state.basics?.name ?? (state as any).display_name ?? null,
    units: state.metrics?.unitSystem ?? (state as any).units ?? 'metric',
    goals: state.goals ?? (state as any).goals ?? {},
    preferences: state.preferences ?? (state as any).preferences ?? {
      allergies: [],
      disliked_ingredients: [],
      preferred_cuisines: [],
    },
  });

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
