import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { verifyAuth } from '../_shared/auth.ts';
import { corsResponse, jsonError, jsonResponse } from '../_shared/cors.ts';
import { logError, logInfo } from '../_shared/log.ts';
import {
  removeQueuedReaderStorageObjects,
  type ReaderStorageCleanupJob,
} from '../_shared/readerStorageCleanup.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || '';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const MAX_CLEANUP_JOBS = 1000;

type DeleteAction = 'deleteCookbook' | 'removeRecipe' | 'drain';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isUuid(value: unknown): value is string {
  return typeof value === 'string'
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (isRecord(error) && typeof error.message === 'string') return error.message;
  return 'Reader deletion failed';
}

async function drainCleanupJobs(admin: ReturnType<typeof createClient>, userId: string) {
  const { data, error } = await admin
    .schema('nutriai')
    .from('storage_cleanup_jobs')
    .select('id, bucket, object_path')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(MAX_CLEANUP_JOBS);

  if (error) throw error;
  const jobs = (data ?? []) as ReaderStorageCleanupJob[];
  const attempt = await removeQueuedReaderStorageObjects(admin.storage, jobs);

  if (attempt.removedJobIds.length > 0) {
    const { error: deleteError } = await admin
      .schema('nutriai')
      .from('storage_cleanup_jobs')
      .delete()
      .eq('user_id', userId)
      .in('id', attempt.removedJobIds);
    if (deleteError) throw deleteError;
  }

  for (const failure of attempt.failures) {
    logError('Reader storage cleanup batch failed', {
      userId,
      bucket: failure.bucket,
      jobCount: failure.jobIds.length,
      error: failure.message,
    });
  }

  return {
    removed: attempt.removedJobIds.length,
    pending: jobs.length - attempt.removedJobIds.length,
  };
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return corsResponse(req);
  const { user, error: authError } = await verifyAuth(req);
  if (authError) return authError;
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_KEY) {
    return jsonError('Reader deletion is not configured', 500, req);
  }

  try {
    const body = await req.json().catch(() => null);
    if (!isRecord(body)) return jsonError('Invalid JSON body', 400, req);
    const action = body.action as DeleteAction;
    if (!['deleteCookbook', 'removeRecipe', 'drain'].includes(action)) {
      return jsonError('Unsupported reader deletion action', 400, req);
    }

    const authHeader = req.headers.get('Authorization')!;
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    let result: unknown = null;
    if (action === 'removeRecipe') {
      if (!isUuid(body.pageId)) return jsonError('Recipe page is required', 400, req);
      const response = await userClient
        .schema('nutriai')
        .rpc('remove_recipe_page', { p_page_id: body.pageId });
      if (response.error) throw response.error;
      result = response.data;
    } else if (action === 'deleteCookbook') {
      if (!isUuid(body.cookbookId)) return jsonError('Cookbook is required', 400, req);
      const response = await userClient
        .schema('nutriai')
        .rpc('delete_cookbook', { p_cookbook_id: body.cookbookId });
      if (response.error) throw response.error;
      result = response.data;
    }

    let cleanup = { removed: 0, pending: 0 };
    try {
      cleanup = await drainCleanupJobs(admin, user!.id);
    } catch (cleanupError) {
      logError('Reader storage cleanup could not be drained', {
        userId: user!.id,
        error: errorMessage(cleanupError),
      });
      cleanup = { removed: 0, pending: 1 };
    }

    logInfo('Reader deletion completed', { userId: user!.id, action, cleanup });
    return jsonResponse({ result, cleanup }, 200, req);
  } catch (error) {
    const record = isRecord(error) ? error : {};
    const status = record.code === 'P0002' ? 404 : 500;
    logError('Reader deletion failed', {
      userId: user!.id,
      error: errorMessage(error),
    });
    return jsonError(errorMessage(error), status, req);
  }
});
