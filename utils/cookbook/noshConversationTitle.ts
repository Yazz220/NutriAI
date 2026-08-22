import type { ThreadMessage } from '@assistant-ui/react-native';

const TITLE_LIMIT = 48;

function messageText(message: ThreadMessage): string {
  if (message.role !== 'user' || !Array.isArray(message.content)) return '';
  return message.content
    .filter((part): part is { type: 'text'; text: string } => part.type === 'text')
    .map((part) => part.text)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function createNoshConversationTitle(messages: readonly ThreadMessage[]): string {
  const firstPrompt = messages.map(messageText).find(Boolean) ?? '';
  if (!firstPrompt) return 'New conversation';

  const urlMatch = firstPrompt.match(/https?:\/\/[^\s)\]]+/i);
  if (urlMatch) {
    try {
      const host = new URL(urlMatch[0]).hostname.replace(/^www\./, '');
      return `Recipe from ${host}`;
    } catch {
      return 'Recipe from a link';
    }
  }

  const knownTitles: Record<string, string> = {
    'Add a recipe from a link': 'Add a recipe',
    'Read a recipe photo': 'Recipe from a photo',
    'Help me choose dinner': 'Dinner ideas',
    'Scale this recipe': 'Scale this recipe',
    'What can I substitute?': 'Ingredient substitutions',
    'Walk me through cooking': 'Cooking guide',
    'Start a timer': 'Kitchen timer',
  };
  const knownTitle = knownTitles[firstPrompt];
  if (knownTitle) return knownTitle;

  if (firstPrompt.length <= TITLE_LIMIT) return firstPrompt;
  return `${firstPrompt.slice(0, TITLE_LIMIT - 1).trimEnd()}…`;
}
