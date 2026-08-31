import React from 'react';
import { Image, StyleSheet, useWindowDimensions, View } from 'react-native';
import { getShelfStyle, type ShelfStyleId } from '@/constants/shelfAppearance';
import { Spacing } from '@/constants/spacing';

/**
 * The canonical Nosh shelf board. The supplied transparent asset owns the
 * wood grain, bevel, front edge, rounded ends, and contact shadow so the shelf
 * reads as one crafted object instead of a stack of simulated UI layers.
 */

interface ShelfBoardProps {
  bottom: number;
  height: number;
  shelfStyleId: ShelfStyleId;
}

// Keep the existing physical clearance contract used by the shelf carousel.
export const SHELF_LIP_HEIGHT = 7;
const SHELF_SURFACE_OVERLAP = 5;

export const ShelfBoard = React.memo(function ShelfBoard({
  bottom,
  height,
  shelfStyleId,
}: ShelfBoardProps) {
  const { width } = useWindowDimensions();
  const shelfStyle = getShelfStyle(shelfStyleId);
  const anchorHeight = height + SHELF_LIP_HEIGHT;
  const naturalAssetHeight = (width - Spacing.lg * 2) * shelfStyle.assetAspectRatio;
  const renderedHeight = Math.min(
    shelfStyle.maxRenderedHeight,
    Math.max(shelfStyle.minRenderedHeight, naturalAssetHeight),
  );

  return (
    <View
      pointerEvents="none"
      style={[styles.wrapper, { bottom, height: anchorHeight }]}
    >
      <Image
        source={shelfStyle.asset}
        style={[
          styles.image,
          {
            top: -SHELF_SURFACE_OVERLAP,
            height: renderedHeight,
          },
        ]}
        resizeMode="stretch"
        accessible={false}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: Spacing.lg,
    right: Spacing.lg,
  },
  image: {
    position: 'absolute',
    width: '100%',
  },
});
