jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));

import { OnboardingNavigationManager, ONBOARDING_STEPS, getStepTitle, getStepDescription } from '../onboardingNavigation';
import { defaultOnboardingData, OnboardingData } from '../../types/onboarding';

describe('OnboardingNavigationManager', () => {
  let navigationManager: OnboardingNavigationManager;

  beforeEach(() => {
    navigationManager = new OnboardingNavigationManager();
  });

  describe('Basic Navigation', () => {
    it('starts at welcome', () => {
      expect(navigationManager.getCurrentStep()).toBe('welcome');
      expect(navigationManager.getCurrentStepNumber()).toBe(1);
    });

    it('advances to next and previous steps correctly', () => {
      expect(navigationManager.nextStep()).toBe('health-goals');
      expect(navigationManager.getCurrentStepNumber()).toBe(2);
      expect(navigationManager.previousStep()).toBe('welcome');
    });

    it('does not advance beyond completion', () => {
      for (let i = 0; i < ONBOARDING_STEPS.length - 1; i++) {
        navigationManager.nextStep();
      }
      expect(navigationManager.getCurrentStep()).toBe('completion');
      expect(navigationManager.nextStep()).toBeNull();
    });

    it('does not go before welcome', () => {
      expect(navigationManager.previousStep()).toBeNull();
      expect(navigationManager.canGoBack()).toBe(false);
    });
  });

  describe('Step calculation from data', () => {
    it('returns health-goals when no goal selected', () => {
      const data = { ...defaultOnboardingData };
      expect(navigationManager.calculateCurrentStepFromData(data)).toBe('health-goals');
    });

    it('returns gender when goal selected but profile incomplete', () => {
      const data: OnboardingData = {
        ...defaultOnboardingData,
        healthGoal: 'lose-weight',
      };
      expect(navigationManager.calculateCurrentStepFromData(data)).toBe('gender');
    });

    it('returns calorie-plan when profile is filled but calorie decision missing', () => {
      const data: OnboardingData = {
        ...defaultOnboardingData,
        healthGoal: 'lose-weight',
        basicProfile: {
          age: 32,
          height: 172,
          weight: 75,
          targetWeight: 70,
          activityLevel: 'moderately-active',
          gender: 'female',
        },
      };
      expect(navigationManager.calculateCurrentStepFromData(data)).toBe('calorie-plan');
    });

    it('returns dietary-preferences when calorie plan is complete', () => {
      const data: OnboardingData = {
        ...defaultOnboardingData,
        healthGoal: 'lose-weight',
        basicProfile: {
          age: 32,
          height: 172,
          weight: 75,
          targetWeight: 70,
          activityLevel: 'moderately-active',
          gender: 'female',
        },
        goalPreferences: {
          goalType: 'lose',
          recommendedCalories: 1900,
          recommendedMacros: { protein: 140, carbs: 210, fats: 60 },
          useCustomCalories: false,
          customCalorieTarget: undefined,
          customMacroTargets: undefined,
        },
      };
      expect(navigationManager.calculateCurrentStepFromData(data)).toBe('dietary-preferences');
    });
  });

  describe('Step validation', () => {
    it('requires a health goal', () => {
      const validation = navigationManager.validateStepCompletion('health-goals', defaultOnboardingData);
      expect(validation.canProceed).toBe(false);
      expect(validation.missingFields).toContain('Health goal selection');
    });

    it('validates profile fields individually', () => {
      const data: OnboardingData = {
        ...defaultOnboardingData,
        healthGoal: 'lose-weight',
        basicProfile: {
          age: 30,
        },
      } as OnboardingData;
      expect(navigationManager.validateStepCompletion('gender', data).canProceed).toBe(false);
      expect(navigationManager.validateStepCompletion('height', data).canProceed).toBe(false);
      expect(navigationManager.validateStepCompletion('weight', data).canProceed).toBe(false);
      expect(navigationManager.validateStepCompletion('activity-level', data).canProceed).toBe(false);
    });

    it('requires target weight for loss/gain goals only', () => {
      const needsTarget: OnboardingData = {
        ...defaultOnboardingData,
        healthGoal: 'lose-weight',
        basicProfile: {
          age: 30,
          height: 170,
          weight: 82,
          activityLevel: 'moderately-active',
          gender: 'female',
        },
      };
      const validation = navigationManager.validateStepCompletion('target-weight', needsTarget);
      expect(validation.canProceed).toBe(false);
      expect(validation.missingFields).toContain('Target weight');

      const maintenance: OnboardingData = {
        ...needsTarget,
        healthGoal: 'maintain-weight',
      };
      expect(navigationManager.validateStepCompletion('target-weight', maintenance).canProceed).toBe(true);
    });

    it('requires a calorie plan decision', () => {
      const data: OnboardingData = {
        ...defaultOnboardingData,
        healthGoal: 'lose-weight',
        basicProfile: {
          age: 32,
          height: 172,
          weight: 75,
          targetWeight: 70,
          activityLevel: 'moderately-active',
          gender: 'female',
        },
        goalPreferences: {
          goalType: null,
          recommendedCalories: undefined,
          recommendedMacros: undefined,
          useCustomCalories: false,
          customCalorieTarget: undefined,
          customMacroTargets: undefined,
        },
      };

      const validation = navigationManager.validateStepCompletion('calorie-plan', data);
      expect(validation.canProceed).toBe(false);
      expect(validation.missingFields).toContain('Calorie plan decision');

      const withDecision: OnboardingData = {
        ...data,
        goalPreferences: {
          goalType: 'lose',
          useCustomCalories: true,
          customCalorieTarget: 1850,
          customMacroTargets: { protein: 140, carbs: 200, fats: 65 },
          recommendedCalories: 1900,
          recommendedMacros: { protein: 145, carbs: 215, fats: 60 },
        },
      };

      expect(navigationManager.validateStepCompletion('calorie-plan', withDecision).canProceed).toBe(true);
    });
  });

  describe('Progress', () => {
    it('computes percentage correctly', () => {
      const total = ONBOARDING_STEPS.length;
      expect(navigationManager.getProgressPercentage()).toBeCloseTo(100 / total);
      navigationManager.nextStep();
      expect(navigationManager.getProgressPercentage()).toBeCloseTo((2 * 100) / total);
    });
  });

  describe('Step accessibility', () => {
    it('allows current step access', () => {
      const data = { ...defaultOnboardingData, healthGoal: 'lose-weight' as const };
      expect(navigationManager.isStepAccessible('health-goals', data)).toBe(true);
    });

    it('blocks future steps until prerequisites are met', () => {
      const data = { ...defaultOnboardingData };
      expect(navigationManager.isStepAccessible('calorie-plan', data)).toBe(false);
    });
  });
});

describe('Helper functions', () => {
  it('returns titles for steps', () => {
    expect(getStepTitle('calorie-plan')).toBe('Calorie Plan');
    expect(getStepTitle('completion')).toBe("You're All Set!");
  });

  it('returns descriptions for steps', () => {
    expect(getStepDescription('calorie-plan')).toBe('Review your recommended daily calories');
  });
});

