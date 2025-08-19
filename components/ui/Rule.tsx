import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Colors } from '@/constants/colors';

export type RuleProps = {
  orientation?: 'h' | 'v';
  thickness?: number;
  color?: string;
  length?: number | string; // width for h, height for v
  style?: ViewStyle | ViewStyle[];
};

export const Rule: React.FC<RuleProps> = ({
  orientation = 'h',
  thickness,
  color = Colors.border,
  length = '100%',
  style,
}) => {
  const isH = orientation === 'h';
  const t = thickness ?? StyleSheet.hairlineWidth;
  const base: ViewStyle = isH
    ? { height: t, width: length as any, backgroundColor: color }
    : { width: t, height: length as any, backgroundColor: color };
  return <View style={[base, style as any]} />;
};

export default Rule;
