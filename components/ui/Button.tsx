import React, { useRef } from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle, Animated } from 'react-native';
import { Colors } from '@/constants/colors';
import { Spacing, Typography, Shadows } from '@/constants/spacing';
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
  shape = 'capsule',
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
        toValue: 0.95,
        useNativeDriver: true,
        tension: 300,
        friction: 10,
      }).start();
    }
  };

  const handlePressOut = () => {
    if (!isDisabled) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 300,
        friction: 10,
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

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
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
          <LoadingSpinner
            size="small"
            color={
              variant === 'primary'
                ? Colors.onPrimary
                : variant === 'danger'
                ? Colors.onError
                : Colors.primary
            }
          />
        ) : (
          icon && (typeof icon === 'string' ? (
            <Text style={textStyles}>{icon}</Text>
          ) : (
            <>{icon}</>
          ))
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
    borderRadius: 6, // more rectangular corners per new spec
  },
  capsule: {
    borderRadius: 999,
  },
  
  // Variants
  primary: {
    backgroundColor: Colors.primary,
  },
  secondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.lightGray, // stroke.hard
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  danger: {
    backgroundColor: Colors.error,
  },
  
  // Sizes
  xs: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    minHeight: 28,
    gap: Spacing.xs,
  },
  sm: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.xs,
  },
  md: {
    paddingHorizontal: 24, // spec paddingH
    paddingVertical: Spacing.md,
    minHeight: 48, // rectangular height
    gap: Spacing.sm,
  },
  lg: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    gap: Spacing.md,
  },
  
  // States
  disabled: {
    opacity: 0.4,
  },
  fullWidth: {
    width: '100%',
  },
  
  // Text styles
  text: {
    fontFamily: Fonts.ui?.semibold ?? undefined,
    fontWeight: Typography.weights.medium, // 500 per JSON subtitle weight
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  primaryText: {
    color: Colors.onPrimary,
  },
  secondaryText: {
    color: Colors.primary, // fg brand on surface
  },
  outlineText: {
    color: Colors.primary,
  },
  ghostText: {
    color: Colors.primary,
  },
  dangerText: {
    color: Colors.onError,
  },
  disabledText: {
    opacity: 0.7,
  },
  
  // Size text
  xsText: {
    fontSize: Typography.sizes.xs,
  },
  smText: {
    fontSize: Typography.sizes.sm,
  },
  mdText: {
    fontSize: Typography.sizes.lg, // subtitle per JSON labelStyle
  },
  lgText: {
    fontSize: Typography.sizes.lg,
  },
});