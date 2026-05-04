import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { verifyAuth } from '../_shared/auth.ts';
import { corsResponse, jsonError, jsonResponse } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return corsResponse(req);

  const { user, error: authError } = await verifyAuth(req);
  if (authError) return authError;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return jsonError('Supabase service client is not configured.', 500, req);
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const { data, error } = await admin
    .schema('nutriai')
    .from('credit_ledger')
    .select('amount')
    .eq('user_id', user!.id);

  if (error) return jsonError(error.message, 500, req);

  const balance = (data ?? []).reduce((sum: number, row: { amount: number | string }) => {
    return sum + Number(row.amount);
  }, 0);

  return jsonResponse({ balance }, 200, req);
});
