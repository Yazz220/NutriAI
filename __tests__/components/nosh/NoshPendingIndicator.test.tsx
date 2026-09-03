import React from 'react';
import { act, render } from '@testing-library/react-native';
import { NoshThinkingIndicator } from '@/components/nosh/conversation/NoshStreamingText';

let mockRunning = true;

jest.mock('@assistant-ui/react-native', () => ({
  useAuiState: (selector: (state: unknown) => unknown) => selector({
    message: { status: { type: mockRunning ? 'running' : 'complete' } },
  }),
}));

jest.mock('@/contexts/NoshConversationContext', () => ({
  useNoshConversation: () => ({
    interaction: {
      entryPoint: 'recipe-ask',
      task: 'recipe-help',
      focus: { kind: 'recipe', cookbookId: 'book-1', pageId: 'page-1', title: 'Soup' },
    },
  }),
}));

describe('NoshThinkingIndicator', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockRunning = true;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('does not flash a processing state for a quick response', () => {
    const screen = render(<NoshThinkingIndicator />);

    expect(screen.queryByRole('progressbar')).toBeNull();
    act(() => jest.advanceTimersByTime(449));
    expect(screen.queryByRole('progressbar')).toBeNull();
    act(() => jest.advanceTimersByTime(1));
    expect(screen.getByRole('progressbar', { name: 'Checking this recipe' })).toBeTruthy();
    expect(screen.queryByText(/checking this recipe|preparing a reply/i)).toBeNull();
  });
});
