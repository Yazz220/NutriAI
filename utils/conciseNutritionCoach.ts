import { NutritionCoachAiContext } from './nutritionCoachAiContext';
import { ChatMessage } from '@/utils/aiClient';

export interface ConciseCoachingResponse {
  message: string;
  actionItem?: string;
  numbers?: {
    calories?: number;
    protein?: number;
    suggestion?: string;
  };
}

// Optimized for open-source models - very structured and concise
export function createConciseNutritionCoachPrompt(
  userMessage: string,
  context: NutritionCoachAiContext
): ChatMessage[] {
  const systemPrompt = buildConciseSystemPrompt(context);
  const userPrompt = buildConciseUserPrompt(userMessage, context);
  
  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ];
}

function buildConciseSystemPrompt(context: NutritionCoachAiContext): string {
  const { userProfile, currentProgress, remainingTargets } = context;
  
  return `You are Alex, a nutrition coach. Respond in exactly this format:

RESPONSE FORMAT:
[Acknowledgment] [Specific advice with numbers] [One action item]

EXAMPLE RESPONSES:
"Great job on tracking! You need 15g more protein today. Try Greek yogurt (20g protein)."
"You're behind on calories. Add 300 calories with a balanced meal. Have chicken with rice."
"Excellent progress! You're 95% on target. Keep this consistency going."

USER DATA:
- Goal: ${userProfile.goals.goalType} weight
- Today: ${currentProgress.today.calories.consumed}/${userProfile.calculatedGoals.dailyCalories} cal
- Protein: ${currentProgress.today.macros.protein.consumed}/${userProfile.calculatedGoals.protein}g  
- Remaining: ${remainingTargets.calories} cal, ${Math.round(remainingTargets.protein)}g protein
- Time: ${remainingTargets.timeOfDay}

RULES:
- Maximum 25 words
- Always include specific numbers
- Give ONE clear action
- Be encouraging but brief
- No questions or multiple options`;
}

function buildConciseUserPrompt(userMessage: string, context: NutritionCoachAiContext): string {
  const { remainingTargets } = context;
  
  // Add context clues to help the model respond appropriately
  let prompt = `User says: "${userMessage}"`;
  
  // Add relevant context based on user's current state
  if (remainingTargets.calories > 400) {
    prompt += ` [User needs substantial calories]`;
  } else if (remainingTargets.calories < 100) {
    prompt += ` [User is close to calorie goal]`;
  }
  
  if (remainingTargets.protein > 20) {
    prompt += ` [User needs more protein]`;
  }
  
  if (remainingTargets.timeOfDay === 'evening') {
    prompt += ` [It's evening]`;
  }
  
  return prompt;
}

// Response templates for common scenarios - helps guide open-source models
export const RESPONSE_TEMPLATES = {
  needsCalories: (calories: number) => 
    `You need ${calories} more calories today. Have a balanced meal with protein and carbs.`,
  
  needsProtein: (protein: number) => 
    `You're ${protein}g short on protein. Try Greek yogurt, chicken, or a protein shake.`,
  
  onTrack: (adherence: number) => 
    `Great job! You're ${adherence}% on track. Keep up this consistency.`,
  
  overTarget: () => 
    `You've exceeded your calorie goal. Focus on lighter options and hydration.`,
  
  eveningCatch: (calories: number) => 
    `You have ${calories} calories left for dinner. Include protein and vegetables.`,
  
  goodProgress: () => 
    `Excellent tracking today! Your consistency is building healthy habits.`,
  
  needsImprovement: () => 
    `Let's get back on track. Focus on one meal at a time today.`
};

// Quick response generator for common scenarios
export function generateQuickResponse(context: NutritionCoachAiContext, scenario?: string): string {
  const { currentProgress, remainingTargets } = context;
  const adherence = Math.round((currentProgress.adherenceScore || 0) * 100);
  
  // Auto-detect scenario if not provided
  if (!scenario) {
    if (remainingTargets.calories > 400) scenario = 'needsCalories';
    else if (remainingTargets.protein > 20) scenario = 'needsProtein';
    else if (adherence > 85) scenario = 'goodProgress';
    else if (remainingTargets.calories < 0) scenario = 'overTarget';
    else if (remainingTargets.timeOfDay === 'evening' && remainingTargets.calories > 200) scenario = 'eveningCatch';
    else scenario = 'onTrack';
  }
  
  switch (scenario) {
    case 'needsCalories':
      return RESPONSE_TEMPLATES.needsCalories(remainingTargets.calories);
    case 'needsProtein':
      return RESPONSE_TEMPLATES.needsProtein(Math.round(remainingTargets.protein));
    case 'onTrack':
      return RESPONSE_TEMPLATES.onTrack(adherence);
    case 'overTarget':
      return RESPONSE_TEMPLATES.overTarget();
    case 'eveningCatch':
      return RESPONSE_TEMPLATES.eveningCatch(remainingTargets.calories);
    case 'goodProgress':
      return RESPONSE_TEMPLATES.goodProgress();
    default:
      return RESPONSE_TEMPLATES.needsImprovement();
  }
}

// Structured response parser for better consistency
export function parseCoachResponse(response: string): ConciseCoachingResponse {
  const cleaned = response.trim();
  
  // Extract numbers from response
  const calorieMatch = cleaned.match(/(\d+)\s*(?:cal|calorie)/i);
  const proteinMatch = cleaned.match(/(\d+)g?\s*protein/i);
  
  // Find action items (usually after periods or exclamation marks)
  const sentences = cleaned.split(/[.!]/).filter(s => s.trim());
  const actionItem = sentences.length > 1 ? sentences[sentences.length - 1].trim() : undefined;
  
  return {
    message: cleaned,
    actionItem,
    numbers: {
      calories: calorieMatch ? parseInt(calorieMatch[1]) : undefined,
      protein: proteinMatch ? parseInt(proteinMatch[1]) : undefined,
      suggestion: actionItem
    }
  };
}

// Fallback responses for when AI fails
export const FALLBACK_RESPONSES = [
  "You're doing great! Keep tracking your meals consistently.",
  "Focus on getting enough protein with each meal today.",
  "Stay hydrated and stick to your calorie targets.",
  "Great progress! Every healthy choice counts.",
  "Keep up the good work with your nutrition goals."
];

export function getFallbackResponse(): string {
  return FALLBACK_RESPONSES[Math.floor(Math.random() * FALLBACK_RESPONSES.length)];
}