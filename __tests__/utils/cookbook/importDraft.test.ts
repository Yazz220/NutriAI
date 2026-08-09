import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  SOURCE_DRAFT_CACHE_PREFIX,
  clearSourceDraft,
  loadSourceDraft,
  saveSourceDraft,
} from '@/utils/cookbook/importDraft';

const userId = 'user-1';
const key = `${SOURCE_DRAFT_CACHE_PREFIX}:${userId}`;

describe('source draft cache', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('round-trips only the typed source input for a user', async () => {
    await saveSourceDraft(userId, 'https://example.com/recipe');

    expect(await loadSourceDraft(userId)).toBe('https://example.com/recipe');
    expect(await AsyncStorage.getItem(key)).toBe('{"input":"https://example.com/recipe"}');
  });

  it('clears empty and explicitly cleared source drafts', async () => {
    await saveSourceDraft(userId, 'Family pasta recipe');
    await saveSourceDraft(userId, '');
    expect(await loadSourceDraft(userId)).toBe('');

    await saveSourceDraft(userId, 'Family pasta recipe');
    await clearSourceDraft(userId);
    expect(await loadSourceDraft(userId)).toBe('');
  });

  it('removes malformed cached data instead of restoring it', async () => {
    await AsyncStorage.setItem(key, '{not-json');

    expect(await loadSourceDraft(userId)).toBe('');
    expect(await AsyncStorage.getItem(key)).toBeNull();
  });
});
