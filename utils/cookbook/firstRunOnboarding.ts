import AsyncStorage from '@react-native-async-storage/async-storage';

export const FIRST_RUN_ONBOARDING_VERSION = 1;

export type FirstRunOnboardingStatus = 'pending' | 'started' | 'skipped' | 'completed';

export interface FirstRunOnboardingState {
  version: number;
  status: FirstRunOnboardingStatus;
  updatedAt: string;
  firstCookbookId?: string;
  firstCaptureId?: string;
  firstPageId?: string;
  activatedAt?: string;
  readerCueSeen?: boolean;
}

function storageKey(userId: string): string {
  return `nosh:first-run:${userId}:v${FIRST_RUN_ONBOARDING_VERSION}`;
}

export function defaultFirstRunOnboardingState(): FirstRunOnboardingState {
  return {
    version: FIRST_RUN_ONBOARDING_VERSION,
    status: 'pending',
    updatedAt: new Date(0).toISOString(),
  };
}

export async function loadFirstRunOnboardingState(
  userId: string,
): Promise<FirstRunOnboardingState> {
  const raw = await AsyncStorage.getItem(storageKey(userId));
  if (!raw) return defaultFirstRunOnboardingState();

  try {
    const parsed = JSON.parse(raw) as Partial<FirstRunOnboardingState>;
    if (
      parsed.version !== FIRST_RUN_ONBOARDING_VERSION ||
      !['pending', 'started', 'skipped', 'completed'].includes(parsed.status ?? '')
    ) {
      return defaultFirstRunOnboardingState();
    }
    return {
      version: FIRST_RUN_ONBOARDING_VERSION,
      status: parsed.status as FirstRunOnboardingStatus,
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : new Date(0).toISOString(),
      firstCookbookId: typeof parsed.firstCookbookId === 'string' ? parsed.firstCookbookId : undefined,
      firstCaptureId: typeof parsed.firstCaptureId === 'string' ? parsed.firstCaptureId : undefined,
      firstPageId: typeof parsed.firstPageId === 'string' ? parsed.firstPageId : undefined,
      activatedAt: typeof parsed.activatedAt === 'string' ? parsed.activatedAt : undefined,
      readerCueSeen: parsed.readerCueSeen === true,
    };
  } catch {
    await AsyncStorage.removeItem(storageKey(userId)).catch(() => undefined);
    return defaultFirstRunOnboardingState();
  }
}

export async function saveFirstRunOnboardingStatus(
  userId: string,
  status: FirstRunOnboardingStatus,
): Promise<FirstRunOnboardingState> {
  const current = await loadFirstRunOnboardingState(userId);
  const state: FirstRunOnboardingState = {
    ...current,
    status,
    updatedAt: new Date().toISOString(),
  };
  await AsyncStorage.setItem(storageKey(userId), JSON.stringify(state));
  return state;
}

async function saveFirstRunOnboardingState(
  userId: string,
  state: FirstRunOnboardingState,
): Promise<FirstRunOnboardingState> {
  await AsyncStorage.setItem(storageKey(userId), JSON.stringify(state));
  return state;
}

export async function recordFirstCookbookCreated(
  userId: string,
  cookbookId: string,
): Promise<FirstRunOnboardingState> {
  const current = await loadFirstRunOnboardingState(userId);
  if (current.status === 'skipped' || current.status === 'completed') return current;
  return saveFirstRunOnboardingState(userId, {
    ...current,
    status: 'started',
    firstCookbookId: cookbookId,
    updatedAt: new Date().toISOString(),
  });
}

export async function recordFirstCaptureStarted(
  userId: string,
  captureId: string,
  destinationCookbookId?: string,
): Promise<{ state: FirstRunOnboardingState; didRecord: boolean }> {
  const current = await loadFirstRunOnboardingState(userId);
  const belongsToFirstBook = Boolean(
    current.firstCookbookId && current.firstCookbookId === destinationCookbookId,
  );
  if (current.status !== 'started' || !belongsToFirstBook || current.firstCaptureId) {
    return { state: current, didRecord: false };
  }
  const state = await saveFirstRunOnboardingState(userId, {
    ...current,
    firstCaptureId: captureId,
    updatedAt: new Date().toISOString(),
  });
  return { state, didRecord: true };
}

export async function recordFirstReadyRecipeOpened(
  userId: string,
  cookbookId: string,
  pageId: string,
): Promise<{ state: FirstRunOnboardingState; didActivate: boolean }> {
  const current = await loadFirstRunOnboardingState(userId);
  if (current.status !== 'started' || current.firstCookbookId !== cookbookId) {
    return { state: current, didActivate: false };
  }
  const activatedAt = new Date().toISOString();
  const state = await saveFirstRunOnboardingState(userId, {
    ...current,
    status: 'completed',
    firstPageId: pageId,
    activatedAt,
    readerCueSeen: false,
    updatedAt: activatedAt,
  });
  return { state, didActivate: true };
}

export async function markFirstPageReaderCueSeen(
  userId: string,
): Promise<FirstRunOnboardingState> {
  const current = await loadFirstRunOnboardingState(userId);
  if (current.readerCueSeen) return current;
  return saveFirstRunOnboardingState(userId, {
    ...current,
    readerCueSeen: true,
    updatedAt: new Date().toISOString(),
  });
}

export function isFirstRunCapture(
  state: FirstRunOnboardingState,
  destinationCookbookId?: string,
  captureId?: string,
): boolean {
  return (
    state.status === 'started' &&
    Boolean(state.firstCookbookId) &&
    state.firstCookbookId === destinationCookbookId &&
    (captureId
      ? !state.firstCaptureId || state.firstCaptureId === captureId
      : !state.firstCaptureId)
  );
}

export function shouldPresentFirstRunWelcome({
  isReady,
  cookbookCount,
  status,
  hasNativeShareWork,
}: {
  isReady: boolean;
  cookbookCount: number;
  status: FirstRunOnboardingStatus;
  hasNativeShareWork: boolean;
}): boolean {
  return (
    isReady &&
    cookbookCount === 0 &&
    (status === 'pending' || status === 'started') &&
    !hasNativeShareWork
  );
}
