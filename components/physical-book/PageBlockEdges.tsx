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
}

export const PageBlockEdges = React.memo(function PageBlockEdges({
  width,
  height,
  blockWidth,
  inset = 3,
  cornerRadius = 5,
}: PageBlockEdgesProps) {
  const { paper, pageBlock } = NOSH_BOOK_MATERIAL;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View
        style={[
          styles.foreEdge,
          {
            width: blockWidth,
            right: -blockWidth + 2,
            top: inset,
            height: height - inset * 2,
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
                top: ((index + 1) / (pageBlock.striationCount + 1)) * (height - inset * 2),
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
            left: inset * 2,
            bottom: -blockWidth + 3,
            width: width - inset * 2 + blockWidth - 2,
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
            left: inset * 2,
            top: -2,
            width: width - inset * 3,
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
    height: 3,
    opacity: 0.82,
  },
});
