// Core onboarding components
export { OnboardingProvider, useOnboarding, useOnboardingStatus } from './OnboardingProvider';
export { 
  OnboardingLayout, 
  OnboardingWelcomeLayout, 
  OnboardingCompletionLayout,
  OnboardingLayoutWithCustomProgress 
} from './OnboardingLayout';
export { ProgressIndicator } from './ProgressIndicator';
export { SkipButton } from './SkipButton';
export { MultiSelectChips } from './MultiSelectChips';

// Onboarding screens
export { WelcomeScreen, AuthScreen } from './screens';

// Onboarding flow
export { OnboardingFlow, OnboardingWithProvider } from './OnboardingFlow';

// Re-export hooks for convenience
export { useOnboardingProgress, useStepProgress, useStepTiming } from '@/hooks/useOnboardingProgress';
export { useOnboardingAnalytics, useStepAnalytics } from '@/hooks/useOnboardingAnalytics';
export { useOnboardingNavigation, useStepNavigation } from '@/hooks/useOnboardingNavigation';

// Re-export types for convenience
export type {
  OnboardingStep,
  OnboardingState,
  OnboardingContextType,
  OnboardingUserData,
  OnboardingLayoutProps,
  MultiSelectChipsProps,
  ChipOption,
} from '@/types';