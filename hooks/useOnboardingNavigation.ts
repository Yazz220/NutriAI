import { useCallback } from 'react';
import { router } from 'expo-router';
import { OnboardingStep } from '@/types';
import { useOnboarding } from '@/components/onboarding/OnboardingProvider';
import { useOnboardingProgress } from './useOnboardingProgress';
import { useOnboardingAnalytics } from './useOnboardingAnalytics';
import { canSkipStep } from '@/utils/onboarding';

export interface NavigationOptions {
  skipWarning?: string;
  requiresConfirmation?: boolean;
  customValidation?: () => boolean | Promise<boolean>;
}

/**
 * Hook for managing onboarding navigation flow
 */
export const useOnboardingNavigation = () => {
  const { state, nextStep, skipStep, goToStep, completeOnboarding } = useOnboarding();
  const progress = useOnboardingProgress();
  const { trackUserChoice, trackError } = useOnboardingAnalytics();

  // Navigate to next step with validation
  const navigateNext = useCallback(async (options?: NavigationOptions) => {
    try {
      // Run custom validation if provided
      if (options?.customValidation) {
        const isValid = await options.customValidation();
        if (!isValid) {
          trackError({
            step: state.currentStep,
            errorType: 'validation_failed',
            errorMessage: 'Custom validation failed for step progression',
          });
          return false;
        }
      }

      // Check if we can proceed
      if (!progress.canGoForward) {
        trackError({
          step: state.currentStep,
          errorType: 'navigation_blocked',
          errorMessage: 'Cannot proceed to next step',
        });
        return false;
      }

      // Track navigation choice
      trackUserChoice({
        step: state.currentStep,
        choiceType: 'navigation',
        choiceValue: 'next',
      });

      nextStep();
      return true;
    } catch (error) {
      trackError({
        step: state.currentStep,
        errorType: 'navigation_error',
        errorMessage: error instanceof Error ? error.message : 'Unknown navigation error',
      });
      return false;
    }
  }, [state.currentStep, progress.canGoForward, nextStep, trackUserChoice, trackError]);

  // Skip current step with confirmation
  const navigateSkip = useCallback(async (options?: NavigationOptions) => {
    try {
      // Check if step can be skipped
      if (!canSkipStep(state.currentStep)) {
        trackError({
          step: state.currentStep,
          errorType: 'skip_not_allowed',
          errorMessage: 'This step cannot be skipped',
        });
        return false;
      }

      // Show confirmation if required
      if (options?.requiresConfirmation) {
        // This would typically show a modal - for now we'll assume confirmation
        // In a real implementation, you'd show a confirmation modal here
      }

      // Track skip choice
      trackUserChoice({
        step: state.currentStep,
        choiceType: 'navigation',
        choiceValue: 'skip',
        context: {
          skipWarning: options?.skipWarning,
        },
      });

      skipStep();
      return true;
    } catch (error) {
      trackError({
        step: state.currentStep,
        errorType: 'skip_error',
        errorMessage: error instanceof Error ? error.message : 'Unknown skip error',
      });
      return false;
    }
  }, [state.currentStep, skipStep, trackUserChoice, trackError]);

  // Navigate to specific step
  const navigateToStep = useCallback((targetStep: OnboardingStep, options?: NavigationOptions) => {
    try {
      // Validate step transition
      if (targetStep < 0 || targetStep > OnboardingStep.COMPLETION) {
        trackError({
          step: state.currentStep,
          errorType: 'invalid_step',
          errorMessage: `Invalid target step: ${targetStep}`,
        });
        return false;
      }

      // Track navigation choice
      trackUserChoice({
        step: state.currentStep,
        choiceType: 'navigation',
        choiceValue: 'goto',
        context: {
          targetStep,
          fromStep: state.currentStep,
        },
      });

      goToStep(targetStep);
      return true;
    } catch (error) {
      trackError({
        step: state.currentStep,
        errorType: 'goto_error',
        errorMessage: error instanceof Error ? error.message : 'Unknown goto error',
      });
      return false;
    }
  }, [state.currentStep, goToStep, trackUserChoice, trackError]);

  // Navigate back to previous step
  const navigateBack = useCallback(() => {
    if (!progress.canGoBack) {
      trackError({
        step: state.currentStep,
        errorType: 'back_not_allowed',
        errorMessage: 'Cannot go back from current step',
      });
      return false;
    }

    const previousStep = state.currentStep - 1;
    return navigateToStep(previousStep);
  }, [progress.canGoBack, state.currentStep, navigateToStep, trackError]);

  // Complete onboarding and navigate to main app
  const finishOnboarding = useCallback(async (finalAction?: string) => {
    try {
      // Track completion
      trackUserChoice({
        step: OnboardingStep.COMPLETION,
        choiceType: 'completion',
        choiceValue: finalAction || 'default',
      });

      await completeOnboarding();

      // Navigate based on final action or default to recipes tab
      switch (finalAction) {
        case 'add_recipe':
          router.replace('/(tabs)/recipes');
          break;
        case 'scan_pantry':
          router.replace('/(tabs)/inventory');
          break;
        case 'ask_ai':
          // AI chat is contextual now via the Coach Chat modal; route to Recipes where users can open recipe Ask AI
          router.replace('/(tabs)/recipes');
          break;
        default:
          router.replace('/(tabs)');
          break;
      }

      return true;
    } catch (error) {
      trackError({
        step: OnboardingStep.COMPLETION,
        errorType: 'completion_error',
        errorMessage: error instanceof Error ? error.message : 'Unknown completion error',
      });
      return false;
    }
  }, [completeOnboarding, trackUserChoice, trackError]);

  // Exit onboarding (skip to main app)
  const exitOnboarding = useCallback(async () => {
    try {
      trackUserChoice({
        step: state.currentStep,
        choiceType: 'navigation',
        choiceValue: 'exit',
        context: {
          exitedAtStep: state.currentStep,
          completedSteps: Array.from(state.completedSteps),
        },
      });

      // Navigate to main app with limited functionality
      router.replace('/(tabs)');
      return true;
    } catch (error) {
      trackError({
        step: state.currentStep,
        errorType: 'exit_error',
        errorMessage: error instanceof Error ? error.message : 'Unknown exit error',
      });
      return false;
    }
  }, [state.currentStep, state.completedSteps, trackUserChoice, trackError]);

  // Get navigation state
  const getNavigationState = useCallback(() => {
    return {
      canGoNext: progress.canGoForward,
      canGoBack: progress.canGoBack,
      canSkip: canSkipStep(state.currentStep),
      isFirstStep: progress.isFirstStep,
      isLastStep: progress.isLastStep,
      currentStep: state.currentStep,
      nextStep: progress.nextStep,
      totalSteps: progress.totalSteps,
      completionPercentage: progress.completionPercentage,
    };
  }, [progress, state.currentStep]);

  return {
    // Navigation methods
    navigateNext,
    navigateSkip,
    navigateToStep,
    navigateBack,
    finishOnboarding,
    exitOnboarding,
    
    // Navigation state
    getNavigationState,
    
    // Convenience properties
    canGoNext: progress.canGoForward,
    canGoBack: progress.canGoBack,
    canSkip: canSkipStep(state.currentStep),
    isFirstStep: progress.isFirstStep,
    isLastStep: progress.isLastStep,
  };
};

/**
 * Hook for step-specific navigation logic
 */
export const useStepNavigation = (step: OnboardingStep) => {
  const { navigateNext, navigateSkip } = useOnboardingNavigation();
  const { state } = useOnboarding();

  const isCurrentStep = state.currentStep === step;
  const isCompleted = state.completedSteps.has(step);
  const isSkipped = state.skippedSteps.has(step);

  const completeStep = useCallback(async (data?: any) => {
    if (!isCurrentStep) return false;
    
    // You could add step-specific completion logic here
    return await navigateNext({
      customValidation: () => {
        // Add any step-specific validation
        return true;
      },
    });
  }, [isCurrentStep, navigateNext]);

  const skipCurrentStep = useCallback(async (reason?: string) => {
    if (!isCurrentStep) return false;
    
    return await navigateSkip({
      skipWarning: `Skipping this step means you'll miss out on personalized recommendations.`,
      requiresConfirmation: true,
    });
  }, [isCurrentStep, navigateSkip]);

  return {
    isCurrentStep,
    isCompleted,
    isSkipped,
    completeStep,
    skipCurrentStep,
  };
};