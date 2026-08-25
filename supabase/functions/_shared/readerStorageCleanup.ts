import { removeStoragePaths, type StorageClientLike } from './storageCleanup.ts';

export interface ReaderStorageCleanupJob {
  id: string;
  bucket: string;
  object_path: string;
}

export interface ReaderStorageCleanupAttempt {
  removedJobIds: string[];
  failures: Array<{ bucket: string; jobIds: string[]; message: string }>;
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String(error.message);
  }
  return String(error);
}

export async function removeQueuedReaderStorageObjects(
  storage: StorageClientLike,
  jobs: ReaderStorageCleanupJob[],
): Promise<ReaderStorageCleanupAttempt> {
  const jobsByBucket = new Map<string, ReaderStorageCleanupJob[]>();
  for (const job of jobs) {
    const bucketJobs = jobsByBucket.get(job.bucket) ?? [];
    bucketJobs.push(job);
    jobsByBucket.set(job.bucket, bucketJobs);
  }

  const removedJobIds: string[] = [];
  const failures: ReaderStorageCleanupAttempt['failures'] = [];

  for (const [bucket, bucketJobs] of jobsByBucket) {
    try {
      await removeStoragePaths(
        storage,
        bucket,
        bucketJobs.map((job) => job.object_path),
      );
      removedJobIds.push(...bucketJobs.map((job) => job.id));
    } catch (error) {
      failures.push({
        bucket,
        jobIds: bucketJobs.map((job) => job.id),
        message: errorMessage(error),
      });
    }
  }

  return { removedJobIds, failures };
}
