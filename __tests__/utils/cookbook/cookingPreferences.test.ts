import { saveCookingPreference } from '@/utils/cookbook/cookingPreferences';
import { supabase } from '@/lib/supabase';

jest.mock('@/lib/supabase', () => ({
  supabase: { schema: jest.fn() },
}));

describe('cooking preferences', () => {
  it('uses the authenticated private-schema table and an idempotent key', async () => {
    const upsert = jest.fn().mockResolvedValue({ error: null });
    const from = jest.fn().mockReturnValue({ upsert });
    jest.mocked(supabase.schema).mockReturnValue({ from } as never);

    await expect(saveCookingPreference({
      userId: 'user-1',
      key: 'measurement_system',
      value: ' metric ',
      action: 'save',
    })).resolves.toEqual({
      success: true,
      action: 'saved',
      key: 'measurement_system',
      value: 'metric',
    });

    expect(supabase.schema).toHaveBeenCalledWith('nutriai');
    expect(from).toHaveBeenCalledWith('cooking_preferences');
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',
        preference_key: 'measurement_system',
        value: 'metric',
      }),
      { onConflict: 'user_id,preference_key,value', ignoreDuplicates: false },
    );
  });
});
