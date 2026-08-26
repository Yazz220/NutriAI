export const MAX_REPORTED_RESPONSE_LENGTH = 8000;
const MAX_MESSAGE_ID_LENGTH = 200;

export interface AiResponseReportInput {
  messageId: string;
  responseText: string;
  agentRequestId?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseAiResponseReportInput(value: unknown): AiResponseReportInput {
  if (!isRecord(value)) throw new Error('Invalid report');

  const messageId = typeof value.messageId === 'string' ? value.messageId.trim() : '';
  const responseText = typeof value.responseText === 'string' ? value.responseText.trim() : '';
  const agentRequestId = typeof value.agentRequestId === 'string'
    ? value.agentRequestId.trim()
    : '';
  if (!messageId) throw new Error('Message ID is required');
  if (messageId.length > MAX_MESSAGE_ID_LENGTH) throw new Error('Message ID is too long');
  if (!responseText) throw new Error('Response text is required');
  if (responseText.length > MAX_REPORTED_RESPONSE_LENGTH) {
    throw new Error('Response text is too long');
  }
  if (agentRequestId.length > MAX_MESSAGE_ID_LENGTH) throw new Error('Agent request ID is too long');

  return { messageId, responseText, ...(agentRequestId ? { agentRequestId } : {}) };
}
