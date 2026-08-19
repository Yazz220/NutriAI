import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

/**
 * The wooden shelf table the books stand on: a light-oak board with a top
 * highlight, a shaded front edge, and faint grain streaks and plank seams.
 * Shared by the bookshelf and the creation studio inspector.
 */

interface ShelfBoardProps {
  bottom: number;
  height: number;
}

const GRAIN_STREAKS = [0.25, 0.5, 0.78];
const PLANK_SEAMS = [0.18, 0.42, 0.66, 0.88];

export const ShelfBoard = React.memo(function ShelfBoard({ bottom, height }: ShelfBoardProps) {
  return (
    <LinearGradient
      colors={['#e0cdaf', '#cdb38f', '#b99a74']}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={[styles.board, { bottom, height }]}
      pointerEvents="none"
    >
      <View style={styles.topHighlight} />
      {GRAIN_STREAKS.map((ratio) => (
        <View key={ratio} style={[styles.grain, { top: height * ratio }]} />
      ))}
      {PLANK_SEAMS.map((ratio) => (
        <View key={ratio} style={[styles.seam, { left: `${ratio * 100}%` }]} />
      ))}
      <View style={styles.frontEdge} />
    </LinearGradient>
  );
});

const styles = StyleSheet.create({
  board: {
    position: 'absolute',
    left: -12,
    right: -12,
  },
  topHighlight: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
  },
  grain: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(96, 72, 46, 0.10)',
  },
  seam: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(96, 72, 46, 0.14)',
  },
  frontEdge: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 3,
    backgroundColor: 'rgba(96, 72, 46, 0.16)',
  },
});
