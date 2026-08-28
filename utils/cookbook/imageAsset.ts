import { Image, type ImageSourcePropType } from 'react-native';

/** Resolve a React Native image source into the URI expected by non-RN renderers. */
export function resolveImageAssetUri(source: ImageSourcePropType | undefined): string | null {
  if (!source) return null;
  if (typeof source === 'number') return Image.resolveAssetSource(source)?.uri ?? null;
  if (Array.isArray(source)) return resolveImageAssetUri(source[0]);
  return typeof source.uri === 'string' ? source.uri : null;
}
