import { NutritionCoachAiContext } from './nutritionCoachAiContext';
import { CoachingInsight } from './progressAnalysis';
import { MealRecommendation } from './goalOrientedMealRecommender';

export interface CoachingPersonality {
  tone: 'supportive' | 'motivational' | 'educational' | 'celebratory' | 'gentle';
  empathy: 'high' | 'medium' | 'low';
  directness: 'direct' | 'gentle' | 'subtle';
  encouragement: 'frequent' | 'moderate' | 'minimal';
  complexity: 'simple' | 'moderate' | 'detailed';
}

export interface CoachingResponse {
  message: string;
  tone: string;
  actionItems?: string[];
  encouragement?: string;
  educationalNote?: string;
  followUpSuggestion?: string;
  celebrationElement?: string;
  medicalDisclaimer?: string;
}

export interface UserEmotionalState {
  motivation: 'high' | 'medium' | 'low';
  confidence: 'high' | 'medium' | 'low';
  stress: 'high' | 'medium' | 'low';
  satisfaction: 'high' | 'medium' | 'low';
  engagement: 'high' | 'medium' | 'low';
}

export interface CoachingContext {
  userState: UserEmotionalState;
  recentProgress: 'excellent' | 'good' | 'struggling' | 'inconsistent';
  challengeAreas: string[];
  strengths: string[];
  timeOfDay: 'morning' | 'afternoon' | 'evening';
  dayOfWeek: 'weekday' | 'weekend';
  streakDays: number;
  goalProximity: 'on-track' | 'ahead' | 'behind' | 'significantly-behind';
}

// Personality templates for different coaching scenarios
const PERSONALITY_TEMPLATES = {
  supportive: {
    tone: 'warm and understanding',
    phrases: [
      "I understand this can be challenging",
      "You're doing great by taking this step",
      "It's completely normal to feel this way",
      "Let's work through this together",
      "Every small step counts"
    ],
    encouragement: [
      "You've got this!",
      "I believe in your ability to reach your goals",
      "Progress isn't always linear, and that's okay",
      "You're building healthy habits that will last",
      "Remember why you started this journey"
    ]
  },
  
  motivational: {
    tone: 'energetic and inspiring',
    phrases: [
      "You're making incredible progress!",
      "This is exactly the kind of consistency that leads to success",
      "Your dedication is really showing",
      "You're building momentum every day",
      "This is what commitment looks like"
    ],
    encouragement: [
      "Keep up this amazing momentum!",
      "You're crushing your goals!",
      "Your consistency is inspiring",
      "You're proving to yourself what you're capable of",
      "This is the breakthrough you've been working toward"
    ]
  },
  
  educational: {
    tone: 'informative and empowering',
    phrases: [
      "Here's what the science tells us",
      "Understanding the 'why' can help with the 'how'",
      "This is a common question, and here's what research shows",
      "Let me break this down in a practical way",
      "Knowledge is power when it comes to nutrition"
    ],
    encouragement: [
      "The more you understand, the more empowered you become",
      "You're asking great questions",
      "This curiosity will serve you well on your journey",
      "Understanding these principles will help you long-term",
      "You're building a strong foundation of knowledge"
    ]
  },
  
  celebratory: {
    tone: 'joyful and proud',
    phrases: [
      "This is fantastic news!",
      "You should be really proud of this achievement",
      "This is exactly what we love to see",
      "Your hard work is paying off",
      "This milestone deserves recognition"
    ],
    encouragement: [
      "Celebrate this win - you've earned it!",
      "This is proof that your approach is working",
      "You're setting a great example for yourself",
      "This success builds on all your previous efforts",
      "You're creating positive momentum"
    ]
  },
  
  gentle: {
    tone: 'calm and reassuring',
    phrases: [
      "Let's take this one step at a time",
      "There's no rush - we're building sustainable habits",
      "It's okay to have ups and downs",
      "Progress comes in many forms",
      "Be kind to yourself during this process"
    ],
    encouragement: [
      "You're exactly where you need to be right now",
      "Small, consistent steps lead to big changes",
      "Your willingness to keep trying is what matters most",
      "Every day is a new opportunity",
      "You're learning and growing through this experience"
    ]
  }
};

// Response templates for different scenarios
const RESPONSE_TEMPLATES = {
  progressCelebration: {
    excellent: [
      "🎉 Outstanding work! You're {streakDays} days strong and really hitting your stride.",
      "Incredible consistency! Your {metric} progress shows real dedication.",
      "You're absolutely crushing it! This level of commitment is inspiring."
    ],
    good: [
      "Great job staying on track! Your consistency is building real momentum.",
      "Solid progress! You're developing habits that will serve you well long-term.",
      "Nice work! You're proving to yourself that you can stick to your goals."
    ]
  },
  
  challengeSupport: {
    struggling: [
      "I can see you're facing some challenges right now, and that's completely normal.",
      "Tough days happen to everyone on this journey. What matters is that you're here.",
      "Let's focus on what you can control today and take it one step at a time."
    ],
    inconsistent: [
      "I notice some ups and downs in your tracking - that's actually very common.",
      "Consistency is a skill that develops over time. You're still learning and growing.",
      "Let's look at what's working well and build from there."
    ]
  },
  
  mealGuidance: {
    onTrack: [
      "You're doing great with your nutrition today! Here's what I'd suggest for your next meal:",
      "Your macro balance is looking good. Let's keep this momentum going with:",
      "Perfect timing for a meal! Based on your remaining targets, I recommend:"
    ],
    behindTargets: [
      "No worries - we can still make today a success! Here's how to catch up:",
      "Let's focus on getting you back on track with some strategic choices:",
      "You still have time to hit your goals today. Here's my suggestion:"
    ],
    overTargets: [
      "You've been generous with your portions today! Let's adjust for the rest of the day:",
      "No problem - let's make some lighter choices for your remaining meals:",
      "We can balance this out with some mindful choices moving forward:"
    ]
  },
  
  educationalMoments: [
    "Here's something interesting about nutrition that might help:",
    "Let me share some science that explains why this works:",
    "Understanding this concept can really empower your food choices:",
    "This is a great opportunity to learn something new about nutrition:",
    "The research on this topic is fascinating and practical:"
  ],
  
  motivationalBoosts: [
    "Remember, every healthy choice you make is an investment in your future self.",
    "You're not just changing numbers - you're building a lifestyle that supports your best life.",
    "Your body is amazing at adapting to the care you give it.",
    "Each day you stick to your goals, you're proving to yourself what you're capable of.",
    "The habits you're building now will benefit you for years to come."
  ]
};

export class CoachingPersonalityEngine {
  private personalityPreferences: CoachingPersonality;
  
  constructor(preferences?: Partial<CoachingPersonality>) {
    this.personalityPreferences = {
      tone: 'supportive',
      empathy: 'high',
      directness: 'gentle',
      encouragement: 'frequent',
      complexity: 'moderate',
      ...preferences
    };
  }

  public generateResponse(
    userMessage: string,
    context: NutritionCoachAiContext,
    coachingContext: CoachingContext,
    insights?: CoachingInsight[],
    recommendations?: MealRecommendation[]
  ): CoachingResponse {
    
    // Determine the primary response type based on context
    const responseType = this.determineResponseType(userMessage, context, coachingContext);
    
    // Select appropriate personality based on user state and context
    const personality = this.selectPersonality(coachingContext);
    
    // Generate the core message
    const coreMessage = this.generateCoreMessage(responseType, context, coachingContext, personality);
    
    // Add personality-specific elements
    const response: CoachingResponse = {
      message: coreMessage,
      tone: personality,
      ...this.addPersonalityElements(responseType, coachingContext, insights, recommendations)
    };
    
    return response;
  }

  private determineResponseType(
    userMessage: string, 
    context: NutritionCoachAiContext, 
    coachingContext: CoachingContext
  ): string {
    const message = userMessage.toLowerCase();
    
    // Check for celebration opportunities
    if (coachingContext.recentProgress === 'excellent' || coachingContext.streakDays >= 7) {
      return 'celebration';
    }
    
    // Check for support needs
    if (coachingContext.recentProgress === 'struggling' || 
        coachingContext.userState.motivation === 'low' ||
        message.includes('struggling') || message.includes('difficult')) {
      return 'support';
    }
    
    // Check for meal guidance requests
    if (message.includes('eat') || message.includes('meal') || message.includes('food')) {
      return 'mealGuidance';
    }
    
    // Check for educational requests
    if (message.includes('why') || message.includes('how') || message.includes('explain')) {
      return 'education';
    }
    
    // Check for progress inquiries
    if (message.includes('progress') || message.includes('doing')) {
      return 'progressUpdate';
    }
    
    return 'general';
  }

  private selectPersonality(coachingContext: CoachingContext): string {
    const { userState, recentProgress, streakDays } = coachingContext;
    
    // Celebratory for excellent progress
    if (recentProgress === 'excellent' || streakDays >= 14) {
      return 'celebratory';
    }
    
    // Gentle for low motivation or high stress
    if (userState.motivation === 'low' || userState.stress === 'high') {
      return 'gentle';
    }
    
    // Motivational for good progress and high engagement
    if (recentProgress === 'good' && userState.engagement === 'high') {
      return 'motivational';
    }
    
    // Educational for moderate engagement and confidence
    if (userState.confidence === 'medium' && userState.engagement === 'medium') {
      return 'educational';
    }
    
    // Default to supportive
    return 'supportive';
  }

  private generateCoreMessage(
    responseType: string,
    context: NutritionCoachAiContext,
    coachingContext: CoachingContext,
    personality: string
  ): string {
    const templates = RESPONSE_TEMPLATES;
    const personalityData = PERSONALITY_TEMPLATES[personality as keyof typeof PERSONALITY_TEMPLATES];
    
    let message = "";
    
    switch (responseType) {
      case 'celebration':
        const celebrationTemplate = templates.progressCelebration[coachingContext.recentProgress as keyof typeof templates.progressCelebration];
        message = this.selectRandomTemplate(celebrationTemplate);
        break;
        
      case 'support':
        const supportTemplate = templates.challengeSupport[coachingContext.recentProgress as keyof typeof templates.challengeSupport];
        message = this.selectRandomTemplate(supportTemplate || templates.challengeSupport.struggling);
        break;
        
      case 'mealGuidance':
        const guidanceTemplate = templates.mealGuidance[coachingContext.goalProximity === 'on-track' ? 'onTrack' : 
                                                      coachingContext.goalProximity === 'behind' ? 'behindTargets' : 'overTargets'];
        message = this.selectRandomTemplate(guidanceTemplate);
        break;
        
      case 'education':
        message = this.selectRandomTemplate(templates.educationalMoments);
        break;
        
      case 'progressUpdate':
        message = this.generateProgressUpdateMessage(context, coachingContext);
        break;
        
      default:
        message = this.selectRandomTemplate(personalityData.phrases);
    }
    
    return this.personalizeMessage(message, context, coachingContext);
  }

  private addPersonalityElements(
    responseType: string,
    coachingContext: CoachingContext,
    insights?: CoachingInsight[],
    recommendations?: MealRecommendation[]
  ): Partial<CoachingResponse> {
    const elements: Partial<CoachingResponse> = {};
    
    // Add encouragement based on personality preferences
    if (this.personalityPreferences.encouragement !== 'minimal') {
      elements.encouragement = this.generateEncouragement(coachingContext);
    }
    
    // Add action items for meal guidance
    if (responseType === 'mealGuidance' && recommendations) {
      elements.actionItems = this.generateActionItems(recommendations);
    }
    
    // Add educational notes for learning opportunities
    if (responseType === 'education' || this.personalityPreferences.complexity !== 'simple') {
      elements.educationalNote = this.generateEducationalNote(responseType, insights);
    }
    
    // Add follow-up suggestions
    elements.followUpSuggestion = this.generateFollowUpSuggestion(responseType, coachingContext);
    
    // Add celebration elements for wins
    if (responseType === 'celebration') {
      elements.celebrationElement = this.generateCelebrationElement(coachingContext);
    }
    
    // Add medical disclaimers when appropriate
    if (this.needsMedicalDisclaimer(responseType)) {
      elements.medicalDisclaimer = this.generateMedicalDisclaimer(responseType);
    }
    
    return elements;
  }

  private selectRandomTemplate(templates: string[]): string {
    return templates[Math.floor(Math.random() * templates.length)];
  }

  private personalizeMessage(
    message: string, 
    context: NutritionCoachAiContext, 
    coachingContext: CoachingContext
  ): string {
    return message
      .replace('{streakDays}', coachingContext.streakDays.toString())
      .replace('{metric}', this.getRelevantMetric(context))
      .replace('{goalType}', context.userProfile.goals.goalType)
      .replace('{timeOfDay}', coachingContext.timeOfDay);
  }

  private getRelevantMetric(context: NutritionCoachAiContext): string {
    const { currentProgress } = context;
    
    if (currentProgress.today.calories.percentage > 0.8) {
      return 'calorie tracking';
    } else if (currentProgress.today.macros.protein.percentage > 0.8) {
      return 'protein intake';
    } else {
      return 'nutrition tracking';
    }
  }

  private generateProgressUpdateMessage(
    context: NutritionCoachAiContext, 
    coachingContext: CoachingContext
  ): string {
    const { currentProgress } = context;
    const calorieProgress = Math.round(currentProgress.today.calories.percentage * 100);
    const proteinProgress = Math.round(currentProgress.today.macros.protein.percentage * 100);
    
    return `You're ${calorieProgress}% toward your calorie goal and ${proteinProgress}% toward your protein target today. ${this.getProgressContextualMessage(coachingContext)}`;
  }

  private getProgressContextualMessage(coachingContext: CoachingContext): string {
    if (coachingContext.recentProgress === 'excellent') {
      return "Your consistency has been outstanding!";
    } else if (coachingContext.recentProgress === 'good') {
      return "You're building great momentum!";
    } else {
      return "Every step forward counts - keep going!";
    }
  }

  private generateEncouragement(coachingContext: CoachingContext): string {
    const personality = this.selectPersonality(coachingContext);
    const personalityData = PERSONALITY_TEMPLATES[personality as keyof typeof PERSONALITY_TEMPLATES];
    
    return this.selectRandomTemplate(personalityData.encouragement);
  }

  private generateActionItems(recommendations: MealRecommendation[]): string[] {
    return recommendations.slice(0, 2).map(rec => 
      `Try ${rec.name} (${rec.nutrition.calories} cal, ${rec.nutrition.protein}g protein)`
    );
  }

  private generateEducationalNote(responseType: string, insights?: CoachingInsight[]): string {
    const educationalNotes = [
      "Protein helps maintain muscle mass during weight management.",
      "Eating regularly helps maintain stable energy levels throughout the day.",
      "Fiber-rich foods help you feel full and satisfied with fewer calories.",
      "Hydration plays a key role in metabolism and appetite regulation.",
      "Consistent meal timing can help regulate your body's hunger cues."
    ];
    
    if (insights && insights.length > 0) {
      const insight = insights.find(i => i.type === 'educational');
      if (insight) return insight.message;
    }
    
    return this.selectRandomTemplate(educationalNotes);
  }

  private generateFollowUpSuggestion(responseType: string, coachingContext: CoachingContext): string {
    const suggestions = {
      mealGuidance: [
        "Would you like me to suggest some specific recipes?",
        "Should we talk about meal prep strategies?",
        "Want to explore some quick and healthy options?"
      ],
      support: [
        "What's been the biggest challenge for you lately?",
        "Would it help to adjust your goals or approach?",
        "Should we focus on one specific area to improve?"
      ],
      celebration: [
        "What's been working best for you?",
        "How are you feeling about your progress?",
        "Ready to set your next milestone?"
      ],
      education: [
        "Would you like to learn more about this topic?",
        "Do you have other nutrition questions?",
        "Should we dive deeper into the science?"
      ]
    };
    
    const relevantSuggestions = suggestions[responseType as keyof typeof suggestions] || [
      "How can I help you with your nutrition goals today?",
      "What would be most helpful to focus on right now?",
      "Is there anything specific you'd like to work on?"
    ];
    
    return this.selectRandomTemplate(relevantSuggestions);
  }

  private generateCelebrationElement(coachingContext: CoachingContext): string {
    const celebrations = [
      `🎯 ${coachingContext.streakDays} days of consistent tracking!`,
      "🌟 You're building incredible healthy habits!",
      "💪 Your dedication is really paying off!",
      "🚀 This momentum is going to carry you far!",
      "✨ You should be proud of this achievement!"
    ];
    
    return this.selectRandomTemplate(celebrations);
  }

  private needsMedicalDisclaimer(responseType: string): boolean {
    return ['education', 'mealGuidance'].includes(responseType);
  }

  private generateMedicalDisclaimer(responseType: string): string {
    const disclaimers = {
      education: "This information is for educational purposes. Always consult your healthcare provider for personalized medical advice.",
      mealGuidance: "These are general nutrition suggestions. Adjust based on your individual needs and any medical conditions.",
      general: "This guidance is based on general nutrition principles. Consult healthcare professionals for medical concerns."
    };
    
    return disclaimers[responseType as keyof typeof disclaimers] || disclaimers.general;
  }

  // Method to update personality preferences based on user feedback
  public updatePersonalityPreferences(feedback: Partial<CoachingPersonality>): void {
    this.personalityPreferences = {
      ...this.personalityPreferences,
      ...feedback
    };
  }

  // Method to analyze user response and adapt personality
  public adaptToUserResponse(userResponse: string, currentContext: CoachingContext): Partial<CoachingPersonality> {
    const response = userResponse.toLowerCase();
    const adaptations: Partial<CoachingPersonality> = {};
    
    // Adapt based on user feedback cues
    if (response.includes('too much') || response.includes('overwhelming')) {
      adaptations.complexity = 'simple';
      adaptations.encouragement = 'moderate';
    }
    
    if (response.includes('more detail') || response.includes('explain more')) {
      adaptations.complexity = 'detailed';
    }
    
    if (response.includes('motivate') || response.includes('push me')) {
      adaptations.tone = 'motivational';
      adaptations.encouragement = 'frequent';
    }
    
    if (response.includes('gentle') || response.includes('stressed')) {
      adaptations.tone = 'supportive';
      adaptations.directness = 'gentle';
    }
    
    return adaptations;
  }
}

// Utility functions for easy integration
export function createCoachingResponse(
  userMessage: string,
  context: NutritionCoachAiContext,
  coachingContext: CoachingContext,
  personalityPreferences?: Partial<CoachingPersonality>
): CoachingResponse {
  const engine = new CoachingPersonalityEngine(personalityPreferences);
  return engine.generateResponse(userMessage, context, coachingContext);
}

export function adaptPersonalityToUser(
  userFeedback: string,
  currentContext: CoachingContext,
  currentPreferences: CoachingPersonality
): CoachingPersonality {
  const engine = new CoachingPersonalityEngine(currentPreferences);
  const adaptations = engine.adaptToUserResponse(userFeedback, currentContext);
  
  return {
    ...currentPreferences,
    ...adaptations
  };
}

// Default personality configurations for different user types
export const PERSONALITY_PRESETS = {
  beginner: {
    tone: 'supportive' as const,
    empathy: 'high' as const,
    directness: 'gentle' as const,
    encouragement: 'frequent' as const,
    complexity: 'simple' as const
  },
  
  experienced: {
    tone: 'motivational' as const,
    empathy: 'medium' as const,
    directness: 'direct' as const,
    encouragement: 'moderate' as const,
    complexity: 'detailed' as const
  },
  
  struggling: {
    tone: 'gentle' as const,
    empathy: 'high' as const,
    directness: 'subtle' as const,
    encouragement: 'frequent' as const,
    complexity: 'simple' as const
  },
  
  analytical: {
    tone: 'educational' as const,
    empathy: 'medium' as const,
    directness: 'direct' as const,
    encouragement: 'moderate' as const,
    complexity: 'detailed' as const
  }
};