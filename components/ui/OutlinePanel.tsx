import React, { PropsWithChildren } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Colors } from '@/constants/colors';
import { Radii, Spacing } from '@/constants/spacing';

export type OutlinePanelProps = PropsWithChildren<{
  radius?: number;
  stroke?: string;
  padding?: number;
  style?: ViewStyle | ViewStyle[];
}>;

export const OutlinePanel: React.FC<OutlinePanelProps> = ({
  radius = Radii.md,
  stroke = 'rgba(0,0,0,0.18)',
  padding = Spacing.md,
  style,
  children,
}) => {
  return (
    <View style={[styles.base, { borderRadius: radius, borderColor: stroke, padding }, style as any]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    backgroundColor: Colors.background,
    borderWidth: 1,
  },
});

export default OutlinePanel;
