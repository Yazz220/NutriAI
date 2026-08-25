import * as Linking from 'expo-linking';
import type { CookbookPage } from '@/types/cookbook';

export function getRecipeSourceUrl(page: CookbookPage): string | null {
  const candidate = page.recipeGraph?.provenance.sourceUrl ?? page.recipe?.sourceUrl;
  if (!candidate) return null;

  try {
    const url = new URL(candidate);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

export async function openRecipeSource(page: CookbookPage): Promise<void> {
  const sourceUrl = getRecipeSourceUrl(page);
  if (!sourceUrl) throw new Error('This recipe does not have an original source link.');
  await Linking.openURL(sourceUrl);
}
