import React, { useMemo } from 'react';
import { Image, ImageSourcePropType, StyleProp, StyleSheet, Text, useWindowDimensions, View, ViewStyle } from 'react-native';

import { Colors } from '@/constants/colors';
import { Spacing, Typography } from '@/constants/spacing';

export type OnboardingHeaderProps = {
  title: string;
  subtitle?: string;
  imageSource?: ImageSourcePropType;
  defaultSource?: ImageSourcePropType;
  imageScale?: number;
  titleNumberOfLines?: number;
  children?: React.ReactNode;
  overlapRatio?: number;
  imageTranslateY?: number;
  titleTranslateY?: number;
  minImageSize?: number;
  maxImageSize?: number;
  imageSize?: number;
  fadeDuration?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

const DEFAULT_OVERLAP_RATIO = 0.22;
const DEFAULT_IMAGE_SCALE = 1.08;
const MAX_BASE_IMAGE = 260;
const MIN_BASE_IMAGE = 180;

const clampRatio = (value: number) => Math.max(0, Math.min(1, value));

const OnboardingHeader = ({
  imageSource,
  defaultSource,
  imageScale = DEFAULT_IMAGE_SCALE,
  imageTranslateY,
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

  const resolvedImageSize = useMemo(() => {
    if (typeof imageSize === 'number' && !Number.isNaN(imageSize)) {
      return imageSize;
    }
    const baseMin = typeof minImageSize === 'number' ? minImageSize : MIN_BASE_IMAGE;
    const baseMax = typeof maxImageSize === 'number' ? maxImageSize : MAX_BASE_IMAGE;
    const responsive = Math.min(width * 0.55, baseMax);
    const size = Math.max(baseMin, Math.min(baseMax, responsive));
    return size * imageScale;
  }, [imageSize, minImageSize, maxImageSize, imageScale, width]);

  const resolvedDefaultSource = defaultSource ?? imageSource;
  const defaultNumSource = typeof resolvedDefaultSource === 'number' ? resolvedDefaultSource : undefined;

  const overlapPx = clampRatio(overlapRatio) * resolvedImageSize;
  const derivedImageTY = typeof imageTranslateY === 'number' ? imageTranslateY : -overlapPx;
  const derivedTitleMarginTop = typeof titleTranslateY === 'number' ? titleTranslateY : -Math.round(overlapPx * 0.75);

  return (
    <View style={[styles.container, style]} testID={testID}>
      {imageSource ? (
        <View style={{ transform: [{ translateY: derivedImageTY }] }}>
          <Image
            source={imageSource}
            defaultSource={defaultNumSource}
            style={{ width: resolvedImageSize, height: resolvedImageSize }}
            resizeMode="contain"
            accessibilityIgnoresInvertColors
            fadeDuration={fadeDuration ?? 0}
          />
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
