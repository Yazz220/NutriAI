import { Alert } from 'react-native';

const API_URL = 'https://world.openfoodfacts.org/cgi/search.pl';

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

  const params = new URLSearchParams({
    search_terms: query,
    search_simple: '1',
    action: 'process',
    json: '1',
    page_size: '50', // Increased for more results
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
          };
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
