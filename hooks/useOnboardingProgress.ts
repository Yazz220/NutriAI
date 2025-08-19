import { useCallback, useEffect, useState } from 'react';
import { OnboardingStep } from '@/types';
import { useOnboarding } from '@/components/onboarding/OnboardingProvider';
import { 
  calculateCompletionPercentage, 
  getNextOnboardingStep, 
  getStepInfo 
} from '@/utils/onboarding';

export interface OnboardingProgress {
  currentStep: OnboardingStep;
  nextStep: OnboardingStep | null;
  completionPercentage: number;
  totalSteps: number;
  completedSteps: number;
  skippedSteps: number;
  stepInfo: {
    name: string;
    number: number;
    canSkip: boolean;
  };
  isFirstStep: boolean;
  isLastStep: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
}

/**
 * Hook to track and manage onboarding progress
 */
export const useOnboardingProgress = (): OnboardingProgress => {
  const { state } = useOnboarding();
  const [progress, setProgress] = useState<OnboardingProgress | null>(null);

  const calculateProgress = useCallback((): OnboardingProgress => {
    const totalSteps = Object.keys(OnboardingStep).length / 2; // Enum has both string and number keys
    const completedCount = state.completedSteps.size;
    const skippedCount = state.skippedSteps.size;
    const completionPercentage = calculateCompletionPercentage(state.completedSteps, totalSteps);
    
    const nextStep = getNextOnboardingStep(state.completedSteps, state.skippedSteps);
    const stepInfo = getStepInfo(state.currentStep);
    
    const isFirstStep = state.currentStep === OnboardingStep.WELCOME;
    const isLastStep = state.currentStep === OnboardingStep.COMPLETION;
    
    // Can go back if not on first step and not completed
    const canGoBack = !isFirstStep && !state.isCompleted;
    
    // Can go forward if current step is completed or can be skipped
    const canGoForward = 
      state.completedSteps.has(state.currentStep) || 
      stepInfo.canSkip || 
      isLastStep;

    return {
      currentStep: state.currentStep,
      nextStep: nextStep !== state.currentStep ? nextStep : null,
      completionPercentage,
      totalSteps,
      completedSteps: completedCount,
      skippedSteps: skippedCount,
      stepInfo,
      isFirstStep,
      isLastStep,
      canGoBack,
      canGoForward,
    };
  }, [state]);

  useEffect(() => {
    setProgress(calculateProgress());
  }, [calculateProgress]);

  return progress || {
    currentStep: OnboardingStep.WELCOME,
    nextStep: OnboardingStep.AUTH,
    completionPercentage: 0,
    totalSteps: 7,
    completedSteps: 0,
    skippedSteps: 0,
    stepInfo: { name: 'Welcome', number: 1, canSkip: true },
    isFirstStep: true,
    isLastStep: false,
    canGoBack: false,
    canGoForward: true,
  };
};

/**
 * Hook to get step-specific progress information
 */
export const useStepProgress = (step: OnboardingStep) => {
  const { state } = useOnboarding();
  
  return {
    isCompleted: state.completedSteps.has(step),
    isSkipped: state.skippedSteps.has(step),
    isCurrent: state.currentStep === step,
    isPast: step < state.currentStep,
    isFuture: step > state.currentStep,
    stepInfo: getStepInfo(step),
  };
};

/**
 * Hook to manage step timing for analytics
 */
export const useStepTiming = () => {
  const { state, trackEvent } = useOnboarding();
  const [stepStartTime, setStepStartTime] = useState<Date>(new Date());

  useEffect(() => {
    // Reset timer when step changes
    setStepStartTime(new Date());
  }, [state.currentStep]);

  const recordStepTime = useCallback(() => {
    const timeSpent = Date.now() - stepStartTime.getTime();
    
    trackEvent({
      type: 'step_completed',
      step: state.currentStep,
      data: {
        timeSpentMs: timeSpent,
        timeSpentFormatted: `${Math.round(timeSpent / 1000)}s`,
      },
    });
  }, [state.currentStep, stepStartTime, trackEvent]);

  return {
    stepStartTime,
    recordStepTime,
    getCurrentStepDuration: () => Date.now() - stepStartTime.getTime(),
  };
};