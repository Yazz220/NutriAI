import React from 'react';
import { View, Text, StyleSheet, ViewStyle, StyleSheet as RNStyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/spacing';

export type StatItem = { value: string | number; label: string };

export type StatRowProps = {
  items: StatItem[];
  style?: ViewStyle | ViewStyle[];
};

export const StatRow: React.FC<StatRowProps> = ({ items, style }) => {
  const hairline = RNStyleSheet.hairlineWidth;
  return (
    <View style={[styles.row, style as any]}>
      {items.map((it, idx) => (
        <View
          key={idx}
          style={[styles.cell, idx > 0 && { borderLeftWidth: hairline, borderLeftColor: Colors.border }]}
        >
          <Text style={styles.value} numberOfLines={1}>
            {it.value}
          </Text>
          <Text style={styles.label} numberOfLines={1}>
            {it.label}
          </Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  cell: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  value: {
    textAlign: 'center',
    color: Colors.text,
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.semibold,
    marginBottom: 2,
  },
  label: {
    textAlign: 'center',
    color: Colors.lightText,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.regular,
  },
});

export default StatRow;
