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
  presentation?: 'book' | 'swatch';
}

const ORGANIC_SPACING = [0.76, 1.22, 0.9, 1.34, 0.84, 1.08];

function buildFiberPositions(length: number, gap: number, organic: boolean, spacingOffset = 0) {
  const positions: number[] = [];
  for (
    let position = 0, index = 0;
    position <= length;
    index += 1, position += gap * (organic ? ORGANIC_SPACING[(index + spacingOffset) % ORGANIC_SPACING.length] : 1)
  ) {
    positions.push(position);
  }
  return positions;
}

export const SkiaBookCover = React.memo(function SkiaBookCover({
  binding,
  width,
  height,
  spineWidth,
  presentation = 'book',
}: SkiaBookCoverProps) {
  const { cloth, weave, band } = binding;
  const isLinen = binding.material === 'linen';
  const isSwatch = presentation === 'swatch';
  const geometry = resolveNoshBookMaterialGeometry(width);
  const boardCornerRadius = isSwatch ? Math.min(10, width * 0.16) : geometry.boardCornerRadius;
  const verticalGap = Math.max(
    binding.weavePattern.verticalGapMin,
    width / binding.weavePattern.verticalGapRatio,
  );
  const horizontalGap = Math.max(
    binding.weavePattern.horizontalGapMin,
    width / binding.weavePattern.horizontalGapRatio,
  );
  const verticalFibers = buildFiberPositions(width, verticalGap, isLinen);
  const horizontalFibers = buildFiberPositions(height, horizontalGap, isLinen, 2);

  return (
    <View style={{ width, height, borderRadius: boardCornerRadius, overflow: 'hidden' }}>
      <LinearGradient
        colors={[shiftColor(cloth, 12), cloth, shiftColor(cloth, -16)]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[StyleSheet.absoluteFill, styles.face, { borderRadius: boardCornerRadius }]}
      />

      {/* Tight cloth stays regular; linen uses broader, uneven cross-fibers. */}
      {verticalFibers.map((position, index) => {
        const isSlub = isLinen && index % 5 === 2;
        return (
        <View
          key={`vertical-${index}`}
          style={[
            styles.weaveLine,
            {
              left: position,
              width: binding.weavePattern.strokeWidth * (isSlub ? 1.75 : 1),
              backgroundColor: withAlpha(
                isSlub ? shiftColor(weave, 16) : weave,
                binding.weavePattern.opacity * (isSlub ? 0.8 : 0.72),
              ),
              transform: isLinen ? [{ rotate: `${((index % 3) - 1) * 0.35}deg` }] : undefined,
            },
          ]}
        />
        );
      })}
      {horizontalFibers.map((position, index) => (
        <View
          key={`horizontal-${index}`}
          style={[
            styles.horizontalWeaveLine,
            {
              top: position,
              height: binding.weavePattern.strokeWidth * (isLinen && index % 6 === 3 ? 1.55 : 1),
              backgroundColor: withAlpha(weave, binding.weavePattern.opacity * 0.64),
              transform: isLinen ? [{ rotate: `${((index % 3) - 1) * 0.25}deg` }] : undefined,
            },
          ]}
        />
      ))}

      {!isSwatch ? (
        <>
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
        </>
      ) : (
        <View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, styles.swatchBorder, { borderColor: withAlpha(shiftColor(cloth, -28), 0.34) }]}
        />
      )}
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
  horizontalWeaveLine: {
    position: 'absolute',
    left: 0,
    right: 0,
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
  swatchBorder: {
    borderWidth: 1,
    borderRadius: 10,
  },
});
