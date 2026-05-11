import { useMemo, useRef, useState } from 'react';
import { createChatCompletion } from '@/utils/aiClient';
import type { CookbookPage } from '@/types/cookbook';

export interface NoshAssistantMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

function recipeContext(page: CookbookPage | null, pageNumber?: number): string {
  if (!page?.recipe) {
    return page
      ? [`Current page: ${page.title}`, pageNumber ? `Page number: ${pageNumber}` : ''].filter(Boolean).join('\n')
      : 'No current recipe page is selected.';
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
    pageNumber ? `Page number: ${pageNumber}` : '',
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

function cookbookContext(pages: CookbookPage[], cookbookTitle?: string): string {
  const header = cookbookTitle ? `Active cookbook: ${cookbookTitle}` : 'Active cookbook: (untitled)';
  if (pages.length === 0) return `${header}\nThis cookbook is empty.`;
  const list = pages
    .map((page, index) => `${index + 1}. ${page.title} (${page.section})`)
    .join('\n');
  return `${header}\n${list}`;
}

export function useNoshAssistant(
  page: CookbookPage | null,
  cookbookPages: CookbookPage[],
  cookbookTitle?: string,
  pageNumber?: number,
) {
  const [messages, setMessages] = useState<NoshAssistantMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const idSeq = useRef(0);
  const nextId = () => `${Date.now()}-${idSeq.current++}`;

  const quickPrompts = useMemo(
    () => [
      'Scale servings',
      'Substitute ingredient',
      'Make a shopping list',
      'Walk me through cooking',
      'Make it healthier',
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
            'You are Nosh, a warm, practical AI chef assistant embedded inside a personal digital cookbook. Answer cooking questions using the current recipe page first, then the rest of the book when useful. Be concise, specific, and safe. Speak like you are looking at the same cookbook page as the user.',
        },
        {
          role: 'user',
          content: [
            `User question: ${trimmed}`,
            '',
            'Current recipe context:',
            recipeContext(page, pageNumber),
            '',
            'Cookbook index:',
            cookbookContext(cookbookPages, cookbookTitle),
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
