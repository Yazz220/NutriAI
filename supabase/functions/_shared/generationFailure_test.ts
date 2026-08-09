import {
  compensateGenerationFailure,
  type GenerationFailureHandlers,
} from './generationFailure.ts';

function assertEquals(actual: unknown, expected: unknown): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`);
  }
}

function handlersFor(events: string[], failureRecorded = true): GenerationFailureHandlers {
  return {
    recordFailure: async (message) => {
      events.push(`fail:${message}`);
      return failureRecorded;
    },
    recoverCompleted: async () => {
      events.push('recover');
      return failureRecorded === false;
    },
    removeStorage: async (path) => { if (path) events.push(`storage:${path}`); },
    removeVersion: async (id) => { if (id) events.push(`version:${id}`); },
    removeCreatedRows: async (pageId, recipeId) => {
      if (pageId) events.push(`page:${pageId}`);
      if (recipeId) events.push(`recipe:${recipeId}`);
    },
  };
}

Deno.test('provider failure refunds and removes the newly created recipe page', async () => {
  const events: string[] = [];
  const result = await compensateGenerationFailure(
    'OpenAI image generation timed out.',
    { pageId: 'page-1', recipeId: 'recipe-1' },
    handlersFor(events),
  );

  assertEquals(result, 'failed');
  assertEquals(events, [
    'fail:OpenAI image generation timed out.',
    'page:page-1',
    'recipe:recipe-1',
  ]);
});

Deno.test('storage upload failure removes a possible partial object and created rows', async () => {
  const events: string[] = [];
  const result = await compensateGenerationFailure(
    'Storage upload failed.',
    { storagePath: 'user/book/partial.png', pageId: 'page-1', recipeId: 'recipe-1' },
    handlersFor(events),
  );

  assertEquals(result, 'failed');
  assertEquals(events, [
    'fail:Storage upload failed.',
    'storage:user/book/partial.png',
    'page:page-1',
    'recipe:recipe-1',
  ]);
});

Deno.test('version-write failure removes the uploaded object and page rows', async () => {
  const events: string[] = [];
  const result = await compensateGenerationFailure(
    'Version insert failed.',
    { storagePath: 'user/book/page.png', pageId: 'page-1', recipeId: 'recipe-1' },
    handlersFor(events),
  );

  assertEquals(result, 'failed');
  assertEquals(events, [
    'fail:Version insert failed.',
    'storage:user/book/page.png',
    'page:page-1',
    'recipe:recipe-1',
  ]);
});

Deno.test('completion failure removes every generated resource after the refund is recorded', async () => {
  const events: string[] = [];
  const result = await compensateGenerationFailure(
    'Completion write failed.',
    {
      storagePath: 'user/book/page.png',
      versionId: 'version-1',
      pageId: 'page-1',
      recipeId: 'recipe-1',
    },
    handlersFor(events),
  );

  assertEquals(result, 'failed');
  assertEquals(events, [
    'fail:Completion write failed.',
    'storage:user/book/page.png',
    'version:version-1',
    'page:page-1',
    'recipe:recipe-1',
  ]);
});

Deno.test('an ambiguous completion preserves resources when the request is already ready', async () => {
  const events: string[] = [];
  const result = await compensateGenerationFailure(
    'Completion response was lost.',
    { storagePath: 'user/book/page.png', versionId: 'version-1', pageId: 'page-1', recipeId: 'recipe-1' },
    handlersFor(events, false),
  );

  assertEquals(result, 'ready');
  assertEquals(events, ['fail:Completion response was lost.', 'recover']);
});

Deno.test('duplicate failure delivery refunds and cleans generated resources once', async () => {
  const events: string[] = [];
  let failureRecorded = false;
  const handlers: GenerationFailureHandlers = {
    recordFailure: async () => {
      events.push('fail');
      if (failureRecorded) return false;
      failureRecorded = true;
      return true;
    },
    recoverCompleted: async () => {
      events.push('recover');
      return false;
    },
    removeStorage: async () => { events.push('storage'); },
    removeVersion: async () => { events.push('version'); },
    removeCreatedRows: async () => { events.push('rows'); },
  };
  const resources = {
    storagePath: 'user/book/page.png',
    versionId: 'version-1',
    pageId: 'page-1',
    recipeId: 'recipe-1',
  };

  const first = await compensateGenerationFailure('Generation failed.', resources, handlers);
  const duplicate = await compensateGenerationFailure('Generation failed.', resources, handlers);

  assertEquals([first, duplicate], ['failed', 'unknown']);
  assertEquals(events, ['fail', 'storage', 'version', 'rows', 'fail', 'recover']);
});
