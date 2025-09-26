import React, { useMemo } from 'react';
import { Image, ImageSourcePropType, StyleProp, StyleSheet, Text, useWindowDimensions, View, ViewStyle } from 'react-native';

import { Colors } from '@/constants/colors';
import { Spacing, Typography } from '@/constants/spacing';

export type OnboardingHeaderProps = {
  title: string;
  subtitle?: string;
  imageSource?: ImageSourcePropType;
  defaultSource?: ImageSourcePropType;
  // Optional renderer for custom image content (e.g., SVG component). Receives computed visual size.
  renderImage?: (size: number) => React.ReactNode;
  imageScale?: number;
  titleNumberOfLines?: number;
  children?: React.ReactNode;
  overlapRatio?: number;
  imageTranslateY?: number;
  // Additional downward translate applied to the image ONLY,
  // expressed as a ratio of the layout image size (0..1). Positive values move the image down.
  imageTranslateExtraRatio?: number;
  // Multiplier applied to the visual image size only (does not affect layout box)
  // e.g. 1.07 means +7% larger visual render
  imageVisualExtraScale?: number;
  titleTranslateY?: number;
  minImageSize?: number;
  maxImageSize?: number;
  imageSize?: number;
  fadeDuration?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

const DEFAULT_OVERLAP_RATIO = 0.22;
const DEFAULT_IMAGE_SCALE = 1.08; // keep existing layout scale
const DEFAULT_VISUAL_UPSCALE = 1.1; // new: increase visual size by 10% without affecting layout
const MAX_BASE_IMAGE = 260;
const MIN_BASE_IMAGE = 180;

const clampRatio = (value: number) => Math.max(0, Math.min(1, value));

const OnboardingHeader = ({
  imageSource,
  defaultSource,
  renderImage,
  imageScale = DEFAULT_IMAGE_SCALE,
  imageTranslateY,
  imageTranslateExtraRatio,
  imageVisualExtraScale,
  titleTranslateY,
  title,
  subtitle,
  titleNumberOfLines = 2,
  children,
  minImageSize,
  maxImageSize,
  imageSize,
  fadeDuration,
  overlapRatio = DEFAULT_OVERLAP_RATIO,
  style,
  testID,
}: OnboardingHeaderProps) => {
  const { width } = useWindowDimensions();

  // Layout size controls the reserved space and overlap math (unchanged)
  const layoutImageSize = useMemo(() => {
    if (typeof imageSize === 'number' && !Number.isNaN(imageSize)) {
      return imageSize;
    }
    const baseMin = typeof minImageSize === 'number' ? minImageSize : MIN_BASE_IMAGE;
    const baseMax = typeof maxImageSize === 'number' ? maxImageSize : MAX_BASE_IMAGE;
    const responsive = Math.min(width * 0.55, baseMax);
    const size = Math.max(baseMin, Math.min(baseMax, responsive));
    return size * imageScale;
  }, [imageSize, minImageSize, maxImageSize, imageScale, width]);

  // Visual size is what we render; upscaled by 10% globally + optional per-screen multiplier. Does not change layout
  const visualImageSize = useMemo(() => {
    const extra = typeof imageVisualExtraScale === 'number' && !Number.isNaN(imageVisualExtraScale)
      ? imageVisualExtraScale
      : 1;
    return Math.round(layoutImageSize * DEFAULT_VISUAL_UPSCALE * extra);
  }, [layoutImageSize, imageVisualExtraScale]);

  const resolvedDefaultSource = defaultSource ?? imageSource;
  const defaultNumSource = typeof resolvedDefaultSource === 'number' ? resolvedDefaultSource : undefined;

  const overlapPx = clampRatio(overlapRatio) * layoutImageSize;
  // Keep image translate the same baseline behavior, then apply optional extra downward offset
  let derivedImageTY = typeof imageTranslateY === 'number' ? imageTranslateY : -overlapPx;
  if (typeof imageTranslateExtraRatio === 'number' && !Number.isNaN(imageTranslateExtraRatio)) {
    const extra = clampRatio(imageTranslateExtraRatio) * layoutImageSize;
    derivedImageTY += extra; // positive moves image further down
  }
  // When header includes children (e.g., unit toggles), reduce the title overlap slightly to avoid collisions
  const hasChildren = Boolean(children);
  const titleOverlapFactor = hasChildren ? 0.6 : 0.75;
  const derivedTitleMarginTop = typeof titleTranslateY === 'number' ? titleTranslateY : -Math.round(overlapPx * titleOverlapFactor);

  return (
    <View style={[styles.container, style]} testID={testID}>
      {renderImage || imageSource ? (
        <View style={{ height: layoutImageSize, width: layoutImageSize, transform: [{ translateY: derivedImageTY }], overflow: 'visible' }}>
          <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center' }}>
            {renderImage ? (
              renderImage(visualImageSize)
            ) : (
              <Image
                source={imageSource}
                defaultSource={defaultNumSource}
                style={{ width: visualImageSize, height: visualImageSize }}
                resizeMode="contain"
                accessibilityIgnoresInvertColors
                fadeDuration={fadeDuration ?? 0}
                progressiveRenderingEnabled
              />
            )}
          </View>
        </View>
      ) : null}
      <Text
        style={[styles.title, { marginTop: derivedTitleMarginTop }]}
        numberOfLines={titleNumberOfLines}
      >
        {title}
      </Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {children ? <View style={styles.children}>{children}</View> : null}
    </View>
  );
};

export default OnboardingHeader;

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: Spacing.sm,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.lightText,
    textAlign: 'center',
  },
  children: {
    marginTop: Spacing.lg,
    alignItems: 'center',
    width: '100%',
  },
});
