import { Image, type ImageSourcePropType } from 'react-native';
import type { CookbookPage } from '@/types/cookbook';

/**
 * Resolves a cookbook page image to a form usable by both RN `Image` and
 * Skia's `useImage` (a require'd asset number or a URI string).
 */
export function getCookbookPageImageSource(
  page: Pick<CookbookPage, 'imageAsset' | 'imageUrl' | 'pageImage'> | null | undefined,
): number | string | null {
  if (!page) return null;
  if (page.pageImage?.imageUrl) return page.pageImage.imageUrl;
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

/** Resolves generated and bundled page images into a URI that can be shared. */
export function getCookbookPageImageUri(
  page: Pick<CookbookPage, 'imageAsset' | 'imageUrl' | 'pageImage'> | null | undefined,
): string | null {
  const source = getCookbookPageImageSource(page);
  if (typeof source === 'string') return source;
  if (source === null) return null;
  return Image.resolveAssetSource(source)?.uri ?? null;
}

/**
 * Resolve the full-page texture used by the curl renderer. Complete generated
 * pages can go straight to the renderer. Only retired split-art pages need a
 * captured compatibility texture.
 */
export function getCookbookPageTurnImageSource(
  page: CookbookPage | null | undefined,
  capturedTextureUri?: string,
): number | string | null {
  if (page?.pageImage?.imageUrl) return page.pageImage.imageUrl;
  if (page?.recipeGraph) return capturedTextureUri ?? null;
  return getCookbookPageImageSource(page);
}
