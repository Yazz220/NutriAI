import {
  applyCookbookPageImageUrl,
  getCookbookPageImageCacheKey,
  getCookbookPageStoragePath,
  selectReaderImageWindow,
} from '@/utils/cookbook/pageImageDelivery';
import type { CookbookPage } from '@/types/cookbook';

function page(index: number): CookbookPage {
  return {
    id: `page-${index}`,
    cookbookId: 'book-1',
    recipeId: `recipe-${index}`,
    title: `Recipe ${index}`,
    section: 'dinner',
    pageNumber: index + 1,
    sortOrder: index,
    selectedVersionId: `version-${index}`,
    pageImage: {
      id: `version-${index}`,
      pageId: `page-${index}`,
      storagePath: `user-1/book-1/page-${index}.png`,
      styleId: 'editorial',
      styleRevision: 1,
      generationPrompt: '',
      model: 'test',
      status: 'ready',
      creditCost: 0,
      createdAt: '',
    },
  };
}

describe('cookbook page image delivery', () => {
  it('uses the immutable storage object as the cache identity instead of its signed URL', () => {
    const storedPage = page(2);
    storedPage.pageImage!.imageUrl = 'https://signed.example/page.png?token=changes';

    expect(getCookbookPageStoragePath(storedPage)).toBe('user-1/book-1/page-2.png');
    expect(getCookbookPageImageCacheKey(storedPage, 'thumbnail')).toBe(
      'folio-page:thumbnail:user-1/book-1/page-2.png',
    );
  });

  it('does not expose a persisted expired URL while a fresh credential resolves', () => {
    const storedPage = page(2);
    storedPage.imageUrl = 'https://signed.example/page.png?token=expired';
    storedPage.pageImage!.imageUrl = 'https://signed.example/page.png?token=expired';

    expect(applyCookbookPageImageUrl(storedPage, undefined)).toMatchObject({
      imageUrl: undefined,
      pageImage: { imageUrl: undefined },
    });
  });

  it('keeps reader delivery to the active page neighborhood', () => {
    const pages = Array.from({ length: 22 }, (_, index) => page(index));

    expect(selectReaderImageWindow(pages, 'page-10', 2).map((item) => item.id)).toEqual([
      'page-8',
      'page-9',
      'page-10',
      'page-11',
      'page-12',
    ]);
  });

  it('does not eagerly select the whole book at either boundary', () => {
    const pages = Array.from({ length: 22 }, (_, index) => page(index));

    expect(selectReaderImageWindow(pages, 'page-0', 2).map((item) => item.id)).toEqual([
      'page-0',
      'page-1',
      'page-2',
    ]);
    expect(selectReaderImageWindow(pages, 'page-21', 2).map((item) => item.id)).toEqual([
      'page-19',
      'page-20',
      'page-21',
    ]);
  });
});
