import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import type { Cookbook, CookbookPage } from '@/types/cookbook';
import { COOKBOOK_GEOMETRY } from '@/constants/cookbookGeometry';
import { getCookbookPageImageUri } from '@/utils/cookbook/pageImage';

const PDF_POINTS_PER_INCH = 72;
const PDF_WIDTH = COOKBOOK_GEOMETRY.print.widthInches * PDF_POINTS_PER_INCH;
const PDF_HEIGHT = COOKBOOK_GEOMETRY.print.heightInches * PDF_POINTS_PER_INCH;

interface PdfRecipePage {
  title: string;
  imageDataUri: string;
}

export async function exportCookbookPdf(
  cookbook: Cookbook,
  pages: CookbookPage[],
): Promise<void> {
  const orderedPages = [...pages].sort((a, b) => a.sortOrder - b.sortOrder || a.pageNumber - b.pageNumber);
  if (orderedPages.length === 0) throw new Error('Add a recipe before exporting this cookbook.');

  const missingPage = orderedPages.find((page) => !getCookbookPageImageUri(page));
  if (missingPage) throw new Error(`${missingPage.title} is not ready to export yet.`);

  const pdfPages: PdfRecipePage[] = [];
  for (const page of orderedPages) {
    const imageUrl = getCookbookPageImageUri(page);
    if (!imageUrl) continue;
    pdfPages.push({
      title: page.title,
      imageDataUri: Platform.OS === 'web' ? imageUrl : await imageToDataUri(imageUrl, page.id),
    });
  }

  const html = buildCookbookPdfHtml(cookbook.title, pdfPages);
  const Print = await loadPrintModule();
  if (Platform.OS === 'web') {
    await Print.printAsync({ html });
    return;
  }

  const result = await Print.printToFileAsync({
    html,
    width: PDF_WIDTH,
    height: PDF_HEIGHT,
    margins: { top: 0, right: 0, bottom: 0, left: 0 },
  });
  const namedUri = await namePdfFile(result.uri, cookbook.title);
  const Sharing = await loadSharingModule();
  if (!await Sharing.isAvailableAsync()) throw new Error('File sharing is unavailable on this device.');
  await Sharing.shareAsync(namedUri, {
    mimeType: 'application/pdf',
    UTI: 'com.adobe.pdf',
    dialogTitle: `Export ${cookbook.title}`,
  });
}

async function loadPrintModule(): Promise<typeof import('expo-print')> {
  try {
    return require('expo-print') as typeof import('expo-print');
  } catch {
    throw new Error('Cookbook export needs a newer Folio development build. Rebuild the app once, then try again.');
  }
}

async function loadSharingModule(): Promise<typeof import('expo-sharing')> {
  try {
    return require('expo-sharing') as typeof import('expo-sharing');
  } catch {
    throw new Error('Cookbook export needs a newer Folio development build. Rebuild the app once, then try again.');
  }
}

export function buildCookbookPdfHtml(
  cookbookTitle: string,
  pages: PdfRecipePage[],
): string {
  const safeTitle = escapeHtml(cookbookTitle);
  const recipeLabel = `${pages.length} ${pages.length === 1 ? 'recipe' : 'recipes'}`;
  const recipePages = pages.map((page) => `
    <section class="page recipe-page" aria-label="${escapeHtml(page.title)}">
      <img src="${escapeHtml(page.imageDataUri)}" alt="${escapeHtml(page.title)}" />
    </section>`).join('');

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      @page { size: ${COOKBOOK_GEOMETRY.print.widthInches}in ${COOKBOOK_GEOMETRY.print.heightInches}in; margin: 0; }
      * { box-sizing: border-box; }
      html, body { width: ${COOKBOOK_GEOMETRY.print.widthInches}in; margin: 0; padding: 0; background: #f5f1e8; }
      .page {
        position: relative;
        width: ${COOKBOOK_GEOMETRY.print.widthInches}in;
        height: ${COOKBOOK_GEOMETRY.print.heightInches}in;
        overflow: hidden;
        break-after: page;
        page-break-after: always;
      }
      .page:last-child { break-after: auto; page-break-after: auto; }
      .cover {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 72px;
        color: #26231f;
        background: #f5f1e8;
        text-align: center;
      }
      .mark {
        width: 42px;
        height: 2px;
        margin-bottom: 32px;
        background: #817663;
      }
      h1 {
        max-width: 468px;
        margin: 0;
        font-family: Georgia, 'Times New Roman', serif;
        font-size: 44px;
        font-weight: 600;
        line-height: 1.12;
      }
      .count {
        margin-top: 20px;
        color: #70685d;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        font-size: 13px;
      }
      .brand {
        position: absolute;
        bottom: 42px;
        color: #817663;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        font-size: 11px;
      }
      .recipe-page { position: relative; background: #ffffff; }
      .recipe-page img {
        position: absolute;
        inset: 0;
        display: block;
        width: 100%;
        height: 100%;
        max-width: none;
        max-height: none;
        object-fit: contain;
        object-position: center;
      }
    </style>
  </head>
  <body>
    <section class="page cover">
      <div class="mark"></div>
      <h1>${safeTitle}</h1>
      <div class="count">${recipeLabel}</div>
      <div class="brand">FOLIO</div>
    </section>${recipePages}
  </body>
</html>`;
}

async function imageToDataUri(imageUrl: string, pageId: string): Promise<string> {
  if (imageUrl.startsWith('data:image/')) return imageUrl;
  if (!FileSystem.cacheDirectory) throw new Error('A temporary export folder is unavailable.');

  const extension = getImageExtension(imageUrl);
  const localUri = imageUrl.startsWith('http://') || imageUrl.startsWith('https://')
    ? (await FileSystem.downloadAsync(
        imageUrl,
        `${FileSystem.cacheDirectory}nosh-pdf-page-${pageId}.${extension}`,
      )).uri
    : imageUrl;

  try {
    const base64 = await FileSystem.readAsStringAsync(localUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return `data:${getImageMimeType(extension)};base64,${base64}`;
  } finally {
    if (localUri !== imageUrl) await FileSystem.deleteAsync(localUri, { idempotent: true });
  }
}

async function namePdfFile(uri: string, title: string): Promise<string> {
  if (!FileSystem.cacheDirectory) return uri;
  const safeTitle = slugify(title) || 'cookbook';
  const destination = `${FileSystem.cacheDirectory}folio-${safeTitle}.pdf`;
  await FileSystem.deleteAsync(destination, { idempotent: true });
  await FileSystem.moveAsync({ from: uri, to: destination });
  return destination;
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function getImageExtension(imageUrl: string): string {
  const match = imageUrl.split('?')[0].match(/\.([a-zA-Z0-9]{2,5})$/);
  return match?.[1]?.toLowerCase() ?? 'png';
}

function getImageMimeType(extension: string): string {
  if (extension === 'jpg' || extension === 'jpeg') return 'image/jpeg';
  if (extension === 'webp') return 'image/webp';
  return 'image/png';
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
