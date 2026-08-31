import { callAuthenticatedFunction } from '@/utils/supabaseEdge';

interface ReportAiResponseInput {
  messageId: string;
  responseText: string;
  agentRequestId?: string;
}

interface ReportAiResponseResult {
  reportId: string;
}

export function reportAiResponse(
  input: ReportAiResponseInput,
): Promise<ReportAiResponseResult> {
  return callAuthenticatedFunction<ReportAiResponseResult>(
    'report-ai-response',
    { ...input },
    { timeoutMs: 15_000 },
  );
}
