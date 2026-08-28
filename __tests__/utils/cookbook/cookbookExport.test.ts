import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { buildCookbookPdfHtml, exportCookbookPdf } from '@/utils/cookbook/cookbookExport';
import { SAMPLE_COOKBOOK, SAMPLE_COOKBOOK_PAGES } from '@/utils/cookbook/sampleCookbook';

jest.mock('expo-print', () => ({
  printAsync: jest.fn(),
  printToFileAsync: jest.fn(),
}));

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(),
  shareAsync: jest.fn(),
}));

jest.mock('expo-file-system/legacy', () => ({
  cacheDirectory: 'file:///cache/',
  EncodingType: { Base64: 'base64' },
  downloadAsync: jest.fn(),
  readAsStringAsync: jest.fn(),
  deleteAsync: jest.fn(),
  moveAsync: jest.fn(),
}));

const mockedPrintToFile = jest.mocked(Print.printToFileAsync);
const mockedShare = jest.mocked(Sharing.shareAsync);
const mockedFileSystem = jest.mocked(FileSystem);

beforeEach(() => {
  jest.clearAllMocks();
  mockedPrintToFile.mockResolvedValue({ uri: 'file:///cache/generated.pdf', numberOfPages: 3 });
  jest.mocked(Sharing.isAvailableAsync).mockResolvedValue(true);
  mockedFileSystem.downloadAsync
    .mockResolvedValueOnce({ uri: 'file:///cache/first.png', status: 200, headers: {}, mimeType: 'image/png' })
    .mockResolvedValueOnce({ uri: 'file:///cache/second.png', status: 200, headers: {}, mimeType: 'image/png' });
  mockedFileSystem.readAsStringAsync
    .mockResolvedValueOnce('FIRST_IMAGE')
    .mockResolvedValueOnce('SECOND_IMAGE');
  mockedFileSystem.deleteAsync.mockResolvedValue();
  mockedFileSystem.moveAsync.mockResolvedValue();
  mockedShare.mockResolvedValue();
});

describe('cookbook PDF export', () => {
  it('builds a minimal cover and one full-bleed PDF page per recipe', () => {
    const html = buildCookbookPdfHtml('Yaz & Family', [
      { title: 'Soup <Special>', imageDataUri: 'data:image/png;base64,SOUP' },
    ]);

    expect(html).toContain('<h1>Yaz &amp; Family</h1>');
    expect(html).toContain('1 recipe');
    expect(html).toContain('aria-label="Soup &lt;Special&gt;"');
    expect(html.match(/<section class="page/g)).toHaveLength(2);
    expect(html).toContain('@page { size: 8in 10in; margin: 0; }');
    expect(html).toContain('width: 8in;');
    expect(html).toContain('height: 10in;');
    expect(html).toContain('object-fit: contain;');
    expect(html).toContain('object-position: center;');
  });

  it('exports recipe pages in cookbook order and shares a named PDF', async () => {
    const first = {
      ...SAMPLE_COOKBOOK_PAGES[0],
      id: 'page-first',
      title: 'First recipe',
      sortOrder: 1,
      imageUrl: 'https://images.example.com/first.png',
    };
    const second = {
      ...SAMPLE_COOKBOOK_PAGES[1],
      id: 'page-second',
      title: 'Second recipe',
      sortOrder: 2,
      imageUrl: 'https://images.example.com/second.png',
    };

    await exportCookbookPdf({ ...SAMPLE_COOKBOOK, title: 'Weeknight Table' }, [second, first]);

    const html = mockedPrintToFile.mock.calls[0][0].html ?? '';
    expect(mockedPrintToFile).toHaveBeenCalledWith(expect.objectContaining({
      width: 576,
      height: 720,
      margins: { top: 0, right: 0, bottom: 0, left: 0 },
    }));
    expect(html.indexOf('FIRST_IMAGE')).toBeLessThan(html.indexOf('SECOND_IMAGE'));
    expect(mockedFileSystem.moveAsync).toHaveBeenCalledWith({
      from: 'file:///cache/generated.pdf',
      to: 'file:///cache/nosh-weeknight-table.pdf',
    });
    expect(mockedShare).toHaveBeenCalledWith('file:///cache/nosh-weeknight-table.pdf', expect.objectContaining({
      mimeType: 'application/pdf',
      UTI: 'com.adobe.pdf',
    }));
  });

  it('does not export a partial cookbook', async () => {
    await expect(exportCookbookPdf(SAMPLE_COOKBOOK, [SAMPLE_COOKBOOK_PAGES[0]]))
      .rejects.toThrow('is not ready to export yet');
    expect(mockedPrintToFile).not.toHaveBeenCalled();
  });
});
