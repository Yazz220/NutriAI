import React, { PropsWithChildren } from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { Colors } from '@/constants/colors';
import { Radii } from '@/constants/spacing';

export type IconButtonSquareProps = PropsWithChildren<{
  size?: number; // default 36
  radius?: number; // default Radii.md
  onPress?: () => void;
  disabled?: boolean;
  style?: ViewStyle | ViewStyle[];
  accessibilityLabel?: string;
}>;

export const IconButtonSquare: React.FC<IconButtonSquareProps> = ({
  size = 36,
  radius = Radii.md,
  onPress,
  disabled,
  style,
  children,
  accessibilityLabel,
}) => {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      activeOpacity={0.7}
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.base,
        { width: size, height: size, borderRadius: radius, opacity: disabled ? 0.5 : 1 },
        style as any,
      ]}
    >
      {children}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
});

export default IconButtonSquare;
