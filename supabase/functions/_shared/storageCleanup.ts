export interface StorageEntry {
  id: string | null;
  name: string;
  metadata?: Record<string, unknown> | null;
}

interface StorageErrorLike {
  message?: string;
  status?: number;
  statusCode?: number | string;
}

interface StorageBucketApi {
  list(
    path: string,
    options: { limit: number; offset: number; sortBy: { column: string; order: 'asc' } },
  ): Promise<{ data: StorageEntry[] | null; error: StorageErrorLike | null }>;
  remove(paths: string[]): Promise<{ error: StorageErrorLike | null }>;
}

export interface StorageClientLike {
  from(bucket: string): StorageBucketApi;
}

const LIST_PAGE_SIZE = 1000;
const REMOVE_BATCH_SIZE = 100;

function isMissingBucket(error: StorageErrorLike): boolean {
  const status = Number(error.status ?? error.statusCode);
  return status === 404 || /bucket\s+not\s+found/i.test(error.message ?? '');
}

function normalizePrefix(prefix: string): string {
  const normalized = prefix.replace(/^\/+|\/+$/g, '');
  if (!normalized || normalized.split('/').includes('..')) {
    throw new Error('A non-empty, scoped storage prefix is required');
  }
  return normalized;
}

async function listFiles(
  bucket: StorageBucketApi,
  prefix: string,
): Promise<string[]> {
  const files: string[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await bucket.list(prefix, {
      limit: LIST_PAGE_SIZE,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    });
    if (error) throw error;

    const entries = data ?? [];
    for (const entry of entries) {
      const path = `${prefix}/${entry.name}`;
      if (entry.id === null) {
        files.push(...await listFiles(bucket, path));
      } else {
        files.push(path);
      }
    }

    if (entries.length < LIST_PAGE_SIZE) break;
    offset += LIST_PAGE_SIZE;
  }

  return files;
}

export async function removeStoragePrefix(
  storage: StorageClientLike,
  bucketName: string,
  rawPrefix: string,
): Promise<number> {
  const prefix = normalizePrefix(rawPrefix);
  const bucket = storage.from(bucketName);

  let files: string[];
  try {
    files = await listFiles(bucket, prefix);
  } catch (error) {
    if (isMissingBucket(error as StorageErrorLike)) return 0;
    throw error;
  }

  for (let index = 0; index < files.length; index += REMOVE_BATCH_SIZE) {
    const { error } = await bucket.remove(files.slice(index, index + REMOVE_BATCH_SIZE));
    if (error) throw error;
  }

  return files.length;
}
