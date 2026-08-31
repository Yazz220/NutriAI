import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { parseAiResponseReportInput } from '../_shared/aiResponseReport.ts';
import { verifyAuth } from '../_shared/auth.ts';
import { corsResponse, jsonError, jsonResponse } from '../_shared/cors.ts';
import { logError, logInfo } from '../_shared/log.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return corsResponse(req);
  if (req.method !== 'POST') return jsonError('Method not allowed', 405, req);

  const { user, error: authError } = await verifyAuth(req);
  if (authError) return authError;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return jsonError('AI response reporting is not configured', 500, req);
  }

  try {
    const input = parseAiResponseReportInput(await req.json().catch(() => null));
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data, error } = await admin
      .schema('nutriai')
      .from('ai_response_reports')
      .upsert({
        user_id: user!.id,
        message_id: input.messageId,
        agent_request_id: input.agentRequestId ?? null,
        response_text: input.responseText,
        status: 'open',
      }, { onConflict: 'user_id,message_id' })
      .select('id')
      .single();
    if (error) throw error;

    logInfo('AI response report received', { userId: user!.id, reportId: data.id });
    return jsonResponse({ reportId: data.id }, 200, req);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not submit report';
    const status = message.startsWith('Invalid')
      || message.includes('required')
      || message.includes('too long')
      ? 400
      : 500;
    logError('AI response report failed', { userId: user!.id, error: message });
    return jsonError(message, status, req);
  }
});
