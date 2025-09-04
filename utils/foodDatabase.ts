import AsyncStorage from '@react-native-async-storage/async-storage';

export interface FoodItem {
  id: string;
  name: string;
  brand?: string;
  servingSize: string;
  caloriesPerServing: number;
  macrosPerServing: {
    protein: number;
    carbs: number;
    fats: number;
  };
  source: 'usda' | 'user' | 'recent';
  category?: string;
  barcode?: string;
}

export interface RecentFood extends FoodItem {
  lastUsed: Date;
  useCount: number;
}

// Comprehensive food database with common foods
const USDA_FOODS: FoodItem[] = [
  // Fruits
  {
    id: 'usda_1',
    name: 'Banana',
    servingSize: '1 medium (118g)',
    caloriesPerServing: 105,
    macrosPerServing: { protein: 1.3, carbs: 27, fats: 0.4 },
    source: 'usda',
    category: 'fruits',
  },
  {
    id: 'usda_2',
    name: 'Apple',
    servingSize: '1 medium (182g)',
    caloriesPerServing: 95,
    macrosPerServing: { protein: 0.5, carbs: 25, fats: 0.3 },
    source: 'usda',
    category: 'fruits',
  },
  {
    id: 'usda_3',
    name: 'Orange',
    servingSize: '1 medium (154g)',
    caloriesPerServing: 62,
    macrosPerServing: { protein: 1.2, carbs: 15.4, fats: 0.2 },
    source: 'usda',
    category: 'fruits',
  },
  {
    id: 'usda_4',
    name: 'Strawberries',
    servingSize: '1 cup (152g)',
    caloriesPerServing: 49,
    macrosPerServing: { protein: 1, carbs: 11.7, fats: 0.5 },
    source: 'usda',
    category: 'fruits',
  },
  {
    id: 'usda_5',
    name: 'Blueberries',
    servingSize: '1 cup (148g)',
    caloriesPerServing: 84,
    macrosPerServing: { protein: 1.1, carbs: 21.5, fats: 0.5 },
    source: 'usda',
    category: 'fruits',
  },

  // Vegetables
  {
    id: 'usda_6',
    name: 'Broccoli',
    servingSize: '1 cup chopped (91g)',
    caloriesPerServing: 25,
    macrosPerServing: { protein: 3, carbs: 5, fats: 0.3 },
    source: 'usda',
    category: 'vegetables',
  },
  {
    id: 'usda_7',
    name: 'Spinach',
    servingSize: '1 cup (30g)',
    caloriesPerServing: 7,
    macrosPerServing: { protein: 0.9, carbs: 1.1, fats: 0.1 },
    source: 'usda',
    category: 'vegetables',
  },
  {
    id: 'usda_8',
    name: 'Carrots',
    servingSize: '1 medium (61g)',
    caloriesPerServing: 25,
    macrosPerServing: { protein: 0.5, carbs: 6, fats: 0.1 },
    source: 'usda',
    category: 'vegetables',
  },
  {
    id: 'usda_9',
    name: 'Bell Pepper',
    servingSize: '1 medium (119g)',
    caloriesPerServing: 24,
    macrosPerServing: { protein: 1, carbs: 7, fats: 0.3 },
    source: 'usda',
    category: 'vegetables',
  },

  // Proteins
  {
    id: 'usda_10',
    name: 'Chicken Breast',
    servingSize: '100g cooked',
    caloriesPerServing: 165,
    macrosPerServing: { protein: 31, carbs: 0, fats: 3.6 },
    source: 'usda',
    category: 'proteins',
  },
  {
    id: 'usda_11',
    name: 'Salmon',
    servingSize: '100g cooked',
    caloriesPerServing: 206,
    macrosPerServing: { protein: 22, carbs: 0, fats: 12 },
    source: 'usda',
    category: 'proteins',
  },
  {
    id: 'usda_12',
    name: 'Ground Beef (93% lean)',
    servingSize: '100g cooked',
    caloriesPerServing: 182,
    macrosPerServing: { protein: 25, carbs: 0, fats: 8 },
    source: 'usda',
    category: 'proteins',
  },
  {
    id: 'usda_13',
    name: 'Eggs',
    servingSize: '1 large (50g)',
    caloriesPerServing: 70,
    macrosPerServing: { protein: 6, carbs: 0.6, fats: 5 },
    source: 'usda',
    category: 'proteins',
  },
  {
    id: 'usda_14',
    name: 'Greek Yogurt (Plain)',
    servingSize: '1 cup (245g)',
    caloriesPerServing: 130,
    macrosPerServing: { protein: 23, carbs: 9, fats: 0.4 },
    source: 'usda',
    category: 'dairy',
  },
  {
    id: 'usda_15',
    name: 'Tofu (Firm)',
    servingSize: '100g',
    caloriesPerServing: 144,
    macrosPerServing: { protein: 17.3, carbs: 3, fats: 9 },
    source: 'usda',
    category: 'proteins',
  },

  // Grains & Carbs
  {
    id: 'usda_16',
    name: 'Brown Rice',
    servingSize: '1 cup cooked (195g)',
    caloriesPerServing: 216,
    macrosPerServing: { protein: 5, carbs: 45, fats: 1.8 },
    source: 'usda',
    category: 'grains',
  },
  {
    id: 'usda_17',
    name: 'Quinoa',
    servingSize: '1 cup cooked (185g)',
    caloriesPerServing: 222,
    macrosPerServing: { protein: 8, carbs: 39, fats: 3.6 },
    source: 'usda',
    category: 'grains',
  },
  {
    id: 'usda_18',
    name: 'Oats',
    servingSize: '1 cup cooked (234g)',
    caloriesPerServing: 154,
    macrosPerServing: { protein: 6, carbs: 28, fats: 3 },
    source: 'usda',
    category: 'grains',
  },
  {
    id: 'usda_19',
    name: 'Whole Wheat Bread',
    servingSize: '1 slice (28g)',
    caloriesPerServing: 81,
    macrosPerServing: { protein: 4, carbs: 14, fats: 1.1 },
    source: 'usda',
    category: 'grains',
  },
  {
    id: 'usda_20',
    name: 'Sweet Potato',
    servingSize: '1 medium baked (128g)',
    caloriesPerServing: 112,
    macrosPerServing: { protein: 2, carbs: 26, fats: 0.1 },
    source: 'usda',
    category: 'vegetables',
  },

  // Nuts & Seeds
  {
    id: 'usda_21',
    name: 'Almonds',
    servingSize: '1 oz (28g)',
    caloriesPerServing: 164,
    macrosPerServing: { protein: 6, carbs: 6, fats: 14 },
    source: 'usda',
    category: 'nuts',
  },
  {
    id: 'usda_22',
    name: 'Walnuts',
    servingSize: '1 oz (28g)',
    caloriesPerServing: 185,
    macrosPerServing: { protein: 4.3, carbs: 3.9, fats: 18.5 },
    source: 'usda',
    category: 'nuts',
  },
  {
    id: 'usda_23',
    name: 'Peanut Butter',
    servingSize: '2 tbsp (32g)',
    caloriesPerServing: 188,
    macrosPerServing: { protein: 8, carbs: 8, fats: 16 },
    source: 'usda',
    category: 'nuts',
  },
  {
    id: 'usda_24',
    name: 'Chia Seeds',
    servingSize: '1 oz (28g)',
    caloriesPerServing: 137,
    macrosPerServing: { protein: 4.4, carbs: 12, fats: 8.6 },
    source: 'usda',
    category: 'seeds',
  },

  // Dairy
  {
    id: 'usda_25',
    name: 'Milk (2%)',
    servingSize: '1 cup (244g)',
    caloriesPerServing: 122,
    macrosPerServing: { protein: 8, carbs: 12, fats: 4.8 },
    source: 'usda',
    category: 'dairy',
  },
  {
    id: 'usda_26',
    name: 'Cheddar Cheese',
    servingSize: '1 oz (28g)',
    caloriesPerServing: 113,
    macrosPerServing: { protein: 7, carbs: 1, fats: 9 },
    source: 'usda',
    category: 'dairy',
  },
  {
    id: 'usda_27',
    name: 'Cottage Cheese (Low-fat)',
    servingSize: '1 cup (226g)',
    caloriesPerServing: 163,
    macrosPerServing: { protein: 28, carbs: 6.2, fats: 2.3 },
    source: 'usda',
    category: 'dairy',
  },

  // Oils & Fats
  {
    id: 'usda_28',
    name: 'Olive Oil',
    servingSize: '1 tbsp (14g)',
    caloriesPerServing: 119,
    macrosPerServing: { protein: 0, carbs: 0, fats: 13.5 },
    source: 'usda',
    category: 'fats',
  },
  {
    id: 'usda_29',
    name: 'Avocado',
    servingSize: '1 medium (150g)',
    caloriesPerServing: 234,
    macrosPerServing: { protein: 2.9, carbs: 12, fats: 21 },
    source: 'usda',
    category: 'fats',
  },
  {
    id: 'usda_30',
    name: 'Butter',
    servingSize: '1 tbsp (14g)',
    caloriesPerServing: 102,
    macrosPerServing: { protein: 0.1, carbs: 0, fats: 11.5 },
    source: 'usda',
    category: 'fats',
  },
];

class FoodDatabase {
  private static instance: FoodDatabase;
  private userFoods: FoodItem[] = [];
  private recentFoods: RecentFood[] = [];
  private isLoaded = false;

  private constructor() {}

  static getInstance(): FoodDatabase {
    if (!FoodDatabase.instance) {
      FoodDatabase.instance = new FoodDatabase();
    }
    return FoodDatabase.instance;
  }

  async initialize(): Promise<void> {
    if (this.isLoaded) return;

    try {
      // Load user foods
      const userFoodsData = await AsyncStorage.getItem('userFoods');
      if (userFoodsData) {
        this.userFoods = JSON.parse(userFoodsData);
      }

      // Load recent foods
      const recentFoodsData = await AsyncStorage.getItem('recentFoods');
      if (recentFoodsData) {
        this.recentFoods = JSON.parse(recentFoodsData).map((food: any) => ({
          ...food,
          lastUsed: new Date(food.lastUsed),
        }));
      }

      this.isLoaded = true;
    } catch (error) {
      console.error('Failed to initialize food database:', error);
    }
  }

  async searchFoods(query: string, limit: number = 20): Promise<FoodItem[]> {
    await this.initialize();

    if (!query.trim()) {
      // Return recent foods and popular USDA foods
      const recentFoodItems = this.recentFoods
        .sort((a, b) => b.lastUsed.getTime() - a.lastUsed.getTime())
        .slice(0, 5);
      
      const popularFoods = USDA_FOODS.slice(0, 10);
      
      return [...recentFoodItems, ...popularFoods].slice(0, limit);
    }

    const searchTerm = query.toLowerCase().trim();
    const allFoods = [...this.recentFoods, ...this.userFoods, ...USDA_FOODS];

    // Score foods based on relevance
    const scoredFoods = allFoods
      .map(food => {
        let score = 0;
        const name = food.name.toLowerCase();
        const brand = food.brand?.toLowerCase() || '';

        // Exact match gets highest score
        if (name === searchTerm) score += 100;
        else if (name.startsWith(searchTerm)) score += 50;
        else if (name.includes(searchTerm)) score += 25;

        // Brand matching
        if (brand.includes(searchTerm)) score += 15;

        // Recent foods get bonus
        if (food.source === 'recent') score += 10;

        // User foods get bonus
        if (food.source === 'user') score += 5;

        return { food, score };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(item => item.food);

    return scoredFoods;
  }

  async addUserFood(food: Omit<FoodItem, 'id' | 'source'>): Promise<FoodItem> {
    await this.initialize();

    const newFood: FoodItem = {
      ...food,
      id: `user_${Date.now()}`,
      source: 'user',
    };

    this.userFoods.push(newFood);
    await this.saveUserFoods();

    return newFood;
  }

  async addToRecent(food: FoodItem): Promise<void> {
    await this.initialize();

    const existingIndex = this.recentFoods.findIndex(rf => rf.id === food.id);
    
    if (existingIndex >= 0) {
      // Update existing recent food
      this.recentFoods[existingIndex].lastUsed = new Date();
      this.recentFoods[existingIndex].useCount += 1;
    } else {
      // Add new recent food
      const recentFood: RecentFood = {
        ...food,
        source: 'recent',
        lastUsed: new Date(),
        useCount: 1,
      };
      this.recentFoods.push(recentFood);
    }

    // Keep only last 50 recent foods
    this.recentFoods = this.recentFoods
      .sort((a, b) => b.lastUsed.getTime() - a.lastUsed.getTime())
      .slice(0, 50);

    await this.saveRecentFoods();
  }

  async getFoodsByCategory(category: string): Promise<FoodItem[]> {
    await this.initialize();

    const allFoods = [...this.userFoods, ...USDA_FOODS];
    return allFoods.filter(food => food.category === category);
  }

  async getRecentFoods(limit: number = 10): Promise<RecentFood[]> {
    await this.initialize();

    return this.recentFoods
      .sort((a, b) => b.lastUsed.getTime() - a.lastUsed.getTime())
      .slice(0, limit);
  }

  async getPopularFoods(limit: number = 10): Promise<FoodItem[]> {
    // Return most commonly used foods from USDA database
    return USDA_FOODS.slice(0, limit);
  }

  private async saveUserFoods(): Promise<void> {
    try {
      await AsyncStorage.setItem('userFoods', JSON.stringify(this.userFoods));
    } catch (error) {
      console.error('Failed to save user foods:', error);
    }
  }

  private async saveRecentFoods(): Promise<void> {
    try {
      await AsyncStorage.setItem('recentFoods', JSON.stringify(this.recentFoods));
    } catch (error) {
      console.error('Failed to save recent foods:', error);
    }
  }

  // Get food categories for filtering
  getCategories(): string[] {
    return ['fruits', 'vegetables', 'proteins', 'grains', 'dairy', 'nuts', 'seeds', 'fats'];
  }

  // Validate nutrition data
  validateNutritionData(data: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  }): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (data.calories < 0 || data.calories > 2000) {
      errors.push('Calories must be between 0 and 2000 per serving');
    }

    if (data.protein < 0 || data.protein > 200) {
      errors.push('Protein must be between 0 and 200g per serving');
    }

    if (data.carbs < 0 || data.carbs > 300) {
      errors.push('Carbs must be between 0 and 300g per serving');
    }

    if (data.fats < 0 || data.fats > 100) {
      errors.push('Fats must be between 0 and 100g per serving');
    }

    // Check if macro calories roughly match total calories (within 20% tolerance)
    const macroCalories = (data.protein * 4) + (data.carbs * 4) + (data.fats * 9);
    const difference = Math.abs(macroCalories - data.calories);
    const tolerance = data.calories * 0.2;

    if (difference > tolerance && data.calories > 0) {
      errors.push('Macro calories don\'t match total calories (check your values)');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

export const foodDatabase = FoodDatabase.getInstance();