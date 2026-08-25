import { Colors } from '@/constants/colors';
import { Radii } from '@/constants/spacing';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

/**
 * The wooden shelf the books stand on. A thick oak board with:
 * - A multi-layer grain pattern (primary streaks + fine secondary grain)
 * - Plank seams with subtle shadow relief
 * - A beveled top edge (light highlight) and a thick front lip (3D depth)
 * - End caps / bookend brackets that frame the shelf
 * - A cast shadow below the board onto the wall
 * - A soft ambient-occlusion gradient where books meet the board surface
 * Shared by the bookshelf and the creation studio inspector.
 */

interface ShelfBoardProps {
  bottom: number;
  height: number;
}

// Primary grain streaks — longer, more visible horizontal lines
const GRAIN_STREAKS = [
  { ratio: 0.12, opacity: 0.07 },
  { ratio: 0.28, opacity: 0.05 },
  { ratio: 0.44, opacity: 0.08 },
  { ratio: 0.58, opacity: 0.04 },
  { ratio: 0.72, opacity: 0.06 },
  { ratio: 0.86, opacity: 0.05 },
];

// Fine secondary grain — short, faint stippling for texture density
const FINE_GRAIN = [
  { ratio: 0.18, opacity: 0.03 },
  { ratio: 0.36, opacity: 0.025 },
  { ratio: 0.52, opacity: 0.035 },
  { ratio: 0.66, opacity: 0.03 },
  { ratio: 0.80, opacity: 0.025 },
  { ratio: 0.92, opacity: 0.03 },
];

const PLANK_SEAMS = [0.16, 0.41, 0.64, 0.87];

// Subtle wood knots — small darker spots that give the wood character
const KNOTS = [
  { x: 0.22, y: 0.38, size: 6 },
  { x: 0.71, y: 0.62, size: 5 },
  { x: 0.48, y: 0.20, size: 4 },
];

// Front lip thickness — the visible 3D edge projecting toward the viewer
export const SHELF_LIP_HEIGHT = 7;

export const ShelfBoard = React.memo(function ShelfBoard({ bottom, height }: ShelfBoardProps) {
  return (
    <View style={[styles.wrapper, { bottom, height: height + SHELF_LIP_HEIGHT }]} pointerEvents="none">
      {/* Cast shadow below the board onto the wall below */}
      <LinearGradient
        colors={[Colors.legacySurface.v60, Colors.legacySurface.v55, Colors.legacySurface.v61]}
        style={styles.castShadow}
      />

      {/* Main board surface */}
      <LinearGradient
        colors={[Colors.legacySurface.v35, Colors.legacySurface.v31, Colors.legacySurface.v26, Colors.legacySurface.v25]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[styles.board, { height }]}
      >
        {/* Beveled top edge — light catches the front-top of the board */}
        <LinearGradient
          colors={[Colors.legacySurface.v73, Colors.legacySurface.v74]}
          style={styles.topBevel}
        />

        {/* Primary grain streaks */}
        {GRAIN_STREAKS.map((streak) => (
          <View
            key={`grain-${streak.ratio}`}
            style={[styles.grain, { top: height * streak.ratio, opacity: streak.opacity }]}
          />
        ))}

        {/* Fine secondary grain */}
        {FINE_GRAIN.map((streak) => (
          <View
            key={`fine-${streak.ratio}`}
            style={[styles.fineGrain, { top: height * streak.ratio, opacity: streak.opacity }]}
          />
        ))}

        {/* Plank seams with shadow relief */}
        {PLANK_SEAMS.map((ratio) => (
          <View key={`seam-${ratio}`} style={[styles.seam, { left: `${ratio * 100}%` }]}>
            <View style={styles.seamShadow} />
            <View style={styles.seamHighlight} />
          </View>
        ))}

        {/* Wood knots */}
        {KNOTS.map((knot) => (
          <View
            key={`knot-${knot.x}-${knot.y}`}
            style={[
              styles.knot,
              {
                left: `${knot.x * 100}%`,
                top: height * knot.y,
                width: knot.size,
                height: knot.size,
                borderRadius: knot.size / 2,
              },
            ]}
          />
        ))}

        {/* Ambient occlusion — subtle darkening where books sit on the board */}
        <LinearGradient
          colors={[Colors.legacySurface.v94, Colors.legacySurface.v92, Colors.legacySurface.v94]}
          style={styles.ambientOcclusion}
        />
      </LinearGradient>

      {/* Front lip / edge — gives the board visible 3D thickness */}
      <LinearGradient
        colors={[Colors.legacySurface.v22, Colors.legacySurface.v19, Colors.legacySurface.v17]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[styles.frontLip, { height: SHELF_LIP_HEIGHT }]}
      >
        <View style={styles.lipHighlight} />
      </LinearGradient>

      {/* End caps — vertical bookend brackets framing the shelf */}
      <View style={[styles.endCap, styles.endCapLeft]} />
      <View style={[styles.endCap, styles.endCapRight]} />
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: -16,
    right: -16,
  },
  board: {
    position: 'relative',
    overflow: 'hidden',
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  topBevel: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
  },
  grain: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: Colors.legacySurface.v11,
  },
  fineGrain: {
    position: 'absolute',
    left: '8%',
    right: '12%',
    height: 0.5,
    backgroundColor: Colors.legacySurface.v16,
  },
  seam: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
  },
  seamShadow: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 1,
    backgroundColor: Colors.legacySurface.v93,
  },
  seamHighlight: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 1,
    width: 1,
    backgroundColor: Colors.legacySurface.v72,
  },
  knot: {
    position: 'absolute',
    backgroundColor: Colors.legacySurface.v95,
  },
  ambientOcclusion: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 6,
  },
  frontLip: {
    position: 'relative',
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
  },
  lipHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: Colors.legacySurface.v71,
  },
  castShadow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: -14,
    height: 20,
  },
  endCap: {
    position: 'absolute',
    bottom: 0,
    width: 5,
    borderRadius: Radii.numeric[2],
  },
  endCapLeft: {
    left: 0,
    height: 26,
    backgroundColor: Colors.legacySurface.v17,
    borderTopLeftRadius: 3,
  },
  endCapRight: {
    right: 0,
    height: 26,
    backgroundColor: Colors.legacySurface.v17,
    borderTopRightRadius: 3,
  },
});
