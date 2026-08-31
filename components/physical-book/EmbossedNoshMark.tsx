import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { NOSH_SYMBOL_PATH, NOSH_SYMBOL_VIEWBOX } from '@/constants/noshSymbol';
import { shiftColor } from '@/utils/cookbook/coverArt';

interface EmbossedNoshMarkProps {
  clothColor: string;
  coverWidth: number;
}

export const EmbossedNoshMark = React.memo(function EmbossedNoshMark({
  clothColor,
  coverWidth,
}: EmbossedNoshMarkProps) {
  const width = Math.max(24, Math.min(40, coverWidth * 0.14));
  const height = width * (NOSH_SYMBOL_VIEWBOX.height / NOSH_SYMBOL_VIEWBOX.width);
  const inset = Math.max(9, coverWidth * 0.055);

  return (
    <View
      testID="nosh-cover-maker-mark"
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.wrap, { width, height, right: inset, top: inset }]}
    >
      <Svg width={width} height={height} viewBox={`0 0 ${NOSH_SYMBOL_VIEWBOX.width} ${NOSH_SYMBOL_VIEWBOX.height}`}>
        <Path
          d={NOSH_SYMBOL_PATH}
          fill={shiftColor(clothColor, 34)}
          opacity={0.26}
          transform="translate(-9 -9)"
        />
        <Path
          d={NOSH_SYMBOL_PATH}
          fill={shiftColor(clothColor, -30)}
          opacity={0.34}
          transform="translate(10 11)"
        />
        <Path
          d={NOSH_SYMBOL_PATH}
          fill={shiftColor(clothColor, -12)}
          fillOpacity={0.16}
          stroke={shiftColor(clothColor, -34)}
          strokeOpacity={0.62}
          strokeWidth={18}
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
  },
});
