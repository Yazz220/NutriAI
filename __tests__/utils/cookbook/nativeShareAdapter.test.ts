import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getNativeShareRequestKey,
  nativeShareReadiness,
  normalizeNativeShareIntent,
} from '@/utils/cookbook/nativeShareAdapter';
import type { ShareIntent } from 'expo-share-intent';

function intent(input: Partial<ShareIntent>): ShareIntent {
  return { type: null, files: null, text: null, webUrl: null, ...input };
}

describe('native share adapter', () => {
  beforeEach(async () => AsyncStorage.clear());

  it('prefers a shared image and keeps selected text as notes', () => {
    expect(normalizeNativeShareIntent(intent({
      text: 'Use half the sugar',
      files: [{
        fileName: 'recipe.jpg',
        mimeType: 'image/jpeg',
        path: 'file:///private/recipe.jpg',
        size: 1234,
        width: 100,
        height: 200,
        duration: null,
      }],
    }))).toEqual({
      type: 'image',
      fileUri: 'file:///private/recipe.jpg',
      mimeType: 'image/jpeg',
      notes: 'Use half the sugar',
    });
  });

  it('extracts a URL from common Android share text', () => {
    expect(normalizeNativeShareIntent(intent({ text: 'Cheesecake https://example.com/cake' })))
      .toEqual({ type: 'url', input: 'https://example.com/cake', title: undefined });
  });

  it('uses the canonical image source limit for native shares', () => {
    expect(() => normalizeNativeShareIntent(intent({
      files: [{
        fileName: 'large.png',
        mimeType: 'image/png',
        path: 'file:///private/large.png',
        size: 15 * 1024 * 1024 + 1,
        width: 5000,
        height: 5000,
        duration: null,
      }],
    }))).toThrow('larger than 15 MB');
  });

  it('uses the same request key for a duplicate OS delivery', async () => {
    const share = { type: 'url', input: 'https://example.com/cake' } as const;
    const first = await getNativeShareRequestKey(share, 1_000);
    const duplicate = await getNativeShareRequestKey(share, 2_000);
    const laterShare = await getNativeShareRequestKey(share, 1_000 + 11 * 60_000);

    expect(duplicate).toBe(first);
    expect(laterShare).not.toBe(first);
  });

  it('waits for authentication and keeps offline handoffs recoverable', () => {
    expect(nativeShareReadiness({ hasSession: false, isConnected: true })).toBe('waiting_for_sign_in');
    expect(nativeShareReadiness({ hasSession: true, isConnected: false })).toBe('offline');
    expect(nativeShareReadiness({ hasSession: true, isConnected: true })).toBe('ready');
  });
});
