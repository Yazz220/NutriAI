import { Radii, Typography , Spacing} from '@/constants/spacing';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '@/components/ui/Text';
import { Fonts } from '@/utils/fonts';
import type { CookbookBinding } from '@/constants/cookbookBindings';
import { shiftColor, withAlpha } from '@/utils/cookbook/coverArt';

/**
 * The spine face of a bound volume, rendered head-on. On the packed shelf
 * every flank book shows this face: cloth with a rounded-face gradient,
 * silk headbands top and bottom, raised hub ribs, a gilded vertical foil
 * title, and a small stamped ornament near the foot.
 *
 * Pure RN views (not Skia) because the shelf rotates this plane with a
 * Reanimated transform every frame.
 */

interface SpineFaceProps {
  title: string;
  binding: CookbookBinding;
  /** Spine width in px (the book's thickness). */
  width: number;
  height: number;
}

const RIB_RATIOS = [0.14, 0.5, 0.86];

export const SpineFace = React.memo(function SpineFace({ title, binding, width, height }: SpineFaceProps) {
  const { cloth, foil, band } = binding;
  const titleSize = Math.max(9, Math.round(width * 0.42));
  const textTrack = height * 0.56;

  return (
    <View style={[styles.wrapper, { width, height }]}>
      {/* Rounded spine face: highlight rides off-center */}
      <LinearGradient
        colors={[shiftColor(cloth, -22), shiftColor(cloth, 14), shiftColor(cloth, -26)]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        locations={[0, 0.42, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Silk headbands */}
      <View style={[styles.headband, { top: 3, backgroundColor: withAlpha(band, 0.95) }]} />
      <View style={[styles.headband, { bottom: 3, backgroundColor: withAlpha(band, 0.95) }]} />

      {/* Raised hub ribs with their cast shadow */}
      {RIB_RATIOS.map((ratio) => (
        <View key={ratio} style={[styles.ribRow, { top: height * ratio, width }]}>
          <View style={[styles.rib, { backgroundColor: shiftColor(cloth, 10) }]} />
          <View style={[styles.ribShadow, { backgroundColor: withAlpha(shiftColor(cloth, -34), 0.5) }]} />
        </View>
      ))}

      {/* Gilded vertical title, letterpress-stamped */}
      <View style={styles.titleZone} pointerEvents="none">
        <View
          style={[
            styles.titleRotator,
            {
              width: textTrack,
              height: width,
              left: (width - textTrack) / 2,
              top: (height * 0.64 - width) / 2 + height * 0.18,
            },
          ]}
        >
          <Text
            style={[
              styles.title,
              {
                color: foil[1],
                fontSize: titleSize,
                textShadowColor: withAlpha(foil[0], 0.9),
                maxWidth: textTrack,
              },
            ]}
            numberOfLines={1}
            allowFontScaling={false}
          >
            {title}
          </Text>
        </View>
      </View>

      {/* Stamped ornament near the foot */}
      <View
        style={[
          styles.ornament,
          {
            bottom: height * 0.05,
            left: width / 2 - width * 0.14,
            width: width * 0.28,
            height: width * 0.28,
            borderColor: withAlpha(foil[1], 0.85),
          },
        ]}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: Radii.numeric[3],
    overflow: 'hidden',
  },
  headband: {
    position: 'absolute',
    left: 1,
    right: 1,
    height: 5,
    borderRadius: Radii.numeric[2],
  },
  ribRow: {
    position: 'absolute',
  },
  rib: {
    height: 5,
    borderRadius: Radii.numeric[2.5],
  },
  ribShadow: {
    height: 1,
    marginTop: Spacing.values[0.5],
  },
  titleZone: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  titleRotator: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '90deg' }],
  },
  title: {
    fontFamily: Fonts.display.semibold,
    letterSpacing: Typography.metrics.letterSpacing16,
    textTransform: 'uppercase',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 0,
    textAlign: 'center',
  },
  ornament: {
    position: 'absolute',
    borderWidth: 1.1,
    borderRadius: Radii.numeric[2],
    transform: [{ rotate: '45deg' }],
  },
});
