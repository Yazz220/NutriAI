import { Platform, Share } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import type { CookbookPage } from '@/types/cookbook';
import { getCookbookPageImageUri } from '@/utils/cookbook/pageImage';

export async function shareCookbookPage(page: CookbookPage): Promise<void> {
  const imageUrl = getCookbookPageImageUri(page);
  if (!imageUrl) {
    throw new Error('This page does not have an image to share yet.');
  }

  await Share.share({
    title: page.title,
    message: `${page.title}\n${imageUrl}`,
    url: imageUrl,
  });
}

export async function exportCookbookPageImage(page: CookbookPage): Promise<void> {
  const imageUrl = getCookbookPageImageUri(page);
  if (!imageUrl) throw new Error('This page does not have an image to export yet.');

  if (Platform.OS === 'web') {
    await Share.share({ title: page.title, message: imageUrl, url: imageUrl });
    return;
  }

  const exportUrl = imageUrl.startsWith('http://') || imageUrl.startsWith('https://')
    ? await downloadPageImage(page, imageUrl)
    : imageUrl;

  await Share.share({
    title: page.title,
    message: page.title,
    url: exportUrl,
  });
}

async function downloadPageImage(page: CookbookPage, imageUrl: string): Promise<string> {
  if (!FileSystem.cacheDirectory) throw new Error('A temporary export folder is unavailable.');
  const extension = getImageExtension(imageUrl);
  const safeTitle = page.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'recipe';
  const destination = `${FileSystem.cacheDirectory}folio-${safeTitle}-${page.id}.${extension}`;
  const result = await FileSystem.downloadAsync(imageUrl, destination);
  return result.uri;
}

function getImageExtension(imageUrl: string): string {
  const match = imageUrl.split('?')[0].match(/\.([a-zA-Z0-9]{2,5})$/);
  return match?.[1]?.toLowerCase() ?? 'png';
}
