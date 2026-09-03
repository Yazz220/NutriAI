export type NoshQuickSocialIntent = 'greeting' | 'thanks';

export interface NoshQuickInteractionContext {
  task?: string;
  focus?: Record<string, unknown>;
}

export function getNoshQuickSocialIntent(text: unknown): NoshQuickSocialIntent | null {
  if (typeof text !== 'string') return null;
  const normalized = text
    .trim()
    .toLocaleLowerCase()
    .replace(/[!.?]+$/g, '')
    .trim();
  if (/^(hi|hello|hey|hi there|hello there|good morning|good afternoon|good evening)$/.test(normalized)) {
    return 'greeting';
  }
  if (/^(thanks|thank you|thanks,? folio|thank you,? folio)$/.test(normalized)) {
    return 'thanks';
  }
  return null;
}

export function buildNoshQuickSocialReply(
  intent: NoshQuickSocialIntent,
  interaction?: NoshQuickInteractionContext,
): string {
  const rawTitle = interaction?.focus?.kind === 'recipe' || interaction?.focus?.kind === 'cookbook'
    ? interaction.focus.title
    : undefined;
  const focusTitle = typeof rawTitle === 'string' && rawTitle.trim().length <= 200
    ? rawTitle.trim()
    : undefined;
  if (intent === 'thanks') {
    return focusTitle
      ? `Anytime. I am here when you need a hand with ${focusTitle}.`
      : 'Anytime. I am here when you need a hand in the kitchen.';
  }
  if (focusTitle) {
    return `Hi. I have ${focusTitle} in view. What would you like to know or change?`;
  }
  if (interaction?.task === 'preferences') {
    return 'Hi. Tell me how you like to cook, and I will ask before saving each preference.';
  }
  return 'Hi. What would you like to cook or find in your cookbooks?';
}
