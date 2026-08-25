import { Spacing } from '@/constants/spacing';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Colors } from '@/constants/colors';

/**
 * The book's page block peeking past the boards on the fore-edge. Rendered
 * beneath the cover face; the striation lines suggest individual page edges.
 */

interface PageBlockEdgesProps {
  height: number;
  blockWidth: number;
}

const STRIATIONS = 4;

export const PageBlockEdges = React.memo(function PageBlockEdges({
  height,
  blockWidth,
}: PageBlockEdgesProps) {
  return (
    <View
      style={[
        styles.block,
        {
          width: blockWidth,
          right: -blockWidth + 2,
          top: 3,
          height: height - 6,
        },
      ]}
    >
      {Array.from({ length: STRIATIONS }).map((_, index) => (
        <View
          key={index}
          style={[
            styles.striation,
            { width: index % 2 === 0 ? blockWidth - 3 : blockWidth - 5 },
          ]}
        />
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  block: {
    position: 'absolute',
    backgroundColor: Colors.book.pageWarm,
    borderWidth: 1,
    borderColor: Colors.book.edge,
    borderTopRightRadius: 3,
    borderBottomRightRadius: 3,
    justifyContent: 'center',
    alignItems: 'flex-end',
    gap: Spacing.values[4],
    paddingRight: Spacing.values[1],
  },
  striation: {
    height: 1,
    backgroundColor: Colors.book.edgeStrong,
    opacity: 0.5,
  },
});
