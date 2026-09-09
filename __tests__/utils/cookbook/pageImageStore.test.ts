import * as FileSystem from 'expo-file-system/legacy';
import { downloadPageImageFile, findPageImageFile } from '@/utils/cookbook/pageImageStore';

const mockDownload = jest.fn();
const mockCancel = jest.fn().mockResolvedValue(undefined);
jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///documents/',
  getInfoAsync: jest.fn(),
  makeDirectoryAsync: jest.fn().mockResolvedValue(undefined),
  readDirectoryAsync: jest.fn().mockResolvedValue([]),
  readAsStringAsync: jest.fn().mockResolvedValue(''),
  moveAsync: jest.fn().mockResolvedValue(undefined),
  deleteAsync: jest.fn().mockResolvedValue(undefined),
  createDownloadResumable: jest.fn(() => ({ downloadAsync: mockDownload, cancelAsync: mockCancel })),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockDownload.mockResolvedValue({ status: 200, headers: { 'Content-Type': 'image/png', 'Content-Length': '100' } });
  jest
    .mocked(FileSystem.getInfoAsync)
    .mockResolvedValue({ exists: true, isDirectory: false, uri: 'file:///test', size: 100, modificationTime: 1 });
});

it('downloads to a temporary file and publishes once validated', async () => {
  const result = await downloadPageImageFile('user-a', 'original:page.png', 'https://signed', () => {});
  expect(result).toEqual({ uri: expect.stringMatching(/original~3Apage\.png$/), bytes: 100 });
  expect(FileSystem.moveAsync).toHaveBeenCalledWith({ from: expect.stringMatching(/\.part$/), to: result.uri });
  expect(FileSystem.deleteAsync).toHaveBeenCalledWith(expect.stringMatching(/\.part$/), { idempotent: true });
});

it.each([403, 429, 500, 206])('never publishes an HTTP %s response', async (status) => {
  mockDownload.mockResolvedValue({ status, headers: {} });
  await expect(downloadPageImageFile('user-a', 'page.png', 'https://signed', () => {})).rejects.toMatchObject({
    status,
  });
  expect(FileSystem.moveAsync).not.toHaveBeenCalled();
  expect(FileSystem.deleteAsync).toHaveBeenCalled();
});

it('rejects truncated content and JSON errors returned with HTTP 200', async () => {
  mockDownload.mockResolvedValueOnce({ status: 200, headers: { 'Content-Length': '101' } });
  await expect(downloadPageImageFile('user-a', 'page.png', 'https://signed', () => {})).rejects.toThrow('incomplete');
  mockDownload.mockResolvedValueOnce({ status: 200, headers: { 'Content-Type': 'application/json' } });
  await expect(downloadPageImageFile('user-a', 'page.png', 'https://signed', () => {})).rejects.toThrow('incomplete');
  expect(FileSystem.moveAsync).not.toHaveBeenCalled();
});

it('does not treat an empty or missing local file as a cache hit', async () => {
  jest
    .mocked(FileSystem.getInfoAsync)
    .mockResolvedValueOnce({ exists: false, isDirectory: false, uri: 'file:///missing' });
  expect(await findPageImageFile('user-a', 'page.png')).toBeNull();
  jest
    .mocked(FileSystem.getInfoAsync)
    .mockResolvedValueOnce({ exists: true, isDirectory: false, size: 0, uri: 'file:///empty', modificationTime: 1 });
  expect(await findPageImageFile('user-a', 'page.png')).toBeNull();
});

it('cleans up if the user changes before publication', async () => {
  const guard = jest
    .fn()
    .mockImplementationOnce(() => {})
    .mockImplementation(() => {
      throw new Error('session changed');
    });
  await expect(downloadPageImageFile('user-a', 'page.png', 'https://signed', guard)).rejects.toThrow('session changed');
  expect(FileSystem.moveAsync).not.toHaveBeenCalled();
  expect(FileSystem.deleteAsync).toHaveBeenCalled();
});
