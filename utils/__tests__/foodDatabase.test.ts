import { foodDatabase } from '../foodDatabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

describe('foodDatabase', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue(undefined);
  });

  describe('searchFoods', () => {
    it('should return popular foods when no query provided', async () => {
      const results = await foodDatabase.searchFoods('');
      
      expect(results.length).toBeGreaterThan(0);
      expect(results.length).toBeLessThanOrEqual(15); // Recent + popular foods
    });

    it('should search foods by name', async () => {
      const results = await foodDatabase.searchFoods('banana');
      
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].name.toLowerCase()).toContain('banana');
    });

    it('should search foods case-insensitively', async () => {
      const results = await foodDatabase.searchFoods('CHICKEN');
      
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(food => food.name.toLowerCase().includes('chicken'))).toBe(true);
    });

    it('should limit search results', async () => {
      const results = await foodDatabase.searchFoods('a', 5);
      
      expect(results.length).toBeLessThanOrEqual(5);
    });

    it('should prioritize exact matches', async () => {
      const results = await foodDatabase.searchFoods('apple');
      
      if (results.length > 1) {
        expect(results[0].name.toLowerCase()).toBe('apple');
      }
    });

    it('should include recent foods in search results', async () => {
      // Mock recent foods in storage
      mockAsyncStorage.getItem.mockImplementation((key) => {
        if (key === 'recentFoods') {
          return Promise.resolve(JSON.stringify([
            {
              id: 'recent_1',
              name: 'Recent Banana',
              servingSize: '1 medium',
              caloriesPerServing: 105,
              macrosPerServing: { protein: 1, carbs: 27, fats: 0.4 },
              source: 'recent',
              lastUsed: new Date().toISOString(),
              useCount: 5,
            },
          ]));
        }
        return Promise.resolve(null);
      });

      const results = await foodDatabase.searchFoods('banana');
      
      expect(results.some(food => food.source === 'recent')).toBe(true);
    });
  });

  describe('addUserFood', () => {
    it('should add user food with generated ID', async () => {
      const foodData = {
        name: 'Custom Smoothie',
        servingSize: '1 cup',
        caloriesPerServing: 200,
        macrosPerServing: { protein: 10, carbs: 30, fats: 5 },
      };

      const result = await foodDatabase.addUserFood(foodData);

      expect(result.id).toMatch(/^user_\d+$/);
      expect(result.source).toBe('user');
      expect(result.name).toBe(foodData.name);
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'userFoods',
        expect.stringContaining(foodData.name)
      );
    });
  });

  describe('addToRecent', () => {
    it('should add new food to recent list', async () => {
      const food = {
        id: 'usda_1',
        name: 'Apple',
        servingSize: '1 medium',
        caloriesPerServing: 95,
        macrosPerServing: { protein: 0.5, carbs: 25, fats: 0.3 },
        source: 'usda' as const,
      };

      await foodDatabase.addToRecent(food);

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'recentFoods',
        expect.stringContaining(food.name)
      );
    });

    it('should update existing recent food usage', async () => {
      // Mock existing recent food
      mockAsyncStorage.getItem.mockImplementation((key) => {
        if (key === 'recentFoods') {
          return Promise.resolve(JSON.stringify([
            {
              id: 'usda_1',
              name: 'Apple',
              servingSize: '1 medium',
              caloriesPerServing: 95,
              macrosPerServing: { protein: 0.5, carbs: 25, fats: 0.3 },
              source: 'recent',
              lastUsed: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
              useCount: 1,
            },
          ]));
        }
        return Promise.resolve(null);
      });

      const food = {
        id: 'usda_1',
        name: 'Apple',
        servingSize: '1 medium',
        caloriesPerServing: 95,
        macrosPerServing: { protein: 0.5, carbs: 25, fats: 0.3 },
        source: 'usda' as const,
      };

      await foodDatabase.addToRecent(food);

      expect(mockAsyncStorage.setItem).toHaveBeenCalled();
    });

    it('should limit recent foods to 50 items', async () => {
      // Mock 50 existing recent foods
      const existingFoods = Array.from({ length: 50 }, (_, i) => ({
        id: `food_${i}`,
        name: `Food ${i}`,
        servingSize: '1 serving',
        caloriesPerServing: 100,
        macrosPerServing: { protein: 5, carbs: 15, fats: 3 },
        source: 'recent',
        lastUsed: new Date(Date.now() - i * 1000).toISOString(),
        useCount: 1,
      }));

      mockAsyncStorage.getItem.mockImplementation((key) => {
        if (key === 'recentFoods') {
          return Promise.resolve(JSON.stringify(existingFoods));
        }
        return Promise.resolve(null);
      });

      const newFood = {
        id: 'new_food',
        name: 'New Food',
        servingSize: '1 serving',
        caloriesPerServing: 150,
        macrosPerServing: { protein: 8, carbs: 20, fats: 4 },
        source: 'usda' as const,
      };

      await foodDatabase.addToRecent(newFood);

      // Should save exactly 50 items (removed oldest, added newest)
      const savedData = mockAsyncStorage.setItem.mock.calls.find(
        call => call[0] === 'recentFoods'
      )?.[1];
      
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        expect(parsedData).toHaveLength(50);
      }
    });
  });

  describe('getFoodsByCategory', () => {
    it('should return foods filtered by category', async () => {
      const fruits = await foodDatabase.getFoodsByCategory('fruits');
      
      expect(fruits.length).toBeGreaterThan(0);
      expect(fruits.every(food => food.category === 'fruits')).toBe(true);
    });

    it('should return empty array for non-existent category', async () => {
      const results = await foodDatabase.getFoodsByCategory('non-existent');
      
      expect(results).toHaveLength(0);
    });
  });

  describe('getRecentFoods', () => {
    it('should return recent foods sorted by last used', async () => {
      const recentFoods = [
        {
          id: 'recent_1',
          name: 'Recent Food 1',
          servingSize: '1 serving',
          caloriesPerServing: 100,
          macrosPerServing: { protein: 5, carbs: 15, fats: 3 },
          source: 'recent',
          lastUsed: new Date(Date.now() - 1000).toISOString(), // 1 second ago
          useCount: 2,
        },
        {
          id: 'recent_2',
          name: 'Recent Food 2',
          servingSize: '1 serving',
          caloriesPerServing: 120,
          macrosPerServing: { protein: 6, carbs: 18, fats: 4 },
          source: 'recent',
          lastUsed: new Date(Date.now() - 5000).toISOString(), // 5 seconds ago
          useCount: 1,
        },
      ];

      mockAsyncStorage.getItem.mockImplementation((key) => {
        if (key === 'recentFoods') {
          return Promise.resolve(JSON.stringify(recentFoods));
        }
        return Promise.resolve(null);
      });

      const results = await foodDatabase.getRecentFoods();

      expect(results).toHaveLength(2);
      expect(results[0].name).toBe('Recent Food 1'); // Most recent first
    });

    it('should limit recent foods results', async () => {
      const recentFoods = Array.from({ length: 20 }, (_, i) => ({
        id: `recent_${i}`,
        name: `Recent Food ${i}`,
        servingSize: '1 serving',
        caloriesPerServing: 100,
        macrosPerServing: { protein: 5, carbs: 15, fats: 3 },
        source: 'recent',
        lastUsed: new Date(Date.now() - i * 1000).toISOString(),
        useCount: 1,
      }));

      mockAsyncStorage.getItem.mockImplementation((key) => {
        if (key === 'recentFoods') {
          return Promise.resolve(JSON.stringify(recentFoods));
        }
        return Promise.resolve(null);
      });

      const results = await foodDatabase.getRecentFoods(5);

      expect(results).toHaveLength(5);
    });
  });

  describe('validateNutritionData', () => {
    it('should validate correct nutrition data', () => {
      const validData = {
        calories: 200,
        protein: 15,
        carbs: 25,
        fats: 8,
      };

      const result = foodDatabase.validateNutritionData(validData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should catch invalid calorie values', () => {
      const invalidData = {
        calories: -50,
        protein: 15,
        carbs: 25,
        fats: 8,
      };

      const result = foodDatabase.validateNutritionData(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        expect.stringContaining('Calories must be between')
      );
    });

    it('should catch invalid protein values', () => {
      const invalidData = {
        calories: 200,
        protein: 250, // Too high
        carbs: 25,
        fats: 8,
      };

      const result = foodDatabase.validateNutritionData(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        expect.stringContaining('Protein must be between')
      );
    });

    it('should catch invalid carb values', () => {
      const invalidData = {
        calories: 200,
        protein: 15,
        carbs: 400, // Too high
        fats: 8,
      };

      const result = foodDatabase.validateNutritionData(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        expect.stringContaining('Carbs must be between')
      );
    });

    it('should catch invalid fat values', () => {
      const invalidData = {
        calories: 200,
        protein: 15,
        carbs: 25,
        fats: 150, // Too high
      };

      const result = foodDatabase.validateNutritionData(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        expect.stringContaining('Fats must be between')
      );
    });

    it('should validate macro-calorie consistency', () => {
      const inconsistentData = {
        calories: 200,
        protein: 50, // 200 cal
        carbs: 50,   // 200 cal
        fats: 20,    // 180 cal
        // Total macro calories: 580, but stated calories: 200
      };

      const result = foodDatabase.validateNutritionData(inconsistentData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        expect.stringContaining("Macro calories don't match")
      );
    });

    it('should allow reasonable macro-calorie variance', () => {
      const slightlyInconsistentData = {
        calories: 200,
        protein: 12, // 48 cal
        carbs: 30,   // 120 cal
        fats: 4,     // 36 cal
        // Total macro calories: 204, stated calories: 200 (2% difference)
      };

      const result = foodDatabase.validateNutritionData(slightlyInconsistentData);

      expect(result.isValid).toBe(true);
    });

    it('should handle zero calories gracefully', () => {
      const zeroCalorieData = {
        calories: 0,
        protein: 0,
        carbs: 0,
        fats: 0,
      };

      const result = foodDatabase.validateNutritionData(zeroCalorieData);

      expect(result.isValid).toBe(true);
    });
  });

  describe('getCategories', () => {
    it('should return list of food categories', () => {
      const categories = foodDatabase.getCategories();

      expect(categories).toContain('fruits');
      expect(categories).toContain('vegetables');
      expect(categories).toContain('proteins');
      expect(categories).toContain('grains');
      expect(categories).toContain('dairy');
    });
  });

  describe('getPopularFoods', () => {
    it('should return popular foods from USDA database', async () => {
      const popularFoods = await foodDatabase.getPopularFoods();

      expect(popularFoods.length).toBeGreaterThan(0);
      expect(popularFoods.length).toBeLessThanOrEqual(10);
      expect(popularFoods.every(food => food.source === 'usda')).toBe(true);
    });

    it('should limit popular foods results', async () => {
      const popularFoods = await foodDatabase.getPopularFoods(5);

      expect(popularFoods).toHaveLength(5);
    });
  });
});