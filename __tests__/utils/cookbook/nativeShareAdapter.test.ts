import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getNativeShareRequestKey,
  nativeShareNeedsVideoPermission,
  nativeShareReadiness,
  normalizeNativeShareIntent,
} from '@/utils/cookbook/nativeShareAdapter';
import type { ShareIntent } from 'expo-share-intent';
import { MAX_RECIPE_TEXT_CHARACTERS } from '@/supabase/functions/_shared/recipeEvidence';

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

  it('routes shared social and direct-video links through the video source contract', () => {
    expect(normalizeNativeShareIntent(intent({ webUrl: 'https://www.tiktok.com/@cook/video/123' })))
      .toEqual({
        type: 'video',
        input: 'https://www.tiktok.com/@cook/video/123',
        rightsConfirmed: false,
        title: undefined,
      });
    expect(normalizeNativeShareIntent(intent({ webUrl: 'https://cdn.example.com/recipe.mp4' })))
      .toMatchObject({ type: 'video', rightsConfirmed: false });
  });

  it('requires rights confirmation for direct video evidence but not social bookmarks', () => {
    expect(nativeShareNeedsVideoPermission({
      type: 'video',
      input: 'https://cdn.example.com/recipe.mp4',
      rightsConfirmed: false,
    })).toBe(true);
    expect(nativeShareNeedsVideoPermission({
      type: 'video',
      input: 'https://www.tiktok.com/@cook/video/123',
      rightsConfirmed: false,
    })).toBe(false);
  });

  it('accepts a shared video file as a permissioned upload candidate', () => {
    expect(normalizeNativeShareIntent(intent({
      files: [{
        fileName: 'recipe.mp4',
        mimeType: 'video/mp4',
        path: 'file:///private/recipe.mp4',
        size: 1234,
        width: 1080,
        height: 1920,
        duration: 30_000,
      }],
    }))).toEqual({
      type: 'video',
      video: {
        uri: 'file:///private/recipe.mp4',
        name: 'recipe.mp4',
        mimeType: 'video/mp4',
        size: 1234,
        duration: 30_000,
      },
      rightsConfirmed: false,
    });
  });

  it('keeps a shared video file when the share also includes caption text', () => {
    expect(normalizeNativeShareIntent(intent({
      text: 'Original post https://example.com/post',
      files: [{
        fileName: 'recipe.webm',
        mimeType: 'video/webm',
        path: 'file:///private/recipe.webm',
        size: 1234,
        width: 1080,
        height: 1920,
        duration: 20_000,
      }],
    }))).toMatchObject({ type: 'video', video: { name: 'recipe.webm' } });
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

  it('rejects oversized shared text before persisting a capture', () => {
    expect(() => normalizeNativeShareIntent(intent({
      text: 'a'.repeat(MAX_RECIPE_TEXT_CHARACTERS + 1),
    }))).toThrow('Recipe text is too long');
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
