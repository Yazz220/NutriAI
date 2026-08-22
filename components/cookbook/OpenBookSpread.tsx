import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/constants/colors';

interface OpenBookSpreadProps {
  width: number;
  height: number;
  left: React.ReactNode;
  right: React.ReactNode;
  coverColor?: string;
}

export const BOOK_GUTTER_WIDTH = 14;

export function BookGutter({ height, style }: { height: number; style?: StyleProp<ViewStyle> }) {
  return (
    <View pointerEvents="none" style={[styles.gutter, { width: BOOK_GUTTER_WIDTH, height }, style]}>
      <LinearGradient
        colors={[
          'rgba(23,22,20,0)',
          'rgba(23,22,20,0.055)',
          'rgba(23,22,20,0.12)',
          'rgba(23,22,20,0.055)',
          'rgba(23,22,20,0)',
        ]}
        locations={[0, 0.32, 0.5, 0.68, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.binding} />
    </View>
  );
}

export function OpenBookSpread({ width, height, left, right, coverColor = Colors.book.coverSpine }: OpenBookSpreadProps) {
  const leafWidth = width / 2;

  return (
    <View style={[styles.scene, { width: width + 20, height: height + 24 }]}>
      <View style={[styles.castShadow, { width: width * 0.92, height: height * 0.22 }]} />
      <View style={[styles.coverEdge, { width: width + 8, height: height + 8, backgroundColor: coverColor }]} />
      <View style={[styles.pageBlock, { width: width + 3, height: height + 5 }]}>
        <View style={styles.pageStriation} />
        <View style={[styles.pageStriation, styles.pageStriationTwo]} />
      </View>

      <View style={[styles.spread, { width, height }]}>
        <View style={[styles.leaf, styles.leftLeaf, { width: leafWidth }]}>{left}</View>
        <View style={[styles.leaf, styles.rightLeaf, { width: leafWidth }]}>{right}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scene: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  castShadow: {
    position: 'absolute',
    bottom: -3,
    borderRadius: 999,
    backgroundColor: 'rgba(23, 22, 20, 0.22)',
    transform: [{ scaleY: 0.42 }],
    boxShadow: '0 22px 30px rgba(23, 22, 20, 0.22)',
  },
  coverEdge: {
    position: 'absolute',
    borderRadius: 11,
    transform: [{ translateY: 4 }],
    boxShadow: '0 18px 32px rgba(23, 22, 20, 0.18)',
  },
  pageBlock: {
    position: 'absolute',
    borderRadius: 9,
    backgroundColor: Colors.book.pageWarm,
    borderWidth: 1,
    borderColor: Colors.book.edgeStrong,
    transform: [{ translateY: 1 }],
    overflow: 'hidden',
  },
  pageStriation: {
    position: 'absolute',
    left: 8,
    right: 8,
    bottom: 2,
    height: 1,
    backgroundColor: Colors.book.edge,
  },
  pageStriationTwo: {
    bottom: 4,
    opacity: 0.58,
  },
  spread: {
    flexDirection: 'row',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: Colors.book.page,
  },
  leaf: {
    height: '100%',
    overflow: 'hidden',
    backgroundColor: Colors.book.page,
  },
  leftLeaf: {
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  rightLeaf: {
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
  },
  gutter: {
    position: 'absolute',
    overflow: 'hidden',
  },
  binding: {
    position: 'absolute',
    left: BOOK_GUTTER_WIDTH / 2 - 0.5,
    top: 6,
    bottom: 6,
    width: 1,
    backgroundColor: 'rgba(23,22,20,0.13)',
  },
});
