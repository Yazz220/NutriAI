import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/constants/colors';
import { NOSH_BOOK_MATERIAL, resolveNoshBookMaterialGeometry } from '@/constants/cookbookMaterial';
import { Shadows } from '@/constants/spacing';
import { shiftColor, withAlpha } from '@/utils/cookbook/coverArt';

interface OpenBookSpreadProps {
  width: number;
  height: number;
  left: React.ReactNode;
  right: React.ReactNode;
  coverColor?: string;
}

interface BookBlockUnderlayProps {
  width: number;
  height: number;
  coverColor?: string;
}

export const BOOK_GUTTER_WIDTH = 14;

/** Shared boards and warm paper block beneath both spread and single-page views. */
export function BookBlockUnderlay({ width, height, coverColor = Colors.book.coverSpine }: BookBlockUnderlayProps) {
  const canonicalPageWidth = width > height ? width / 2 : width;
  const geometry = resolveNoshBookMaterialGeometry(canonicalPageWidth);
  const { paper } = NOSH_BOOK_MATERIAL;
  const coverWidth = width + geometry.boardDepth * 2;
  const coverHeight = height + geometry.boardDepth * 2;
  const blockWidth = width + geometry.pageBlockInset;
  const blockHeight = height + geometry.pageBlockInset * 1.5;

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.underlay]}>
      <View style={[styles.castShadow, { width: width * 0.9, height: height * 0.22 }]} />
      <LinearGradient
        colors={[shiftColor(coverColor, -18), coverColor, shiftColor(coverColor, -10)]}
        locations={[0, 0.42, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.coverEdge,
          {
            width: coverWidth,
            height: coverHeight,
            marginLeft: -coverWidth / 2,
            marginTop: -coverHeight / 2 + 4,
            borderRadius: geometry.boardCornerRadius,
          },
        ]}
      />
      <LinearGradient
        colors={[paper.edgeHighlight, paper.edge, paper.edgeShade]}
        locations={[0, 0.68, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[
          styles.pageBlock,
          {
            width: blockWidth,
            height: blockHeight,
            marginLeft: -blockWidth / 2,
            marginTop: -blockHeight / 2 + 1,
            borderRadius: geometry.pageCornerRadius,
            borderColor: paper.edgeShade,
          },
        ]}
      >
        {Array.from({ length: 4 }).map((_, index) => (
          <View
            key={index}
            style={[
              styles.pageStriation,
              {
                bottom: 1 + index * 1.25,
                backgroundColor: paper.edgeShade,
                opacity: 0.16 + index * 0.035,
              },
            ]}
          />
        ))}
      </LinearGradient>
    </View>
  );
}

/** A restrained inner-edge falloff that makes each flat page meet the binding. */
export function BookLeafShade({ side }: { side: 'left' | 'right' }) {
  const { gutterShade, gutterCore } = NOSH_BOOK_MATERIAL.light;
  return (
    <LinearGradient
      pointerEvents="none"
      colors={
        side === 'left'
          ? ['rgba(255, 255, 255, 0)', gutterShade, gutterCore]
          : [gutterCore, gutterShade, 'rgba(255, 255, 255, 0)']
      }
      locations={[0, 0.68, 1]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={[styles.leafShade, side === 'left' ? styles.leftShade : styles.rightShade]}
    />
  );
}

export function BookGutter({ height, style }: { height: number; style?: StyleProp<ViewStyle> }) {
  const { gutterShade, gutterCore } = NOSH_BOOK_MATERIAL.light;
  return (
    <View pointerEvents="none" style={[styles.gutter, { width: BOOK_GUTTER_WIDTH, height }, style]}>
      <LinearGradient
        colors={['rgba(255, 255, 255, 0)', gutterShade, gutterCore, gutterShade, 'rgba(255, 255, 255, 0)']}
        locations={[0, 0.3, 0.5, 0.7, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.binding} />
    </View>
  );
}

export function OpenBookSpread({
  width,
  height,
  left,
  right,
  coverColor = Colors.book.coverSpine,
}: OpenBookSpreadProps) {
  const leafWidth = width / 2;

  return (
    <View style={[styles.scene, { width: width + 20, height: height + 24 }]}>
      <BookBlockUnderlay width={width} height={height} coverColor={coverColor} />
      <View style={[styles.spread, { width, height }]}>
        <View style={[styles.leaf, styles.leftLeaf, { width: leafWidth }]}>
          {left}
          <BookLeafShade side="left" />
        </View>
        <View style={[styles.leaf, styles.rightLeaf, { width: leafWidth }]}>
          {right}
          <BookLeafShade side="right" />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scene: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  underlay: {
    alignItems: 'center',
  },
  castShadow: {
    position: 'absolute',
    alignSelf: 'center',
    bottom: -3,
    borderRadius: 999,
    backgroundColor: NOSH_BOOK_MATERIAL.light.ambientShadow,
    transform: [{ scaleY: 0.42 }],
    boxShadow: Shadows.custom.spread,
  },
  coverEdge: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    boxShadow: Shadows.custom.spreadSoft,
  },
  pageBlock: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    borderWidth: 0.7,
    overflow: 'hidden',
  },
  pageStriation: {
    position: 'absolute',
    left: 8,
    right: 8,
    height: 0.6,
  },
  spread: {
    flexDirection: 'row',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: NOSH_BOOK_MATERIAL.paper.face,
  },
  leaf: {
    height: '100%',
    overflow: 'hidden',
    backgroundColor: NOSH_BOOK_MATERIAL.paper.face,
  },
  leftLeaf: {
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  rightLeaf: {
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
  },
  leafShade: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 22,
    zIndex: 3,
  },
  leftShade: {
    right: 0,
  },
  rightShade: {
    left: 0,
  },
  gutter: {
    position: 'absolute',
    overflow: 'hidden',
  },
  binding: {
    position: 'absolute',
    left: BOOK_GUTTER_WIDTH / 2 - 0.35,
    top: 7,
    bottom: 7,
    width: 0.7,
    backgroundColor: withAlpha(NOSH_BOOK_MATERIAL.paper.edgeShade, 0.72),
  },
});
