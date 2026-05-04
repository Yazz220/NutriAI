import { Share } from 'react-native';
import type { CookbookPage } from '@/types/cookbook';

export async function shareCookbookPage(page: CookbookPage): Promise<void> {
  if (!page.imageUrl) {
    throw new Error('This page does not have an image to share yet.');
  }

  await Share.share({
    title: page.title,
    message: `${page.title}\n${page.imageUrl}`,
    url: page.imageUrl,
  });
}
