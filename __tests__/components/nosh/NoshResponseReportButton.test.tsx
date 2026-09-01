import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { NoshResponseReportButton } from '@/components/nosh/conversation/NoshResponseReportButton';
import { reportAiResponse } from '@/utils/cookbook/aiResponseReport';

jest.mock('@/utils/cookbook/aiResponseReport', () => ({
  reportAiResponse: jest.fn(),
}));

describe('NoshResponseReportButton', () => {
  it('privately submits the selected Folio response after confirmation', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    jest.mocked(reportAiResponse).mockResolvedValue({ reportId: 'report-1' });
    const screen = render(
      <NoshResponseReportButton
        messageId="assistant-message-1"
        agentRequestId="agent-run-1"
        responseText="Check chicken with a thermometer."
      />,
    );

    fireEvent.press(screen.getByRole('button', { name: 'Report this Folio response' }));
    const send = alert.mock.calls[0]?.[2]?.find((button) => button.text === 'Send report');
    await act(async () => { await send?.onPress?.(); });

    expect(reportAiResponse).toHaveBeenCalledWith({
      messageId: 'assistant-message-1',
      agentRequestId: 'agent-run-1',
      responseText: 'Check chicken with a thermometer.',
    });
    await waitFor(() => expect(alert).toHaveBeenCalledWith(
      'Report sent',
      'Thanks. This response was sent privately for review.',
    ));
  });
});
