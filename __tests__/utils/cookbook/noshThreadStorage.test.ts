import type { ThreadMessage } from '@assistant-ui/react-native';
import { createNoshConversationTitle } from '@/utils/cookbook/noshConversationTitle';

function userMessage(text: string): ThreadMessage {
  return {
    id: 'user-1',
    role: 'user',
    content: [{ type: 'text', text }],
    attachments: [],
    createdAt: new Date('2026-08-20T12:00:00Z'),
    metadata: { custom: {} },
  };
}

describe('createNoshConversationTitle', () => {
  it('turns a recipe URL into a useful compact history title', () => {
    expect(createNoshConversationTitle([
      userMessage('Please add https://therecipecritic.com/very-berry-cheesecake-salad/'),
    ])).toBe('Recipe from therecipecritic.com');
  });

  it('uses polished titles for the starter prompts', () => {
    expect(createNoshConversationTitle([userMessage('Help me choose dinner')])).toBe('Dinner ideas');
  });

  it('keeps arbitrary prompts readable and bounded', () => {
    const title = createNoshConversationTitle([
      userMessage('Help me plan a week of simple dinners using the vegetables already in my refrigerator'),
    ]);
    expect(title).toHaveLength(48);
    expect(title.endsWith('…')).toBe(true);
  });
});
