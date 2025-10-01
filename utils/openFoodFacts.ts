import { Alert } from 'react-native';

const API_URL = 'https://world.openfoodfacts.org/cgi/search.pl';
const NUTRITION_PROXY_BASE = process.env.EXPO_PUBLIC_FOOD_NUTRITION_BASE;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export interface FoodSearchResult {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  brand?: string;
  servingSize: string;
  imageUrl?: string;
}

export const searchFoodDatabase = async (query: string): Promise<FoodSearchResult[]> => {
  if (!query.trim()) {
    return [];
  }

  // Prefer calling our Supabase Edge Function aggregator if configured
  if (NUTRITION_PROXY_BASE) {
    try {
      const u = new URL(NUTRITION_PROXY_BASE);
      u.searchParams.set('q', query.trim());
      const headers: Record<string, string> = {};
      if (SUPABASE_ANON_KEY) {
        headers['apikey'] = SUPABASE_ANON_KEY;
        headers['Authorization'] = `Bearer ${SUPABASE_ANON_KEY}`;
      }
      const res = await fetch(u.toString(), { headers });
      if (res.ok) {
        const data = await res.json();
        const items: any[] = Array.isArray(data?.alternatives) ? data.alternatives : [];
        const mapped: FoodSearchResult[] = items.map((it: any) => ({
          id: String(it.id || it.code || ''),
          name: String(it.name || 'Unknown Food'),
          calories: Number(it?.per100g?.calories ?? 0),
          protein: Number(it?.per100g?.protein ?? 0),
          carbs: Number(it?.per100g?.carbs ?? 0),
          fats: Number(it?.per100g?.fats ?? 0),
          brand: it.brand || 'Generic',
          servingSize: it.servingSize || '100g',
          imageUrl: it.imageUrl,
        })).filter((p) => p.id && p.name && p.calories > 0);
        if (mapped.length) return mapped;
      } else {
        const text = await res.text();
        console.warn('[nutrition-lookup] proxy error', res.status, text.slice(0, 200));
      }
    } catch (e) {
      console.warn('[nutrition-lookup] proxy call failed, falling back to OFF', e);
    }
  }

  // Fallback to direct OpenFoodFacts if proxy is unavailable
  const params = new URLSearchParams({
    search_terms: query,
    search_simple: '1',
    action: 'process',
    json: '1',
    page_size: '50',
    fields: 'code,product_name,brands,serving_size,nutriments,image_front_small_url',
  });

  try {
    const response = await fetch(`${API_URL}?${params.toString()}`);
    const data = await response.json();
    if (data.products && Array.isArray(data.products)) {
      return data.products
        .map((product: any) => {
          const nutriments = product.nutriments || {};
          return {
            id: product.code || product._id,
            name: product.product_name || 'Unknown Food',
            calories: nutriments['energy-kcal_100g'] || nutriments.energy_value || 0,
            protein: nutriments.proteins_100g || nutriments.proteins_value || 0,
            carbs: nutriments.carbohydrates_100g || nutriments.carbohydrates_value || 0,
            fats: nutriments.fat_100g || nutriments.fat_value || 0,
            brand: product.brands || 'Generic',
            servingSize: product.serving_size || '100g',
            imageUrl: product.image_front_small_url,
          } as FoodSearchResult;
        })
        .filter((p: FoodSearchResult) => p.id && p.name && p.calories > 0);
    }
    return [];
  } catch (error) {
    console.error('Failed to fetch from Open Food Facts API:', error);
    Alert.alert('API Error', 'Could not connect to the food database. Please try again later.');
    return [];
  }
};
