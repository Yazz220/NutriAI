import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { CookbookBinding } from '@/constants/cookbookBindings';
import { resolveNoshBookMaterialGeometry } from '@/constants/cookbookMaterial';
import { shiftColor, withAlpha } from '@/utils/cookbook/coverArt';

/**
 * Web fallback for the Skia cover: same layout (cloth gradient, curved spine
 * zone and fine weave) without the SkSL grain shader or
 * weave paths, so `expo start --web` keeps working without CanvasKit.
 */

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
  const { cloth, weave, band } = binding;
  const { boardCornerRadius } = resolveNoshBookMaterialGeometry(width);
  return (
    <View style={{ width, height }}>
      <LinearGradient
        colors={[shiftColor(cloth, 12), cloth, shiftColor(cloth, -16)]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[StyleSheet.absoluteFill, styles.face, { borderRadius: boardCornerRadius }]}
      />

      {/* Weave hint follows the same finish tuning as the native renderer. */}
      {Array.from({ length: Math.ceil(width / binding.weavePattern.verticalGapMin) }).map((_, index) => (
        <View
          key={index}
          style={[
            styles.weaveLine,
            {
              left: index * binding.weavePattern.verticalGapMin,
              width: binding.weavePattern.strokeWidth,
              backgroundColor: withAlpha(weave, binding.weavePattern.opacity * 0.72),
            },
          ]}
        />
      ))}

      {/* Curved spine face */}
      <LinearGradient
        colors={[shiftColor(cloth, -28), shiftColor(cloth, 18), shiftColor(cloth, -22)]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        locations={[0, 0.38, 1]}
        style={[
          styles.spine,
          { width: spineWidth, borderTopLeftRadius: boardCornerRadius, borderBottomLeftRadius: boardCornerRadius },
        ]}
      />

      {/* Quiet head and tail caps. */}
      <View style={[styles.headband, { top: 3, width: spineWidth - 3, backgroundColor: withAlpha(band, 0.62) }]} />
      <View style={[styles.headband, { bottom: 3, width: spineWidth - 3, backgroundColor: withAlpha(band, 0.62) }]} />

      {/* Hinge groove */}
      <View
        style={[
          styles.hinge,
          { left: spineWidth - 1, height: height - 12, backgroundColor: withAlpha(shiftColor(cloth, -34), 0.7) },
        ]}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  face: {},
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
  },
  headband: {
    position: 'absolute',
    left: 1,
    height: 2,
  },
  hinge: {
    position: 'absolute',
    top: 6,
    width: 1.2,
  },
});
