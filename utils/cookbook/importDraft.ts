import AsyncStorage from '@react-native-async-storage/async-storage';

export const SOURCE_DRAFT_CACHE_PREFIX = 'nosh:recipe-source-draft:v1';

interface CachedSourceDraft {
  input: string;
}

function sourceDraftKey(userId: string): string {
  return `${SOURCE_DRAFT_CACHE_PREFIX}:${userId}`;
}

export async function loadSourceDraft(userId: string): Promise<string> {
  const key = sourceDraftKey(userId);
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return '';

  try {
    const draft = JSON.parse(raw) as CachedSourceDraft;
    if (typeof draft.input !== 'string') throw new Error('Invalid source draft');
    return draft.input;
  } catch {
    await AsyncStorage.removeItem(key);
    return '';
  }
}

export async function saveSourceDraft(userId: string, input: string): Promise<void> {
  const key = sourceDraftKey(userId);
  if (!input) {
    await AsyncStorage.removeItem(key);
    return;
  }

  await AsyncStorage.setItem(key, JSON.stringify({ input } satisfies CachedSourceDraft));
}

export async function clearSourceDraft(userId: string): Promise<void> {
  await AsyncStorage.removeItem(sourceDraftKey(userId));
}
