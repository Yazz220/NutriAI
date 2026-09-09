import * as FileSystem from 'expo-file-system/legacy';

export class PageImageDownloadError extends Error {
  constructor(
    public readonly status: number,
    public readonly reason = '',
  ) {
    super(`Could not download the cookbook page (${status}).`);
  }
}

function userDirectory(userId: string): string {
  if (!FileSystem.documentDirectory) throw new Error('Local cookbook storage is unavailable.');
  const project = fileSegment(process.env.EXPO_PUBLIC_SUPABASE_URL ?? '');
  return `${FileSystem.documentDirectory}folio-page-images-v1/project-${project}/user-${fileSegment(userId)}/`;
}

// Avoid percent-encoded slashes: native file URL parsers decode them to directories.
function fileSegment(value: string): string {
  return encodeURIComponent(value).replace(/~/g, '%7E').replace(/%/g, '~');
}

function fileUri(userId: string, key: string): string {
  return `${userDirectory(userId)}${fileSegment(key)}`;
}

const directorySetups = new Map<string, Promise<void>>();
async function prepareDirectory(userId: string): Promise<void> {
  const existing = directorySetups.get(userId);
  if (existing) return existing;
  const setup = (async () => {
    const directory = userDirectory(userId);
    await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
    const files = await FileSystem.readDirectoryAsync(directory);
    // Only first use in this process: no current writer can own these crash leftovers.
    await Promise.all(
      files
        .filter((name) => name.endsWith('.part'))
        .map((name) => FileSystem.deleteAsync(`${directory}${name}`, { idempotent: true })),
    );
  })();
  directorySetups.set(userId, setup);
  try {
    await setup;
  } catch (error) {
    directorySetups.delete(userId);
    throw error;
  }
}

export async function findPageImageFile(userId: string, key: string): Promise<string | null> {
  const uri = fileUri(userId, key);
  const info = await FileSystem.getInfoAsync(uri);
  return info.exists && !info.isDirectory && info.size > 0 ? uri : null;
}

/** Never publish a partial download or an HTTP error body as a readable file. */
export async function downloadPageImageFile(
  userId: string,
  key: string,
  url: string,
  assertActive: () => void,
): Promise<{ uri: string; bytes: number }> {
  const destination = fileUri(userId, key);
  const temporary = `${destination}.${Date.now()}-${Math.random().toString(36).slice(2)}.part`;
  await prepareDirectory(userId);
  const download = FileSystem.createDownloadResumable(url, temporary, {
    headers: { Accept: 'image/webp,image/png,image/jpeg' },
  });
  const timer = setTimeout(() => {
    void download.cancelAsync().catch(() => undefined);
  }, 30_000);
  try {
    assertActive();
    const result = await download.downloadAsync();
    if (!result) throw new Error('The cookbook page download was interrupted. Try again.');
    if (result.status !== 200) {
      const info = await FileSystem.getInfoAsync(temporary);
      const reason =
        info.exists && !info.isDirectory && info.size <= 4096
          ? await FileSystem.readAsStringAsync(temporary).catch(() => '')
          : '';
      throw new PageImageDownloadError(result.status, reason);
    }
    const info = await FileSystem.getInfoAsync(temporary);
    const contentType = Object.entries(result.headers ?? []).find(
      ([name]) => name.toLowerCase() === 'content-type',
    )?.[1];
    const contentLength = Object.entries(result.headers ?? []).find(
      ([name]) => name.toLowerCase() === 'content-length',
    )?.[1];
    if (
      !info.exists ||
      info.isDirectory ||
      info.size === 0 ||
      (contentType && !contentType.startsWith('image/')) ||
      (contentLength && Number(contentLength) !== info.size)
    ) {
      throw new Error('The cookbook page download was incomplete. Try again.');
    }
    assertActive();
    await FileSystem.moveAsync({ from: temporary, to: destination });
    try {
      assertActive();
    } catch (error) {
      await FileSystem.deleteAsync(destination, { idempotent: true });
      throw error;
    }
    return { uri: destination, bytes: info.size };
  } finally {
    clearTimeout(timer);
    await FileSystem.deleteAsync(temporary, { idempotent: true });
  }
}

export async function removePageImageFile(userId: string, key: string): Promise<void> {
  await FileSystem.deleteAsync(fileUri(userId, key), { idempotent: true });
}

export async function clearPageImageFiles(userId: string): Promise<void> {
  await FileSystem.deleteAsync(userDirectory(userId), { idempotent: true });
  directorySetups.delete(userId);
}
