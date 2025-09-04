import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { NutritionProvider, useNutrition } from '../useNutrition';
import { UserProfileProvider } from '../useUserProfile';
import { UserPreferencesProvider } from '../useUserPreferences';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

// Mock the goal calculations
jest.mock('@/utils/goalCalculations', () => ({
  calculateNutritionGoals: jest.fn(),
  validateNutritionGoals: jest.fn(),
  getDefaultNutritionGoals: jest.fn(() => ({
    dailyCalories: 2000,
    protein: 125,
    carbs: 250,
    fats: 56,
  })),
  canCalculateGoals: jest.fn(),
  getGoalExplanation: jest.fn(() => 'Mock explanation'),
}));

// Mock user profile hook
const mockProfile = {
  basics: { age: 30, sex: 'male' as const, heightCm: 180, weightKg: 80 },
  goals: { dailyCalories: 2500, proteinTargetG: 150, carbsTargetG: 300, fatsTargetG: 80 },
  preferences: { allergies: [], dislikedIngredients: [], preferredCuisines: [] },
  metrics: { unitSystem: 'metric' as const },
};

const mockUserProfile = {
  profile: mockProfile,
  savePartial: jest.fn(),
  isLoading: false,
};

const mockUserPreferences = {
  preferences: { goals: undefined },
  updateGoals: jest.fn(),
};

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
            maybeSingle: () => Promise.resolve({ data: null, error: null }),
          }),
        }),
        insert: () => ({
          select: () => ({
            single: () => Promise.resolve({ data: null, error: null }),
          }),
        }),
        upsert: () => Promise.resolve({ error: null }),
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
      <NutritionProvider>
        {children}
      </NutritionProvider>
    </UserPreferencesProvider>
  </UserProfileProvider>
);

describe('useNutrition', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
  });

  it('should initialize with default values', async () => {
    const { result } = renderHook(() => useNutrition(), {
      wrapper: TestWrapper,
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.loggedMeals).toEqual([]);
    expect(result.current.todayTotals).toEqual({
      calories: 0,
      protein: 0,
      carbs: 0,
      fats: 0,
    });
  });

  it('should load logged meals from AsyncStorage', async () => {
    const mockMeals = [
      {
        id: '1',
        date: '2024-01-01',
        mealType: 'breakfast' as const,
        calories: 300,
        protein: 20,
        carbs: 40,
        fats: 10,
        servings: 1,
      },
    ];

    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(mockMeals));

    const { result, waitForNextUpdate } = renderHook(() => useNutrition(), {
      wrapper: TestWrapper,
    });

    await waitForNextUpdate();

    expect(result.current.loggedMeals).toEqual(mockMeals);
    expect(result.current.isLoading).toBe(false);
  });

  it('should calculate daily progress correctly', async () => {
    const mockMeals = [
      {
        id: '1',
        date: '2024-01-01',
        mealType: 'breakfast' as const,
        calories: 500,
        protein: 25,
        carbs: 50,
        fats: 20,
        servings: 1,
      },
      {
        id: '2',
        date: '2024-01-01',
        mealType: 'lunch' as const,
        calories: 600,
        protein: 30,
        carbs: 60,
        fats: 25,
        servings: 1,
      },
    ];

    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(mockMeals));

    const { result, waitForNextUpdate } = renderHook(() => useNutrition(), {
      wrapper: TestWrapper,
    });

    await waitForNextUpdate();

    const progress = result.current.getDailyProgress('2024-01-01');

    expect(progress.calories.consumed).toBe(1100);
    expect(progress.macros.protein.consumed).toBe(55);
    expect(progress.macros.carbs.consumed).toBe(110);
    expect(progress.macros.fats.consumed).toBe(45);
    expect(progress.status).toBe('under'); // 1100 < 2000 default goal
  });

  it('should log meals from recipes correctly', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useNutrition(), {
      wrapper: TestWrapper,
    });

    await waitForNextUpdate();

    const mockMeal = {
      id: 'recipe-1',
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
    };

    act(() => {
      result.current.logMealFromRecipe(mockMeal, '2024-01-01', 'dinner', 1.5);
    });

    const loggedMeal = result.current.loggedMeals[0];
    expect(loggedMeal.calories).toBe(600); // 400 * 1.5
    expect(loggedMeal.protein).toBe(38); // 25 * 1.5, rounded
    expect(loggedMeal.carbs).toBe(45); // 30 * 1.5
    expect(loggedMeal.fats).toBe(30); // 20 * 1.5
    expect(loggedMeal.servings).toBe(1.5);
  });

  it('should log custom meals correctly', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useNutrition(), {
      wrapper: TestWrapper,
    });

    await waitForNextUpdate();

    act(() => {
      result.current.logCustomMeal(
        'Custom Snack',
        '2024-01-01',
        'snack',
        { calories: 200, protein: 10, carbs: 25, fats: 8 }
      );
    });

    const loggedMeal = result.current.loggedMeals[0];
    expect(loggedMeal.customName).toBe('Custom Snack');
    expect(loggedMeal.calories).toBe(200);
    expect(loggedMeal.protein).toBe(10);
    expect(loggedMeal.carbs).toBe(25);
    expect(loggedMeal.fats).toBe(8);
  });

  it('should remove logged meals correctly', async () => {
    const mockMeals = [
      {
        id: '1',
        date: '2024-01-01',
        mealType: 'breakfast' as const,
        calories: 300,
        protein: 20,
        carbs: 40,
        fats: 10,
        servings: 1,
      },
      {
        id: '2',
        date: '2024-01-01',
        mealType: 'lunch' as const,
        calories: 400,
        protein: 25,
        carbs: 50,
        fats: 15,
        servings: 1,
      },
    ];

    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(mockMeals));

    const { result, waitForNextUpdate } = renderHook(() => useNutrition(), {
      wrapper: TestWrapper,
    });

    await waitForNextUpdate();

    act(() => {
      result.current.removeLoggedMeal('1');
    });

    expect(result.current.loggedMeals).toHaveLength(1);
    expect(result.current.loggedMeals[0].id).toBe('2');
  });

  it('should calculate weekly trends correctly', async () => {
    // Mock meals for multiple days
    const mockMeals = [];
    for (let i = 0; i < 14; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateISO = date.toISOString().split('T')[0];
      
      mockMeals.push({
        id: `meal-${i}`,
        date: dateISO,
        mealType: 'breakfast' as const,
        calories: 1800 + (i * 50), // Varying calories
        protein: 100,
        carbs: 200,
        fats: 60,
        servings: 1,
      });
    }

    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(mockMeals));

    const { result, waitForNextUpdate } = renderHook(() => useNutrition(), {
      wrapper: TestWrapper,
    });

    await waitForNextUpdate();

    expect(result.current.weeklyTrends).toBeDefined();
    expect(result.current.weeklyTrends.length).toBeGreaterThan(0);
    
    const firstWeek = result.current.weeklyTrends[0];
    expect(firstWeek.averageCalories).toBeGreaterThan(0);
    expect(firstWeek.goalAdherence).toBeGreaterThanOrEqual(0);
    expect(firstWeek.totalDays).toBeGreaterThan(0);
  });

  it('should persist meals to AsyncStorage when changed', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useNutrition(), {
      wrapper: TestWrapper,
    });

    await waitForNextUpdate();

    const mockMeal = {
      id: 'recipe-1',
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
    };

    act(() => {
      result.current.logMealFromRecipe(mockMeal, '2024-01-01', 'dinner', 1);
    });

    // Wait for the effect to run
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      'loggedMeals',
      expect.stringContaining('recipe-1')
    );
  });
});