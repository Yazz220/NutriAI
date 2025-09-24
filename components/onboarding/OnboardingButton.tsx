import React, { useRef } from 'react';
import { 
  TouchableOpacity, 
  Text, 
  StyleSheet, 
  Animated, 
  ActivityIndicator,
  View,
  AccessibilityRole 
} from 'react-native';
import { Colors } from '@/constants/colors';
import { Spacing, Typography, Radii } from '@/constants/spacing';

interface OnboardingButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export function OnboardingButton({
  title,
  onPress,
  variant = 'ghost',
  disabled = false,
  loading = false,
  icon,
  accessibilityLabel,
  accessibilityHint
}: OnboardingButtonProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (disabled || loading) return;
    
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0.96,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0.8,
        duration: 100,
        useNativeDriver: true,
      })
    ]).start();
  };

  const handlePressOut = () => {
    if (disabled || loading) return;
    
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      })
    ]).start();
  };

  const getButtonStyle = () => {
    const baseStyle = { ...styles.button };
    
    switch (variant) {
      case 'primary':
        Object.assign(baseStyle, styles.primaryButton);
        if (disabled) Object.assign(baseStyle, styles.disabledPrimary);
        break;
      case 'secondary':
        Object.assign(baseStyle, styles.secondaryButton);
        if (disabled) Object.assign(baseStyle, styles.disabledSecondary);
        break;
      case 'ghost':
        Object.assign(baseStyle, styles.ghostButton);
        if (disabled) Object.assign(baseStyle, styles.disabledGhost);
        break;
    }
    
    return baseStyle;
  };

  const getTextStyle = () => {
    const baseStyle = { ...styles.buttonText };
    
    switch (variant) {
      case 'primary':
        Object.assign(baseStyle, styles.primaryText);
        break;
      case 'secondary':
        Object.assign(baseStyle, styles.secondaryText);
        break;
      case 'ghost':
        Object.assign(baseStyle, styles.ghostText);
        break;
    }
    
    if (disabled) {
      Object.assign(baseStyle, styles.disabledText);
    }
    
    return baseStyle;
  };

  const accessibilityRole: AccessibilityRole = 'button';
  const accessibilityState = {
    disabled: disabled || loading,
    busy: loading
  };

  return (
    <Animated.View
      style={{
        transform: [{ scale: scaleAnim }],
        opacity: opacityAnim,
      }}
    >
      <TouchableOpacity
        style={getButtonStyle()}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        accessibilityRole={accessibilityRole}
        accessibilityLabel={accessibilityLabel || title}
        accessibilityHint={accessibilityHint}
        accessibilityState={accessibilityState}
        activeOpacity={1} // We handle opacity with our animation
      >
        <View style={styles.buttonContent}>
          {loading ? (
            <ActivityIndicator 
              size="small" 
              color={variant === 'primary' ? Colors.onPrimary : Colors.primary}
              style={styles.loadingIndicator}
            />
          ) : (
            <>
              {icon && <View style={styles.iconContainer}>{icon}</View>}
              <Text style={getTextStyle()}>{title}</Text>
            </>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: Radii.lg, // More organic rounded shape
    minHeight: 56,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2.5, // Consistent border for organic look
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: Typography.weights.semibold,
    textAlign: 'center',
  },
  iconContainer: {
    marginRight: 8,
  },
  loadingIndicator: {
    marginRight: 0,
  },
  
    // Primary button keeps the rich herb fill
  primaryButton: {
    backgroundColor: Colors.primary, // brand fill
    borderColor: Colors.primaryDark,
  },
  primaryText: {
    color: Colors.onPrimary,
  },
  disabledPrimary: {
    backgroundColor: Colors.surfaceMuted,
    borderColor: Colors.borderMuted,
  },

  // Secondary button leans on soft surfaces
  secondaryButton: {
    backgroundColor: Colors.surface,
    borderColor: Colors.primaryLight,
  },
  secondaryText: {
    color: Colors.primary,
  },
  disabledSecondary: {
    backgroundColor: Colors.surfaceMuted,
    borderColor: Colors.border,
  },

  // Ghost button uses the warm squash outline
  ghostButton: {
    backgroundColor: 'transparent',
    borderColor: Colors.secondary,
    shadowOpacity: 0,
    elevation: 0,
  },
  ghostText: {
    color: Colors.secondary,
  },
  disabledGhost: {
    backgroundColor: 'transparent',
    borderColor: Colors.borderMuted,
  },

    // Disabled text
  disabledText: {
    color: Colors.lightText,
  },
});


