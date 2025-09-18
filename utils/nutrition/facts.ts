// Basic nutrition facts per 100g for common ingredients
// calories (kcal), protein (g), carbs (g), fats (g)
export type Macro = { calories: number; protein: number; carbs: number; fats: number };

export const NUTRITION_PER_100G: Record<string, Macro> = {
  // proteins
  'chicken breast': { calories: 165, protein: 31, carbs: 0, fats: 3.6 },
  'chicken': { calories: 215, protein: 27, carbs: 0, fats: 12 },
  'beef': { calories: 250, protein: 26, carbs: 0, fats: 17 },
  'egg': { calories: 155, protein: 13, carbs: 1.1, fats: 11 },
  'egg yolk': { calories: 322, protein: 16, carbs: 3.6, fats: 27 },
  'egg white': { calories: 52, protein: 11, carbs: 0.7, fats: 0.2 },
  'milk': { calories: 42, protein: 3.4, carbs: 5, fats: 1 }, // whole ~61; 1% ~42; treat generically

  // carbs and staples
  'rice': { calories: 130, protein: 2.7, carbs: 28, fats: 0.3 },
  'pasta': { calories: 131, protein: 5, carbs: 25, fats: 1.1 },
  'flour': { calories: 364, protein: 10, carbs: 76, fats: 1 },
  'sugar': { calories: 387, protein: 0, carbs: 100, fats: 0 },
  'bread': { calories: 265, protein: 9, carbs: 49, fats: 3.2 },
  'potato': { calories: 77, protein: 2, carbs: 17, fats: 0.1 },

  // oils & fats
  'olive oil': { calories: 884, protein: 0, carbs: 0, fats: 100 },
  'butter': { calories: 717, protein: 0.9, carbs: 0.1, fats: 81 },

  // vegetables & aromatics
  'onion': { calories: 40, protein: 1.1, carbs: 9.3, fats: 0.1 },
  'garlic': { calories: 149, protein: 6.4, carbs: 33, fats: 0.5 },
  'tomato': { calories: 18, protein: 0.9, carbs: 3.9, fats: 0.2 },
  'chopped tomatoes': { calories: 24, protein: 1.2, carbs: 5.3, fats: 0.2 }, // canned per 100g
  'bell pepper': { calories: 31, protein: 1, carbs: 6, fats: 0.3 },
  'carrot': { calories: 41, protein: 0.9, carbs: 10, fats: 0.2 },
  'broccoli': { calories: 34, protein: 2.8, carbs: 7, fats: 0.4 },

  // legumes & beans (cooked/canned)
  'kidney beans': { calories: 127, protein: 8.7, carbs: 22.8, fats: 0.5 },
  'beans': { calories: 110, protein: 7, carbs: 20, fats: 0.5 },
  'mixed vegetables': { calories: 72, protein: 3, carbs: 12, fats: 0.5 },
  'mixed grains': { calories: 130, protein: 4.5, carbs: 24, fats: 1.5 }, // rough average

  // dairy & cheese
  'cheddar cheese': { calories: 403, protein: 25, carbs: 1.3, fats: 33 },
  'mozzarella': { calories: 280, protein: 28, carbs: 3, fats: 17 },
  'parmesan': { calories: 431, protein: 38, carbs: 4.1, fats: 29 },

  // herbs/spices (approx, per 100g dried, rarely used at 100g)
  'salt': { calories: 0, protein: 0, carbs: 0, fats: 0 },
  'black pepper': { calories: 251, protein: 10, carbs: 64, fats: 3.3 },
};

export const ALIASES: Record<string, string> = {
  'extra virgin olive oil': 'olive oil',
  'onions': 'onion',
  'garlic clove': 'garlic',
  'garlic cloves': 'garlic',
  'tomatoes': 'tomato',
  'canned tomatoes': 'chopped tomatoes',
  'chopped tomato': 'chopped tomatoes',
  'red onion': 'onion',
  'yellow onion': 'onion',
  'white onion': 'onion',
  'parmigiano reggiano': 'parmesan',
  'mozzarella cheese': 'mozzarella',
  'cheddar': 'cheddar cheese',
  'kidney bean': 'kidney beans',
  'canned kidney beans': 'kidney beans',
  'mixed veg': 'mixed vegetables',
};
