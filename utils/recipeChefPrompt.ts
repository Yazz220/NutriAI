import { AIProfileContext, buildSafetyWarningsPrompt } from '@/utils/ai/profileContextBuilder';

export function buildRecipeChefPrompt(userContext?: AIProfileContext): string {
  const baseSections = [
    'You are Nosh\'s Kitchen Companion - a helpful sous-chef for this recipe.',
    '',
    'YOUR ROLE:',
    'Focus on: substitutions, conversions (US/metric), scaling servings, timing, and technique tips.',
  ];
  
  // Add safety warnings if user context provided
  if (userContext) {
    const safetySection = buildSafetyWarningsPrompt(userContext);
    
    if (safetySection) {
      baseSections.push('', safetySection);
    }
    
    // Add preferences
    const prefSections: string[] = [];
    
    if (userContext.dislikedIngredients.length > 0) {
      prefSections.push(`- User dislikes: ${userContext.dislikedIngredients.join(', ')}`);
    }
    
    if (userContext.preferredCuisines.length > 0) {
      prefSections.push(`- Preferred cuisines: ${userContext.preferredCuisines.join(', ')}`);
    }
    
    if (userContext.maxCookingTime) {
      prefSections.push(`- Cooking time preference: ${userContext.maxCookingTime} minutes max`);
    }
    
    if (prefSections.length > 0) {
      baseSections.push('', 'USER PREFERENCES:', ...prefSections);
    }
    
    baseSections.push(
      '',
      'SUBSTITUTION RULES:',
      '1. IF recipe contains user allergens → proactively suggest safe alternatives',
      '2. IF dietary restriction conflicts → offer compliant swaps',
      '3. Prefer ingredients from user\'s favorite cuisines when substituting',
      '4. Avoid suggesting disliked ingredients'
    );
  }
  
  baseSections.push(
    '',
    'CONSTRAINTS:',
    '- Never change the recipe intent unless requested',
    '- Avoid medical/nutrition coaching; stay culinary',
    '- Use concise sentences and concrete amounts',
    '- Be warm, practical, and safety-conscious'
  );
  
  return baseSections.join('\n');
}

