// Client-side Supabase instance for React Native.
// Uses AsyncStorage for persistent auth sessions on native platforms.

import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

const authOptions =
  Platform.OS === 'web'
    ? { persistSession: true, autoRefreshToken: true }
    : { persistSession: true, autoRefreshToken: true, storage: AsyncStorage };

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: authOptions,
  db: { schema: 'public' },
});
