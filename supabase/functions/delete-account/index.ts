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
import { logError, logInfo } from '../_shared/log.ts';
import { removeStoragePrefix } from '../_shared/storageCleanup.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const CAPTURE_BUCKET = 'recipe-captures';
const COOKBOOK_PAGE_BUCKET = Deno.env.get('COOKBOOK_PAGE_BUCKET') || 'cookbook-pages';

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
    logInfo('delete-account started', { userId });

    // Use service role client for admin operations
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Storage objects do not participate in database foreign-key cascades.
    // Remove both source captures and generated page artwork before deleting
    // auth data so an account deletion cannot leave private media behind.
    const [captureObjectsRemoved, pageArtObjectsRemoved] = await Promise.all([
      removeStoragePrefix(adminClient.storage, CAPTURE_BUCKET, userId),
      removeStoragePrefix(adminClient.storage, COOKBOOK_PAGE_BUCKET, userId),
    ]);

    // Delete user via Supabase Admin API (cascades through foreign keys).
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);

    if (deleteError) {
      logError('delete-account auth deletion failed', {
        userId,
        error: deleteError.message,
      });
      return jsonError('Failed to delete account', 500, req);
    }

    logInfo('delete-account completed', {
      userId,
      captureObjectsRemoved,
      pageArtObjectsRemoved,
    });
    return jsonResponse({ success: true }, 200, req);
  } catch (error) {
    logError('delete-account failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return jsonError(
      error instanceof Error ? error.message : 'Internal server error',
      500,
      req,
    );
  }
});
