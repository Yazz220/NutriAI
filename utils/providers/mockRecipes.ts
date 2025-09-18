// Mock recipe provider for development when FatSecret is unavailable
import type { ExternalRecipe } from '@/types/external';

const MOCK_RECIPES: ExternalRecipe[] = [
  {
    id: 1001,
    title: "Grilled Chicken Breast",
    image: "https://images.unsplash.com/photo-1532550907401-a500c9a57435?w=640&h=480&fit=crop",
    servings: 4,
    readyInMinutes: 25,
    sourceName: "Mock Provider",
    sourceUrl: "",
    dishTypes: ["main course"],
    cuisines: ["american"],
  },
  {
    id: 1002,
    title: "Caesar Salad",
    image: "https://images.unsplash.com/photo-1551248429-40975aa4de74?w=640&h=480&fit=crop",
    servings: 2,
    readyInMinutes: 15,
    sourceName: "Mock Provider",
    sourceUrl: "",
    dishTypes: ["salad", "side dish"],
    cuisines: ["italian"],
  },
  {
    id: 1003,
    title: "Spaghetti Carbonara",
    image: "https://images.unsplash.com/photo-1621996346565-e3dbc353d2e5?w=640&h=480&fit=crop",
    servings: 4,
    readyInMinutes: 20,
    sourceName: "Mock Provider",
    sourceUrl: "",
    dishTypes: ["main course"],
    cuisines: ["italian"],
  },
  {
    id: 1004,
    title: "Beef Tacos",
    image: "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=640&h=480&fit=crop",
    servings: 6,
    readyInMinutes: 30,
    sourceName: "Mock Provider",
    sourceUrl: "",
    dishTypes: ["main course"],
    cuisines: ["mexican"],
  },
  {
    id: 1005,
    title: "Vegetable Stir Fry",
    image: "https://images.unsplash.com/photo-1512058564366-18510be2db19?w=640&h=480&fit=crop",
    servings: 3,
    readyInMinutes: 15,
    sourceName: "Mock Provider",
    sourceUrl: "",
    dishTypes: ["main course"],
    cuisines: ["asian"],
  },
  {
    id: 1006,
    title: "Chocolate Chip Cookies",
    image: "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=640&h=480&fit=crop",
    servings: 24,
    readyInMinutes: 45,
    sourceName: "Mock Provider",
    sourceUrl: "",
    dishTypes: ["dessert"],
    cuisines: ["american"],
  },
  {
    id: 1007,
    title: "Greek Yogurt Parfait",
    image: "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=640&h=480&fit=crop",
    servings: 1,
    readyInMinutes: 5,
    sourceName: "Mock Provider",
    sourceUrl: "",
    dishTypes: ["breakfast"],
    cuisines: ["greek"],
  },
  {
    id: 1008,
    title: "Mushroom Risotto",
    image: "https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=640&h=480&fit=crop",
    servings: 4,
    readyInMinutes: 35,
    sourceName: "Mock Provider",
    sourceUrl: "",
    dishTypes: ["main course"],
    cuisines: ["italian"],
  },
  {
    id: 1009,
    title: "Salmon Teriyaki",
    image: "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=640&h=480&fit=crop",
    servings: 2,
    readyInMinutes: 20,
    sourceName: "Mock Provider",
    sourceUrl: "",
    dishTypes: ["main course"],
    cuisines: ["japanese"],
  },
  {
    id: 1010,
    title: "Avocado Toast",
    image: "https://images.unsplash.com/photo-1541519227354-08fa5d50c44d?w=640&h=480&fit=crop",
    servings: 1,
    readyInMinutes: 5,
    sourceName: "Mock Provider",
    sourceUrl: "",
    dishTypes: ["breakfast", "snack"],
    cuisines: ["american"],
  },
  {
    id: 1011,
    title: "Thai Green Curry",
    image: "https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=640&h=480&fit=crop",
    servings: 4,
    readyInMinutes: 30,
    sourceName: "Mock Provider",
    sourceUrl: "",
    dishTypes: ["main course"],
    cuisines: ["thai"],
  },
  {
    id: 1012,
    title: "Blueberry Pancakes",
    image: "https://images.unsplash.com/photo-1506084868230-bb9d95c24759?w=640&h=480&fit=crop",
    servings: 4,
    readyInMinutes: 20,
    sourceName: "Mock Provider",
    sourceUrl: "",
    dishTypes: ["breakfast"],
    cuisines: ["american"],
  },
];

export interface MockRecipeSearchParams {
  query?: string;
  type?: string;
  number?: number;
  page?: number;
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export async function mockRecipesSearch(params: MockRecipeSearchParams = {}): Promise<ExternalRecipe[]> {
  console.log('[MockRecipes] search', params);
  
  let filtered = [...MOCK_RECIPES];
  
  // Filter by query
  if (params.query) {
    const q = params.query.toLowerCase();
    filtered = filtered.filter(recipe => 
      recipe.title.toLowerCase().includes(q) ||
      recipe.cuisines?.some(c => c.toLowerCase().includes(q)) ||
      recipe.dishTypes?.some(d => d.toLowerCase().includes(q))
    );
  }
  
  // Filter by type/meal
  if (params.type && params.type !== 'all') {
    const t = params.type.toLowerCase();
    filtered = filtered.filter(recipe => 
      recipe.dishTypes?.some(d => d.toLowerCase().includes(t)) ||
      (t === 'breakfast' && recipe.dishTypes?.includes('breakfast')) ||
      (t === 'lunch' && recipe.dishTypes?.includes('main course')) ||
      (t === 'dinner' && recipe.dishTypes?.includes('main course')) ||
      (t === 'snacks' && recipe.dishTypes?.includes('snack'))
    );
  }
  
  // Shuffle for variety
  filtered = shuffleArray(filtered);
  
  // Limit results
  const limit = params.number || 12;
  const result = filtered.slice(0, limit);
  
  console.log('[MockRecipes] returning', result.length, 'recipes');
  return result;
}

export async function mockGetRecipe(recipeId: number | string): Promise<ExternalRecipe> {
  const recipe = MOCK_RECIPES.find(r => r.id === Number(recipeId));
  if (!recipe) throw new Error('Recipe not found');
  
  // Add mock ingredients and instructions for detail view
  return {
    ...recipe,
    ingredients: [
      { id: 1, original: "2 cups flour", name: "flour", amount: 2, unit: "cups" },
      { id: 2, original: "1 tsp salt", name: "salt", amount: 1, unit: "tsp" },
      { id: 3, original: "1 tbsp olive oil", name: "olive oil", amount: 1, unit: "tbsp" },
    ],
    analyzedInstructions: [
      {
        name: "",
        steps: [
          { number: 1, step: "Prepare all ingredients." },
          { number: 2, step: "Cook according to recipe instructions." },
          { number: 3, step: "Serve hot and enjoy!" },
        ]
      }
    ]
  };
}

export async function mockGetTrendingRecipes(): Promise<ExternalRecipe[]> {
  console.log('[MockRecipes] trending');
  return shuffleArray(MOCK_RECIPES).slice(0, 8);
}

export async function mockGetRandomRecipes(tags?: string[], number = 12): Promise<ExternalRecipe[]> {
  console.log('[MockRecipes] random', { tags, number });
  return shuffleArray(MOCK_RECIPES).slice(0, number);
}
