import { OnboardingNavigationManager, ONBOARDING_STEPS, getStepTitle, getStepDescription } from '../onboardingNavigation';
import { defaultOnboardingData, OnboardingData } from '../../types/onboarding';

describe('OnboardingNavigationManager', () => {
  let navigationManager: OnboardingNavigationManager;

  beforeEach(() => {
    navigationManager = new OnboardingNavigationManager();
  });

  describe('Basic Navigation', () => {
    it('should start at welcome step', () => {
      expect(navigationManager.getCurrentStep()).toBe('welcome');
      expect(navigationManager.getCurrentStepNumber()).toBe(1);
    });

    it('should navigate to next step', () => {
      const nextStep = navigationManager.nextStep();
      expect(nextStep).toBe('health-goals');
      expect(navigationManager.getCurrentStep()).toBe('health-goals');
      expect(navigationManager.getCurrentStepNumber()).toBe(2);
    });

    it('should navigate to previous step', () => {
      navigationManager.nextStep(); // Go to health-goals
      const prevStep = navigationManager.previousStep();
      expect(prevStep).toBe('welcome');
      expect(navigationManager.getCurrentStep()).toBe('welcome');
    });

    it('should not go beyond last step', () => {
      // Navigate to last step
      for (let i = 0; i < ONBOARDING_STEPS.length - 1; i++) {
        navigationManager.nextStep();
      }
      
      expect(navigationManager.getCurrentStep()).toBe('completion');
      expect(navigationManager.nextStep()).toBeNull();
      expect(navigationManager.canGoNext()).toBe(false);
    });

    it('should not go before first step', () => {
      expect(navigationManager.previousStep()).toBeNull();
      expect(navigationManager.canGoBack()).toBe(false);
    });
  });

  describe('Step Calculation from Data', () => {
    it('should return health-goals when no health goal is set', () => {
      const data = { ...defaultOnboardingData };
      const step = navigationManager.calculateCurrentStepFromData(data);
      expect(step).toBe('health-goals');
    });

    it('should return gender when health goal is set but profile is incomplete', () => {
      const data: OnboardingData = {
        ...defaultOnboardingData,
        healthGoal: 'lose-weight'
      };
      const step = navigationManager.calculateCurrentStepFromData(data);
      expect(step).toBe('gender');
    });

    it('should return dietary-preferences when basic profile is complete', () => {
      const data: OnboardingData = {
        ...defaultOnboardingData,
        healthGoal: 'lose-weight',
        basicProfile: {
          age: 30,
          height: 170,
          weight: 70,
          activityLevel: 'moderately-active',
          gender: 'female'
        }
      };
      const step = navigationManager.calculateCurrentStepFromData(data);
      expect(step).toBe('dietary-preferences');
    });
  });

  describe('Step Validation', () => {
    it('should validate health-goals step completion', () => {
      const dataWithoutGoal = { ...defaultOnboardingData };
      const validation1 = navigationManager.validateStepCompletion('health-goals', dataWithoutGoal);
      expect(validation1.canProceed).toBe(false);
      expect(validation1.missingFields).toContain('Health goal selection');

      const dataWithGoal = { ...defaultOnboardingData, healthGoal: 'lose-weight' as const };
      const validation2 = navigationManager.validateStepCompletion('health-goals', dataWithGoal);
      expect(validation2.canProceed).toBe(true);
      expect(validation2.missingFields).toHaveLength(0);
    });

    it('should validate required fields across profile steps', () => {
      const incompleteData: OnboardingData = {
        ...defaultOnboardingData,
        healthGoal: 'lose-weight',
        basicProfile: {
          age: 30,
          // Missing height, weight, activityLevel, gender
        }
      };
      // Each profile-related step should block progression when its field is missing
      expect(navigationManager.validateStepCompletion('height', incompleteData).canProceed).toBe(false);
      expect(navigationManager.validateStepCompletion('weight', incompleteData).canProceed).toBe(false);
      expect(navigationManager.validateStepCompletion('activity-level', incompleteData).canProceed).toBe(false);
      expect(navigationManager.validateStepCompletion('gender', incompleteData).canProceed).toBe(false);
    });

    it('should require target weight for weight loss/gain goals', () => {
      const dataWithoutTarget: OnboardingData = {
        ...defaultOnboardingData,
        healthGoal: 'lose-weight',
        basicProfile: {
          age: 30,
          height: 170,
          weight: 80,
          activityLevel: 'moderately-active',
          gender: 'female'
          // Missing targetWeight
        }
      };
      
      const validation = navigationManager.validateStepCompletion('target-weight', dataWithoutTarget);
      expect(validation.canProceed).toBe(false);
      expect(validation.missingFields).toContain('Target weight');
    });

    it('should not require target weight for maintenance goals', () => {
      const dataForMaintenance: OnboardingData = {
        ...defaultOnboardingData,
        healthGoal: 'maintain-weight',
        basicProfile: {
          age: 30,
          height: 170,
          weight: 70,
          activityLevel: 'moderately-active',
          gender: 'female'
          // No targetWeight needed
        }
      };
      
      const validation = navigationManager.validateStepCompletion('target-weight', dataForMaintenance);
      expect(validation.canProceed).toBe(true);
    });
  });

  describe('Progress Calculation', () => {
    it('should calculate correct progress percentage', () => {
      const total = ONBOARDING_STEPS.length;
      expect(navigationManager.getProgressPercentage()).toBe(100 / total); // Step 1
      
      navigationManager.nextStep();
      expect(navigationManager.getProgressPercentage()).toBe((2 * 100) / total); // Step 2
    });

    it('should return correct total steps', () => {
      expect(navigationManager.getTotalSteps()).toBe(ONBOARDING_STEPS.length);
    });
  });

  describe('Step Accessibility', () => {
    it('should allow access to current step', () => {
      const data = { ...defaultOnboardingData, healthGoal: 'lose-weight' as const };
      expect(navigationManager.isStepAccessible('health-goals', data)).toBe(true);
    });

    it('should prevent access to future steps with incomplete data', () => {
      const incompleteData = { ...defaultOnboardingData }; // No health goal
      expect(navigationManager.isStepAccessible('gender', incompleteData)).toBe(false);
    });
  });
});

describe('Helper Functions', () => {
  it('should return correct step titles', () => {
    expect(getStepTitle('welcome')).toBe('Welcome to Nosh');
    expect(getStepTitle('health-goals')).toBe('Health Goals');
    expect(getStepTitle('completion')).toBe('You\'re All Set!');
  });

  it('should return correct step descriptions', () => {
    expect(getStepDescription('welcome')).toBe('Your friendly nutrition companion');
    expect(getStepDescription('health-goals')).toBe('Tell us what you want to achieve');
    expect(getStepDescription('completion')).toBe('Start your nutrition journey');
  });
});