import React, { PropsWithChildren } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Colors } from '@/constants/colors';
import { Radii } from '@/constants/spacing';

export type TileSquareProps = PropsWithChildren<{
  size?: number; // 64–88
  radius?: number;
  style?: ViewStyle | ViewStyle[];
}>;

export const TileSquare: React.FC<TileSquareProps> = ({ size = 72, radius = Radii.md, style, children }) => {
  return (
    <View style={[styles.base, { width: size, height: size, borderRadius: radius }, style as any]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    backgroundColor: Colors.surfaceTile,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default TileSquare;
