import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, Pattern, Rect } from 'react-native-svg';
import { NoshSymbol } from '@/components/brand/NoshBrandAssets';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { Radii, Spacing, Typography } from '@/constants/spacing';
import { Fonts } from '@/utils/fonts';

interface PageGenerationStateProps {
  statusLabel: string;
  title: string;
}

function PaperDotPattern() {
  return (
    <Svg pointerEvents="none" style={StyleSheet.absoluteFill} width="100%" height="100%">
      <Defs>
        <Pattern id="folio-generation-dots" width="14" height="14" patternUnits="userSpaceOnUse">
          <Circle cx="2" cy="2" r="0.65" fill="rgba(101, 67, 111, 0.13)" />
        </Pattern>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#folio-generation-dots)" />
    </Svg>
  );
}

export function PageGenerationPreview() {
  const reduceMotion = useReducedMotion();
  const sweep = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) {
      sweep.value = 0.42;
      return undefined;
    }

    sweep.value = withRepeat(withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.quad) }), -1, true);
    return () => cancelAnimation(sweep);
  }, [reduceMotion, sweep]);

  const sheenStyle = useAnimatedStyle(() => ({
    opacity: 0.16 + sweep.value * 0.2,
    transform: [{ translateX: -90 + sweep.value * 180 }, { rotate: '-12deg' }],
  }));

  return (
    <LinearGradient
      colors={[Colors.paperIvory, '#F4ECEF', '#E7EEE2']}
      locations={[0, 0.56, 1]}
      style={styles.preview}
      testID="folio-page-generation-preview"
    >
      <PaperDotPattern />
      <View style={styles.plumWash} />
      <View style={styles.sageWash} />
      <Animated.View style={[styles.sheen, sheenStyle]} />

      <View style={styles.pageContents} importantForAccessibility="no-hide-descendants">
        <View style={styles.symbolFrame}>
          <NoshSymbol size={34} tone="plum" />
        </View>
        <View style={[styles.recipeLine, styles.recipeLineLong]} />
        <View style={[styles.recipeLine, styles.recipeLineShort]} />
        <View style={styles.illustrationFrame}>
          <LinearGradient
            colors={['rgba(101, 67, 111, 0.12)', 'rgba(151, 167, 137, 0.16)']}
            style={StyleSheet.absoluteFill}
          />
        </View>
        <View style={[styles.recipeLine, styles.recipeLineMedium]} />
        <View style={[styles.recipeLine, styles.recipeLineLong]} />
      </View>
    </LinearGradient>
  );
}

export function PageGenerationStatus({ statusLabel, title }: PageGenerationStateProps) {
  const reduceMotion = useReducedMotion();
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (reduceMotion) return undefined;
    pulse.value = withRepeat(withTiming(0.38, { duration: 900, easing: Easing.inOut(Easing.quad) }), -1, true);
    return () => cancelAnimation(pulse);
  }, [pulse, reduceMotion]);

  const dotStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  return (
    <View
      accessible
      accessibilityLiveRegion="polite"
      accessibilityRole="progressbar"
      accessibilityLabel={`${statusLabel}. ${title}.`}
      style={styles.status}
      testID="folio-page-generation-status"
    >
      <Animated.View style={[styles.statusDot, dotStyle]} />
      <View style={styles.statusCopy}>
        <Animated.View
          key={statusLabel}
          entering={reduceMotion ? undefined : FadeIn.duration(180)}
          exiting={reduceMotion ? undefined : FadeOut.duration(120)}
        >
          <Text style={styles.statusLabel} numberOfLines={1} maxFontSizeMultiplier={1.2}>
            {statusLabel}
          </Text>
        </Animated.View>
        <Text style={styles.title} numberOfLines={1} maxFontSizeMultiplier={1.2}>
          {title}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  preview: {
    flex: 1,
    overflow: 'hidden',
  },
  plumWash: {
    position: 'absolute',
    width: 120,
    height: 120,
    top: -44,
    right: -44,
    borderRadius: Radii.full,
    backgroundColor: Colors.alpha.primary[10],
  },
  sageWash: {
    position: 'absolute',
    width: 100,
    height: 100,
    bottom: -38,
    left: -32,
    borderRadius: Radii.full,
    backgroundColor: 'rgba(151, 167, 137, 0.16)',
  },
  sheen: {
    position: 'absolute',
    top: -24,
    bottom: -24,
    left: '38%',
    width: 46,
    backgroundColor: Colors.white,
  },
  pageContents: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  symbolFrame: {
    width: 50,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radii.full,
    backgroundColor: Colors.alpha.white[50],
    marginBottom: Spacing.xs,
  },
  recipeLine: {
    height: 5,
    borderRadius: Radii.full,
    backgroundColor: Colors.alpha.primary[10],
  },
  recipeLineLong: { width: '74%' },
  recipeLineMedium: { width: '58%' },
  recipeLineShort: { width: '42%' },
  illustrationFrame: {
    width: '76%',
    aspectRatio: 1.35,
    overflow: 'hidden',
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.alpha.primary[10],
    marginVertical: Spacing.xs,
  },
  status: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: Radii.full,
    backgroundColor: Colors.primary,
  },
  statusCopy: {
    flex: 1,
    gap: 2,
  },
  statusLabel: {
    color: Colors.primary,
    fontFamily: Fonts.ui.semibold,
    fontSize: Typography.sizes.sm,
    lineHeight: Typography.metrics.lineHeight16,
  },
  title: {
    color: Colors.textSecondary,
    fontFamily: Fonts.ui.regular,
    fontSize: Typography.sizes.sm,
    lineHeight: Typography.metrics.lineHeight16,
  },
});
