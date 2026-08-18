import type { ImageSourcePropType } from 'react-native';
import type { CookbookPage } from '@/types/cookbook';

/**
 * Resolves a cookbook page image to a form usable by both RN `Image` and
 * Skia's `useImage` (a require'd asset number or a URI string).
 */
export function getCookbookPageImageSource(
  page: Pick<CookbookPage, 'imageAsset' | 'imageUrl'> | null | undefined,
): number | string | null {
  if (!page) return null;
  const asset: ImageSourcePropType | undefined = page.imageAsset;
  if (typeof asset === 'number') return asset;
  if (Array.isArray(asset)) {
    const first = asset[0] as { uri?: string } | number | undefined;
    if (typeof first === 'number') return first;
    if (first && typeof first.uri === 'string') return first.uri;
  } else if (asset && typeof asset === 'object' && typeof (asset as { uri?: string }).uri === 'string') {
    return (asset as { uri: string }).uri;
  }
  return page.imageUrl ?? null;
}
