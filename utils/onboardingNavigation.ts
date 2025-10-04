import { router } from 'expo-router';
import { OnboardingData, OnboardingGoalPreferences } from '@/types/onboarding';
import { NOSH_HEADER_SUBTITLE } from '@/constants/brand';

export type OnboardingStep = 
  | 'welcome'
  | 'health-goals'
  | 'gender'
  | 'age'
  | 'height'
  | 'weight'
  | 'target-weight'
  | 'activity-level'
  | 'calorie-plan'
  | 'dietary-preferences'
  | 'allergies'
  | 'other-restrictions';

export const ONBOARDING_STEPS: OnboardingStep[] = [
  'welcome',
  'health-goals',
  'gender',
  'age',
  'height',
  'weight',
  'target-weight',
  'activity-level',
  'calorie-plan',
  'dietary-preferences',
  'allergies',
  'other-restrictions'
];

export const STEP_ROUTES: Record<OnboardingStep, string> = {
  'welcome': '/(onboarding)/welcome',
  'health-goals': '/(onboarding)/health-goals',
  'gender': '/(onboarding)/gender',
  'age': '/(onboarding)/age',
  'height': '/(onboarding)/height',
  'weight': '/(onboarding)/weight',
  'target-weight': '/(onboarding)/target-weight',
  'activity-level': '/(onboarding)/activity-level',
  'calorie-plan': '/(onboarding)/calorie-plan',
  'dietary-preferences': '/(onboarding)/dietary-preferences',
  'allergies': '/(onboarding)/allergies',
  'other-restrictions': '/(onboarding)/other-restrictions'
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

    // Check gender
    if (!data.basicProfile.gender) {
      return 'gender';
    }

    // Check age
    if (!data.basicProfile.age) {
      return 'age';
    }

    // Check height
    if (!data.basicProfile.height) {
      return 'height';
    }

    // Check weight
    if (!data.basicProfile.weight) {
      return 'weight';
    }

    // Check target weight for weight loss/gain goals
    if ((data.healthGoal === 'lose-weight' || data.healthGoal === 'gain-weight') && 
        !data.basicProfile.targetWeight) {
      return 'target-weight';
    }

    // Check activity level
    if (!data.basicProfile.activityLevel) {
      return 'activity-level';
    }

    // Check dietary preferences (only require making a selection here).
    if (!OnboardingNavigationManager.isCaloriePlanComplete(data.goalPreferences)) {
      return 'calorie-plan';
    }

    // Allergies and other restrictions are optional yet still part of the guided sequence.
    // Once dietary preferences are captured, default to the final step so the user can wrap up setup.
    const hasRestrictions = data.dietaryPreferences.restrictions.length > 0 ||
      (data.dietaryPreferences.customRestrictions?.length ?? 0) > 0;
    if (!hasRestrictions) {
      return 'dietary-preferences';
    }

    // Final step in the flow
    return 'other-restrictions';
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

      case 'gender':
        if (!data.basicProfile.gender) {
          missingFields.push('Gender selection');
        }
        break;

      case 'age':
        if (!data.basicProfile.age) {
          missingFields.push('Age');
        }
        break;

      case 'height':
        if (!data.basicProfile.height) {
          missingFields.push('Height');
        }
        break;

      case 'weight':
        if (!data.basicProfile.weight) {
          missingFields.push('Weight');
        }
        break;

      case 'target-weight':
        // Only required for weight loss/gain goals
        if ((data.healthGoal === 'lose-weight' || data.healthGoal === 'gain-weight') && 
            !data.basicProfile.targetWeight) {
          missingFields.push('Target weight');
        }
        break;

      case 'activity-level':
        if (!data.basicProfile.activityLevel) {
          missingFields.push('Activity level');
        }
        break;
      case 'calorie-plan':
        if (!OnboardingNavigationManager.isCaloriePlanComplete(data.goalPreferences)) {
          missingFields.push('Calorie plan decision');
        }
        break;

      case 'dietary-preferences':
        // Encourage a choice but don't block progression
        // Consider it complete if they selected any restriction or explicitly chose 'none'
        // No missing fields enforced
        break;

      case 'allergies':
        // Optional step; user can skip or add any
        return { canProceed: true, missingFields: [] };

      case 'other-restrictions':
        // Optional step; user can skip or add any
        return { canProceed: true, missingFields: [] };
    }

    return {
      canProceed: missingFields.length === 0,
      missingFields
    };
  }

  private static isCaloriePlanComplete(goalPreferences?: OnboardingGoalPreferences): boolean {
    if (!goalPreferences) {
      return false;
    }

    if (goalPreferences.useCustomCalories) {
      return typeof goalPreferences.customCalorieTarget === 'number' && goalPreferences.customCalorieTarget > 0;
    }

    return typeof goalPreferences.recommendedCalories === 'number' && goalPreferences.recommendedCalories > 0;
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
    'welcome': 'Welcome to Nosh',
    'health-goals': 'Health Goals',
    'gender': 'Gender',
    'age': 'Age',
    'height': 'Height',
    'weight': 'Current Weight',
    'target-weight': 'Target Weight',
    'activity-level': 'Activity Level',
    'calorie-plan': 'Calorie Plan',
    'dietary-preferences': 'Dietary Preferences',
    'allergies': 'Food Allergies',
    'other-restrictions': 'Other Restrictions'
  };
  
  return titles[step];
}

// Helper to get step description for UI
export function getStepDescription(step: OnboardingStep): string {
  const descriptions: Record<OnboardingStep, string> = {
    'welcome': NOSH_HEADER_SUBTITLE,
    'health-goals': 'Tell us what you want to achieve',
    'gender': 'Help us personalize your nutrition',
    'age': 'How old are you?',
    'height': 'Your height helps us calculate your needs',
    'weight': 'Your current weight',
    'target-weight': 'What weight are you aiming for?',
    'activity-level': 'How active are you?',
    'calorie-plan': 'Review your recommended daily calories',
    'dietary-preferences': 'Select any dietary styles you follow',
    'allergies': 'Let us know about any food allergies',
    'other-restrictions': 'Any other foods you avoid'
  };
  
  return descriptions[step];
}

