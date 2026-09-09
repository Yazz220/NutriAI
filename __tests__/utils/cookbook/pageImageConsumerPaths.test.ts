import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { exportCookbookPdf } from '@/utils/cookbook/cookbookExport';
import { shareCookbookPage } from '@/utils/cookbook/share';
import { resolveCookbookPageRemoteImageUri } from '@/utils/cookbook/pageImageResolver';
import { resolveStoredPageImage } from '@/utils/cookbook/localPageImages';
import { getSignedCookbookPageImageUrl } from '@/utils/cookbook/privatePageUrls';
import { SAMPLE_COOKBOOK, SAMPLE_COOKBOOK_PAGES } from '@/utils/cookbook/sampleCookbook';
import type { CookbookPage } from '@/types/cookbook';

jest.mock('@/utils/cookbook/localPageImages', () => ({
  resolveStoredPageImage: jest.fn(async () => 'file:///documents/page.png'),
}));
jest.mock('@/utils/cookbook/privatePageUrls', () => ({
  getSignedCookbookPageImageUrl: jest.fn(async () => 'https://storage/remote-reference.png?token=secret'),
}));
jest.mock('expo-file-system/legacy', () => ({
  cacheDirectory: 'file:///cache/',
  EncodingType: { Base64: 'base64' },
  downloadAsync: jest.fn(),
  readAsStringAsync: jest.fn(async () => 'PNG_BYTES'),
  deleteAsync: jest.fn(async () => {}),
  moveAsync: jest.fn(async () => {}),
}));
jest.mock('expo-print', () => ({ printToFileAsync: jest.fn(async () => ({ uri: 'file:///cache/generated.pdf' })) }));
jest.mock('expo-sharing', () => ({ isAvailableAsync: jest.fn(async () => true), shareAsync: jest.fn() }));

const page: CookbookPage = {
  ...SAMPLE_COOKBOOK_PAGES[0],
  pageImage: {
    id: 'version',
    pageId: 'page',
    storagePath: 'user/book/immutable.png',
    styleId: 'editorial',
    styleRevision: 1,
    generationPrompt: '',
    model: 'test',
    status: 'ready',
    creditCost: 0,
    createdAt: '',
  },
};

beforeEach(() => jest.clearAllMocks());

it('shares and exports the same original without downloading or deleting its local bytes', async () => {
  await shareCookbookPage(page);
  expect(Sharing.shareAsync).toHaveBeenCalledWith('file:///documents/page.png', expect.any(Object));
  await exportCookbookPdf(SAMPLE_COOKBOOK, [page]);
  expect(FileSystem.readAsStringAsync).toHaveBeenCalledWith('file:///documents/page.png', { encoding: 'base64' });
  expect(FileSystem.downloadAsync).not.toHaveBeenCalled();
  expect(FileSystem.deleteAsync).not.toHaveBeenCalledWith('file:///documents/page.png', expect.anything());
  expect(getSignedCookbookPageImageUrl).not.toHaveBeenCalled();
});

it('provides a remotely usable redesign reference without fetching bytes to the device', async () => {
  expect(await resolveCookbookPageRemoteImageUri(page)).toBe('https://storage/remote-reference.png?token=secret');
  expect(resolveStoredPageImage).not.toHaveBeenCalled();
  expect(FileSystem.downloadAsync).not.toHaveBeenCalled();
});
