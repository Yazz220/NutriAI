import React from 'react';
import { renderHook } from '@testing-library/react-native';
import { useNutritionWithMealPlan } from '../useNutritionWithMealPlan';
import { NutritionProvider } from '../useNutrition';
import { MealPlannerProvider } from '../useMealPlanner';
import { MealsProvider } from '../useMealsStore';
import { UserProfileProvider } from '../useUserProfile';
import { UserPreferencesProvider } from '../useUserPreferences';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

// Mock auth
jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ session: null, user: null }),
}));

// Mock Supabase
jest.mock('../../supabase/functions/_shared/supabaseClient', () => ({
  supabase: {
    schema: () => ({
      from: () => ({
        select: () => ({
          eq: () => ({
            order: () => ({
              order: () => Promise.resolve({ data: [], error: null }),
            }),
          }),
        }),
        insert: () => ({
          select: () => ({
            single: () => Promise.resolve({ data: null, error: null }),
          }),
        }),
        update: () => ({
          eq: () => Promise.resolve({ error: null }),
        }),
        delete: () => ({
          eq: () => Promise.resolve({ error: null }),
        }),
      }),
    }),
  },
}));

// Mock React Query
jest.mock('@tanstack/react-query', () => ({
  useQuery: () => ({ data: undefined }),
  useMutation: () => ({
    mutate: jest.fn(),
  }),
  useQueryClient: () => ({
    setQueryData: jest.fn(),
    cancelQueries: jest.fn(),
    getQueryData: jest.fn(),
    invalidateQueries: jest.fn(),
  }),
}));

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <UserProfileProvider>
    <UserPreferencesProvider>
      <MealsProvider>
        <MealPlannerProvider>
          <NutritionProvider>
            {children}
          </NutritionProvider>
        </MealPlannerProvider>
      </MealsProvider>
    </UserPreferencesProvider>
  </UserProfileProvider>
);

describe('useNutritionWithMealPlan', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should integrate nutrition and meal plan data', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useNutritionWithMealPlan(), {
      wrapper: TestWrapper,
    });

    await waitForNextUpdate();

    expect(result.current.hasMealPlanData).toBeDefined();
    expect(result.current.hasRecipeData).toBeDefined();
    expect(result.current.getPlannedMealCalories).toBeDefined();
    expect(result.current.logPlannedMeal).toBeDefined();
    expect(result.current.calculatePlannedMealCalories).toBeDefined();
  });

  it('should calculate planned meal calories correctly', async () => {
    // Mock meal data
    const mockMeals = [
      {
        id: '1',
        name: 'Test Recipe',
        description: 'Test',
        ingredients: [],
        steps: [],
        tags: [],
        prepTime: 30,
        cookTime: 30,
        servings: 2,
        nutritionPerServing: {
          calories: 400,
          protein: 25,
          carbs: 30,
          fats: 20,
        },
      },
    ];

    const mockPlannedMeals = [
      {
        id: '1',
        recipeId: '1',
        date: '2024-01-01',
        mealType: 'dinner' as const,
        servings: 1.5,
        notes: '',
        isCompleted: false,
      },
    ];

    // Mock the hooks to return our test data
    jest.doMock('../useMeals', () => ({
      useMeals: () => ({ meals: mockMeals, isLoading: false }),
    }));

    jest.doMock('../useMealPlanner', () => ({
      useMealPlanner: () => ({ plannedMeals: mockPlannedMeals, isLoading: false }),
    }));

    const { result, waitForNextUpdate } = renderHook(() => useNutritionWithMealPlan(), {
      wrapper: TestWrapper,
    });

    await waitForNextUpdate();

    const plannedCalories = result.current.getPlannedMealCalories('2024-01-01');
    
    expect(plannedCalories).toHaveLength(1);
    expect(plannedCalories[0].calories).toBe(600); // 400 * 1.5
    expect(plannedCalories[0].protein).toBe(38); // 25 * 1.5, rounded
    expect(plannedCalories[0].recipeName).toBe('Test Recipe');
  });

  it('should estimate calories when nutrition data is missing', async () => {
    const mockMeals = [
      {
        id: '1',
        name: 'Recipe Without Nutrition',
        description: 'Test',
        ingredients: [
          { name: 'Chicken Breast', quantity: 200, unit: 'g', optional: false },
          { name: 'Rice', quantity: 1, unit: 'cup', optional: false },
        ],
        steps: [],
        tags: [],
        prepTime: 30,
        cookTime: 30,
        servings: 2,
        // No nutritionPerServing data
      },
    ];

    const mockPlannedMeals = [
      {
        id: '1',
        recipeId: '1',
        date: '2024-01-01',
        mealType: 'dinner' as const,
        servings: 1,
        notes: '',
        isCompleted: false,
      },
    ];

    jest.doMock('../useMeals', () => ({
      useMeals: () => ({ meals: mockMeals, isLoading: false }),
    }));

    jest.doMock('../useMealPlanner', () => ({
      useMealPlanner: () => ({ plannedMeals: mockPlannedMeals, isLoading: false }),
    }));

    const { result, waitForNextUpdate } = renderHook(() => useNutritionWithMealPlan(), {
      wrapper: TestWrapper,
    });

    await waitForNextUpdate();

    const plannedCalories = result.current.getPlannedMealCalories('2024-01-01');
    
    expect(plannedCalories).toHaveLength(1);
    expect(plannedCalories[0].calories).toBeGreaterThan(0); // Should estimate calories
    expect(plannedCalories[0].recipeName).toBe('Recipe Without Nutrition');
  });

  it('should integrate planned calories into daily progress', async () => {
    const mockMeals = [
      {
        id: '1',
        name: 'Breakfast Recipe',
        description: 'Test',
        ingredients: [],
        steps: [],
        tags: [],
        prepTime: 10,
        cookTime: 5,
        servings: 1,
        nutritionPerServing: {
          calories: 300,
          protein: 15,
          carbs: 40,
          fats: 10,
        },
      },
    ];

    const mockPlannedMeals = [
      {
        id: '1',
        recipeId: '1',
        date: '2024-01-01',
        mealType: 'breakfast' as const,
        servings: 1,
        notes: '',
        isCompleted: false,
      },
    ];

    jest.doMock('../useMeals', () => ({
      useMeals: () => ({ meals: mockMeals, isLoading: false }),
    }));

    jest.doMock('../useMealPlanner', () => ({
      useMealPlanner: () => ({ plannedMeals: mockPlannedMeals, isLoading: false }),
    }));

    const { result, waitForNextUpdate } = renderHook(() => useNutritionWithMealPlan(), {
      wrapper: TestWrapper,
    });

    await waitForNextUpdate();

    const dailyProgress = result.current.getDailyProgress('2024-01-01');
    
    expect(dailyProgress.calories.fromPlanned).toBe(300);
    expect(dailyProgress.calories.consumed).toBe(300); // Only planned, no logged
    expect(dailyProgress.macros.protein.consumed).toBe(15);
  });

  it('should calculate planned calories for date ranges', async () => {
    const mockMeals = [
      {
        id: '1',
        name: 'Daily Recipe',
        description: 'Test',
        ingredients: [],
        steps: [],
        tags: [],
        prepTime: 30,
        cookTime: 30,
        servings: 1,
        nutritionPerServing: {
          calories: 500,
          protein: 25,
          carbs: 50,
          fats: 20,
        },
      },
    ];

    const mockPlannedMeals = [
      {
        id: '1',
        recipeId: '1',
        date: '2024-01-01',
        mealType: 'lunch' as const,
        servings: 1,
        notes: '',
        isCompleted: false,
      },
      {
        id: '2',
        recipeId: '1',
        date: '2024-01-02',
        mealType: 'lunch' as const,
        servings: 1,
        notes: '',
        isCompleted: false,
      },
      {
        id: '3',
        recipeId: '1',
        date: '2024-01-03',
        mealType: 'lunch' as const,
        servings: 1,
        notes: '',
        isCompleted: false,
      },
    ];

    jest.doMock('../useMeals', () => ({
      useMeals: () => ({ meals: mockMeals, isLoading: false }),
    }));

    jest.doMock('../useMealPlanner', () => ({
      useMealPlanner: () => ({ plannedMeals: mockPlannedMeals, isLoading: false }),
    }));

    const { result, waitForNextUpdate } = renderHook(() => useNutritionWithMealPlan(), {
      wrapper: TestWrapper,
    });

    await waitForNextUpdate();

    const rangeCalories = result.current.getPlannedCaloriesForRange('2024-01-01', '2024-01-03');
    
    expect(rangeCalories).toBe(1500); // 500 * 3 days
  });

  it('should check if recipes have nutrition data', async () => {
    const mockMeals = [
      {
        id: '1',
        name: 'Recipe With Nutrition',
        description: 'Test',
        ingredients: [],
        steps: [],
        tags: [],
        prepTime: 30,
        cookTime: 30,
        servings: 1,
        nutritionPerServing: {
          calories: 400,
          protein: 25,
          carbs: 30,
          fats: 20,
        },
      },
      {
        id: '2',
        name: 'Recipe Without Nutrition',
        description: 'Test',
        ingredients: [],
        steps: [],
        tags: [],
        prepTime: 30,
        cookTime: 30,
        servings: 1,
        // No nutritionPerServing
      },
    ];

    jest.doMock('../useMeals', () => ({
      useMeals: () => ({ meals: mockMeals, isLoading: false }),
    }));

    const { result, waitForNextUpdate } = renderHook(() => useNutritionWithMealPlan(), {
      wrapper: TestWrapper,
    });

    await waitForNextUpdate();

    expect(result.current.hasNutritionData('1')).toBe(true);
    expect(result.current.hasNutritionData('2')).toBe(false);
    expect(result.current.hasNutritionData('nonexistent')).toBe(false);
  });
});