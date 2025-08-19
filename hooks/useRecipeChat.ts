import { useMemo, useRef, useState } from 'react';
import { Recipe, RecipeIngredient, RecipeWithAvailability } from '@/types';
import { createChatCompletion } from '@/utils/aiClient';
import { buildStructuredSystemPrompt, tryExtractJSON, type StructuredResponse } from '@/utils/aiFormat';

export type RecipeChatMessage = {
  id: string;
  role: 'user' | 'coach';
  text?: string;
  actions?: Array<{ label: string; type: 'GENERATE_LIST_FROM_RECIPE' | 'PLAN_RECIPE'; payload?: any }>;
  source?: 'ai' | 'builtin';
  structuredData?: StructuredResponse;
};

function buildRecipeContext(recipe: Recipe, availability?: RecipeWithAvailability['availability']) {
  const ingredients = recipe.ingredients
    .map((i: RecipeIngredient) => `- ${i.quantity} ${i.unit} ${i.name}`)
    .join('\n');
  const instructions = recipe.instructions.map((s, idx) => `${idx + 1}. ${s}`).join('\n');
  const tags = recipe.tags.join(', ');
  const avail = availability
    ? `Availability: ${availability.availabilityPercentage}% (Missing: ${availability.missingIngredients.length}$${availability.expiringIngredients.length ? `, Expiring: ${availability.expiringIngredients.length}` : ''})`
    : 'Availability: n/a';
  return [
    `Recipe: ${recipe.name}`,
    `Servings: ${recipe.servings}`,
    `Prep/Cook: ${recipe.prepTime} / ${'cookTime' in recipe ? recipe.cookTime : 'n/a'}`,
    `Tags: ${tags || 'n/a'}`,
    avail,
    '',
    'Ingredients:',
    ingredients || 'n/a',
    '',
    'Instructions:',
    instructions || 'n/a',
  ].join('\n');
}

export function useRecipeChat(recipe: Recipe, availability?: RecipeWithAvailability['availability']) {

  const [messages, setMessages] = useState<RecipeChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const idSeq = useRef(0);
  const newId = () => `${Date.now()}-${idSeq.current++}`;

  function pushCoach(msg: Omit<RecipeChatMessage, 'id' | 'role'>) {
    setMessages(prev => [...prev, { id: newId(), role: 'coach', source: msg.source || 'ai', ...msg }]);
  }

  function pushUser(text: string) {
    setMessages(prev => [...prev, { id: newId(), role: 'user', text }]);
  }

  function performInlineAction(action: NonNullable<RecipeChatMessage['actions']>[number]) {
    // Placeholder: wiring to shopping list / planner can be added later
    console.log('Inline action requested:', action);
  }

  async function sendMessage(text: string) {
    pushUser(text);

    // Build userContext injected into the structured system prompt (inventory + availability awareness)
    const availabilitySummary = availability
      ? [
          `Availability: ${availability.availabilityPercentage}%`,
          availability.missingIngredients.length ? `Missing: ${availability.missingIngredients.map(m => m.name).join(', ')}` : 'Missing: none',
          availability.expiringIngredients.length ? `Expiring soon: ${availability.expiringIngredients.map(e => e.name).join(', ')}` : 'Expiring soon: none',
        ].join(' | ')
      : 'Availability: n/a';
    const userContext = [
      availabilitySummary,
      'Inventory awareness is required: set inInventory for each ingredient when possible based on the recipe context and availability info above.',
    ].join('\n');
    const system = { role: 'system' as const, content: buildStructuredSystemPrompt(userContext) };

    const user = {
      role: 'user' as const,
      content: [
        `User question: ${text}`,
        '',
        'Recipe context:',
        buildRecipeContext(recipe, availability),
      ].join('\n'),
    };

    const sanitize = (s: string) => s.trim();

    try {
      setIsTyping(true);
      const placeholderId = newId();
      setMessages(prev => [...prev, { id: placeholderId, role: 'coach', text: '…', source: 'ai' }]);

      const full = await createChatCompletion([system, user]);
      const parsed = tryExtractJSON(full);
      if (parsed) {
        setMessages(prev => prev.map(m => (m.id === placeholderId ? { ...m, text: undefined, structuredData: parsed } : m)));
      } else {
        const finalText = sanitize(full);
        setMessages(prev => prev.map(m => (m.id === placeholderId ? { ...m, text: finalText } : m)));
      }
      setIsTyping(false);
    } catch (err: any) {
      console.warn('Recipe AI error', err?.message || err);
      pushCoach({ text: 'I can help with substitutions, scaling, or guidance. Try: "Substitute missing ingredients".', source: 'builtin' });
      setIsTyping(false);
    }
  }

  const quickChips = useMemo(() => {
    const chips = [
      'Substitute missing ingredients',
      'Scale to 1 serving',
      'Give me step-by-step guidance',
    ];
    if (availability && availability.missingIngredients.length > 0) {
      chips.unshift(`What can I use instead of ${availability.missingIngredients[0].name}?`);
    }
    return chips;
  }, [availability]);

  return { messages, isTyping, sendMessage, performInlineAction, quickChips };
}
