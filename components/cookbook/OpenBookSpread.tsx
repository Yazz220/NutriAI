import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/constants/colors';

interface OpenBookSpreadProps {
  width: number;
  height: number;
  left: React.ReactNode;
  right: React.ReactNode;
}

export function OpenBookSpread({ width, height, left, right }: OpenBookSpreadProps) {
  const leafWidth = width / 2;

  return (
    <View style={[styles.scene, { width: width + 20, height: height + 24 }]}>
      <View style={[styles.castShadow, { width: width * 0.92, height: height * 0.22 }]} />
      <View style={[styles.coverEdge, { width: width + 8, height: height + 8 }]} />
      <View style={[styles.pageBlock, { width: width + 3, height: height + 5 }]}>
        <View style={styles.pageStriation} />
        <View style={[styles.pageStriation, styles.pageStriationTwo]} />
      </View>

      <View style={[styles.spread, { width, height }]}>
        <View style={[styles.leaf, styles.leftLeaf, { width: leafWidth }]}>{left}</View>
        <View style={[styles.leaf, styles.rightLeaf, { width: leafWidth }]}>{right}</View>

        <LinearGradient
          pointerEvents="none"
          colors={['rgba(23,22,20,0.10)', 'rgba(23,22,20,0.025)', 'rgba(255,255,255,0.24)']}
          locations={[0, 0.45, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.leftGutter, { left: leafWidth - 18 }]}
        />
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(255,255,255,0.18)', 'rgba(23,22,20,0.03)', 'rgba(23,22,20,0.12)']}
          locations={[0, 0.5, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.rightGutter, { left: leafWidth }]}
        />
        <View pointerEvents="none" style={[styles.binding, { left: leafWidth - 1 }]} />
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
    backgroundColor: Colors.book.coverSpine,
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
  leftGutter: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 18,
  },
  rightGutter: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 18,
  },
  binding: {
    position: 'absolute',
    top: 6,
    bottom: 6,
    width: 2,
    borderRadius: 1,
    backgroundColor: 'rgba(23,22,20,0.09)',
  },
});
