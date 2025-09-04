import {
  calculateBMR,
  calculateTDEE,
  calculateCalorieGoal,
  calculateMacroTargets,
  calculateNutritionGoals,
  validateNutritionGoals,
  getDefaultNutritionGoals,
  canCalculateGoals,
  getGoalExplanation,
  ACTIVITY_MULTIPLIERS,
  GOAL_ADJUSTMENTS,
  GOAL_CONSTRAINTS,
} from '../goalCalculations';
import { UserBasics, UserGoals } from '@/hooks/useUserProfile';

describe('goalCalculations', () => {
  const mockMaleBasics: UserBasics = {
    age: 30,
    sex: 'male',
    heightCm: 180,
    weightKg: 80,
  };

  const mockFemaleBasics: UserBasics = {
    age: 25,
    sex: 'female',
    heightCm: 165,
    weightKg: 60,
  };

  const mockGoals: UserGoals = {
    activityLevel: 'moderate',
    goalType: 'maintain',
  };

  describe('calculateBMR', () => {
    it('should calculate BMR correctly for males', () => {
      const bmr = calculateBMR(mockMaleBasics);
      // Expected: (10 * 80) + (6.25 * 180) - (5 * 30) + 5 = 800 + 1125 - 150 + 5 = 1780
      expect(bmr).toBe(1780);
    });

    it('should calculate BMR correctly for females', () => {
      const bmr = calculateBMR(mockFemaleBasics);
      // Expected: (10 * 60) + (6.25 * 165) - (5 * 25) - 161 = 600 + 1031.25 - 125 - 161 = 1345.25 ≈ 1345
      expect(bmr).toBe(1345);
    });

    it('should handle "other" sex by using average adjustment', () => {
      const otherBasics = { ...mockMaleBasics, sex: 'other' as const };
      const bmr = calculateBMR(otherBasics);
      // Expected: (10 * 80) + (6.25 * 180) - (5 * 30) - 78 = 800 + 1125 - 150 - 78 = 1697
      expect(bmr).toBe(1697);
    });

    it('should return null for missing required data', () => {
      expect(calculateBMR({ age: 30 })).toBeNull();
      expect(calculateBMR({ age: 30, sex: 'male' })).toBeNull();
      expect(calculateBMR({ age: 30, sex: 'male', heightCm: 180 })).toBeNull();
    });

    it('should return null for invalid ranges', () => {
      expect(calculateBMR({ ...mockMaleBasics, age: 5 })).toBeNull();
      expect(calculateBMR({ ...mockMaleBasics, age: 150 })).toBeNull();
      expect(calculateBMR({ ...mockMaleBasics, heightCm: 50 })).toBeNull();
      expect(calculateBMR({ ...mockMaleBasics, heightCm: 300 })).toBeNull();
      expect(calculateBMR({ ...mockMaleBasics, weightKg: 20 })).toBeNull();
      expect(calculateBMR({ ...mockMaleBasics, weightKg: 400 })).toBeNull();
    });
  });

  describe('calculateTDEE', () => {
    it('should calculate TDEE correctly for different activity levels', () => {
      const bmr = 1780;
      
      expect(calculateTDEE(bmr, 'sedentary')).toBe(Math.round(1780 * 1.2)); // 2136
      expect(calculateTDEE(bmr, 'light')).toBe(Math.round(1780 * 1.375)); // 2448
      expect(calculateTDEE(bmr, 'moderate')).toBe(Math.round(1780 * 1.55)); // 2759
      expect(calculateTDEE(bmr, 'active')).toBe(Math.round(1780 * 1.725)); // 3071
      expect(calculateTDEE(bmr, 'athlete')).toBe(Math.round(1780 * 1.9)); // 3382
    });
  });

  describe('calculateCalorieGoal', () => {
    const tdee = 2500;

    it('should calculate calorie goals for different goal types', () => {
      expect(calculateCalorieGoal(tdee, 'maintain')).toBe(2500);
      expect(calculateCalorieGoal(tdee, 'lose')).toBe(2000);
      expect(calculateCalorieGoal(tdee, 'gain')).toBe(2800);
    });

    it('should enforce minimum calorie constraints', () => {
      const lowTdee = 1000;
      expect(calculateCalorieGoal(lowTdee, 'lose')).toBe(GOAL_CONSTRAINTS.calories.min);
    });

    it('should enforce maximum calorie constraints', () => {
      const highTdee = 5000;
      expect(calculateCalorieGoal(highTdee, 'gain')).toBe(GOAL_CONSTRAINTS.calories.max);
    });
  });

  describe('calculateMacroTargets', () => {
    const calorieGoal = 2000;

    it('should calculate macros for maintenance goal', () => {
      const macros = calculateMacroTargets(calorieGoal, 'maintain');
      
      // 25% protein (500 cal / 4 = 125g), 50% carbs (1000 cal / 4 = 250g), 25% fats (500 cal / 9 = 56g)
      expect(macros.protein).toBe(125);
      expect(macros.carbs).toBe(250);
      expect(macros.fats).toBe(56);
    });

    it('should calculate macros for weight loss goal', () => {
      const macros = calculateMacroTargets(calorieGoal, 'lose');
      
      // Higher protein for muscle preservation: 30% protein, 45% carbs, 25% fats
      expect(macros.protein).toBe(150); // 600 cal / 4
      expect(macros.carbs).toBe(225);   // 900 cal / 4
      expect(macros.fats).toBe(56);     // 500 cal / 9
    });

    it('should calculate macros for weight gain goal', () => {
      const macros = calculateMacroTargets(calorieGoal, 'gain');
      
      // Higher fats for calorie density: 25% protein, 45% carbs, 30% fats
      expect(macros.protein).toBe(125); // 500 cal / 4
      expect(macros.carbs).toBe(225);   // 900 cal / 4
      expect(macros.fats).toBe(67);     // 600 cal / 9
    });
  });

  describe('calculateNutritionGoals', () => {
    it('should calculate complete nutrition goals', () => {
      const goals = calculateNutritionGoals(mockMaleBasics, mockGoals);
      
      expect(goals).not.toBeNull();
      expect(goals!.dailyCalories).toBeGreaterThan(0);
      expect(goals!.protein).toBeGreaterThan(0);
      expect(goals!.carbs).toBeGreaterThan(0);
      expect(goals!.fats).toBeGreaterThan(0);
    });

    it('should return null for incomplete profile data', () => {
      const incompleteBasics = { age: 30, sex: 'male' as const };
      const goals = calculateNutritionGoals(incompleteBasics, mockGoals);
      
      expect(goals).toBeNull();
    });

    it('should use default values for missing goal parameters', () => {
      const goals = calculateNutritionGoals(mockMaleBasics, {});
      
      expect(goals).not.toBeNull();
      // Should use 'light' activity and 'maintain' goal as defaults
    });
  });

  describe('validateNutritionGoals', () => {
    it('should validate correct goals without errors', () => {
      const validGoals = {
        dailyCalories: 2000,
        protein: 125,
        carbs: 250,
        fats: 56,
      };
      
      const result = validateNutritionGoals(validGoals);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should catch calorie constraint violations', () => {
      const lowCalories = { dailyCalories: 800 };
      const highCalories = { dailyCalories: 5000 };
      
      const lowResult = validateNutritionGoals(lowCalories);
      const highResult = validateNutritionGoals(highCalories);
      
      expect(lowResult.errors.some(error => error.includes('Daily calories too low'))).toBe(true);
      expect(highResult.errors.some(error => error.includes('Daily calories too high'))).toBe(true);
    });

    it('should catch protein constraint violations', () => {
      const lowProtein = { protein: 20 };
      const highProtein = { protein: 400 };
      
      const lowResult = validateNutritionGoals(lowProtein);
      const highResult = validateNutritionGoals(highProtein);
      
      expect(lowResult.errors.some(error => error.includes('Protein target too low'))).toBe(true);
      expect(highResult.errors.some(error => error.includes('Protein target too high'))).toBe(true);
    });

    it('should catch fat constraint violations', () => {
      const lowFats = { fats: 10 };
      
      const result = validateNutritionGoals(lowFats);
      
      expect(result.errors.some(error => error.includes('Fat target too low'))).toBe(true);
    });

    it('should provide warnings for edge cases', () => {
      const veryLowCalories = { dailyCalories: 1300 };
      const lowCarbs = { carbs: 50 };
      
      const lowCalResult = validateNutritionGoals(veryLowCalories);
      const lowCarbResult = validateNutritionGoals(lowCarbs);
      
      expect(lowCalResult.warnings.some(warning => warning.includes('Very low calorie goals'))).toBe(true);
      expect(lowCarbResult.warnings.some(warning => warning.includes('Low carb intake'))).toBe(true);
    });

    it('should validate macro-calorie consistency', () => {
      const inconsistentGoals = {
        dailyCalories: 2000,
        protein: 200, // 800 cal
        carbs: 300,   // 1200 cal
        fats: 100,    // 900 cal
        // Total: 2900 cal vs 2000 target
      };
      
      const result = validateNutritionGoals(inconsistentGoals);
      
      expect(result.warnings.some(warning => warning.includes("Macro calories"))).toBe(true);
    });
  });

  describe('getDefaultNutritionGoals', () => {
    it('should return sensible default goals', () => {
      const defaults = getDefaultNutritionGoals();
      
      expect(defaults.dailyCalories).toBe(2000);
      expect(defaults.protein).toBe(125);
      expect(defaults.carbs).toBe(250);
      expect(defaults.fats).toBe(56);
    });
  });

  describe('canCalculateGoals', () => {
    it('should return true for complete profile data', () => {
      expect(canCalculateGoals(mockMaleBasics)).toBe(true);
    });

    it('should return false for incomplete profile data', () => {
      expect(canCalculateGoals({ age: 30 })).toBe(false);
      expect(canCalculateGoals({ age: 30, sex: 'male' })).toBe(false);
      expect(canCalculateGoals({ age: 30, sex: 'male', heightCm: 180 })).toBe(false);
    });
  });

  describe('getGoalExplanation', () => {
    it('should provide detailed explanation for valid profile', () => {
      const calculatedGoals = {
        dailyCalories: 2500,
        protein: 125,
        carbs: 250,
        fats: 56,
      };
      
      const explanation = getGoalExplanation(mockMaleBasics, mockGoals, calculatedGoals);
      
      expect(explanation).toContain('BMR:');
      expect(explanation).toContain('TDEE:');
      expect(explanation).toContain('Daily target:');
      expect(explanation).toContain('moderate activity');
    });

    it('should handle missing profile data gracefully', () => {
      const incompleteBasics = { age: 30 };
      const explanation = getGoalExplanation(incompleteBasics, mockGoals, getDefaultNutritionGoals());
      
      expect(explanation).toContain('Unable to calculate');
    });

    it('should show goal adjustments for weight loss/gain', () => {
      const loseGoals = { ...mockGoals, goalType: 'lose' as const };
      const calculatedGoals = getDefaultNutritionGoals();
      
      const explanation = getGoalExplanation(mockMaleBasics, loseGoals, calculatedGoals);
      
      expect(explanation).toContain('Goal adjustment:');
      expect(explanation).toContain('lose weight');
    });
  });

  describe('Constants', () => {
    it('should have correct activity multipliers', () => {
      expect(ACTIVITY_MULTIPLIERS.sedentary).toBe(1.2);
      expect(ACTIVITY_MULTIPLIERS.light).toBe(1.375);
      expect(ACTIVITY_MULTIPLIERS.moderate).toBe(1.55);
      expect(ACTIVITY_MULTIPLIERS.active).toBe(1.725);
      expect(ACTIVITY_MULTIPLIERS.athlete).toBe(1.9);
    });

    it('should have correct goal adjustments', () => {
      expect(GOAL_ADJUSTMENTS.lose).toBe(-500);
      expect(GOAL_ADJUSTMENTS.maintain).toBe(0);
      expect(GOAL_ADJUSTMENTS.gain).toBe(300);
    });

    it('should have reasonable constraint values', () => {
      expect(GOAL_CONSTRAINTS.calories.min).toBe(1200);
      expect(GOAL_CONSTRAINTS.calories.max).toBe(4000);
      expect(GOAL_CONSTRAINTS.protein.min).toBe(50);
      expect(GOAL_CONSTRAINTS.protein.max).toBe(300);
    });
  });
});