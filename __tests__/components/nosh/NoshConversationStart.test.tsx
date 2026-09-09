import React from 'react';
import { render } from '@testing-library/react-native';
import { NoshConversationStart } from '@/components/nosh/conversation/NoshConversationStart';
import type { NoshInteractionSession } from '@/types/noshInteraction';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('@/contexts/NoshConversationContext', () => ({
  useNoshConversation: () => ({ close: jest.fn() }),
}));
jest.mock('@assistant-ui/react-native', () => {
  const ReactModule = require('react');
  const { Pressable } = require('react-native');
  return {
    AuiIf: ({ children }: { children: React.ReactNode }) => children,
    ThreadPrimitive: {
      Suggestion: ({ children, ...props }: { children: React.ReactNode }) => (
        ReactModule.createElement(Pressable, { accessibilityRole: 'button', ...props }, children)
      ),
    },
  };
});

const recipeInteraction: NoshInteractionSession = {
  entryPoint: 'recipe-ask',
  task: 'recipe-help',
  focus: { kind: 'recipe', cookbookId: 'book-1', pageId: 'page-1', title: 'Tomato Soup' },
};

describe('NoshConversationStart', () => {
  it('shows what Folio can do with the active recipe while its graph loads', () => {
    const screen = render(
      <NoshConversationStart interaction={recipeInteraction} disabled />,
    );

    expect(screen.getByText('Tomato Soup')).toBeTruthy();
    expect(screen.getByText('Ask naturally about this recipe, adapt it, or cook through it together.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Make this for two' })).toBeDisabled();
  });
});
