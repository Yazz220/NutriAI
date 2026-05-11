/**
 * Shared authentication helper for Edge Functions.
 *
 * Verifies the caller's JWT via Supabase auth and returns the user.
 * Returns null + an error Response if verification fails, so callers can
 * early-return the error response directly.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { jsonError } from './cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || '';

interface AuthResult {
  user: { id: string; email?: string } | null;
  error: Response | null;
}

/**
 * Verify the request's Authorization header against Supabase Auth.
 *
 * Usage:
 * ```ts
 * const { user, error } = await verifyAuth(req);
 * if (error) return error;
 * // user is now guaranteed non-null
 * ```
 */
export async function verifyAuth(req: Request): Promise<AuthResult> {
  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) {
    return { user: null, error: jsonError('Missing Authorization header', 401, req) };
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { user: null, error: jsonError('Unauthorized', 401, req) };
  }

  return { user, error: null };
}
