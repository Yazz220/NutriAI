import { parseAiResponseReportInput } from '@/supabase/functions/_shared/aiResponseReport';

describe('AI response report input', () => {
  it('accepts and trims a valid report', () => {
    expect(parseAiResponseReportInput({
      messageId: ' assistant-message-1 ',
      agentRequestId: ' agent-run-1 ',
      responseText: ' Check chicken with a thermometer. ',
    })).toEqual({
      messageId: 'assistant-message-1',
      agentRequestId: 'agent-run-1',
      responseText: 'Check chicken with a thermometer.',
    });
  });

  it('rejects an empty response', () => {
    expect(() => parseAiResponseReportInput({
      messageId: 'assistant-message-1',
      responseText: '   ',
    })).toThrow('Response text is required');
  });

  it('rejects oversized response content', () => {
    expect(() => parseAiResponseReportInput({
      messageId: 'assistant-message-1',
      responseText: 'a'.repeat(8001),
    })).toThrow('Response text is too long');
  });
});
