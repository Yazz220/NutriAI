/**
 * Delete Account Edge Function
 *
 * Permanently deletes the authenticated user's account and all associated data.
 * Uses the service role key to call admin.deleteUser(), which cascades through
 * RLS-protected tables.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders, corsResponse, jsonError, jsonResponse } from '../_shared/cors.ts';
import { verifyAuth } from '../_shared/auth.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return corsResponse(req);
  }

  // Verify the caller is authenticated
  const { user, error: authErr } = await verifyAuth(req);
  if (authErr) return authErr;

  const cors = getCorsHeaders(req);

  try {
    const userId = user!.id;
    console.log(`[delete-account] Deleting user ${userId}`);

    // Use service role client for admin operations
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Delete user via Supabase Admin API (cascades through foreign keys)
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error('[delete-account] Admin deleteUser error:', deleteError);
      return jsonError('Failed to delete account', 500, req);
    }

    console.log(`[delete-account] User ${userId} deleted successfully`);
    return jsonResponse({ success: true }, 200, req);
  } catch (error) {
    console.error('[delete-account] Error:', error);
    return jsonError(
      error instanceof Error ? error.message : 'Internal server error',
      500,
      req,
    );
  }
});
