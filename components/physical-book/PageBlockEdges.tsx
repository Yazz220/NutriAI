import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NOSH_BOOK_MATERIAL } from '@/constants/cookbookMaterial';

/**
 * The book's page block peeking past the boards on the fore-edge. Rendered
 * beneath the cover face; the striation lines suggest individual page edges.
 */

interface PageBlockEdgesProps {
  width: number;
  height: number;
  blockWidth: number;
  inset?: number;
  cornerRadius?: number;
  rotateYDeg?: number;
}

export interface PageBlockPresentation {
  foreReveal: number;
  tailReveal: number;
  headReveal: number;
  foreInset: number;
  tailInset: number;
}

/**
 * Keeps the paper block beneath the cover boards when the book faces forward.
 * A posed book reveals a little more depth, but never the whole rectangular
 * block; the cover should continue to read as the outer physical shell.
 */
export function resolvePageBlockPresentation(
  blockWidth: number,
  inset: number,
  rotateYDeg = 0,
): PageBlockPresentation {
  const safeBlockWidth = Math.max(0, blockWidth);
  const safeInset = Math.max(0, inset);
  const poseProgress = Math.min(1, Math.abs(rotateYDeg) / 18);
  const foreBase = Math.min(2, safeBlockWidth * 0.2);
  const tailBase = Math.min(0.9, safeBlockWidth * 0.08);

  return {
    foreReveal: foreBase + poseProgress * Math.min(2, safeBlockWidth * 0.2),
    tailReveal: tailBase + poseProgress * Math.min(0.8, safeBlockWidth * 0.08),
    headReveal: Math.min(0.75, safeBlockWidth * 0.07),
    foreInset: Math.max(safeInset * 1.35, safeBlockWidth * 0.65),
    tailInset: Math.max(safeInset * 2.25, safeBlockWidth * 1.05),
  };
}

export const PageBlockEdges = React.memo(function PageBlockEdges({
  width,
  height,
  blockWidth,
  inset = 3,
  cornerRadius = 5,
  rotateYDeg = 0,
}: PageBlockEdgesProps) {
  const { paper, pageBlock } = NOSH_BOOK_MATERIAL;
  const presentation = resolvePageBlockPresentation(blockWidth, inset, rotateYDeg);
  const foreEdgeHeight = Math.max(0, height - presentation.foreInset * 2);
  const horizontalEdgeWidth = Math.max(0, width - presentation.tailInset * 2);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View
        style={[
          styles.foreEdge,
          {
            width: blockWidth,
            right: -presentation.foreReveal,
            top: presentation.foreInset,
            height: foreEdgeHeight,
            borderTopRightRadius: cornerRadius,
            borderBottomRightRadius: cornerRadius,
            borderColor: paper.edgeShade,
          },
        ]}
      >
        <LinearGradient
          colors={[paper.edgeHighlight, paper.edge, paper.edgeShade]}
          locations={[0, 0.56, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
        {Array.from({ length: pageBlock.striationCount }).map((_, index) => (
          <View
            key={index}
            style={[
              styles.foreStriation,
              {
                top: ((index + 1) / (pageBlock.striationCount + 1)) * foreEdgeHeight,
                width: index % 3 === 0 ? blockWidth - 2 : blockWidth - 4,
                backgroundColor: paper.edgeShade,
              },
            ]}
          />
        ))}
      </View>

      <View
        style={[
          styles.tailEdge,
          {
            left: presentation.tailInset,
            bottom: -presentation.tailReveal,
            width: horizontalEdgeWidth,
            height: blockWidth,
            borderBottomLeftRadius: cornerRadius,
            borderBottomRightRadius: cornerRadius,
            borderColor: paper.edgeShade,
          },
        ]}
      >
        <LinearGradient
          colors={[paper.edgeHighlight, paper.edge, paper.edgeShade]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        {Array.from({ length: 3 }).map((_, index) => (
          <View
            key={index}
            style={[
              styles.tailStriation,
              {
                top: ((index + 1) / 4) * blockWidth,
                backgroundColor: paper.edgeShade,
              },
            ]}
          />
        ))}
      </View>

      <View
        style={[
          styles.headEdge,
          {
            left: presentation.tailInset,
            top: -presentation.headReveal,
            width: horizontalEdgeWidth,
            backgroundColor: paper.edgeHighlight,
            borderTopLeftRadius: cornerRadius,
            borderTopRightRadius: cornerRadius,
          },
        ]}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  foreEdge: {
    position: 'absolute',
    borderWidth: 0.7,
    overflow: 'hidden',
    opacity: 0.84,
  },
  foreStriation: {
    position: 'absolute',
    right: 1,
    height: 0.55,
    opacity: 0.32,
  },
  tailEdge: {
    position: 'absolute',
    borderWidth: 0.7,
    overflow: 'hidden',
    opacity: 0.62,
  },
  tailStriation: {
    position: 'absolute',
    left: 3,
    right: 3,
    height: 0.5,
    opacity: 0.3,
  },
  headEdge: {
    position: 'absolute',
    height: 2,
    opacity: 0.54,
  },
});
