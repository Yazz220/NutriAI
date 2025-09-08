import { NutritionCoachAiContext } from './nutritionCoachAiContext';
import { MealRecommendation } from './goalOrientedMealRecommender';
import { CoachingInsight } from './nutritionCoachAiContext';
import { ChatMessage } from '@/utils/aiClient';
import { CoachingPersonality, CoachingContext, CoachingPersonalityEngine, CoachingResponse } from './coachingPersonality';
import { analyzeCoachingContext } from './coachingContextAnalyzer';

export interface CoachingPromptContext {
  userMessage: string;
  aiContext: NutritionCoachAiContext;
  mealRecommendations?: MealRecommendation[];
  insights?: CoachingInsight[];
  conversationHistory?: ChatMessage[];
  personalityPreferences?: Partial<CoachingPersonality>;
}

export interface EnhancedCoachingResponse extends CoachingResponse {
  systemPrompt: string;
  userPrompt: string;
  contextualElements: {
    progressSummary: string;
    remainingTargets: string;
    personalizedEncouragement: string;
    actionableAdvice: string[];
  };
}

// Enhanced system prompt optimized for open-source models
export function buildPersonalizedNutritionCoachPrompt(context: CoachingPromptContext): string {
  const { aiContext, personalityPreferences } = context;
  
  // Build concise, structured prompt optimized for open-source models
  let systemPrompt = buildConciseCoachingPrompt(personalityPreferences?.tone || 'supportive');
  systemPrompt += buildStructuredUserContext(aiContext);
  systemPrompt += buildResponseFormat();
  systemPrompt += buildConciseGuidelines();
  
  return systemPrompt;
}

function buildConciseCoachingPrompt(tone: string): string {
  return `You are Alex, a certified nutrition coach. You provide concise, actionable nutrition advice.

PERSONALITY: ${tone}, encouraging, evidence-based
RESPONSE STYLE: Brief (2-3 sentences max), specific numbers, actionable advice
FOCUS: Current nutrition targets, meal suggestions, progress celebration

`;
}

function buildStructuredUserContext(aiContext: NutritionCoachAiContext): string {
  const { userProfile, currentProgress, remainingTargets } = aiContext;
  
  return `USER STATUS:
Goal: ${userProfile.goals.goalType} weight
Today: ${currentProgress.today.calories.consumed}/${userProfile.calculatedGoals.dailyCalories} cal, ${currentProgress.today.macros.protein.consumed}/${userProfile.calculatedGoals.protein}g protein
Remaining: ${remainingTargets.calories} cal, ${Math.round(remainingTargets.protein)}g protein
Time: ${remainingTargets.timeOfDay}
Weekly adherence: ${Math.round((currentProgress.adherenceScore || 0) * 100)}%

`;
}

function buildResponseFormat(): string {
  return `RESPONSE FORMAT:
1. Brief acknowledgment (1 sentence)
2. Specific advice with numbers (1-2 sentences)
3. One actionable next step

EXAMPLES:
"Great progress on protein! You need 15g more protein today. Try Greek yogurt with berries (20g protein)."
"You're 300 calories behind. Have a balanced dinner with chicken, rice, and vegetables."
"Excellent consistency this week! Keep up the regular meal timing for best results."

`;
}

function buildConciseGuidelines(): string {
  return `RULES:
- Keep responses under 50 words
- Always include specific numbers (calories, protein, etc.)
- Give ONE clear action item
- Be encouraging but brief
- Use "you" not "we"
- No long explanations
- Focus on immediate next steps

AVOID:
- Multiple paragraphs
- Generic advice
- Long explanations
- Multiple suggestions at once`;
}

function buildBaseCoachingPrompt(tone: string): string {
  return `You are Alex, a nutrition coach. Be ${tone}, brief, and specific.

ROLE: Provide concise nutrition advice with specific numbers and actionable steps.
STYLE: Friendly but direct. 2-3 sentences maximum per response.
FOCUS: Current targets, immediate actions, progress recognition.

`;
}

function buildUserContextSection(aiContext: NutritionCoachAiContext): string {
  const { userProfile, currentProgress, remainingTargets } = aiContext;
  
  return `USER: ${userProfile.goals.goalType} weight goal
TODAY: ${currentProgress.today.calories.consumed}/${userProfile.calculatedGoals.dailyCalories} cal, ${currentProgress.today.macros.protein.consumed}/${userProfile.calculatedGoals.protein}g protein
REMAINING: ${remainingTargets.calories} cal, ${Math.round(remainingTargets.protein)}g protein (${remainingTargets.timeOfDay})
ADHERENCE: ${Math.round((currentProgress.adherenceScore || 0) * 100)}%

Today's Progress:
- Calories: ${currentProgress.today.calories.consumed}/${currentProgress.today.calories.goal} (${Math.round(currentProgress.today.calories.percentage * 100)}%)
- Protein: ${currentProgress.today.macros.protein.consumed}g/${currentProgress.today.macros.protein.goal}g (${Math.round(currentProgress.today.macros.protein.percentage * 100)}%)
- Carbs: ${currentProgress.today.macros.carbs.consumed}g/${currentProgress.today.macros.carbs.goal}g (${Math.round(currentProgress.today.macros.carbs.percentage * 100)}%)
- Fats: ${currentProgress.today.macros.fats.consumed}g/${currentProgress.today.macros.fats.goal}g (${Math.round(currentProgress.today.macros.fats.percentage * 100)}%)

Remaining Today:
- Calories: ${remainingTargets.calories}
- Protein: ${Math.round(remainingTargets.protein)}g
- Carbs: ${Math.round(remainingTargets.carbs)}g
- Fats: ${Math.round(remainingTargets.fats)}g
- Time of day: ${remainingTargets.timeOfDay}

Weekly Adherence: ${Math.round((currentProgress.adherenceScore || 0) * 100)}%

`;
}

function buildPersonalityGuidelines(coachingResponse: CoachingResponse, coachingContext: CoachingContext): string {
  const { userState, recentProgress, challengeAreas, strengths } = coachingContext;
  
  return `PERSONALIZED COACHING APPROACH:
Current User State:
- Motivation Level: ${userState.motivation}
- Confidence Level: ${userState.confidence}
- Stress Level: ${userState.stress}
- Satisfaction: ${userState.satisfaction}
- Engagement: ${userState.engagement}

Recent Progress Assessment: ${recentProgress}
Streak Days: ${coachingContext.streakDays}
Goal Proximity: ${coachingContext.goalProximity}

Key Strengths to Reinforce:
${strengths.map(s => `- ${s}`).join('\n')}

Challenge Areas to Address:
${challengeAreas.map(c => `- ${c}`).join('\n')}

PERSONALITY ADAPTATION:
- Primary Tone: ${coachingResponse.tone}
- Communication Style: Adapt to user's ${userState.motivation} motivation and ${userState.confidence} confidence
- Encouragement Level: ${userState.motivation === 'low' ? 'High - provide frequent positive reinforcement' : 'Moderate - balance encouragement with practical advice'}
- Detail Level: ${userState.engagement === 'high' ? 'Detailed explanations welcome' : 'Keep explanations concise and actionable'}

`;
}

function buildResponseStructureGuidelines(coachingResponse: CoachingResponse): string {
  let guidelines = `RESPONSE STRUCTURE GUIDELINES:
1. Start with acknowledgment of their current situation and progress
2. Provide specific, actionable advice based on their remaining targets
3. Include encouraging elements appropriate to their emotional state
4. Explain the reasoning behind recommendations when helpful
5. End with a supportive note and optional follow-up question

`;

  if (coachingResponse.actionItems && coachingResponse.actionItems.length > 0) {
    guidelines += `SUGGESTED ACTION ITEMS:
${coachingResponse.actionItems.map(item => `- ${item}`).join('\n')}

`;
  }

  if (coachingResponse.encouragement) {
    guidelines += `ENCOURAGEMENT TO INCLUDE:
${coachingResponse.encouragement}

`;
  }

  if (coachingResponse.educationalNote) {
    guidelines += `EDUCATIONAL OPPORTUNITY:
${coachingResponse.educationalNote}

`;
  }

  if (coachingResponse.followUpSuggestion) {
    guidelines += `FOLLOW-UP SUGGESTION:
${coachingResponse.followUpSuggestion}

`;
  }

  return guidelines;
}

function buildSafetyAndMedicalGuidelines(): string {
  return `SAFETY AND MEDICAL BOUNDARIES:
- Always include appropriate medical disclaimers for nutrition advice
- Recommend consulting healthcare providers for medical conditions
- Focus on general healthy eating principles, not medical treatment
- Avoid diagnosing or treating medical conditions
- Emphasize moderate, sustainable approaches to nutrition
- Watch for concerning patterns and suggest professional help when appropriate

MEDICAL DISCLAIMER REQUIREMENTS:
- Include disclaimers for significant dietary recommendations
- Remind users to consult healthcare providers for medical concerns
- Emphasize that advice is for general wellness, not medical treatment
- Be especially careful with weight loss recommendations and calorie restrictions

RESPONSE QUALITY STANDARDS:
- Be specific with numbers and recommendations when helpful
- Provide practical, actionable advice the user can implement today
- Balance scientific accuracy with accessible language
- Show empathy and understanding for their challenges
- Maintain a supportive, non-judgmental tone throughout
- Focus on progress over perfection

Remember: Your goal is to be a supportive, knowledgeable nutrition coach who helps users build sustainable healthy habits while maintaining appropriate professional boundaries.`;
}

// Main function to create enhanced coaching prompts
export function createEnhancedNutritionCoachPrompt(context: CoachingPromptContext): ChatMessage[] {
  const systemPrompt = buildPersonalizedNutritionCoachPrompt(context);
  
  // Create contextual user prompt
  const userPrompt = buildContextualUserPrompt(context);
  
  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ];
}

function buildContextualUserPrompt(context: CoachingPromptContext): string {
  const { userMessage, mealRecommendations, insights } = context;
  
  let prompt = `User Message: "${userMessage}"`;
  
  // Add meal recommendations if available
  if (mealRecommendations && mealRecommendations.length > 0) {
    prompt += `\n\nAvailable Meal Recommendations:`;
    mealRecommendations.slice(0, 3).forEach((rec, index) => {
      prompt += `\n${index + 1}. ${rec.name} - ${rec.nutrition.calories} cal, ${rec.nutrition.protein}g protein`;
      prompt += `\n   Reasoning: ${rec.reasoning}`;
    });
  }
  
  // Add relevant insights if available
  if (insights && insights.length > 0) {
    prompt += `\n\nRelevant Insights:`;
    insights.slice(0, 2).forEach((insight, index) => {
      prompt += `\n${index + 1}. ${insight.type.toUpperCase()}: ${insight.message}`;
    });
  }
  
  return prompt;
}

// Specialized prompt creators for different scenarios
export function createMealPlanningPrompt(context: CoachingPromptContext): ChatMessage[] {
  // Enhance context for meal planning
  const enhancedContext = {
    ...context,
    userMessage: `${context.userMessage}\n\nPlease provide specific meal suggestions based on my remaining nutrition targets.`
  };
  
  return createEnhancedNutritionCoachPrompt(enhancedContext);
}

export function createProgressAnalysisPrompt(context: CoachingPromptContext): ChatMessage[] {
  const enhancedContext = {
    ...context,
    userMessage: `${context.userMessage}\n\nPlease analyze my progress and provide insights on my nutrition patterns.`
  };
  
  return createEnhancedNutritionCoachPrompt(enhancedContext);
}

export function createMotivationalPrompt(context: CoachingPromptContext): ChatMessage[] {
  const enhancedContext = {
    ...context,
    userMessage: `${context.userMessage}\n\nI could use some encouragement and motivation with my nutrition goals.`
  };
  
  return createEnhancedNutritionCoachPrompt(enhancedContext);
}

export function createEducationalPrompt(context: CoachingPromptContext): ChatMessage[] {
  const enhancedContext = {
    ...context,
    userMessage: `${context.userMessage}\n\nPlease explain the science and reasoning behind your recommendations.`
  };
  
  return createEnhancedNutritionCoachPrompt(enhancedContext);
}

// Response analysis and adaptation
export function analyzeResponseEffectiveness(
  userResponse: string,
  coachingResponse: CoachingResponse,
  context: CoachingPromptContext
): {
  effectiveness: 'high' | 'medium' | 'low';
  adaptations: Partial<CoachingPersonality>;
  suggestions: string[];
} {
  const response = userResponse.toLowerCase();
  
  // Analyze user satisfaction indicators
  const positiveIndicators = ['helpful', 'great', 'thanks', 'perfect', 'exactly'];
  const negativeIndicators = ['confusing', 'too much', 'overwhelming', 'not helpful'];
  
  const hasPositive = positiveIndicators.some(indicator => response.includes(indicator));
  const hasNegative = negativeIndicators.some(indicator => response.includes(indicator));
  
  let effectiveness: 'high' | 'medium' | 'low' = 'medium';
  const adaptations: Partial<CoachingPersonality> = {};
  const suggestions: string[] = [];
  
  if (hasPositive && !hasNegative) {
    effectiveness = 'high';
  } else if (hasNegative) {
    effectiveness = 'low';
    
    // Suggest adaptations based on negative feedback
    if (response.includes('too much') || response.includes('overwhelming')) {
      adaptations.complexity = 'simple';
      adaptations.encouragement = 'moderate';
      suggestions.push('Reduce information density and focus on key points');
    }
    
    if (response.includes('not motivating') || response.includes('need more encouragement')) {
      adaptations.tone = 'motivational';
      adaptations.encouragement = 'frequent';
      suggestions.push('Increase motivational elements and celebration');
    }
  }
  
  return { effectiveness, adaptations, suggestions };
}

// Utility function for creating quick coaching responses
export function createQuickCoachingResponse(
  userMessage: string,
  aiContext: NutritionCoachAiContext,
  personalityPreferences?: Partial<CoachingPersonality>
): ChatMessage[] {
  const context: CoachingPromptContext = {
    userMessage,
    aiContext,
    personalityPreferences
  };
  
  return createEnhancedNutritionCoachPrompt(context);
}

// Export default personality presets for easy use
export { PERSONALITY_PRESETS } from './coachingPersonality';