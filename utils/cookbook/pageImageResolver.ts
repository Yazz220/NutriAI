import type { CookbookPage } from '@/types/cookbook';
import { getCookbookPageImageUri } from '@/utils/cookbook/pageImage';
import { getCookbookPageStoragePath } from '@/utils/cookbook/pageImageDelivery';
import { resolveStoredPageImage } from '@/utils/cookbook/localPageImages';
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
  if (path) return resolveStoredPageImage(path, variant);
  return getCookbookPageImageUri(page);
}

/** Provider references must be remotely accessible; never send a device file URI. */
export async function resolveCookbookPageRemoteImageUri(
  page: Pick<CookbookPage, 'imageAsset' | 'imageUrl' | 'pageImage' | 'artAsset'>,
): Promise<string | null> {
  const path = getCookbookPageStoragePath(page);
  return path ? getSignedCookbookPageImageUrl(path, 'full') : getCookbookPageImageUri(page);
}
