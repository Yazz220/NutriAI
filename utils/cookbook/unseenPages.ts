import AsyncStorage from '@react-native-async-storage/async-storage';

const UNSEEN_PAGES_PREFIX = 'nosh:unseen-cookbook-pages:v1';

interface CookbookPageSeenState {
  knownPageIds: string[];
  unseenPageIds: string[];
}

interface UnseenPagesState {
  version: 1;
  cookbooks: Record<string, CookbookPageSeenState>;
}

const updateQueues = new Map<string, Promise<void>>();

function storageKey(userId: string): string {
  return `${UNSEEN_PAGES_PREFIX}:${userId}`;
}

function emptyState(): UnseenPagesState {
  return { version: 1, cookbooks: {} };
}

async function loadState(userId: string): Promise<UnseenPagesState> {
  const key = storageKey(userId);
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return emptyState();

  try {
    const parsed = JSON.parse(raw) as Partial<UnseenPagesState>;
    if (parsed.version !== 1 || !parsed.cookbooks || typeof parsed.cookbooks !== 'object') {
      await AsyncStorage.removeItem(key);
      return emptyState();
    }
    return parsed as UnseenPagesState;
  } catch {
    await AsyncStorage.removeItem(key);
    return emptyState();
  }
}

function updateState(userId: string, update: (state: UnseenPagesState) => UnseenPagesState): Promise<UnseenPagesState> {
  const previous = updateQueues.get(userId) ?? Promise.resolve();
  const operation = previous
    .catch(() => undefined)
    .then(async () => {
      const next = update(await loadState(userId));
      await AsyncStorage.setItem(storageKey(userId), JSON.stringify(next));
      return next;
    });

  updateQueues.set(
    userId,
    operation.then(
      () => undefined,
      () => undefined,
    ),
  );
  return operation;
}

export async function observeReadyCookbookPages(
  userId: string,
  cookbookId: string,
  readyPageIds: string[],
): Promise<string[]> {
  const currentPageIds = [...new Set(readyPageIds.filter(Boolean))];
  const currentPageIdSet = new Set(currentPageIds);
  const next = await updateState(userId, (state) => {
    const book = state.cookbooks[cookbookId];
    if (!book) {
      return {
        ...state,
        cookbooks: {
          ...state.cookbooks,
          [cookbookId]: { knownPageIds: currentPageIds, unseenPageIds: [] },
        },
      };
    }

    const knownPageIds = new Set(book.knownPageIds);
    const unseenPageIds = new Set(book.unseenPageIds.filter((pageId) => currentPageIdSet.has(pageId)));
    currentPageIds.forEach((pageId) => {
      if (!knownPageIds.has(pageId)) unseenPageIds.add(pageId);
      knownPageIds.add(pageId);
    });

    return {
      ...state,
      cookbooks: {
        ...state.cookbooks,
        [cookbookId]: {
          knownPageIds: [...knownPageIds],
          unseenPageIds: [...unseenPageIds],
        },
      },
    };
  });

  return next.cookbooks[cookbookId]?.unseenPageIds ?? [];
}

export async function markCookbookPageSeen(userId: string, cookbookId: string, pageId: string): Promise<string[]> {
  const next = await updateState(userId, (state) => {
    const book = state.cookbooks[cookbookId] ?? { knownPageIds: [], unseenPageIds: [] };
    return {
      ...state,
      cookbooks: {
        ...state.cookbooks,
        [cookbookId]: {
          knownPageIds: [...new Set([...book.knownPageIds, pageId])],
          unseenPageIds: book.unseenPageIds.filter((candidate) => candidate !== pageId),
        },
      },
    };
  });

  return next.cookbooks[cookbookId]?.unseenPageIds ?? [];
}

export async function clearUnseenCookbookPages(userId?: string | null): Promise<void> {
  if (!userId) return;
  await updateQueues.get(userId)?.catch(() => undefined);
  updateQueues.delete(userId);
  await AsyncStorage.removeItem(storageKey(userId));
}
