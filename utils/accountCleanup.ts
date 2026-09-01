import AsyncStorage from '@react-native-async-storage/async-storage';
import { withdrawAiDataConsent } from '@/utils/privacy/aiDataConsent';
import {
  clearCachedCaptures,
  clearCachedPages,
  clearCachedShelf,
  loadCachedShelf,
} from '@/utils/cookbook/cache';
import { clearFirstRunOnboardingState } from '@/utils/cookbook/firstRunOnboarding';
import { clearNoshThreadStorage } from '@/utils/cookbook/noshThreadCleanup';
import { clearBookshelfScene } from '@/utils/cookbook/shelfAppearanceStorage';
import { clearUnseenCookbookPages } from '@/utils/cookbook/unseenPages';

const PENDING_PURGES_KEY = 'nosh:pending-user-data-purges:v1';

export interface LocalUserDataPurgeRequest {
  userId: string;
  cookbookIds: string[];
}

export interface LocalUserDataPurgeResult {
  complete: boolean;
  failed: string[];
}

async function loadPendingPurges(): Promise<LocalUserDataPurgeRequest[]> {
  const raw = await AsyncStorage.getItem(PENDING_PURGES_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as LocalUserDataPurgeRequest[];
    return Array.isArray(parsed)
      ? parsed.filter((request) => request && typeof request.userId === 'string')
      : [];
  } catch {
    await AsyncStorage.removeItem(PENDING_PURGES_KEY).catch(() => undefined);
    return [];
  }
}

async function rememberPendingPurge(request: LocalUserDataPurgeRequest): Promise<void> {
  const pending = await loadPendingPurges();
  const existing = pending.find((candidate) => candidate.userId === request.userId);
  const cookbookIds = [...new Set([
    ...(existing?.cookbookIds ?? []),
    ...request.cookbookIds,
  ].filter(Boolean))];
  const next = [
    ...pending.filter((candidate) => candidate.userId !== request.userId),
    { userId: request.userId, cookbookIds },
  ];
  await AsyncStorage.setItem(PENDING_PURGES_KEY, JSON.stringify(next));
}

async function forgetPendingPurge(userId: string): Promise<void> {
  const next = (await loadPendingPurges()).filter((request) => request.userId !== userId);
  if (next.length === 0) {
    await AsyncStorage.removeItem(PENDING_PURGES_KEY);
    return;
  }
  await AsyncStorage.setItem(PENDING_PURGES_KEY, JSON.stringify(next));
}

export async function purgeLocalUserData(
  request: LocalUserDataPurgeRequest,
): Promise<LocalUserDataPurgeResult> {
  const failed: string[] = [];
  try {
    await rememberPendingPurge(request);
  } catch {
    failed.push('cleanup retry marker');
  }

  let cookbookIds = [...new Set(request.cookbookIds.filter(Boolean))];
  try {
    const cachedShelf = await loadCachedShelf(request.userId);
    cookbookIds = [...new Set([
      ...cookbookIds,
      ...(cachedShelf?.cookbooks.map((cookbook) => cookbook.id) ?? []),
    ])];
  } catch {
    failed.push('cached shelf lookup');
  }

  const tasks = [
    ['cookbook pages', () => clearCachedPages(cookbookIds)],
    ['recipe activity', () => clearCachedCaptures(request.userId)],
    ['cookbook shelf', () => clearCachedShelf(request.userId)],
    ['Folio conversations', () => clearNoshThreadStorage(request.userId)],
    ['AI data permission', () => withdrawAiDataConsent(request.userId)],
    ['onboarding state', () => clearFirstRunOnboardingState(request.userId)],
    ['shelf appearance', () => clearBookshelfScene(request.userId)],
    ['new page markers', () => clearUnseenCookbookPages(request.userId)],
  ] as const;

  const results = await Promise.allSettled(tasks.map(([, task]) => task()));
  results.forEach((result, index) => {
    if (result.status === 'rejected') failed.push(tasks[index][0]);
  });

  if (failed.length === 0) {
    try {
      await forgetPendingPurge(request.userId);
    } catch {
      failed.push('cleanup retry marker');
    }
  }

  return { complete: failed.length === 0, failed };
}

export async function retryPendingLocalUserDataPurges(): Promise<void> {
  const pending = await loadPendingPurges().catch(() => []);
  for (const request of pending) {
    await purgeLocalUserData(request).catch(() => undefined);
  }
}
