import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Colors } from '@/constants/colors';

export type RuleProps = {
  orientation?: 'h' | 'v';
  thickness?: number;
  color?: string;
  length?: ViewStyle['width']; // width for h, height for v
  style?: StyleProp<ViewStyle>;
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
    ? { height: t, width: length, backgroundColor: color }
    : { width: t, height: length, backgroundColor: color };
  return <View style={[base, style]} />;
};

export default Rule;
