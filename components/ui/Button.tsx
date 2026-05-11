import React, { useRef } from 'react';
import { Animated, StyleSheet, Text, TextStyle, TouchableOpacity, ViewStyle } from 'react-native';
import { Colors } from '@/constants/colors';
import { Spacing, Radii } from '@/constants/spacing';
import { Tokens } from '@/constants/tokens';
import { Fonts } from '@/utils/fonts';
import { LoadingSpinner } from './LoadingSpinner';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  shape?: 'rect' | 'capsule';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
  testID?: string;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  shape = 'rect',
  disabled = false,
  loading = false,
  fullWidth = false,
  icon,
  style,
  textStyle,
  testID,
  accessibilityLabel,
  accessibilityHint,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const isDisabled = disabled || loading;

  const handlePressIn = () => {
    if (!isDisabled) {
      Animated.spring(scaleAnim, {
        toValue: 0.98,
        useNativeDriver: true,
        tension: 260,
        friction: 16,
      }).start();
    }
  };

  const handlePressOut = () => {
    if (!isDisabled) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 260,
        friction: 16,
      }).start();
    }
  };

  const buttonStyle = [
    styles.base,
    styles[variant],
    styles[size],
    shape === 'capsule' && styles.capsule,
    fullWidth && styles.fullWidth,
    isDisabled && styles.disabled,
    style,
  ];

  const textStyles = [
    styles.text,
    styles[`${variant}Text`],
    styles[`${size}Text`],
    isDisabled && styles.disabledText,
    textStyle,
  ];

  const spinnerColor =
    variant === 'primary' || variant === 'danger' ? Colors.onPrimary : Colors.text;

  return (
    <Animated.View style={[fullWidth && styles.fullWidth, { transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity
        style={buttonStyle}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isDisabled}
        testID={testID}
        activeOpacity={1}
        accessibilityLabel={accessibilityLabel || title}
        accessibilityHint={accessibilityHint}
        accessibilityRole="button"
        accessibilityState={{ disabled: isDisabled }}
      >
        {loading ? (
          <LoadingSpinner size="small" color={spinnerColor} />
        ) : (
          icon && (typeof icon === 'string' ? <Text style={textStyles}>{icon}</Text> : <>{icon}</>)
        )}
        {!loading && <Text style={textStyles}>{title}</Text>}
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radii.sm,
    borderCurve: 'continuous',
  },
  capsule: {
    borderRadius: Radii.full,
  },
  primary: {
    backgroundColor: Tokens.component.button.primary.container.bg,
  },
  secondary: {
    backgroundColor: Tokens.component.button.secondary.container.bg,
    borderWidth: Tokens.component.button.secondary.border.width,
    borderColor: Tokens.component.button.secondary.border.color,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.borderStrong,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  danger: {
    backgroundColor: Tokens.component.button.danger.container.bg,
  },
  xs: {
    minHeight: 30,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    gap: Spacing.xs,
  },
  sm: {
    minHeight: 36,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.xs,
  },
  md: {
    minHeight: 44,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  lg: {
    minHeight: 52,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  disabled: {
    opacity: Colors.state.disabledOpacity,
  },
  fullWidth: {
    width: '100%',
  },
  text: {
    fontFamily: Fonts.ui.medium,
    fontWeight: '500',
    textAlign: 'center',
    letterSpacing: 0,
  },
  primaryText: {
    color: Colors.onPrimary,
  },
  secondaryText: {
    color: Colors.text,
  },
  outlineText: {
    color: Colors.text,
  },
  ghostText: {
    color: Colors.text,
  },
  dangerText: {
    color: Colors.onError,
  },
  disabledText: {
    opacity: 0.7,
  },
  xsText: {
    fontSize: 12,
    lineHeight: 16,
  },
  smText: {
    fontSize: 13,
    lineHeight: 18,
  },
  mdText: {
    fontSize: 14,
    lineHeight: 20,
  },
  lgText: {
    fontSize: 16,
    lineHeight: 24,
  },
});
