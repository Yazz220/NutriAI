// Shared Supabase admin client for Edge Functions (Deno runtime).
// Uses SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from Function secrets.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
