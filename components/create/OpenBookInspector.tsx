import { Radii, Typography , Spacing, Shadows} from '@/constants/spacing';
/* eslint-disable react-hooks/immutability -- Reanimated shared values are intentionally mutated through their .value API. */
import React, { useCallback, useEffect, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { BookplatePage } from '@/components/create/BookplatePage';
import { ContactShadow } from '@/components/physical-book/ContactShadow';
import { PhysicalBook } from '@/components/physical-book/PhysicalBook';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { getCookbookBindingForStyle } from '@/constants/cookbookBindings';
import { resolveCookbookPageHeight } from '@/constants/cookbookGeometry';
import type { CookbookStylePreset } from '@/constants/cookbookStyles';
import { withAlpha } from '@/utils/cookbook/coverArt';
import { Fonts } from '@/utils/fonts';

/**
 * A small, interactive version of the same physical book used on the shelf
 * and in the reader. It starts closed on the right, opens around the center
 * hinge, then reveals the selected cookbook's bookplate and visual identity.
 */

interface OpenBookInspectorProps {
  preset: CookbookStylePreset;
  title: string;
  /** Available stage width. */
  width: number;
}

const INTRO_MS = 320;
const SWING_MS = 760;
const SWING_END_DEG = -175;
const INTRO_EASING = Easing.bezier(0.22, 0.72, 0.24, 1);
const SWING_EASING = Easing.bezier(0.45, 0, 0.15, 1);

export function OpenBookInspector({
  preset,
  title,
  width,
}: OpenBookInspectorProps) {
  const binding = getCookbookBindingForStyle(preset.id);
  const pageWidth = Math.min((width - 20) / 2, 164);
  const pageHeight = resolveCookbookPageHeight(pageWidth);
  const spreadWidth = pageWidth * 2;
  const [isOpen, setIsOpen] = useState(false);

  const intro = useSharedValue(0);
  const swing = useSharedValue(0);

  useEffect(() => {
    intro.value = withTiming(1, { duration: INTRO_MS, easing: INTRO_EASING });
  }, [intro]);

  const openBook = useCallback(() => {
    if (isOpen) return;
    setIsOpen(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    swing.value = withTiming(1, { duration: SWING_MS, easing: SWING_EASING });
  }, [isOpen, swing]);

  const bookStyle = useAnimatedStyle(() => ({
    opacity: interpolate(intro.value, [0, 1], [0, 1]),
    transform: [
      { perspective: 1200 },
      { rotateX: '5deg' },
      { scale: interpolate(intro.value, [0, 1], [0.95, 1]) },
      { translateY: interpolate(intro.value, [0, 1], [8, 0]) },
    ],
  }));

  const interiorStyle = useAnimatedStyle(() => ({
    opacity: interpolate(swing.value, [0, 0.38, 0.58, 1], [0, 0, 1, 1], Extrapolation.CLAMP),
  }));

  const coverLeafStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 1200 },
      { translateX: -pageWidth / 2 },
      { rotateY: `${interpolate(swing.value, [0, 1], [0, SWING_END_DEG])}deg` },
      { translateX: pageWidth / 2 },
    ],
  }));

  const frontFaceStyle = useAnimatedStyle(() => ({
    opacity: interpolate(swing.value, [0.47, 0.52], [1, 0], Extrapolation.CLAMP),
  }));

  const backFaceStyle = useAnimatedStyle(() => ({
    opacity: interpolate(swing.value, [0.5, 0.56], [0, 1], Extrapolation.CLAMP),
  }));

  const closedShadowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(swing.value, [0, 0.46, 0.68], [1, 1, 0], Extrapolation.CLAMP),
  }));

  const openShadowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(swing.value, [0, 0.44, 0.66, 1], [0, 0, 1, 1], Extrapolation.CLAMP),
  }));

  return (
    <View style={[styles.root, { width: spreadWidth, height: pageHeight + 46 }]}>
      <Animated.View
        style={[
          styles.shadowLayer,
          { left: pageWidth, width: pageWidth, height: pageHeight },
          closedShadowStyle,
        ]}
        pointerEvents="none"
      >
        <ContactShadow width={pageWidth} opacity={0.3} />
      </Animated.View>
      <Animated.View
        style={[styles.shadowLayer, { left: 0, width: spreadWidth, height: pageHeight }, openShadowStyle]}
        pointerEvents="none"
      >
        <ContactShadow width={spreadWidth} opacity={0.3} />
      </Animated.View>

      <Animated.View style={[styles.book, { width: spreadWidth, height: pageHeight }, bookStyle]}>
        <Animated.View
          pointerEvents={isOpen ? 'auto' : 'none'}
          style={[styles.interior, { width: spreadWidth, height: pageHeight }, interiorStyle]}
        >
          <View
            style={[
              styles.coverBoard,
              {
                width: spreadWidth + 8,
                height: pageHeight + 8,
                backgroundColor: binding.cloth,
              },
            ]}
          />

          <View style={[styles.leftPaper, { width: pageWidth, height: pageHeight }]} />

          <View style={[styles.rightPageSlot, { left: pageWidth, width: pageWidth, height: pageHeight }]}>
            <QuotePage
              quote={preset.quote ?? preset.tagline}
              foil={binding.foil}
              width={pageWidth}
              height={pageHeight}
            />
          </View>

          <LinearGradient
            colors={[Colors.legacySurface.v61, Colors.legacySurface.v59, Colors.legacySurface.v78, Colors.legacySurface.v61]}
            locations={[0, 0.4, 0.58, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.gutterShade, { left: pageWidth - 7, height: pageHeight }]}
            pointerEvents="none"
          />
        </Animated.View>

        <Animated.View
          style={[styles.coverLeaf, { left: pageWidth, width: pageWidth, height: pageHeight }, coverLeafStyle]}
        >
          <Animated.View style={[styles.coverFace, frontFaceStyle]} pointerEvents="none">
            <PhysicalBook
              title={title.trim() || preset.name}
              coverStyle={preset.id}
              width={pageWidth}
              showShadow={false}
            />
          </Animated.View>

          <Animated.View style={[styles.coverFace, styles.coverBack, backFaceStyle]} pointerEvents="none">
            <BookplatePage title={title} binding={binding} width={pageWidth} height={pageHeight} />
          </Animated.View>

          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={openBook}
            disabled={isOpen}
            accessibilityRole="button"
            accessibilityLabel={isOpen ? 'Cookbook preview open' : 'Open cookbook preview'}
            accessibilityState={{ expanded: isOpen, disabled: isOpen }}
          />
        </Animated.View>
      </Animated.View>

      <View style={styles.previewNavigation}>
        <Text style={styles.previewLabel}>
          {isOpen ? `${preset.name} visual identity` : 'Tap the cover to open'}
        </Text>
      </View>
    </View>
  );
}

function QuotePage({
  quote,
  foil,
  width,
  height,
}: {
  quote: string;
  foil: readonly [string, string, string];
  width: number;
  height: number;
}) {
  const foilColor = foil[1];
  const quoteSize = Math.max(13, Math.round(width * 0.082));
  const eyebrowSize = Math.max(7, Math.round(width * 0.042));

  return (
    <View style={[styles.page, styles.quotePageContainer, { width, height }]}>
      <View style={styles.ornamentRow}>
        <View style={[styles.ornamentRule, { backgroundColor: withAlpha(foilColor, 0.5) }]} />
        <View style={[styles.ornamentDiamond, { borderColor: withAlpha(foilColor, 0.7) }]} />
        <View style={[styles.ornamentRule, { backgroundColor: withAlpha(foilColor, 0.5) }]} />
      </View>

      <Text style={[styles.quote, { fontSize: quoteSize }]}>{quote}</Text>

      <View style={styles.ornamentRow}>
        <View style={[styles.ornamentRule, { backgroundColor: withAlpha(foilColor, 0.5) }]} />
        <View style={[styles.ornamentDiamond, { borderColor: withAlpha(foilColor, 0.7) }]} />
        <View style={[styles.ornamentRule, { backgroundColor: withAlpha(foilColor, 0.5) }]} />
      </View>

      <Text style={[styles.eyebrow, { fontSize: eyebrowSize }]}>FOLIO BINDERY</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    overflow: 'visible',
  },
  shadowLayer: {
    position: 'absolute',
    top: 0,
  },
  book: {
    position: 'relative',
  },
  interior: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  coverBoard: {
    position: 'absolute',
    left: -4,
    top: -4,
    borderRadius: Radii.numeric[11],
    boxShadow: Shadows.custom.openBook,
  },
  leftPaper: {
    position: 'absolute',
    left: 0,
    top: 0,
    backgroundColor: Colors.book.page,
    borderTopLeftRadius: 7,
    borderBottomLeftRadius: 7,
  },
  rightPageSlot: {
    position: 'absolute',
    top: 0,
    overflow: 'hidden',
    backgroundColor: Colors.book.page,
    borderTopRightRadius: 7,
    borderBottomRightRadius: 7,
  },
  gutterShade: {
    position: 'absolute',
    top: 0,
    width: 14,
    zIndex: 4,
  },
  coverLeaf: {
    position: 'absolute',
    top: 0,
    zIndex: 5,
  },
  coverFace: {
    ...StyleSheet.absoluteFillObject,
  },
  coverBack: {
    transform: [{ scaleX: -1 }],
  },
  page: {
    backgroundColor: Colors.book.page,
  },
  quotePageContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.values[14],
    paddingHorizontal: Spacing.values[16],
    paddingVertical: Spacing.values[20],
  },
  ornamentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.values[8],
  },
  ornamentRule: {
    width: 28,
    height: 1,
  },
  ornamentDiamond: {
    width: 7,
    height: 7,
    borderWidth: 1,
    transform: [{ rotate: '45deg' }],
  },
  quote: {
    fontFamily: Fonts.display.semibold,
    color: Colors.book.ink,
    textAlign: 'center',
    letterSpacing: Typography.metrics.letterSpacing02,
    lineHeight: Typography.metrics.lineHeight24,
  },
  eyebrow: {
    fontFamily: Fonts.ui.medium,
    color: Colors.book.caption,
    letterSpacing: Typography.metrics.letterSpacing24,
    textAlign: 'center',
  },
  previewNavigation: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    gap: Spacing.values[7],
  },
  previewLabel: {
    color: Colors.textSecondary,
    fontFamily: Fonts.ui.medium,
    fontSize: Typography.sizes.md,
    lineHeight: Typography.metrics.lineHeight15,
  },
});
