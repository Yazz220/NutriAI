export interface GenerationFailureResources {
  storagePath?: string;
  versionId?: string;
  pageId?: string;
  recipeId?: string;
}

export interface GenerationFailureHandlers {
  recordFailure: (message: string) => Promise<boolean | null>;
  recoverCompleted: () => Promise<boolean>;
  removeStorage: (storagePath?: string) => Promise<void>;
  removeVersion: (versionId?: string) => Promise<void>;
  removeCreatedRows: (pageId?: string, recipeId?: string) => Promise<void>;
}

export type GenerationFailureResolution = 'failed' | 'ready' | 'unknown';

export async function compensateGenerationFailure(
  message: string,
  resources: GenerationFailureResources,
  handlers: GenerationFailureHandlers,
): Promise<GenerationFailureResolution> {
  const failureRecorded = await handlers.recordFailure(message);

  if (failureRecorded === false) {
    return (await handlers.recoverCompleted()) ? 'ready' : 'unknown';
  }

  if (failureRecorded !== true) return 'unknown';

  await handlers.removeStorage(resources.storagePath);
  await handlers.removeVersion(resources.versionId);
  await handlers.removeCreatedRows(resources.pageId, resources.recipeId);
  return 'failed';
}
