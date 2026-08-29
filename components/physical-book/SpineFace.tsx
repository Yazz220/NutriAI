import { Radii, Typography } from '@/constants/spacing';
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
 * quiet head and tail caps, a shallow shoulder on either side, and a
 * restrained vertical title. It shares the same cloth as the front board.
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

export const SpineFace = React.memo(function SpineFace({ title, binding, width, height }: SpineFaceProps) {
  const { cloth, foil, band, weave } = binding;
  const titleSize = Math.max(9, Math.round(width * 0.36));
  const textTrack = height * 0.56;
  const threadCount = binding.finishId === 'natural-linen' ? 7 : 9;
  const threadOpacity = binding.finishId === 'natural-linen' ? 0.2 : 0.13;

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

      {/* The threads are deliberately quiet. They should read as cloth, not decoration. */}
      {Array.from({ length: threadCount }).map((_, index) => (
        <View
          key={index}
          style={[
            styles.thread,
            {
              left: ((index + 1) / (threadCount + 1)) * width,
              width: binding.weavePattern.strokeWidth,
              backgroundColor: withAlpha(index % 2 === 0 ? weave : shiftColor(weave, 12), threadOpacity),
            },
          ]}
        />
      ))}

      <View style={[styles.shoulder, { left: 1, backgroundColor: withAlpha(shiftColor(cloth, -28), 0.36) }]} />
      <View style={[styles.shoulder, { right: 1, backgroundColor: withAlpha(shiftColor(cloth, 16), 0.28) }]} />

      {/* Compact caps replace the old decorative silk bands and raised ribs. */}
      <View style={[styles.headband, { top: 2, backgroundColor: withAlpha(band, 0.62) }]} />
      <View style={[styles.headband, { bottom: 2, backgroundColor: withAlpha(band, 0.62) }]} />

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
    left: 2,
    right: 2,
    height: 2,
    borderRadius: Radii.numeric[2],
  },
  thread: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 0.6,
  },
  shoulder: {
    position: 'absolute',
    top: 5,
    bottom: 5,
    width: 1,
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
});
