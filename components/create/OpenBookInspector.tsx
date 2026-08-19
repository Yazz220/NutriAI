/* eslint-disable react-hooks/immutability -- Reanimated shared values are intentionally mutated through their .value API. */
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
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
import { PhysicalBook } from '@/components/physical-book/PhysicalBook';
import { ContactShadow } from '@/components/physical-book/ContactShadow';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { getCookbookBindingForStyle } from '@/constants/cookbookBindings';
import type { CookbookStylePreset } from '@/constants/cookbookStyles';
import { Fonts } from '@/utils/fonts';
import { withAlpha } from '@/utils/cookbook/coverArt';

/**
 * The Open Book Inspector — a cinematic closed→open sequence.
 *
 * Phase 1 (intro, ~420ms): the closed volume fades in and settles on the
 * wooden table, front cover facing the viewer.
 *
 * Phase 2 (hold, ~140ms): the closed book rests. This is the stable stop
 * where future cover-customization (stickers, emblems) will live — the
 * closed cover is the customization canvas.
 *
 * Phase 3 (swing, ~820ms): the front cover swings open around the gutter
 * hinge. The cover leaf is two-faced: the front shows the physical cover
 * art (cloth, foil, spine); the back shows the bookplate (stamped with
 * the live title). As the cover passes edge-on, the front face fades and
 * the bookplate face fades in. The quote page is revealed underneath on
 * the right. The cover lands face-down on the left, bookplate up — the
 * final spread: bookplate left, signature quote right.
 */

interface OpenBookInspectorProps {
  preset: CookbookStylePreset;
  title: string;
  /** Available stage width. */
  width: number;
}

const INTRO_MS = 420;
const HOLD_MS = 560;
const SWING_MS = 820;
const INTRO_EASING = Easing.bezier(0.22, 0.72, 0.24, 1);
const SWING_EASING = Easing.bezier(0.45, 0, 0.15, 1);
const SWING_END_DEG = -175;

export function OpenBookInspector({ preset, title, width }: OpenBookInspectorProps) {
  const binding = getCookbookBindingForStyle(preset.id);
  const pageWidth = Math.min((width - 16) / 2, 168);
  const pageHeight = pageWidth * 1.38;
  const quote = preset.quote ?? preset.tagline;

  const intro = useSharedValue(0);
  const swing = useSharedValue(0);

  useEffect(() => {
    intro.value = withTiming(1, { duration: INTRO_MS, easing: INTRO_EASING });
    const timer = setTimeout(() => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      swing.value = withTiming(1, { duration: SWING_MS, easing: SWING_EASING });
    }, HOLD_MS);
    return () => clearTimeout(timer);
  }, [intro, swing]);

  // Whole-book intro: scale + fade + settle onto the table
  const bookStyle = useAnimatedStyle(() => ({
    opacity: interpolate(intro.value, [0, 1], [0, 1]),
    transform: [
      { perspective: 1200 },
      { rotateX: '6deg' },
      { scale: interpolate(intro.value, [0, 1], [0.94, 1]) },
      { translateY: interpolate(intro.value, [0, 1], [10, 0]) },
    ],
  }));

  // Cover leaf: swings from 0 to -175° around the gutter (left edge)
  const coverLeafStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 1200 },
      { translateX: -pageWidth / 2 },
      { rotateY: `${interpolate(swing.value, [0, 1], [0, SWING_END_DEG])}deg` },
      { translateX: pageWidth / 2 },
    ],
  }));

  // Front face (cover art): visible until the cover passes edge-on (~-89°)
  const frontFaceStyle = useAnimatedStyle(() => ({
    opacity: interpolate(swing.value, [0.47, 0.52], [1, 0], Extrapolation.CLAMP),
  }));

  // Back face (bookplate): visible after the cover passes edge-on (~-91°)
  const backFaceStyle = useAnimatedStyle(() => ({
    opacity: interpolate(swing.value, [0.50, 0.56], [0, 1], Extrapolation.CLAMP),
  }));

  // Quote page: subtle reveal as the cover lifts away
  const quotePageStyle = useAnimatedStyle(() => ({
    opacity: interpolate(swing.value, [0.2, 0.55], [0, 1], Extrapolation.CLAMP),
  }));

  return (
    <View style={[styles.root, { width: pageWidth * 2, height: pageHeight }]}>
      <ContactShadow width={pageWidth * 2} opacity={0.34} />

      <Animated.View style={[styles.book, bookStyle]}>
        {/* Right page: the signature quote (under the cover when closed) */}
        <Animated.View
          style={[styles.quotePageSlot, { left: pageWidth, width: pageWidth, height: pageHeight }, quotePageStyle]}
        >
          <QuotePage quote={quote} foil={binding.foil} width={pageWidth} height={pageHeight} />
        </Animated.View>

        {/* Gutter shadow at the spine */}
        <LinearGradient
          colors={['rgba(23,22,20,0)', 'rgba(23,22,20,0.12)', 'rgba(23,22,20,0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.gutterShade, { left: pageWidth - 6, height: pageHeight }]}
          pointerEvents="none"
        />

        {/* Cover leaf: two-faced, swings open around the gutter */}
        <Animated.View
          style={[styles.coverLeaf, { left: pageWidth, width: pageWidth, height: pageHeight }, coverLeafStyle]}
          pointerEvents="none"
        >
          {/* Front face: the physical cover art */}
          <Animated.View style={[styles.coverFace, frontFaceStyle]}>
            <PhysicalBook
              title={title.trim() || preset.name}
              coverStyle={preset.id}
              width={pageWidth}
              showShadow={false}
            />
          </Animated.View>

          {/* Back face: the bookplate (inside front cover), mirrored to read correctly */}
          <Animated.View style={[styles.coverFace, styles.coverBack, backFaceStyle]}>
            <View style={styles.mirror}>
              <BookplatePage title={title} binding={binding} width={pageWidth} height={pageHeight} />
            </View>
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

/**
 * The right page of the open spread: a signature quote in the binding's
 * ink, framed by foil ornaments. Editorial frontispiece — no spec rows,
 * no controls. Those live in the CreationStudio panel below.
 */
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

      <Text style={[styles.eyebrow, { fontSize: eyebrowSize }]}>NOSH BINDERY</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    overflow: 'visible',
  },
  book: {
    ...StyleSheet.absoluteFillObject,
  },
  quotePageSlot: {
    position: 'absolute',
    top: 0,
  },
  gutterShade: {
    position: 'absolute',
    top: 0,
    width: 12,
  },
  coverLeaf: {
    position: 'absolute',
    top: 0,
    // transformOrigin is the left edge (gutter); set via animated transforms
  },
  coverFace: {
    ...StyleSheet.absoluteFillObject,
    backfaceVisibility: 'hidden',
  },
  coverBack: {
    // The back face is seen after a -180° Y rotation, which mirrors content.
    // Pre-mirror so the bookplate reads correctly when the cover lands.
    transform: [{ scaleX: -1 }],
  },
  mirror: {
    flex: 1,
  },
  page: {
    backgroundColor: Colors.book.page,
  },
  quotePageContainer: {
    borderTopRightRadius: 6,
    borderBottomRightRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  ornamentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
    letterSpacing: 0.2,
    lineHeight: 24,
  },
  eyebrow: {
    fontFamily: Fonts.ui.medium,
    color: Colors.book.caption,
    letterSpacing: 2.4,
    textAlign: 'center',
  },
});
