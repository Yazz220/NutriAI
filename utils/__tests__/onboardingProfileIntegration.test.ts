import { OnboardingProfileIntegration } from '../onboardingProfileIntegration';
import { defaultOnboardingData, OnboardingData } from '@/types/onboarding';

describe('OnboardingProfileIntegration', () => {
  const completeOnboardingData: OnboardingData = {
    ...defaultOnboardingData,
    healthGoal: 'lose-weight',
    basicProfile: {
      age: 30,
      height: 170,
      weight: 75,
      activityLevel: 'moderately-active',
      gender: 'female',
      targetWeight: 65,
    },
    dietaryPreferences: {
      restrictions: ['vegetarian'],
      allergies: ['nuts'],
      customRestrictions: ['spicy food'],
    },
  };

  describe('mapOnboardingToProfile', () => {
    it('maps complete onboarding data to profile format', () => {
      const result = OnboardingProfileIntegration.mapOnboardingToProfile(completeOnboardingData);

      expect(result.basics).toEqual({
        name: undefined,
        age: 30,
        sex: 'female',
        heightCm: 170,
        weightKg: 75,
      });

      expect(result.goals?.goalType).toBe('lose');
      expect(result.goals?.activityLevel).toBe('moderately-active');
      expect(result.goals?.dailyCalories).toBeGreaterThan(0);
      expect(result.goals?.recommendedCalories).toEqual(result.goals?.dailyCalories);

      expect(result.preferences?.allergies).toEqual(['nuts']);
      expect(result.preferences?.dietary).toBe('vegetarian');
      expect(result.preferences?.dislikedIngredients).toEqual(['spicy food']);
    });

    it('handles custom goals and custom calorie targets', () => {
      const data: OnboardingData = {
        ...completeOnboardingData,
        healthGoal: 'custom',
        customGoal: {
          title: 'Finish a marathon',
          goalType: 'maintain',
          motivation: 'Build endurance',
        },
        goalPreferences: {
          goalType: 'maintain',
          useCustomCalories: true,
          customCalorieTarget: 2200,
          customMacroTargets: { protein: 165, carbs: 245, fats: 70 },
          recommendedCalories: 2100,
          recommendedMacros: { protein: 155, carbs: 230, fats: 68 },
        },
      };

      const result = OnboardingProfileIntegration.mapOnboardingToProfile(data);

      expect(result.goals?.dailyCalories).toBe(2200);
      expect(result.goals?.usesCustomCalorieTarget).toBe(true);
      expect(result.goals?.customGoalLabel).toBe('Finish a marathon');
      expect(result.goals?.customGoalMotivation).toBe('Build endurance');
      expect(result.goals?.recommendedCalories).toBe(2100);
      expect(result.goals?.goalType).toBe('maintain');
    });

    it('handles incomplete data gracefully', () => {
      const incompleteData: OnboardingData = {
        ...defaultOnboardingData,
        healthGoal: 'maintain-weight',
      };

      const result = OnboardingProfileIntegration.mapOnboardingToProfile(incompleteData);

      expect(result.basics?.age).toBeUndefined();
      expect(result.goals?.dailyCalories).toBeUndefined();
      expect(result.goals?.goalType).toBe('maintain');
    });
  });

  describe('calculateDailyCalories', () => {
    it('calculates calories for female weight loss', () => {
      const calories = OnboardingProfileIntegration.calculateDailyCalories({
        age: 30,
        height: 170,
        weight: 75,
        gender: 'female',
        activityLevel: 'moderately-active',
        goalType: 'lose',
      });

      expect(calories).toBeGreaterThan(1200);
      expect(calories).toBeLessThan(2500);
    });

    it('calculates higher calories for males', () => {
      const femaleCalories = OnboardingProfileIntegration.calculateDailyCalories({
        age: 30,
        height: 170,
        weight: 75,
        gender: 'female',
        activityLevel: 'moderately-active',
        goalType: 'maintain',
      });

      const maleCalories = OnboardingProfileIntegration.calculateDailyCalories({
        age: 30,
        height: 170,
        weight: 75,
        gender: 'male',
        activityLevel: 'moderately-active',
        goalType: 'maintain',
      });

      expect(maleCalories).toBeGreaterThan(femaleCalories);
    });

    it('respects minimum calorie limits for weight loss', () => {
      const calories = OnboardingProfileIntegration.calculateDailyCalories({
        age: 25,
        height: 150,
        weight: 50,
        gender: 'female',
        activityLevel: 'sedentary',
        goalType: 'lose',
      });

      expect(calories).toBeGreaterThanOrEqual(1200);
    });
  });

  describe('calculateMacroTargets', () => {
    it('calculates balanced macros for maintenance', () => {
      const macros = OnboardingProfileIntegration.calculateMacroTargets(2000, 'maintain-weight');

      expect(macros.protein).toBeGreaterThan(0);
      expect(macros.carbs).toBeGreaterThan(0);
      expect(macros.fats).toBeGreaterThan(0);

      const totalCalories = macros.protein * 4 + macros.carbs * 4 + macros.fats * 9;
      expect(Math.abs(totalCalories - 2000)).toBeLessThan(50);
    });

    it('increases protein for muscle building', () => {
      const maintenanceMacros = OnboardingProfileIntegration.calculateMacroTargets(2000, 'maintain-weight');
      const muscleMacros = OnboardingProfileIntegration.calculateMacroTargets(2000, 'build-muscle');

      expect(muscleMacros.protein).toBeGreaterThan(maintenanceMacros.protein);
    });
  });

  describe('BMI calculations', () => {
    it('calculates BMI correctly', () => {
      const bmi = OnboardingProfileIntegration.calculateBMI(170, 70);
      expect(bmi).toBeCloseTo(24.22, 1);
    });

    it('categorizes BMI correctly', () => {
      expect(OnboardingProfileIntegration.getBMICategory(18)).toBe('underweight');
      expect(OnboardingProfileIntegration.getBMICategory(22)).toBe('normal');
      expect(OnboardingProfileIntegration.getBMICategory(27)).toBe('overweight');
      expect(OnboardingProfileIntegration.getBMICategory(32)).toBe('obese');
    });

    it('calculates ideal weight range', () => {
      const range = OnboardingProfileIntegration.calculateIdealWeightRange(170);
      expect(range.min).toBeGreaterThan(50);
      expect(range.max).toBeGreaterThan(range.min);
      expect(range.max).toBeLessThan(80);
    });
  });

  describe('validateTargetWeight', () => {
    it('validates reasonable weight loss target', () => {
      const validation = OnboardingProfileIntegration.validateTargetWeight(75, 70, 170, 'lose');
      expect(validation.isValid).toBe(true);
    });

    it('rejects unrealistic weight loss target', () => {
      const validation = OnboardingProfileIntegration.validateTargetWeight(75, 45, 170, 'lose');
      expect(validation.isValid).toBe(false);
      expect(validation.message).toContain('healthy BMI range');
    });

    it('rejects conflicting targets', () => {
      const validation = OnboardingProfileIntegration.validateTargetWeight(70, 75, 170, 'lose');
      expect(validation.isValid).toBe(false);
    });
  });
});
