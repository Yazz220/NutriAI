import { router } from 'expo-router';
import { OnboardingData } from '@/types/onboarding';

export type OnboardingStep = 
  | 'welcome'
  | 'health-goals'
  | 'basic-profile'
  | 'dietary-preferences'
  | 'pantry-setup'
  | 'ai-coach-intro'
  | 'completion';

export const ONBOARDING_STEPS: OnboardingStep[] = [
  'welcome',
  'health-goals',
  'basic-profile',
  'dietary-preferences',
  'pantry-setup',
  'ai-coach-intro',
  'completion'
];

export const STEP_ROUTES: Record<OnboardingStep, string> = {
  'welcome': '/(onboarding)/welcome',
  'health-goals': '/(onboarding)/health-goals',
  'basic-profile': '/(onboarding)/basic-profile',
  'dietary-preferences': '/(onboarding)/dietary-preferences',
  'pantry-setup': '/(onboarding)/pantry-setup',
  'ai-coach-intro': '/(onboarding)/ai-coach-intro',
  'completion': '/(onboarding)/completion'
};

export class OnboardingNavigationManager {
  private currentStepIndex: number = 0;

  constructor(initialStep: OnboardingStep = 'welcome') {
    this.currentStepIndex = ONBOARDING_STEPS.indexOf(initialStep);
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

  navigateNext(): void {
    const nextStep = this.nextStep();
    if (nextStep) {
      this.navigateToStep(nextStep);
    }
  }

  navigatePrevious(): void {
    const prevStep = this.previousStep();
    if (prevStep) {
      this.navigateToStep(prevStep);
    }
  }

  // Calculate which step user should be on based on completed data
  calculateCurrentStepFromData(data: OnboardingData): OnboardingStep {
    // Welcome screen is always first
    if (!data.healthGoal) {
      return 'health-goals';
    }

    // Check basic profile completion
    const { age, height, weight, activityLevel } = data.basicProfile;
    if (!age || !height || !weight || !activityLevel) {
      return 'basic-profile';
    }

    // Check dietary preferences
    if (data.dietaryPreferences.restrictions.length === 0 && 
        data.dietaryPreferences.allergies.length === 0) {
      return 'dietary-preferences';
    }

    // Pantry setup is optional, so we check if user made a choice
    if (!data.pantrySetup.skipPantry && data.pantrySetup.initialItems.length === 0) {
      return 'pantry-setup';
    }

    // AI coach intro
    return 'ai-coach-intro';
  }

  // Validate if user can proceed from current step
  validateStepCompletion(step: OnboardingStep, data: OnboardingData): {
    canProceed: boolean;
    missingFields: string[];
  } {
    const missingFields: string[] = [];

    switch (step) {
      case 'welcome':
        // Always can proceed from welcome
        return { canProceed: true, missingFields: [] };

      case 'health-goals':
        if (!data.healthGoal) {
          missingFields.push('Health goal selection');
        }
        break;

      case 'basic-profile':
        const { age, height, weight, activityLevel, gender } = data.basicProfile;
        if (!age) missingFields.push('Age');
        if (!height) missingFields.push('Height');
        if (!weight) missingFields.push('Weight');
        if (!activityLevel) missingFields.push('Activity level');
        if (!gender) missingFields.push('Gender');
        
        // Target weight is required for weight loss/gain goals
        if ((data.healthGoal === 'lose-weight' || data.healthGoal === 'gain-weight') && 
            !data.basicProfile.targetWeight) {
          missingFields.push('Target weight');
        }
        break;

      case 'dietary-preferences':
        // Dietary preferences are optional, but user should at least make a selection
        // We'll consider it complete if they have any restrictions OR explicitly chose none
        const hasRestrictions = data.dietaryPreferences.restrictions.length > 0;
        const hasAllergies = data.dietaryPreferences.allergies.length > 0;
        const hasCustom = data.dietaryPreferences.customRestrictions.length > 0;
        
        if (!hasRestrictions && !hasAllergies && !hasCustom) {
          // We'll allow proceeding but could show a confirmation
        }
        break;

      case 'pantry-setup':
        // Pantry setup is optional - user can skip or add items
        return { canProceed: true, missingFields: [] };

      case 'ai-coach-intro':
        // AI coach intro is informational
        return { canProceed: true, missingFields: [] };

      case 'completion':
        // Final step - check if auth choice is made
        if (!data.authChoice) {
          missingFields.push('Authentication choice');
        }
        break;
    }

    return {
      canProceed: missingFields.length === 0,
      missingFields
    };
  }

  // Get progress percentage
  getProgressPercentage(): number {
    return ((this.currentStepIndex + 1) / ONBOARDING_STEPS.length) * 100;
  }

  // Check if step is accessible (user hasn't skipped required previous steps)
  isStepAccessible(targetStep: OnboardingStep, data: OnboardingData): boolean {
    const targetIndex = ONBOARDING_STEPS.indexOf(targetStep);
    
    // Check all previous steps are completed
    for (let i = 0; i < targetIndex; i++) {
      const step = ONBOARDING_STEPS[i];
      const validation = this.validateStepCompletion(step, data);
      
      // Skip validation for optional steps
      if (step === 'pantry-setup' || step === 'ai-coach-intro') {
        continue;
      }
      
      if (!validation.canProceed) {
        return false;
      }
    }
    
    return true;
  }
}

// Navigation guards
export function createNavigationGuard(
  requiredStep: OnboardingStep,
  onboardingData: OnboardingData,
  navigationManager: OnboardingNavigationManager
) {
  return () => {
    const currentStep = navigationManager.calculateCurrentStepFromData(onboardingData);
    const currentStepIndex = ONBOARDING_STEPS.indexOf(currentStep);
    const requiredStepIndex = ONBOARDING_STEPS.indexOf(requiredStep);
    
    // If user is trying to access a step they haven't reached yet
    if (requiredStepIndex > currentStepIndex) {
      navigationManager.navigateToStep(currentStep);
      return false;
    }
    
    return true;
  };
}

// Helper to get step title for UI
export function getStepTitle(step: OnboardingStep): string {
  const titles: Record<OnboardingStep, string> = {
    'welcome': 'Welcome to NutriAI',
    'health-goals': 'Health Goals',
    'basic-profile': 'Basic Profile',
    'dietary-preferences': 'Dietary Preferences',
    'pantry-setup': 'Pantry Setup',
    'ai-coach-intro': 'Meet Your AI Coach',
    'completion': 'You\'re All Set!'
  };
  
  return titles[step];
}

// Helper to get step description for UI
export function getStepDescription(step: OnboardingStep): string {
  const descriptions: Record<OnboardingStep, string> = {
    'welcome': 'Your AI-powered nutrition assistant',
    'health-goals': 'Tell us what you want to achieve',
    'basic-profile': 'Help us personalize your experience',
    'dietary-preferences': 'Let us know about your dietary needs',
    'pantry-setup': 'Set up your digital pantry',
    'ai-coach-intro': 'Discover how AI can help you',
    'completion': 'Start your nutrition journey'
  };
  
  return descriptions[step];
}