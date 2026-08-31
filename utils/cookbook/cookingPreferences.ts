import { supabase } from '@/lib/supabase';

export type CookingPreferenceKey =
  | 'allergy'
  | 'dietary_restriction'
  | 'disliked_ingredient'
  | 'measurement_system'
  | 'default_servings'
  | 'appliance'
  | 'cooking_goal';

export interface CookingPreference {
  id: string;
  key: CookingPreferenceKey;
  value: string;
  updatedAt: string;
}

interface CookingPreferenceRow {
  id: string;
  preference_key: CookingPreferenceKey;
  value: string;
  updated_at: string;
}

let cachedPreferences: { userId: string; expiresAt: number; value: CookingPreference[] } | null = null;

export async function loadCookingPreferences(userId: string): Promise<CookingPreference[]> {
  if (cachedPreferences?.userId === userId && cachedPreferences.expiresAt > Date.now()) {
    return cachedPreferences.value;
  }

  const { data, error } = await supabase
    .schema('nutriai')
    .from('cooking_preferences')
    .select('id, preference_key, value, updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(30);
  if (error) throw error;

  const value = ((data ?? []) as CookingPreferenceRow[]).map((row) => ({
    id: row.id,
    key: row.preference_key,
    value: row.value,
    updatedAt: row.updated_at,
  }));
  cachedPreferences = { userId, value, expiresAt: Date.now() + 5 * 60_000 };
  return value;
}

export async function saveCookingPreference(input: {
  userId: string;
  key: CookingPreferenceKey;
  value: string;
  action: 'save' | 'remove';
}): Promise<{ success: true; action: 'saved' | 'removed'; key: CookingPreferenceKey; value: string }> {
  const value = input.value.trim();
  if (!value) throw new Error('Preference value is required');

  if (input.action === 'remove') {
    const { error } = await supabase
      .schema('nutriai')
      .from('cooking_preferences')
      .delete()
      .eq('user_id', input.userId)
      .eq('preference_key', input.key)
      .ilike('value', value);
    if (error) throw error;
    cachedPreferences = null;
    return { success: true, action: 'removed', key: input.key, value };
  }

  const { error } = await supabase
    .schema('nutriai')
    .from('cooking_preferences')
    .upsert({
      user_id: input.userId,
      preference_key: input.key,
      value,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,preference_key,value', ignoreDuplicates: false });
  if (error) throw error;
  cachedPreferences = null;
  return { success: true, action: 'saved', key: input.key, value };
}
