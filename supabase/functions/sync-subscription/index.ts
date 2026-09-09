import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { verifyAuth } from '../_shared/auth.ts';
import { corsResponse, jsonError, jsonResponse } from '../_shared/cors.ts';
import { logError, logInfo } from '../_shared/log.ts';
import {
  fetchRevenueCatSubscriber,
  syncRevenueCatSubscriber,
} from '../_shared/revenueCat.ts';
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';

const REVENUECAT_SECRET_API_KEY = Deno.env.get('REVENUECAT_SECRET_API_KEY') || '';
// App Review and TestFlight use sandbox receipts against the production app.
// RevenueCat remains authoritative and the environment is persisted for audit.
const ACCEPT_SANDBOX = Deno.env.get('REVENUECAT_ACCEPT_SANDBOX_EVENTS') !== 'false';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || '';

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return corsResponse(req);
  if (req.method !== 'POST') return jsonError('Method not allowed', 405, req);

  const { user, error: authError } = await verifyAuth(req);
  if (authError) return authError;
  if (!REVENUECAT_SECRET_API_KEY || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return jsonError('Subscription sync is not configured', 503, req);
  }

  try {
    const subscriber = await fetchRevenueCatSubscriber(
      user!.id,
      REVENUECAT_SECRET_API_KEY,
    );
    const result = await syncRevenueCatSubscriber(supabaseAdmin, user!.id, subscriber, {
      acceptSandbox: ACCEPT_SANDBOX,
    });
    if (result.ignored) {
      return jsonError('Sandbox subscriptions are not accepted by this environment', 409, req);
    }

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: req.headers.get('Authorization')! } },
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const snapshot = await userClient.schema('nutriai').rpc('get_subscription_access');
    if (snapshot.error) throw snapshot.error;

    logInfo('RevenueCat subscription synchronized', {
      userId: user!.id,
      environment: result.state.environment,
      status: result.state.status,
      productId: result.state.productId,
    });
    return jsonResponse({ access: snapshot.data }, 200, req);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Subscription sync failed';
    logError('RevenueCat subscription sync failed', { userId: user!.id, error: message });
    return jsonError('Folio could not refresh the subscription right now', 502, req);
  }
});
