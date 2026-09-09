import { useState } from 'react';
import { requireOptionalNativeModule } from 'expo-modules-core';
import {
  Image as ReactNativeImage,
  Platform,
  ActivityIndicator,
  Pressable,
  View,
  type ImageResizeMode,
  type ImageStyle,
  type StyleProp,
} from 'react-native';
import type { ImageContentFit } from 'expo-image';
import type { CookbookPage } from '@/types/cookbook';
import { useCookbookPageImageUrl } from '@/hooks/useCookbookPageImage';
import { getCookbookPageImageCacheKey, getCookbookPageStoragePath } from '@/utils/cookbook/pageImageDelivery';
import { getCookbookPageImageSource } from '@/utils/cookbook/pageImage';
import type { CookbookPageImageVariant } from '@/utils/cookbook/privatePageUrls';
import { removeStoredPageImage } from '@/utils/cookbook/localPageImages';
import { Text } from '@/components/ui/Text';

interface CookbookPageImageProps {
  page: Pick<CookbookPage, 'title' | 'pageImage' | 'artAsset' | 'imageAsset' | 'imageUrl'>;
  variant: CookbookPageImageVariant;
  style: StyleProp<ImageStyle>;
  contentFit?: ImageContentFit;
  accessible?: boolean;
  accessibilityLabel?: string;
  onLoad?: () => void;
}

const ExpoImage =
  Platform.OS === 'web' || requireOptionalNativeModule('ExpoImage')
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
  const [decodeFailed, setDecodeFailed] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const imageQuery = useCookbookPageImageUrl(storagePath, variant);
  const cacheKey = getCookbookPageImageCacheKey(page, variant) ?? undefined;
  const handleError = () => setDecodeFailed(true);
  if (decodeFailed || (!imageQuery.data && imageQuery.isError)) {
    return (
      <Pressable
        style={[style, { alignItems: 'center', justifyContent: 'center' }]}
        accessibilityRole="button"
        accessibilityLabel={`Retry loading ${page.title}`}
        disabled={retrying}
        onPress={() => {
          setRetrying(true);
          void (async () => {
            try {
              if (decodeFailed) await removeStoredPageImage(storagePath, variant, imageQuery.data);
              const result = await imageQuery.refetch();
              if (!result.isError) setDecodeFailed(false);
            } finally {
              setRetrying(false);
            }
          })().catch(() => undefined);
        }}
      >
        {retrying ? <ActivityIndicator /> : <Text>Tap to load page</Text>}
      </Pressable>
    );
  }
  if (!imageQuery.data)
    return (
      <View style={[style, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator />
      </View>
    );

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
      cachePolicy="memory"
      priority={variant === 'full' ? 'high' : 'normal'}
      contentFit={contentFit}
      allowDownscaling={variant === 'thumbnail'}
      enforceEarlyResizing={variant === 'thumbnail'}
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
    return <StoredCookbookPageImage key={`${props.variant}:${storagePath}`} {...props} storagePath={storagePath} />;
  }

  const source = getCookbookPageImageSource(props.page);
  if (source === null) return null;
  if (!ExpoImage) {
    return (
      <ReactNativeImage
        source={typeof source === 'number' ? source : { uri: source, cache: 'force-cache' }}
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
