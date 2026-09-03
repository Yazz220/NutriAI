import AsyncStorage from '@react-native-async-storage/async-storage';

const READER_POSITIONS_PREFIX = 'nosh:cookbook-reader-positions:v1';

export type CookbookReaderViewMode = 'page' | 'spread';

export interface CookbookReaderPosition {
  pageId: string;
  pageIndex: number;
  /** Optional so positions written before view-mode persistence remain valid. */
  viewMode?: CookbookReaderViewMode;
  updatedAt: string;
}

interface CookbookReaderPositionState {
  version: 1;
  cookbooks: Record<string, CookbookReaderPosition>;
}

const updateQueues = new Map<string, Promise<void>>();

function storageKey(userId: string): string {
  return `${READER_POSITIONS_PREFIX}:${userId}`;
}

function emptyState(): CookbookReaderPositionState {
  return { version: 1, cookbooks: {} };
}

function isPosition(value: unknown): value is CookbookReaderPosition {
  if (!value || typeof value !== 'object') return false;
  const position = value as Partial<CookbookReaderPosition>;
  return Boolean(
    typeof position.pageId === 'string'
      && Number.isInteger(position.pageIndex)
      && (position.viewMode === undefined || position.viewMode === 'page' || position.viewMode === 'spread')
      && typeof position.updatedAt === 'string',
  );
}

async function loadState(userId: string): Promise<CookbookReaderPositionState> {
  const key = storageKey(userId);
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return emptyState();

  try {
    const parsed = JSON.parse(raw) as Partial<CookbookReaderPositionState>;
    if (parsed.version !== 1 || !parsed.cookbooks || typeof parsed.cookbooks !== 'object') {
      await AsyncStorage.removeItem(key);
      return emptyState();
    }
    return parsed as CookbookReaderPositionState;
  } catch {
    await AsyncStorage.removeItem(key);
    return emptyState();
  }
}

function updateState(
  userId: string,
  update: (state: CookbookReaderPositionState) => CookbookReaderPositionState,
): Promise<void> {
  const previous = updateQueues.get(userId) ?? Promise.resolve();
  const operation = previous
    .catch(() => undefined)
    .then(async () => {
      const next = update(await loadState(userId));
      await AsyncStorage.setItem(storageKey(userId), JSON.stringify(next));
    });
  updateQueues.set(userId, operation);
  return operation;
}

export async function loadCookbookReaderPosition(
  userId: string,
  cookbookId: string,
): Promise<CookbookReaderPosition | null> {
  await updateQueues.get(userId)?.catch(() => undefined);
  const position = (await loadState(userId)).cookbooks[cookbookId];
  return isPosition(position) ? position : null;
}

export async function saveCookbookReaderPosition(
  userId: string,
  cookbookId: string,
  pageId: string,
  pageIndex: number,
  viewMode: CookbookReaderViewMode,
): Promise<void> {
  if (!pageId || pageIndex < 0) return;
  await updateState(userId, (state) => ({
    ...state,
    cookbooks: {
      ...state.cookbooks,
      [cookbookId]: {
        pageId,
        pageIndex,
        viewMode,
        updatedAt: new Date().toISOString(),
      },
    },
  }));
}

export async function clearCookbookReaderPosition(userId: string, cookbookId: string): Promise<void> {
  await updateState(userId, (state) => {
    const cookbooks = { ...state.cookbooks };
    delete cookbooks[cookbookId];
    return { ...state, cookbooks };
  });
}

export async function clearCookbookReaderPositions(userId?: string | null): Promise<void> {
  if (!userId) return;
  await updateQueues.get(userId)?.catch(() => undefined);
  updateQueues.delete(userId);
  await AsyncStorage.removeItem(storageKey(userId));
}

export function resolveCookbookReaderPageId(
  position: CookbookReaderPosition | null | undefined,
  pageIds: string[],
): string | null {
  if (pageIds.length === 0) return null;
  if (position?.pageId && pageIds.includes(position.pageId)) return position.pageId;
  if (!position) return null;
  const fallbackIndex = Math.max(0, Math.min(pageIds.length - 1, position.pageIndex));
  return pageIds[fallbackIndex] ?? null;
}
