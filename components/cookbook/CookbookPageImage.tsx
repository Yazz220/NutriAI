import { useEffect, useState } from 'react';
import { requireOptionalNativeModule } from 'expo-modules-core';
import {
  Image as ReactNativeImage,
  Platform,
  type ImageResizeMode,
  type ImageStyle,
  type StyleProp,
} from 'react-native';
import type { ImageContentFit } from 'expo-image';
import type { CookbookPage } from '@/types/cookbook';
import { useCookbookPageImageUrl } from '@/hooks/useCookbookPageImage';
import {
  getCookbookPageImageCacheKey,
  getCookbookPageStoragePath,
} from '@/utils/cookbook/pageImageDelivery';
import { getCookbookPageImageSource } from '@/utils/cookbook/pageImage';
import type { CookbookPageImageVariant } from '@/utils/cookbook/privatePageUrls';

interface CookbookPageImageProps {
  page: CookbookPage;
  variant: CookbookPageImageVariant;
  style: StyleProp<ImageStyle>;
  contentFit?: ImageContentFit;
  accessible?: boolean;
  accessibilityLabel?: string;
  onLoad?: () => void;
}

const ExpoImage = (
  Platform.OS === 'web' || requireOptionalNativeModule('ExpoImage')
)
  ? (require('expo-image') as typeof import('expo-image')).Image
  : null;

function toNativeResizeMode(contentFit?: ImageContentFit): ImageResizeMode {
  switch (contentFit) {
    case 'cover':
    case 'contain':
    case 'fill':
    case 'none':
    case 'scale-down':
      return contentFit === 'fill'
        ? 'stretch'
        : contentFit === 'none'
          ? 'center'
          : contentFit === 'scale-down'
            ? 'contain'
            : contentFit;
    default:
      return 'cover';
  }
}

function StoredCookbookPageImage({
  page,
  storagePath,
  variant,
  style,
  contentFit,
  accessible,
  accessibilityLabel,
  onLoad,
}: CookbookPageImageProps & { storagePath: string }) {
  const [useFullFallback, setUseFullFallback] = useState(false);
  const requestedVariant = useFullFallback ? 'full' : variant;
  const imageQuery = useCookbookPageImageUrl(storagePath, requestedVariant);

  useEffect(() => {
    setUseFullFallback(false);
  }, [storagePath, variant]);

  if (!imageQuery.data) return null;

  const cacheKey = getCookbookPageImageCacheKey(page, requestedVariant) ?? undefined;
  const handleError = () => {
    // Supabase image transforms require a paid plan. Development projects
    // fall back to the original while retaining stable cache identity.
    if (requestedVariant === 'thumbnail') setUseFullFallback(true);
  };

  if (!ExpoImage) {
    return (
      <ReactNativeImage
        source={{ uri: imageQuery.data, cache: 'force-cache' }}
        resizeMode={toNativeResizeMode(contentFit)}
        style={style}
        accessible={accessible ? true : undefined}
        accessibilityRole="image"
        accessibilityLabel={accessibilityLabel}
        onLoad={onLoad}
        onError={handleError}
      />
    );
  }

  return (
    <ExpoImage
      source={{ uri: imageQuery.data, cacheKey }}
      recyclingKey={cacheKey}
      cachePolicy="memory-disk"
      priority={variant === 'full' ? 'high' : 'normal'}
      contentFit={contentFit}
      allowDownscaling
      enforceEarlyResizing
      transition={100}
      style={style}
      accessible={accessible ? true : undefined}
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
      onLoad={onLoad}
      onError={handleError}
    />
  );
}

export function CookbookPageImage(props: CookbookPageImageProps) {
  const storagePath = getCookbookPageStoragePath(props.page);
  if (storagePath) {
    return <StoredCookbookPageImage {...props} storagePath={storagePath} />;
  }

  const source = getCookbookPageImageSource(props.page);
  if (source === null) return null;
  if (!ExpoImage) {
    return (
      <ReactNativeImage
        source={typeof source === 'number'
          ? source
          : { uri: source, cache: 'force-cache' }}
        resizeMode={toNativeResizeMode(props.contentFit)}
        style={props.style}
        accessible={props.accessible ? true : undefined}
        accessibilityRole="image"
        accessibilityLabel={props.accessibilityLabel}
        onLoad={props.onLoad}
      />
    );
  }
  return (
    <ExpoImage
      source={typeof source === 'number' ? source : { uri: source }}
      cachePolicy="memory-disk"
      contentFit={props.contentFit}
      allowDownscaling
      enforceEarlyResizing
      transition={100}
      style={props.style}
      accessible={props.accessible ? true : undefined}
      accessibilityRole="image"
      accessibilityLabel={props.accessibilityLabel}
      onLoad={props.onLoad}
    />
  );
}
