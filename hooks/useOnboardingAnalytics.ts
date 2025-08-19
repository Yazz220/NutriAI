import { useCallback, useEffect } from 'react';
import { OnboardingStep, AnalyticsEvent } from '@/types';
import { useOnboarding } from '@/components/onboarding/OnboardingProvider';
import { ANALYTICS_EVENTS } from '@/constants/onboarding';

export interface AnalyticsData {
  sessionId: string;
  totalEvents: number;
  completionRate: number;
  timeSpent: number;
  dropOffPoint?: OnboardingStep;
  userChoices: Record<string, any>;
}

/**
 * Hook for tracking onboarding analytics events
 */
export const useOnboardingAnalytics = () => {
  const { state, trackEvent } = useOnboarding();

  // Track step views automatically
  useEffect(() => {
    trackEvent({
      type: 'step_viewed',
      step: state.currentStep,
      data: {
        timestamp: new Date().toISOString(),
        sessionId: state.analytics.sessionId,
      },
    });
  }, [state.currentStep, trackEvent, state.analytics.sessionId]);

  // Custom event tracking methods
  const trackWelcomeShown = useCallback(() => {
    trackEvent({
      type: 'step_viewed',
      step: OnboardingStep.WELCOME,
      data: {
        eventName: ANALYTICS_EVENTS.ONBOARDING_WELCOME_SHOWN,
      },
    });
  }, [trackEvent]);

  const trackDietaryPreferencesSet = useCallback((preferences: {
    dietaryTypes: string[];
    allergies: string[];
    goals: string[];
  }) => {
    trackEvent({
      type: 'option_selected',
      step: OnboardingStep.DIETARY_PREFERENCES,
      data: {
        eventName: ANALYTICS_EVENTS.ONBOARDING_DIETARY_SET,
        dietaryTypes: preferences.dietaryTypes,
        allergies: preferences.allergies,
        goals: preferences.goals,
        totalSelections: preferences.dietaryTypes.length + preferences.allergies.length + preferences.goals.length,
      },
    });
  }, [trackEvent]);

  const trackCookingHabitsSet = useCallback((habits: {
    cookingSkill: string;
    cookingTime: string;
    shoppingFrequency: string;
  }) => {
    trackEvent({
      type: 'option_selected',
      step: OnboardingStep.COOKING_HABITS,
      data: {
        eventName: ANALYTICS_EVENTS.ONBOARDING_HABITS_SET,
        ...habits,
      },
    });
  }, [trackEvent]);

  const trackInventoryItemsAdded = useCallback((items: {
    method: 'scan' | 'quickpick';
    itemCount: number;
    categories: string[];
  }) => {
    trackEvent({
      type: 'option_selected',
      step: OnboardingStep.INVENTORY_KICKSTART,
      data: {
        method: items.method,
        itemCount: items.itemCount,
        categories: items.categories,
      },
    });
  }, [trackEvent]);

  const trackAICoachDemoViewed = useCallback((interaction: {
    promptUsed?: string;
    responseReceived: boolean;
    interactionTime: number;
  }) => {
    trackEvent({
      type: 'step_viewed',
      step: OnboardingStep.AI_COACH_INTRO,
      data: {
        eventName: ANALYTICS_EVENTS.ONBOARDING_COACH_DEMO_VIEWED,
        ...interaction,
      },
    });
  }, [trackEvent]);

  const trackOnboardingCompleted = useCallback((summary: {
    totalTimeSpent: number;
    completedSteps: OnboardingStep[];
    skippedSteps: OnboardingStep[];
    finalAction?: string;
  }) => {
    trackEvent({
      type: 'step_completed',
      step: OnboardingStep.COMPLETION,
      data: {
        eventName: ANALYTICS_EVENTS.ONBOARDING_COMPLETED,
        ...summary,
      },
    });
  }, [trackEvent]);

  const trackError = useCallback((error: {
    step: OnboardingStep;
    errorType: string;
    errorMessage: string;
    context?: Record<string, any>;
  }) => {
    trackEvent({
      type: 'error_occurred',
      step: error.step,
      data: {
        errorType: error.errorType,
        errorMessage: error.errorMessage,
        context: error.context,
      },
    });
  }, [trackEvent]);

  const trackUserChoice = useCallback((choice: {
    step: OnboardingStep;
    choiceType: string;
    choiceValue: any;
    context?: Record<string, any>;
  }) => {
    trackEvent({
      type: 'option_selected',
      step: choice.step,
      data: {
        choiceType: choice.choiceType,
        choiceValue: choice.choiceValue,
        context: choice.context,
      },
    });
  }, [trackEvent]);

  // Get analytics summary
  const getAnalyticsSummary = useCallback((): AnalyticsData => {
    const timeSpent = Date.now() - state.analytics.startTime.getTime();
    
    // Find drop-off point (last incomplete step)
    let dropOffPoint: OnboardingStep | undefined;
    const allSteps = Object.values(OnboardingStep).filter(
      (step): step is OnboardingStep => typeof step === 'number'
    );
    
    for (const step of allSteps) {
      if (!state.completedSteps.has(step) && !state.skippedSteps.has(step)) {
        dropOffPoint = step;
        break;
      }
    }

    // Aggregate user choices from events
    const userChoices: Record<string, any> = {};
    state.analytics.events.forEach(event => {
      if (event.type === 'option_selected' && event.data) {
        const stepName = OnboardingStep[event.step];
        if (!userChoices[stepName]) {
          userChoices[stepName] = {};
        }
        Object.assign(userChoices[stepName], event.data);
      }
    });

    return {
      sessionId: state.analytics.sessionId,
      totalEvents: state.analytics.events.length,
      completionRate: state.analytics.completionRate,
      timeSpent,
      dropOffPoint,
      userChoices,
    };
  }, [state]);

  // Export analytics data (for debugging or external analytics services)
  const exportAnalyticsData = useCallback(() => {
    const summary = getAnalyticsSummary();
    const exportData = {
      ...summary,
      events: state.analytics.events,
      userData: state.userData,
      completedSteps: Array.from(state.completedSteps),
      skippedSteps: Array.from(state.skippedSteps),
    };

    return exportData;
  }, [getAnalyticsSummary, state]);

  return {
    // Event tracking methods
    trackWelcomeShown,
    trackDietaryPreferencesSet,
    trackCookingHabitsSet,
    trackInventoryItemsAdded,
    trackAICoachDemoViewed,
    trackOnboardingCompleted,
    trackError,
    trackUserChoice,
    
    // Analytics data
    getAnalyticsSummary,
    exportAnalyticsData,
    
    // Current state
    currentEvents: state.analytics.events,
    sessionId: state.analytics.sessionId,
    completionRate: state.analytics.completionRate,
  };
};

/**
 * Hook for tracking specific step analytics
 */
export const useStepAnalytics = (step: OnboardingStep) => {
  const { trackEvent } = useOnboarding();

  const trackStepStarted = useCallback(() => {
    trackEvent({
      type: 'step_viewed',
      step,
      data: {
        action: 'step_started',
        timestamp: new Date().toISOString(),
      },
    });
  }, [step, trackEvent]);

  const trackStepCompleted = useCallback((data?: Record<string, any>) => {
    trackEvent({
      type: 'step_completed',
      step,
      data: {
        action: 'step_completed',
        timestamp: new Date().toISOString(),
        ...data,
      },
    });
  }, [step, trackEvent]);

  const trackStepSkipped = useCallback((reason?: string) => {
    trackEvent({
      type: 'step_skipped',
      step,
      data: {
        action: 'step_skipped',
        reason,
        timestamp: new Date().toISOString(),
      },
    });
  }, [step, trackEvent]);

  return {
    trackStepStarted,
    trackStepCompleted,
    trackStepSkipped,
  };
};