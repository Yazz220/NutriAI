import AsyncStorage from '@react-native-async-storage/async-storage';

export const FIRST_RUN_ONBOARDING_VERSION = 1;

export type FirstRunOnboardingStatus = 'pending' | 'started' | 'skipped' | 'completed';

export interface FirstRunOnboardingState {
  version: number;
  status: FirstRunOnboardingStatus;
  updatedAt: string;
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
  const state: FirstRunOnboardingState = {
    version: FIRST_RUN_ONBOARDING_VERSION,
    status,
    updatedAt: new Date().toISOString(),
  };
  await AsyncStorage.setItem(storageKey(userId), JSON.stringify(state));
  return state;
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
