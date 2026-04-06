import { UserProfileState } from '@/hooks/useUserProfile';

export interface EnhancedAIContext {
  profile: UserProfileState;
}

export function buildAIContext(input: EnhancedAIContext): string {
  const { profile } = input;

  const basics = profile.basics || {};
  const prefs = profile.preferences || { allergies: [], dislikedIngredients: [], preferredCuisines: [] };

  const parts: string[] = [];
  parts.push(`- Name: ${basics.name || 'n/a'}`);
  parts.push(`- Preferences: diet ${prefs.dietary || 'none'}, allergies [${(prefs.allergies || []).join(', ') || 'none'}]`);
  parts.push(`- Dislikes: [${(prefs.dislikedIngredients || []).join(', ') || 'none'}] | Cuisines: [${(prefs.preferredCuisines || []).join(', ') || 'none'}]`);

  return parts.join('\n');
}
