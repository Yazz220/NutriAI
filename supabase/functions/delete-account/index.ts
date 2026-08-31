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
import { revokeAppleAuthorization } from '../_shared/appleTokenRevocation.ts';
import { deleteRevenueCatSubscriber } from '../_shared/revenueCat.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const REVENUECAT_SECRET_API_KEY = Deno.env.get('REVENUECAT_SECRET_API_KEY') || '';
const CAPTURE_BUCKET = 'recipe-captures';
const COOKBOOK_PAGE_BUCKET = Deno.env.get('COOKBOOK_PAGE_BUCKET') || 'cookbook-pages';

function appleIdentity(user: {
  app_metadata?: Record<string, unknown>;
  identities?: Array<{ provider?: string; id?: string; identity_data?: Record<string, unknown> }>;
}): { isApple: boolean; subject: string | null } {
  const providers = Array.isArray(user.app_metadata?.providers)
    ? user.app_metadata.providers
    : [user.app_metadata?.provider];
  const identity = user.identities?.find((candidate) => candidate.provider === 'apple');
  const isApple = providers.includes('apple') || Boolean(identity);
  if (!isApple) return { isApple: false, subject: null };
  const subject = identity?.identity_data?.sub ?? identity?.id;
  return {
    isApple: true,
    subject: typeof subject === 'string' && subject.length > 0 ? subject : null,
  };
}

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
    const body = await req.json().catch(() => ({})) as { appleAuthorizationCode?: unknown };
    logInfo('delete-account started', { userId });

    // Account erasure must not report success while RevenueCat still retains
    // the subscriber. This removes provider data only; Apple continues to own
    // billing and the subscription is not cancelled by this operation.
    if (!REVENUECAT_SECRET_API_KEY) {
      return jsonError('Account deletion is not fully configured', 503, req);
    }

    // Use service role client for admin operations
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: authUserData, error: authUserError } = await adminClient.auth.admin.getUserById(userId);
    if (authUserError || !authUserData.user) {
      return jsonError('Could not verify account identity', 500, req);
    }

    const appleAccount = appleIdentity(authUserData.user);
    let appleDeletion: {
      authorizationCode: string;
      expectedSubject: string;
      config: {
        clientId: string;
        teamId: string;
        keyId: string;
        privateKey: string;
      };
    } | null = null;
    if (appleAccount.isApple) {
      if (!appleAccount.subject) {
        return jsonError('Could not verify the Sign in with Apple identity', 500, req);
      }
      if (typeof body.appleAuthorizationCode !== 'string' || body.appleAuthorizationCode.length === 0) {
        return jsonError('Apple authorization is required before deleting this account', 409, req);
      }
      const appleConfig = {
        clientId: Deno.env.get('APPLE_CLIENT_ID') || 'com.yaz12.nosh',
        teamId: Deno.env.get('APPLE_TEAM_ID') || '',
        keyId: Deno.env.get('APPLE_KEY_ID') || '',
        privateKey: Deno.env.get('APPLE_PRIVATE_KEY') || '',
      };
      if (!appleConfig.teamId || !appleConfig.keyId || !appleConfig.privateKey) {
        return jsonError('Apple account deletion is not configured', 500, req);
      }
      appleDeletion = {
        authorizationCode: body.appleAuthorizationCode,
        expectedSubject: appleAccount.subject,
        config: appleConfig,
      };
    }

    // Erase provider data before other destructive steps. If RevenueCat is
    // unreachable the Nosh account and Apple authorization remain intact.
    try {
      await deleteRevenueCatSubscriber(userId, REVENUECAT_SECRET_API_KEY);
    } catch (revenueCatError) {
      logError('delete-account RevenueCat deletion failed', {
        userId,
        error: revenueCatError instanceof Error
          ? revenueCatError.message
          : String(revenueCatError),
      });
      return jsonError('Could not erase subscription account data', 502, req);
    }

    if (appleDeletion) {
      try {
        await revokeAppleAuthorization(appleDeletion);
      } catch (appleError) {
        logError('delete-account Apple revocation failed', {
          userId,
          error: appleError instanceof Error ? appleError.message : String(appleError),
        });
        return jsonError('Could not revoke Sign in with Apple authorization', 502, req);
      }
    }

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
