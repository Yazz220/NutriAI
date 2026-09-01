import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import {
  NoshHeaderActions,
  NoshHeaderIdentity,
} from '@/components/nosh/conversation/NoshConversationHeader';

jest.mock('@assistant-ui/react-native', () => ({
  useAuiState: (selector: (state: unknown) => unknown) => selector({
    threadListItem: { title: 'Dinner ideas' },
    thread: { isRunning: false },
  }),
}));

describe('Folio conversation header', () => {
  it('shows one concise conversation identity', () => {
    const screen = render(
      <NoshHeaderIdentity contextLabel="Your cookbook collection" showingHistory={false} />,
    );

    expect(screen.getByText('Dinner ideas')).toBeTruthy();
    expect(screen.getByText('Your cookbook collection')).toBeTruthy();
    expect(screen.queryByText(/Folio ·/)).toBeNull();
  });

  it('keeps one new-conversation action in history', () => {
    const onToggleHistory = jest.fn();
    const onNewConversation = jest.fn();
    const screen = render(
      <NoshHeaderActions
        showingHistory
        onToggleHistory={onToggleHistory}
        onNewConversation={onNewConversation}
      />,
    );

    expect(screen.queryByRole('button', { name: 'Open conversation history' })).toBeNull();
    fireEvent.press(screen.getByRole('button', { name: 'Start a new conversation' }));
    expect(onNewConversation).toHaveBeenCalledTimes(1);
  });
});
