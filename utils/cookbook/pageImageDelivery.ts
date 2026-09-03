import type { CookbookPage } from '@/types/cookbook';
import { getCookbookPageImageSource } from '@/utils/cookbook/pageImage';
import type { CookbookPageImageVariant } from '@/utils/cookbook/privatePageUrls';

export function getCookbookPageStoragePath(
  page: Pick<CookbookPage, 'pageImage' | 'artAsset'> | null | undefined,
): string | null {
  return page?.pageImage?.storagePath ?? page?.artAsset?.storagePath ?? null;
}

export function getCookbookPageImageCacheKey(
  page: Pick<CookbookPage, 'pageImage' | 'artAsset'>,
  variant: CookbookPageImageVariant,
): string | null {
  const path = getCookbookPageStoragePath(page);
  return path ? `folio-page:${variant}:${path}` : null;
}

export function hasCookbookPageImage(
  page: Pick<CookbookPage, 'imageAsset' | 'imageUrl' | 'pageImage' | 'artAsset'> | null | undefined,
): boolean {
  return Boolean(getCookbookPageStoragePath(page) || getCookbookPageImageSource(page));
}

/** True only when the stored asset is itself the complete reading page. */
export function hasCompleteCookbookPageImage(
  page: Pick<CookbookPage, 'imageAsset' | 'imageUrl' | 'pageImage' | 'recipeGraph'>,
): boolean {
  return Boolean(
    page.pageImage?.storagePath
      || page.pageImage?.imageUrl
      || page.imageAsset
      || (!page.recipeGraph && page.imageUrl),
  );
}

export function selectReaderImageWindow(
  pages: CookbookPage[],
  activePageId: string | null | undefined,
  radius = 2,
): CookbookPage[] {
  if (pages.length === 0 || !activePageId) return [];
  const activeIndex = pages.findIndex((page) => page.id === activePageId);
  if (activeIndex < 0) return [];
  return pages.slice(
    Math.max(0, activeIndex - radius),
    Math.min(pages.length, activeIndex + radius + 1),
  );
}

export function applyCookbookPageImageUrl(page: CookbookPage, url?: string): CookbookPage {
  const hasStoredAsset = Boolean(getCookbookPageStoragePath(page));
  if (!hasStoredAsset) return page;

  // AsyncStorage may contain a URL from an older app session. Never hand that
  // expired credential to an eager image/texture loader while a fresh URL is
  // resolving.
  if (!url) {
    return {
      ...page,
      imageUrl: undefined,
      pageImage: page.pageImage ? { ...page.pageImage, imageUrl: undefined } : page.pageImage,
      artAsset: page.artAsset ? { ...page.artAsset, artUrl: undefined } : page.artAsset,
    };
  }
  return {
    ...page,
    imageUrl: url,
    pageImage: page.pageImage ? { ...page.pageImage, imageUrl: url } : page.pageImage,
    artAsset: page.artAsset ? { ...page.artAsset, artUrl: url } : page.artAsset,
  };
}
