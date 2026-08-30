import React, { PropsWithChildren } from 'react';
import { TouchableOpacity, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Colors } from '@/constants/colors';
import { Radii } from '@/constants/spacing';

export type IconButtonSquareProps = PropsWithChildren<{
  size?: number; // default 44
  radius?: number; // default capsule/circle
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}>;

export const IconButtonSquare: React.FC<IconButtonSquareProps> = ({
  size = 44,
  radius = Radii.full,
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
      activeOpacity={0.82}
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.base,
        { width: size, height: size, borderRadius: radius, opacity: disabled ? 0.5 : 1 },
        style,
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
    backgroundColor: Colors.white,
  },
});

export default IconButtonSquare;
