import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';
import { getInventoryIcon } from '@/utils/inventoryIcons';

export type InventoryIconProps = {
  category?: string;
  size?: number;
  color?: string;
  strokeWidth?: number;
  background?: 'none' | 'subtle';
};

export const InventoryIcon: React.FC<InventoryIconProps> = ({
  category,
  size = 18,
  color = Colors.text,
  strokeWidth = 2,
  background = 'none',
}) => {
  const icon = getInventoryIcon(category, { size, color, strokeWidth });
  if (background === 'subtle') {
    return <View style={[styles.bg, { width: size + 12, height: size + 12, borderRadius: (size + 12) / 2 }]}>{icon}</View>;
  }
  return icon as any;
};

const styles = StyleSheet.create({
  bg: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.tabBackground,
    borderWidth: 1,
    borderColor: Colors.border,
  },
});

export default InventoryIcon;
