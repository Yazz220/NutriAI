import {
  generateCalorieRecommendations,
  suggestMealsForCalorieBudget,
  calculateOptimalPortion,
} from '../calorieAwareRecommendations';
import { DailyProgress, WeeklyTrend } from '@/hooks/useNutrition';
import { Meal } from '@/types';

const mockDailyProgress: DailyProgress = {
  date: '2024-01-01',
  calories: {
    consumed: 1500,
    goal: 2000,
    remaining: 500,
    percentage: 0.75,
    fromPlanned: 800,
    fromLogged: 700,
  },
  macros: {
    protein: { consumed: 75, goal: 100, percentage: 0.75 },
    carbs: { consumed: 150, goal: 200, percentage: 0.75 },
    fats: { consumed: 50, goal: 67, percentage: 0.75 },
  },
  status: 'under',
};

const mockWeeklyTrends: WeeklyTrend[] = [
  {
    weekStartDate: '2024-01-01',
    averageCalories: 1800,
    goalAdherence: 60,
    totalDays: 7,
    daysMetGoal: 4,
  },
];

const mockMeals: Meal[] = [
  {
    id: '1',
    name: 'Chicken Salad',
    description: 'Healthy chicken salad',
    ingredients: [],
    steps: [],
    tags: ['healthy', 'protein'],
    prepTime: 15,
    cookTime: 0,
    servings: 1,
    nutritionPerServing: {
      calories: 350,
      protein: 30,
      carbs: 10,
      fats: 20,
    },
  },
  {
    id: '2',
    name: 'Pasta Dinner',
    description: 'Hearty pasta meal',
    ingredients: [],
    steps: [],
    tags: ['dinner', 'carbs'],
    prepTime: 10,
    cookTime: 20,
    servings: 2,
    nutritionPerServing: {
      calories: 600,
      protein: 20,
      carbs: 80,
      fats: 15,
    },
  },
  {
    id: '3',
    name: 'Protein Smoothie',
    description: 'High protein smoothie',
    ingredients: [],
    steps: [],
    tags: ['protein', 'quick'],
    prepTime: 5,
    cookTime: 0,
    servings: 1,
    nutritionPerServing: {
      calories: 250,
      protein: 25,
      carbs: 15,
      fats: 8,
    },
  },
];

describe('calorieAwareRecommendations', () => {
  describe('generateCalorieRecommendations', () => {
    it('should generate recommendations for under-goal status', () => {
      const context = {
        dailyProgress: mockDailyProgress,
        weeklyTrends: mockWeeklyTrends,
        availableMeals: mockMeals,
        timeOfDay: 'evening' as const,
      };

      const recommendations = generateCalorieRecommendations(context);

      expect(recommendations).toHaveLength(5);
      expect(recommendations[0].type).toBe('meal_suggestion');
      expect(recommendations[0].priority).toBe('high');
      expect(recommendations[0].title).toBe('Calories Needed');
      expect(recommendations[0].message).toContain('500 calories remaining');
    });

    it('should generate recommendations for over-goal status', () => {
      const overGoalProgress = {
        ...mockDailyProgress,
        calories: {
          ...mockDailyProgress.calories,
          consumed: 2200,
          remaining: -200,
          percentage: 1.1,
        },
        status: 'over' as const,
      };

      const context = {
        dailyProgress: overGoalProgress,
        weeklyTrends: mockWeeklyTrends,
        availableMeals: mockMeals,
        timeOfDay: 'afternoon' as const,
      };

      const recommendations = generateCalorieRecommendations(context);

      expect(recommendations[0].type).toBe('portion_adjustment');
      expect(recommendations[0].priority).toBe('high');
      expect(recommendations[0].title).toBe('Over Daily Goal');
      expect(recommendations[0].message).toContain('200 calories over');
    });

    it('should generate recommendations for met-goal status', () => {
      const metGoalProgress = {
        ...mockDailyProgress,
        calories: {
          ...mockDailyProgress.calories,
          consumed: 2000,
          remaining: 0,
          percentage: 1.0,
        },
        status: 'met' as const,
      };

      const context = {
        dailyProgress: metGoalProgress,
        weeklyTrends: mockWeeklyTrends,
        availableMeals: mockMeals,
        timeOfDay: 'evening' as const,
      };

      const recommendations = generateCalorieRecommendations(context);

      expect(recommendations.some(r => r.title === 'Great Progress!')).toBe(true);
    });

    it('should generate macro balance recommendations', () => {
      const lowProteinProgress = {
        ...mockDailyProgress,
        macros: {
          ...mockDailyProgress.macros,
          protein: { consumed: 50, goal: 100, percentage: 0.5 },
        },
      };

      const context = {
        dailyProgress: lowProteinProgress,
        weeklyTrends: mockWeeklyTrends,
        availableMeals: mockMeals,
        timeOfDay: 'afternoon' as const,
      };

      const recommendations = generateCalorieRecommendations(context);

      expect(recommendations.some(r => r.type === 'macro_balance')).toBe(true);
      expect(recommendations.some(r => r.title === 'Protein Boost Needed')).toBe(true);
    });

    it('should generate timing-based recommendations', () => {
      const context = {
        dailyProgress: mockDailyProgress,
        weeklyTrends: mockWeeklyTrends,
        availableMeals: mockMeals,
        timeOfDay: 'evening' as const,
        currentMealType: 'dinner' as const,
      };

      const recommendations = generateCalorieRecommendations(context);

      expect(recommendations.some(r => r.type === 'timing_suggestion')).toBe(true);
    });

    it('should generate trend-based recommendations for low adherence', () => {
      const lowAdherenceTrends = [
        {
          ...mockWeeklyTrends[0],
          goalAdherence: 30,
        },
      ];

      const context = {
        dailyProgress: mockDailyProgress,
        weeklyTrends: lowAdherenceTrends,
        availableMeals: mockMeals,
        timeOfDay: 'afternoon' as const,
      };

      const recommendations = generateCalorieRecommendations(context);

      expect(recommendations.some(r => r.title === 'Goal Adherence Low')).toBe(true);
    });

    it('should limit recommendations to top 5', () => {
      const context = {
        dailyProgress: mockDailyProgress,
        weeklyTrends: mockWeeklyTrends,
        availableMeals: mockMeals,
        timeOfDay: 'evening' as const,
      };

      const recommendations = generateCalorieRecommendations(context);

      expect(recommendations.length).toBeLessThanOrEqual(5);
    });

    it('should prioritize high priority recommendations', () => {
      const context = {
        dailyProgress: mockDailyProgress,
        weeklyTrends: mockWeeklyTrends,
        availableMeals: mockMeals,
        timeOfDay: 'evening' as const,
      };

      const recommendations = generateCalorieRecommendations(context);

      // First recommendation should be high priority
      expect(recommendations[0].priority).toBe('high');
    });
  });

  describe('suggestMealsForCalorieBudget', () => {
    it('should suggest meals within calorie budget', () => {
      const suggestions = suggestMealsForCalorieBudget(
        400,
        mockMeals,
        'lunch'
      );

      expect(suggestions).toHaveLength(2); // Chicken Salad (350) and Protein Smoothie (250)
      expect(suggestions[0].name).toBe('Chicken Salad'); // Closest to 400
    });

    it('should filter by prep time preference', () => {
      const suggestions = suggestMealsForCalorieBudget(
        400,
        mockMeals,
        'lunch',
        { maxPrep: 10 }
      );

      expect(suggestions).toHaveLength(1); // Only Protein Smoothie (5 min prep)
      expect(suggestions[0].name).toBe('Protein Smoothie');
    });

    it('should filter by dietary preferences', () => {
      const suggestions = suggestMealsForCalorieBudget(
        400,
        mockMeals,
        'lunch',
        { dietary: ['protein'] }
      );

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.every(meal => meal.tags.includes('protein'))).toBe(true);
    });

    it('should exclude meals with unwanted ingredients', () => {
      const mealsWithChicken = [
        ...mockMeals,
        {
          id: '4',
          name: 'Chicken Soup',
          description: 'Warm chicken soup',
          ingredients: [{ name: 'Chicken', quantity: 1, unit: 'cup' }],
          steps: [],
          tags: [],
          prepTime: 30,
          cookTime: 30,
          servings: 1,
          nutritionPerServing: { calories: 300, protein: 20, carbs: 15, fats: 10 },
        },
      ];

      const suggestions = suggestMealsForCalorieBudget(
        350,
        mealsWithChicken,
        'lunch',
        { excludeIngredients: ['chicken'] }
      );

      expect(suggestions.every(meal => 
        !meal.ingredients.some(ing => 
          ing.name.toLowerCase().includes('chicken')
        )
      )).toBe(true);
    });

    it('should return empty array when no meals match criteria', () => {
      const suggestions = suggestMealsForCalorieBudget(
        100, // Very low budget
        mockMeals,
        'lunch'
      );

      expect(suggestions).toHaveLength(0);
    });

    it('should sort by calorie proximity to budget', () => {
      const suggestions = suggestMealsForCalorieBudget(
        300,
        mockMeals,
        'snack'
      );

      if (suggestions.length > 1) {
        const firstMealCalories = suggestions[0].nutritionPerServing?.calories || 0;
        const secondMealCalories = suggestions[1].nutritionPerServing?.calories || 0;
        
        expect(Math.abs(firstMealCalories - 300))
          .toBeLessThanOrEqual(Math.abs(secondMealCalories - 300));
      }
    });
  });

  describe('calculateOptimalPortion', () => {
    it('should calculate correct portion for target calories', () => {
      const meal = mockMeals[0]; // 350 calories
      const result = calculateOptimalPortion(meal, 700);

      expect(result.portion).toBe(2); // 700 / 350 = 2
      expect(result.actualCalories).toBe(700);
      expect(result.recommendation).toContain('2 servings');
    });

    it('should round portion to nearest 0.25', () => {
      const meal = mockMeals[0]; // 350 calories
      const result = calculateOptimalPortion(meal, 400);

      expect(result.portion).toBe(1); // 400 / 350 = 1.14, rounded to 1
      expect(result.actualCalories).toBe(350);
    });

    it('should handle small portions', () => {
      const meal = mockMeals[1]; // 600 calories
      const result = calculateOptimalPortion(meal, 200);

      expect(result.portion).toBe(0.25); // Minimum reasonable portion
      expect(result.recommendation).toContain('smaller portion');
    });

    it('should handle large portions', () => {
      const meal = mockMeals[2]; // 250 calories
      const result = calculateOptimalPortion(meal, 800);

      expect(result.portion).toBe(3.25); // 800 / 250 = 3.2, rounded to 3.25
      expect(result.recommendation).toContain('Large portion needed');
    });

    it('should handle meals without nutrition data', () => {
      const mealWithoutNutrition = {
        ...mockMeals[0],
        nutritionPerServing: undefined,
      };

      const result = calculateOptimalPortion(mealWithoutNutrition, 400);

      expect(result.portion).toBe(1);
      expect(result.actualCalories).toBe(0);
      expect(result.recommendation).toContain('Nutrition data not available');
    });

    it('should provide appropriate recommendations for different portion sizes', () => {
      const meal = mockMeals[0]; // 350 calories

      // Normal portion
      const normalResult = calculateOptimalPortion(meal, 350);
      expect(normalResult.recommendation).toContain('1 serving recommended');

      // Small portion
      const smallResult = calculateOptimalPortion(meal, 100);
      expect(smallResult.recommendation).toContain('smaller portion');

      // Large portion
      const largeResult = calculateOptimalPortion(meal, 1000);
      expect(largeResult.recommendation).toContain('Large portion needed');
    });
  });
});