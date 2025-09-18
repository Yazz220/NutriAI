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
      targetWeight: 65
    },
    dietaryPreferences: {
      restrictions: ['vegetarian'],
      allergies: ['nuts'],
      customRestrictions: ['spicy food']
    }
  };

  describe('mapOnboardingToProfile', () => {
    it('should map complete onboarding data to profile format', () => {
      const result = OnboardingProfileIntegration.mapOnboardingToProfile(completeOnboardingData);
      
      expect(result.basics).toEqual({
        name: undefined,
        age: 30,
        sex: 'female',
        heightCm: 170,
        weightKg: 75
      });
      
      expect(result.goals?.goalType).toBe('lose');
      expect(result.goals?.activityLevel).toBe('moderately-active');
      expect(result.goals?.dailyCalories).toBeGreaterThan(0);
      
      expect(result.preferences?.allergies).toEqual(['nuts']);
      expect(result.preferences?.dietary).toBe('vegetarian');
      expect(result.preferences?.dislikedIngredients).toEqual(['spicy food']);
    });

    it('should handle incomplete data gracefully', () => {
      const incompleteData = {
        ...defaultOnboardingData,
        healthGoal: 'maintain-weight' as const
      };
      
      const result = OnboardingProfileIntegration.mapOnboardingToProfile(incompleteData);
      
      expect(result.basics?.age).toBeUndefined();
      expect(result.goals?.dailyCalories).toBeUndefined();
      expect(result.goals?.goalType).toBe('maintain');
    });
  });

  describe('calculateDailyCalories', () => {
    it('should calculate calories for female weight loss', () => {
      const calories = OnboardingProfileIntegration.calculateDailyCalories({
        age: 30,
        height: 170,
        weight: 75,
        gender: 'female',
        activityLevel: 'moderately-active',
        goalType: 'lose'
      });
      
      expect(calories).toBeGreaterThan(1200); // Minimum safe calories
      expect(calories).toBeLessThan(2500); // Reasonable upper bound
    });

    it('should calculate higher calories for males', () => {
      const femaleCalories = OnboardingProfileIntegration.calculateDailyCalories({
        age: 30,
        height: 170,
        weight: 75,
        gender: 'female',
        activityLevel: 'moderately-active',
        goalType: 'maintain'
      });
      
      const maleCalories = OnboardingProfileIntegration.calculateDailyCalories({
        age: 30,
        height: 170,
        weight: 75,
        gender: 'male',
        activityLevel: 'moderately-active',
        goalType: 'maintain'
      });
      
      expect(maleCalories).toBeGreaterThan(femaleCalories);
    });

    it('should respect minimum calorie limits for weight loss', () => {
      const calories = OnboardingProfileIntegration.calculateDailyCalories({
        age: 25,
        height: 150,
        weight: 50,
        gender: 'female',
        activityLevel: 'sedentary',
        goalType: 'lose'
      });
      
      expect(calories).toBeGreaterThanOrEqual(1200);
    });
  });

  describe('calculateMacroTargets', () => {
    it('should calculate balanced macros for maintenance', () => {
      const macros = OnboardingProfileIntegration.calculateMacroTargets(2000, 'maintain-weight');
      
      expect(macros.protein).toBeGreaterThan(0);
      expect(macros.carbs).toBeGreaterThan(0);
      expect(macros.fats).toBeGreaterThan(0);
      
      // Check that macros add up approximately to total calories
      const totalCalories = (macros.protein * 4) + (macros.carbs * 4) + (macros.fats * 9);
      expect(Math.abs(totalCalories - 2000)).toBeLessThan(50); // Allow small rounding differences
    });

    it('should increase protein for muscle building', () => {
      const maintenanceMacros = OnboardingProfileIntegration.calculateMacroTargets(2000, 'maintain-weight');
      const muscleMacros = OnboardingProfileIntegration.calculateMacroTargets(2000, 'build-muscle');
      
      expect(muscleMacros.protein).toBeGreaterThan(maintenanceMacros.protein);
    });
  });

  describe('BMI calculations', () => {
    it('should calculate BMI correctly', () => {
      const bmi = OnboardingProfileIntegration.calculateBMI(170, 70);
      expect(bmi).toBeCloseTo(24.22, 1);
    });

    it('should categorize BMI correctly', () => {
      expect(OnboardingProfileIntegration.getBMICategory(18)).toBe('underweight');
      expect(OnboardingProfileIntegration.getBMICategory(22)).toBe('normal');
      expect(OnboardingProfileIntegration.getBMICategory(27)).toBe('overweight');
      expect(OnboardingProfileIntegration.getBMICategory(32)).toBe('obese');
    });

    it('should calculate ideal weight range', () => {
      const range = OnboardingProfileIntegration.calculateIdealWeightRange(170);
      expect(range.min).toBeGreaterThan(50);
      expect(range.max).toBeGreaterThan(range.min);
      expect(range.max).toBeLessThan(80);
    });
  });

  describe('validateTargetWeight', () => {
    it('should validate reasonable weight loss target', () => {
      const validation = OnboardingProfileIntegration.validateTargetWeight(
        75, 70, 170, 'lose'
      );
      expect(validation.isValid).toBe(true);
    });

    it('should reject unrealistic weight loss target', () => {
      const validation = OnboardingProfileIntegration.validateTargetWeight(
        75, 45, 170, 'lose'
      );
      expect(validation.isValid).toBe(false);
      expect(validation.message).toContain('healthy BMI range');
    });

    it('should reject target that conflicts with goal', () => {
      const validation = OnboardingProfileIntegration.validateTargetWeight(
        70, 75, 170, 'lose'
      );
      expect(validation.isValid).toBe(false);
      expect(validation.message).toContain('less than current weight');
    });
  });
});