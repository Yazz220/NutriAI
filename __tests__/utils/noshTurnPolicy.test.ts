import {
  buildNoshQuickSocialReply,
  getNoshQuickSocialIntent,
} from '@/supabase/functions/_shared/noshTurnPolicy';

describe('Folio turn policy', () => {
  it('uses the quick path only for self-contained social turns', () => {
    expect(getNoshQuickSocialIntent('Hi!')).toBe('greeting');
    expect(getNoshQuickSocialIntent('Thanks, Folio')).toBe('thanks');
    expect(getNoshQuickSocialIntent('Thank you Folio.')).toBe('thanks');
    expect(getNoshQuickSocialIntent('Hey, scale this for four')).toBeNull();
  });

  it('keeps an immediate greeting grounded in the active recipe', () => {
    expect(buildNoshQuickSocialReply('greeting', {
      task: 'recipe-help',
      focus: { kind: 'recipe', title: 'Baked Cheesecake' },
    })).toBe('Hi. I have Baked Cheesecake in view. What would you like to know or change?');
  });

  it('keeps the preference entry point focused without loading assistant tools', () => {
    expect(buildNoshQuickSocialReply('greeting', {
      task: 'preferences',
      focus: { kind: 'collection' },
    })).toContain('before saving each preference');
  });
});
