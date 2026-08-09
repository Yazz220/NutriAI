import AsyncStorage from '@react-native-async-storage/async-storage';
import { isRecipeTemplateId } from '@/constants/recipeTemplates';
import type { RecipeTemplateId } from '@/types/cookbook';

export const TEMPLATE_FAVORITES_KEY = 'nosh:favorite-page-templates:v1';

function normalizeFavoriteTemplateIds(value: unknown): RecipeTemplateId[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(isRecipeTemplateId)
    .filter((id, index, all) => all.indexOf(id) === index);
}

export async function loadFavoriteRecipeTemplateIds(): Promise<RecipeTemplateId[]> {
  const raw = await AsyncStorage.getItem(TEMPLATE_FAVORITES_KEY);
  if (!raw) return [];
  try {
    return normalizeFavoriteTemplateIds(JSON.parse(raw));
  } catch {
    await AsyncStorage.removeItem(TEMPLATE_FAVORITES_KEY);
    return [];
  }
}

export async function saveFavoriteRecipeTemplateIds(ids: readonly RecipeTemplateId[]): Promise<void> {
  await AsyncStorage.setItem(TEMPLATE_FAVORITES_KEY, JSON.stringify(normalizeFavoriteTemplateIds([...ids])));
}
