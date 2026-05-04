import { useMemo, useRef, useState } from 'react';
import { createChatCompletion } from '@/utils/aiClient';
import type { CookbookPage } from '@/types/cookbook';

export interface NoshAssistantMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

function recipeContext(page: CookbookPage | null): string {
  if (!page?.recipe) {
    return page ? `Current page: ${page.title}` : 'No current recipe page is selected.';
  }

  const recipe = page.recipe;
  const ingredients = recipe.ingredients
    .map((ingredient) => {
      const amount = [ingredient.quantity, ingredient.unit].filter(Boolean).join(' ');
      return `- ${amount ? `${amount} ` : ''}${ingredient.name}`;
    })
    .join('\n');
  const steps = recipe.steps.map((step, index) => `${index + 1}. ${step}`).join('\n');

  return [
    `Current page: ${page.title}`,
    `Section: ${page.section}`,
    `Servings: ${recipe.servings ?? 'unknown'}`,
    `Prep time: ${recipe.prepTime ?? 0} minutes`,
    `Cook time: ${recipe.cookTime ?? 0} minutes`,
    recipe.description ? `Description: ${recipe.description}` : '',
    '',
    'Ingredients:',
    ingredients || 'No ingredients saved.',
    '',
    'Directions:',
    steps || 'No directions saved.',
  ]
    .filter((line) => line !== '')
    .join('\n');
}

function cookbookContext(pages: CookbookPage[]): string {
  if (pages.length === 0) return 'The cookbook is empty.';
  return pages
    .map((page, index) => `${index + 1}. ${page.title} (${page.section})`)
    .join('\n');
}

export function useNoshAssistant(page: CookbookPage | null, cookbookPages: CookbookPage[]) {
  const [messages, setMessages] = useState<NoshAssistantMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const idSeq = useRef(0);
  const nextId = () => `${Date.now()}-${idSeq.current++}`;

  const quickPrompts = useMemo(
    () => [
      'Walk me through this recipe',
      'Scale this to 2 servings',
      'What can I substitute?',
      'Make a shopping list',
    ],
    [],
  );

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isSending) return;

    const userMessage: NoshAssistantMessage = { id: nextId(), role: 'user', text: trimmed };
    const placeholderId = nextId();
    setMessages((current) => [
      ...current,
      userMessage,
      { id: placeholderId, role: 'assistant', text: 'Thinking...' },
    ]);

    setIsSending(true);
    try {
      const response = await createChatCompletion([
        {
          role: 'system',
          content:
            'You are Nosh, a warm, practical AI chef assistant inside a personal cookbook. Answer cooking questions using the current recipe first, then the rest of the cookbook when useful. Be concise, specific, and safe.',
        },
        {
          role: 'user',
          content: [
            `User question: ${trimmed}`,
            '',
            'Current recipe context:',
            recipeContext(page),
            '',
            'Cookbook index:',
            cookbookContext(cookbookPages),
          ].join('\n'),
        },
      ]);

      setMessages((current) =>
        current.map((message) =>
          message.id === placeholderId
            ? { ...message, text: response.trim() || 'I can help with this recipe.' }
            : message,
        ),
      );
    } catch (err) {
      console.warn('[NoshAssistant] chat failed', err);
      setMessages((current) =>
        current.map((message) =>
          message.id === placeholderId
            ? {
                ...message,
                text: 'I can still help with this recipe. Try asking about substitutions, servings, timing, or shopping lists.',
              }
            : message,
        ),
      );
    } finally {
      setIsSending(false);
    }
  }

  return { messages, isSending, quickPrompts, send };
}
