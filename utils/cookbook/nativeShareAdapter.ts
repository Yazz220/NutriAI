import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ShareIntent } from 'expo-share-intent';
import { RECIPE_CAPTURE_IMAGE_SOURCE_MAX_BYTES } from '@/utils/cookbook/recipeCaptureImageContract';
import {
  classifyVideoSourceUrl,
  isRecognizedVideoSourceUrl,
} from '@/supabase/functions/_shared/videoSource';
import type { RecipeCaptureVideoAsset } from '@/utils/cookbook/recipeCaptureVideo';
import { recipeTextSourceIsTooLarge } from '@/supabase/functions/_shared/recipeEvidence';

const DELIVERY_KEY = 'nosh:native-share:last-delivery';
const DUPLICATE_WINDOW_MS = 10 * 60_000;

export type NormalizedNativeShare =
  | { type: 'url'; input: string; title?: string }
  | { type: 'video'; input: string; rightsConfirmed: false; title?: string }
  | { type: 'video'; video: RecipeCaptureVideoAsset; rightsConfirmed: false; notes?: string; title?: string }
  | { type: 'text'; input: string; title?: string }
  | { type: 'image'; fileUri: string; mimeType: string; notes?: string; title?: string };

export function nativeShareReadiness(input: {
  hasSession: boolean;
  isConnected?: boolean;
  isInternetReachable?: boolean;
}): 'waiting_for_sign_in' | 'offline' | 'ready' {
  if (!input.hasSession) return 'waiting_for_sign_in';
  if (input.isConnected === false || input.isInternetReachable === false) return 'offline';
  return 'ready';
}

function firstUrl(value: string): string | null {
  return value.match(/https?:\/\/[^\s]+/i)?.[0] ?? null;
}

export function normalizeNativeShareIntent(intent: ShareIntent): NormalizedNativeShare {
  const title = intent.meta?.title?.trim() || undefined;
  const text = intent.text?.trim() || '';
  if (recipeTextSourceIsTooLarge(text)) {
    throw new Error('Recipe text is too long. Share one recipe at a time.');
  }
  const image = intent.files?.find((file) => file.mimeType.startsWith('image/'));
  const video = intent.files?.find((file) => (
    file.mimeType.startsWith('video/')
    || /\.(?:mp4|mov|mpeg|mpg|webm)$/i.test(file.fileName ?? file.path)
  ));

  if (image) {
    if (image.size != null && image.size > RECIPE_CAPTURE_IMAGE_SOURCE_MAX_BYTES) {
      throw new Error('This image is larger than 15 MB. Choose a smaller image and try again.');
    }
    return {
      type: 'image',
      fileUri: image.path,
      mimeType: image.mimeType || 'image/jpeg',
      notes: text || undefined,
      title,
    };
  }

  if (video) {
    return {
      type: 'video',
      video: {
        uri: video.path,
        name: video.fileName || 'shared-video',
        mimeType: video.mimeType || undefined,
        size: video.size,
        duration: video.duration,
      },
      rightsConfirmed: false,
      notes: text || undefined,
      title,
    };
  }
  const url = intent.webUrl ?? firstUrl(text);
  if (url && isRecognizedVideoSourceUrl(url)) {
    return { type: 'video', input: url, rightsConfirmed: false, title };
  }
  if (url) return { type: 'url', input: url, title };
  if (text) return { type: 'text', input: text, title };
  throw new Error('Nosh can receive one recipe link, text selection, image, or video at a time.');
}

export function nativeShareNeedsVideoPermission(value: NormalizedNativeShare): boolean {
  if (value.type !== 'video') return false;
  if ('video' in value) return true;
  return classifyVideoSourceUrl(value.input)?.kind === 'direct_file';
}

function fingerprint(value: NormalizedNativeShare): string {
  if (value.type === 'image') return `image|${value.fileUri}|${value.mimeType}`;
  if (value.type === 'video' && 'video' in value) {
    return `video|${value.video.uri}|${value.video.mimeType ?? ''}|${value.video.size ?? ''}`;
  }
  return `${value.type}|${value.input}`;
}

function compactHash(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

export async function getNativeShareRequestKey(
  share: NormalizedNativeShare,
  now = Date.now(),
): Promise<string> {
  const fingerprintHash = compactHash(fingerprint(share));
  const saved = await AsyncStorage.getItem(DELIVERY_KEY);
  if (saved) {
    try {
      const previous = JSON.parse(saved) as {
        fingerprintHash?: string;
        requestKey?: string;
        createdAt?: number;
      };
      if (
        previous.fingerprintHash === fingerprintHash
        && typeof previous.requestKey === 'string'
        && typeof previous.createdAt === 'number'
        && now - previous.createdAt < DUPLICATE_WINDOW_MS
      ) {
        return previous.requestKey;
      }
    } catch {
      // Replace malformed delivery metadata. Raw shared content is never stored here.
    }
  }

  const requestKey = `share-${now.toString(36)}-${fingerprintHash}`;
  await AsyncStorage.setItem(DELIVERY_KEY, JSON.stringify({ fingerprintHash, requestKey, createdAt: now }));
  return requestKey;
}
