import { router } from 'expo-router';
import { OnboardingData } from '@/types/onboarding';

export type OnboardingStep =
  | 'welcome'
  | 'dietary-preferences'
  | 'allergies'
  | 'other-restrictions';

export const ONBOARDING_STEPS: OnboardingStep[] = [
  'welcome',
  'dietary-preferences',
  'allergies',
  'other-restrictions'
];

export const STEP_ROUTES: Record<OnboardingStep, string> = {
  'welcome': '/(onboarding)/welcome',
  'dietary-preferences': '/(onboarding)/dietary-preferences',
  'allergies': '/(onboarding)/allergies',
  'other-restrictions': '/(onboarding)/other-restrictions'
};

export class OnboardingNavigationManager {
  private currentStepIndex: number = 0;

  constructor(initialStep: OnboardingStep = 'welcome') {
    this.currentStepIndex = ONBOARDING_STEPS.indexOf(initialStep);
    if (this.currentStepIndex === -1) this.currentStepIndex = 0;
  }

  getCurrentStep(): OnboardingStep {
    return ONBOARDING_STEPS[this.currentStepIndex];
  }

  getCurrentStepNumber(): number {
    return this.currentStepIndex + 1;
  }

  getTotalSteps(): number {
    return ONBOARDING_STEPS.length;
  }

  canGoNext(): boolean {
    return this.currentStepIndex < ONBOARDING_STEPS.length - 1;
  }

  canGoBack(): boolean {
    return this.currentStepIndex > 0;
  }

  nextStep(): OnboardingStep | null {
    if (this.canGoNext()) {
      this.currentStepIndex++;
      return this.getCurrentStep();
    }
    return null;
  }

  previousStep(): OnboardingStep | null {
    if (this.canGoBack()) {
      this.currentStepIndex--;
      return this.getCurrentStep();
    }
    return null;
  }

  goToStep(step: OnboardingStep): void {
    const stepIndex = ONBOARDING_STEPS.indexOf(step);
    if (stepIndex !== -1) {
      this.currentStepIndex = stepIndex;
    }
  }

  navigateToStep(step: OnboardingStep): void {
    const route = STEP_ROUTES[step];
    if (route) {
      router.push(route as any);
    }
  }

  navigateNext(): OnboardingStep | null {
    const nextStep = this.nextStep();
    if (nextStep) {
      this.navigateToStep(nextStep);
      return nextStep;
    }
    return null;
  }

  navigatePrevious(): OnboardingStep | null {
    const prevStep = this.previousStep();
    if (prevStep) {
      this.navigateToStep(prevStep);
      return prevStep;
    }
    return null;
  }

  calculateCurrentStepFromData(_data: OnboardingData): OnboardingStep {
    return 'dietary-preferences';
  }

  validateStepCompletion(step: OnboardingStep, _data: OnboardingData): {
    canProceed: boolean;
    missingFields: string[];
  } {
    // All steps are optional in recipe-focused flow
    return { canProceed: true, missingFields: [] };
  }

  getProgressPercentage(): number {
    return ((this.currentStepIndex + 1) / ONBOARDING_STEPS.length) * 100;
  }

  isStepAccessible(_targetStep: OnboardingStep, _data: OnboardingData): boolean {
    return true;
  }
}

export function createNavigationGuard(
  _requiredStep: OnboardingStep,
  _onboardingData: OnboardingData,
  _navigationManager: OnboardingNavigationManager
) {
  return () => true;
}

export function getStepTitle(step: OnboardingStep): string {
  const titles: Record<OnboardingStep, string> = {
    'welcome': 'Welcome to Nosh',
    'dietary-preferences': 'Dietary Preferences',
    'allergies': 'Food Allergies',
    'other-restrictions': 'Other Restrictions'
  };
  return titles[step] ?? step;
}

export function getStepDescription(step: OnboardingStep): string {
  const descriptions: Record<OnboardingStep, string> = {
    'welcome': 'Save and organize recipes from anywhere',
    'dietary-preferences': 'Select any dietary styles you follow',
    'allergies': 'Let us know about any food allergies',
    'other-restrictions': 'Any other foods you avoid'
  };
  return descriptions[step] ?? '';
}
