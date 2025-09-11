import { NutritionCoachAiContext } from './nutritionCoachAiContext';
import { CoachingContext, UserEmotionalState } from './coachingPersonality';
import { CoachingInsight } from './nutritionCoachAiContext';

export interface UserBehaviorPattern {
  consistency: 'high' | 'medium' | 'low';
  engagement: 'increasing' | 'stable' | 'decreasing';
  weekendVariance: 'high' | 'medium' | 'low';
  mealTimingRegularity: 'regular' | 'irregular';
  goalAdherence: 'excellent' | 'good' | 'struggling';
}

export interface ConversationContext {
  messageCount: number;
  lastInteractionHours: number;
  commonTopics: string[];
  userSentiment: 'positive' | 'neutral' | 'negative';
  questionFrequency: 'high' | 'medium' | 'low';
}

export class CoachingContextAnalyzer {
  
  public analyzeCoachingContext(
    aiContext: NutritionCoachAiContext,
    conversationHistory?: any[],
    recentInsights?: CoachingInsight[]
  ): CoachingContext {
    
    const userState = this.analyzeUserEmotionalState(aiContext, conversationHistory);
    const recentProgress = this.assessRecentProgress(aiContext);
    const challengeAreas = this.identifyChallengeAreas(aiContext, recentInsights);
    const strengths = this.identifyStrengths(aiContext, recentInsights);
    const streakDays = this.calculateStreakDays(aiContext);
    const goalProximity = this.assessGoalProximity(aiContext);
    
    return {
      userState,
      recentProgress,
      challengeAreas,
      strengths,
      timeOfDay: this.getCurrentTimeOfDay(),
      dayOfWeek: this.getCurrentDayType(),
      streakDays,
      goalProximity
    };
  }

  private analyzeUserEmotionalState(
    aiContext: NutritionCoachAiContext,
    conversationHistory?: any[]
  ): UserEmotionalState {
    
    const { currentProgress, eatingPatterns } = aiContext;
    
    // Derive a consistency proxy from eatingPatterns.commonPatterns if available
    const consistencyProxy = (eatingPatterns && (eatingPatterns as any).consistencyScore) ?? (
      eatingPatterns?.commonPatterns?.length ? 0.6 : 0.5
    );
    // Analyze motivation based on consistency and progress
    const motivation = this.assessMotivation(currentProgress, { ...eatingPatterns, consistencyScore: consistencyProxy } as any);
    
    // Analyze confidence based on goal adherence
    const confidence = this.assessConfidence(currentProgress);
    
    // Analyze stress based on eating patterns and consistency
    const stress = this.assessStress(eatingPatterns, conversationHistory);
    
    // Analyze satisfaction based on progress toward goals
    const satisfaction = this.assessSatisfaction(currentProgress);
    
    // Analyze engagement based on tracking consistency
    const engagement = this.assessEngagement(eatingPatterns);
    
    return {
      motivation,
      confidence,
      stress,
      satisfaction,
      engagement
    };
  }

  private assessMotivation(currentProgress: any, eatingPatterns: any): 'high' | 'medium' | 'low' {
    const adherenceScore = currentProgress.adherenceScore || 0;
    const consistencyDays = eatingPatterns.consistentDays || 0;
    
    if (adherenceScore > 0.8 && consistencyDays >= 5) return 'high';
    if (adherenceScore > 0.6 && consistencyDays >= 3) return 'medium';
    return 'low';
  }

  private assessConfidence(currentProgress: any): 'high' | 'medium' | 'low' {
    const { today } = currentProgress;
    const calorieAccuracy = Math.abs(today.calories.percentage - 1.0);
    const proteinAccuracy = Math.abs(today.macros.protein.percentage - 1.0);
    
    const avgAccuracy = (calorieAccuracy + proteinAccuracy) / 2;
    
    if (avgAccuracy < 0.2) return 'high';
    if (avgAccuracy < 0.4) return 'medium';
    return 'low';
  }

  private assessStress(eatingPatterns: any, conversationHistory?: any[]): 'high' | 'medium' | 'low' {
    // Look for stress indicators in eating patterns
    const irregularPatterns = eatingPatterns.commonPatterns?.filter(
      (p: any) => p.impact === 'negative'
    ).length || 0;
    
    // Check conversation history for stress indicators
    const stressKeywords = ['stressed', 'overwhelmed', 'difficult', 'struggling', 'hard'];
    const recentStressMessages = conversationHistory?.filter(msg => 
      stressKeywords.some(keyword => msg.content?.toLowerCase().includes(keyword))
    ).length || 0;
    
    if (irregularPatterns > 2 || recentStressMessages > 1) return 'high';
    if (irregularPatterns > 0 || recentStressMessages > 0) return 'medium';
    return 'low';
  }

  private assessSatisfaction(currentProgress: any): 'high' | 'medium' | 'low' {
    const { adherenceScore } = currentProgress;
    const weeklyProgress = adherenceScore || 0;
    
    if (weeklyProgress > 0.85) return 'high';
    if (weeklyProgress > 0.65) return 'medium';
    return 'low';
  }

  private assessEngagement(eatingPatterns: any): 'high' | 'medium' | 'low' {
    const trackingFrequency = eatingPatterns.trackingFrequency || 0;
    const recentActivity = eatingPatterns.recentActivity || 0;
    
    if (trackingFrequency > 0.8 && recentActivity > 0.7) return 'high';
    if (trackingFrequency > 0.6 && recentActivity > 0.5) return 'medium';
    return 'low';
  }

  private assessRecentProgress(aiContext: NutritionCoachAiContext): 'excellent' | 'good' | 'struggling' | 'inconsistent' {
    const { currentProgress } = aiContext;
    const adherenceScore = currentProgress.adherenceScore || 0;
    const consistency = this.calculateConsistency(aiContext);
    
    if (adherenceScore > 0.9 && consistency > 0.8) return 'excellent';
    if (adherenceScore > 0.7 && consistency > 0.6) return 'good';
    if (consistency < 0.4) return 'inconsistent';
    return 'struggling';
  }

  private calculateConsistency(aiContext: NutritionCoachAiContext): number {
    const { eatingPatterns } = aiContext;
    // This would calculate based on tracking frequency, meal timing regularity, etc.
  // eatingPatterns may not include a consistencyScore; fall back to a reasonable default
  return (eatingPatterns && (eatingPatterns as any).consistencyScore) ?? 0.5;
  }

  private identifyChallengeAreas(
    aiContext: NutritionCoachAiContext, 
    insights?: CoachingInsight[]
  ): string[] {
    const challenges: string[] = [];
    const { currentProgress, remainingTargets } = aiContext;
    
    // Check macro adherence
    if (currentProgress.today.macros.protein.percentage < 0.7) {
      challenges.push('protein intake');
    }
    
    if (currentProgress.today.calories.percentage < 0.8) {
      challenges.push('calorie consistency');
    }
    
    // Check for large remaining targets late in day
    if (remainingTargets.timeOfDay === 'evening' && remainingTargets.calories > 500) {
      challenges.push('meal distribution');
    }
    
    // Add insights-based challenges
    insights?.forEach(insight => {
      if (insight.type === 'warning') {
          // Use message as a category fallback when explicit categories are not present
          challenges.push(insight.message || 'general nutrition');
        }
    });
    
    return challenges.slice(0, 3); // Limit to top 3 challenges
  }

  private identifyStrengths(
    aiContext: NutritionCoachAiContext, 
    insights?: CoachingInsight[]
  ): string[] {
    const strengths: string[] = [];
    const { currentProgress, eatingPatterns } = aiContext;
    
    // Check for strong areas
    if (currentProgress.today.macros.protein.percentage > 0.9) {
      strengths.push('protein tracking');
    }
    
    if (currentProgress.adherenceScore > 0.8) {
      strengths.push('consistency');
    }
    
    // eatingPatterns may include meal timing patterns - check mealTiming array for regularity
    const mealTiming = eatingPatterns.mealTiming || [];
    if (mealTiming.some(m => m.consistency && m.consistency > 0.8)) {
      strengths.push('meal timing');
    }
    
    // Add insights-based strengths
    insights?.forEach(insight => {
      if (insight.type === 'celebration' || insight.type === 'encouragement') {
        strengths.push(insight.message || 'nutrition habits');
      }
    });
    
    return strengths.slice(0, 3); // Limit to top 3 strengths
  }

  private calculateStreakDays(aiContext: NutritionCoachAiContext): number {
    // This would calculate consecutive days of goal adherence
    // For now, return a placeholder based on adherence score
    const adherenceScore = aiContext.currentProgress.adherenceScore || 0;
    return Math.floor(adherenceScore * 14); // Estimate based on 2-week period
  }

  private assessGoalProximity(aiContext: NutritionCoachAiContext): 'on-track' | 'ahead' | 'behind' | 'significantly-behind' {
    const { currentProgress } = aiContext;
    const avgProgress = (
      currentProgress.today.calories.percentage +
      currentProgress.today.macros.protein.percentage +
      currentProgress.today.macros.carbs.percentage +
      currentProgress.today.macros.fats.percentage
    ) / 4;
    
    if (avgProgress > 1.1) return 'ahead';
    if (avgProgress > 0.8) return 'on-track';
    if (avgProgress > 0.6) return 'behind';
    return 'significantly-behind';
  }

  private getCurrentTimeOfDay(): 'morning' | 'afternoon' | 'evening' {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    return 'evening';
  }

  private getCurrentDayType(): 'weekday' | 'weekend' {
    const day = new Date().getDay();
    return (day === 0 || day === 6) ? 'weekend' : 'weekday';
  }

  // Method to analyze user behavior patterns over time
  public analyzeUserBehaviorPatterns(aiContext: NutritionCoachAiContext): UserBehaviorPattern {
    const { eatingPatterns, currentProgress } = aiContext;
    
    return {
      consistency: this.assessConsistencyLevel(eatingPatterns),
      engagement: this.assessEngagementTrend(eatingPatterns),
      weekendVariance: this.assessWeekendVariance(eatingPatterns),
      mealTimingRegularity: this.assessMealTimingRegularity(eatingPatterns),
      goalAdherence: this.assessGoalAdherence(currentProgress)
    };
  }

  private assessConsistencyLevel(eatingPatterns: any): 'high' | 'medium' | 'low' {
    const consistencyScore = eatingPatterns.consistencyScore || 0;
    if (consistencyScore > 0.8) return 'high';
    if (consistencyScore > 0.6) return 'medium';
    return 'low';
  }

  private assessEngagementTrend(eatingPatterns: any): 'increasing' | 'stable' | 'decreasing' {
    // This would analyze engagement over time
    // For now, return stable as default
    return 'stable';
  }

  private assessWeekendVariance(eatingPatterns: any): 'high' | 'medium' | 'low' {
    // This would compare weekend vs weekday patterns
    return 'medium';
  }

  private assessMealTimingRegularity(eatingPatterns: any): 'regular' | 'irregular' {
    return eatingPatterns.mealTimingRegularity || 'irregular';
  }

  private assessGoalAdherence(currentProgress: any): 'excellent' | 'good' | 'struggling' {
    const adherenceScore = currentProgress.adherenceScore || 0;
    if (adherenceScore > 0.85) return 'excellent';
    if (adherenceScore > 0.65) return 'good';
    return 'struggling';
  }

  // Method to analyze conversation context
  public analyzeConversationContext(conversationHistory: any[]): ConversationContext {
    const messageCount = conversationHistory.length;
    const lastInteractionHours = this.calculateLastInteractionHours(conversationHistory);
    const commonTopics = this.extractCommonTopics(conversationHistory);
    const userSentiment = this.analyzeSentiment(conversationHistory);
    const questionFrequency = this.analyzeQuestionFrequency(conversationHistory);
    
    return {
      messageCount,
      lastInteractionHours,
      commonTopics,
      userSentiment,
      questionFrequency
    };
  }

  private calculateLastInteractionHours(conversationHistory: any[]): number {
    if (conversationHistory.length === 0) return 24;
    
    const lastMessage = conversationHistory[conversationHistory.length - 1];
    const lastTime = new Date(lastMessage.timestamp || Date.now());
    const now = new Date();
    
    return Math.floor((now.getTime() - lastTime.getTime()) / (1000 * 60 * 60));
  }

  private extractCommonTopics(conversationHistory: any[]): string[] {
    const topics = ['meals', 'progress', 'goals', 'challenges', 'recipes'];
    const topicCounts: Record<string, number> = {};
    
    conversationHistory.forEach(message => {
      const content = message.content?.toLowerCase() || '';
      topics.forEach(topic => {
        if (content.includes(topic)) {
          topicCounts[topic] = (topicCounts[topic] || 0) + 1;
        }
      });
    });
    
    return Object.entries(topicCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([topic]) => topic);
  }

  private analyzeSentiment(conversationHistory: any[]): 'positive' | 'neutral' | 'negative' {
    const positiveWords = ['great', 'good', 'excellent', 'happy', 'satisfied', 'love', 'amazing'];
    const negativeWords = ['difficult', 'hard', 'struggling', 'frustrated', 'disappointed', 'stressed'];
    
    let positiveCount = 0;
    let negativeCount = 0;
    
    conversationHistory.slice(-5).forEach(message => { // Look at last 5 messages
      const content = message.content?.toLowerCase() || '';
      positiveWords.forEach(word => {
        if (content.includes(word)) positiveCount++;
      });
      negativeWords.forEach(word => {
        if (content.includes(word)) negativeCount++;
      });
    });
    
    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  private analyzeQuestionFrequency(conversationHistory: any[]): 'high' | 'medium' | 'low' {
    const recentMessages = conversationHistory.slice(-10);
    const questionCount = recentMessages.filter(msg => 
      msg.content?.includes('?') || 
      msg.content?.toLowerCase().startsWith('how') ||
      msg.content?.toLowerCase().startsWith('what') ||
      msg.content?.toLowerCase().startsWith('why')
    ).length;
    
    const questionRatio = questionCount / Math.max(recentMessages.length, 1);
    
    if (questionRatio > 0.5) return 'high';
    if (questionRatio > 0.2) return 'medium';
    return 'low';
  }
}

// Utility functions for easy integration
export function analyzeCoachingContext(
  aiContext: NutritionCoachAiContext,
  conversationHistory?: any[],
  insights?: CoachingInsight[]
): CoachingContext {
  const analyzer = new CoachingContextAnalyzer();
  return analyzer.analyzeCoachingContext(aiContext, conversationHistory, insights);
}

export function analyzeUserBehavior(aiContext: NutritionCoachAiContext): UserBehaviorPattern {
  const analyzer = new CoachingContextAnalyzer();
  return analyzer.analyzeUserBehaviorPatterns(aiContext);
}

export function analyzeConversation(conversationHistory: any[]): ConversationContext {
  const analyzer = new CoachingContextAnalyzer();
  return analyzer.analyzeConversationContext(conversationHistory);
}