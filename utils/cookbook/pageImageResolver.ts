import type { CookbookPage } from '@/types/cookbook';
import { getCookbookPageImageUri } from '@/utils/cookbook/pageImage';
import { getCookbookPageStoragePath } from '@/utils/cookbook/pageImageDelivery';
import {
  getSignedCookbookPageImageUrl,
  type CookbookPageImageVariant,
} from '@/utils/cookbook/privatePageUrls';

/** Resolve a stored asset only for a visible surface or explicit user action. */
export async function resolveCookbookPageImageUri(
  page: Pick<CookbookPage, 'imageAsset' | 'imageUrl' | 'pageImage' | 'artAsset'>,
  variant: CookbookPageImageVariant = 'full',
): Promise<string | null> {
  const path = getCookbookPageStoragePath(page);
  if (path) return getSignedCookbookPageImageUrl(path, variant);
  return getCookbookPageImageUri(page);
}
