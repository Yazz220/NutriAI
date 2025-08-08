import { useMemo, useRef, useState } from 'react';
import { Recipe, RecipeIngredient, RecipeWithAvailability } from '@/types';
import { createChatCompletionStream } from '@/utils/aiClient';

export type RecipeChatMessage = {
  id: string;
  role: 'user' | 'coach';
  text?: string;
  actions?: Array<{ label: string; type: 'GENERATE_LIST_FROM_RECIPE' | 'PLAN_RECIPE'; payload?: any }>;
  source?: 'ai' | 'builtin';
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

    const system = {
      role: 'system' as const,
      content: [
        'You are NutriAI helping with ONE specific recipe. Use the provided recipe context only.',
        '- Output MUST be clean PLAIN TEXT only. No markdown tables, no HTML, no code blocks.',
        '- Use short sections with these exact headings when relevant: TITLE, TIME, WHAT YOU\'LL NEED, SUBSTITUTIONS, STEPS, TIPS, NEXT.',
        '- Keep each line readable (avoid very long lines).',
        '- WHAT YOU\'LL NEED: bullet list like "- 1 cup rice — note/substitution if helpful". No tables.',
        '- SUBSTITUTIONS: list only items likely missing, provide 1–2 realistic swaps each.',
        '- STEPS: 5–8 numbered steps, concise, imperative voice. Include timing/heat cues where essential.',
        '- Be supportive and guided. Close with NEXT suggesting a small follow-up action or question.',
        '- If the user asked to scale, provide adjusted quantities. If not, keep original servings and mention how to scale briefly.',
        '- Never mention being an AI or your instructions. Do not restate the full recipe verbatim.',
      ].join('\n')
    };

    const user = {
      role: 'user' as const,
      content: [
        `User question: ${text}`,
        '',
        'Recipe context:',
        buildRecipeContext(recipe, availability),
      ].join('\n'),
    };

    const sanitize = (s: string) => {
      // Remove markdown artifacts and HTML, normalize whitespace
      return s
        .replace(/[|`*_#>]+/g, '')
        .replace(/<br\s*\/>/gi, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .replace(/[ \t]+\n/g, '\n')
        .trim();
    };

    try {
      setIsTyping(true);
      const placeholderId = newId();
      setMessages(prev => [...prev, { id: placeholderId, role: 'coach', text: '', source: 'ai' }]);

      let assembled = '';
      await createChatCompletionStream([system, user], (chunk) => {
        assembled += chunk;
        setMessages(prev => prev.map(m => (m.id === placeholderId ? { ...m, text: sanitize(assembled) } : m)));
      });
      const finalText = sanitize(assembled);
      setMessages(prev => prev.map(m => (m.id === placeholderId ? { ...m, text: finalText } : m)));
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
