import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/spacing';

export type TabsUnderlineItem = { key: string; label: string };

export type TabsUnderlineProps = {
  items: TabsUnderlineItem[];
  value: string;
  onChange: (key: string) => void;
  style?: ViewStyle | ViewStyle[];
};

export const TabsUnderline: React.FC<TabsUnderlineProps> = ({ items, value, onChange, style }) => {
  return (
    <View style={[styles.container, style as any]}>
      {items.map((it) => {
        const active = it.key === value;
        return (
          <TouchableOpacity
            key={it.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(it.key)}
            style={styles.tab}
          >
            <Text style={[styles.label, active && styles.labelActive]}>{it.label}</Text>
            <View style={[styles.indicator, active && styles.indicatorActive]} />
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  label: {
    fontSize: Typography.h3.fontSize,
    fontWeight: Typography.h3.fontWeight,
    color: Colors.lightText,
  },
  labelActive: {
    color: Colors.text,
  },
  indicator: {
    height: 2,
    width: '100%',
    backgroundColor: 'transparent',
    marginTop: 6,
  },
  indicatorActive: {
    backgroundColor: Colors.primary,
  },
});

export default TabsUnderline;
