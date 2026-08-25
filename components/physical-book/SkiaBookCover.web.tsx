import { Radii } from '@/constants/spacing';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { CookbookBinding } from '@/constants/cookbookBindings';
import { shiftColor, withAlpha } from '@/utils/cookbook/coverArt';

/**
 * Web fallback for the Skia cover: same layout (cloth gradient, curved spine
 * zone, headbands, hub bands, foil border) without the SkSL grain shader or
 * weave paths, so `expo start --web` keeps working without CanvasKit.
 */

export const COVER_CORNER_RADIUS = 10;

interface SkiaBookCoverProps {
  binding: CookbookBinding;
  width: number;
  height: number;
  spineWidth: number;
}

export const SkiaBookCover = React.memo(function SkiaBookCover({
  binding,
  width,
  height,
  spineWidth,
}: SkiaBookCoverProps) {
  const { cloth, weave, foil, band, material } = binding;
  return (
    <View style={{ width, height }}>
      <LinearGradient
        colors={[shiftColor(cloth, 12), cloth, shiftColor(cloth, -16)]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[StyleSheet.absoluteFill, styles.face]}
      />

      {/* Weave hint: sparse vertical threads for cloth materials */}
      {material !== 'leather'
        ? Array.from({ length: Math.floor(width / 9) }).map((_, index) => (
            <View
              key={index}
              style={[styles.weaveLine, { left: index * 9, backgroundColor: withAlpha(weave, 0.08) }]}
            />
          ))
        : null}

      {/* Curved spine face */}
      <LinearGradient
        colors={[shiftColor(cloth, -28), shiftColor(cloth, 18), shiftColor(cloth, -22)]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        locations={[0, 0.38, 1]}
        style={[styles.spine, { width: spineWidth }]}
      />

      {/* Headbands + hub bands */}
      <View style={[styles.headband, { top: 4, width: spineWidth - 3, backgroundColor: withAlpha(band, 0.95) }]} />
      <View
        style={[styles.headband, { bottom: 4, width: spineWidth - 3, backgroundColor: withAlpha(band, 0.95) }]}
      />
      {[0.16, 0.84].map((ratio) => (
        <View
          key={ratio}
          style={[
            styles.hub,
            { top: height * ratio, width: spineWidth + 1, backgroundColor: shiftColor(cloth, 8) },
          ]}
        />
      ))}

      {/* Hinge groove */}
      <View
        style={[
          styles.hinge,
          { left: spineWidth - 1, height: height - 12, backgroundColor: withAlpha(shiftColor(cloth, -34), 0.7) },
        ]}
      />

      {/* Foil border */}
      <View
        style={[
          styles.foilBorder,
          {
            left: spineWidth + 12,
            borderColor: withAlpha(foil[1], 0.8),
            shadowColor: foil[1],
          },
        ]}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  face: {
    borderRadius: COVER_CORNER_RADIUS,
  },
  weaveLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
  },
  spine: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderTopLeftRadius: COVER_CORNER_RADIUS,
    borderBottomLeftRadius: COVER_CORNER_RADIUS,
  },
  headband: {
    position: 'absolute',
    left: 1,
    height: 5,
  },
  hub: {
    position: 'absolute',
    left: -1,
    height: 6,
    borderRadius: Radii.numeric[3],
  },
  hinge: {
    position: 'absolute',
    top: 6,
    width: 1.2,
  },
  foilBorder: {
    position: 'absolute',
    top: 12,
    right: 12,
    bottom: 12,
    borderWidth: 1,
    borderRadius: Radii.numeric[6],
  },
});
