import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// Debug: validate envs at startup with masked output
(() => {
  try {
    const maskedKey = supabaseAnonKey ? `${supabaseAnonKey.slice(0, 6)}…${supabaseAnonKey.slice(-4)}` : 'MISSING';
    console.log('[Supabase] Init', {
      url: supabaseUrl || 'MISSING',
      anonKey: maskedKey,
      schema: 'public',
    });
    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('[Supabase] Missing URL or ANON KEY. Check .env EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY');
    }
  } catch (e) {
    // Never throw from module init
    console.error('[Supabase] Env validation error', e);
  }
})();

const authOptions = Platform.OS === 'web'
  ? { persistSession: true, autoRefreshToken: true }
  : { persistSession: true, autoRefreshToken: true, storage: AsyncStorage };

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: authOptions,
  db: { schema: 'public' },
});
