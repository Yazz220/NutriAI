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
import { Spacing, Typography } from '@/constants/spacing';

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
              color={variant === 'primary' ? Colors.white : Colors.primary}
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
    borderRadius: 16,
    minHeight: 56, // Ensures minimum touch target size
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
  
  // Primary button styles
  primaryButton: {
    backgroundColor: Colors.primary,
  },
  primaryText: {
    color: Colors.white,
  },
  disabledPrimary: {
    backgroundColor: Colors.lightGray,
  },
  
  // Secondary button styles
  secondaryButton: {
    backgroundColor: Colors.card,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  secondaryText: {
    color: Colors.text,
  },
  disabledSecondary: {
    backgroundColor: Colors.lightGray,
    borderColor: Colors.lightGray,
  },
  
  // Ghost button styles
  ghostButton: {
    backgroundColor: 'transparent',
    shadowOpacity: 0,
    elevation: 0,
  },
  ghostText: {
    color: Colors.primary,
  },
  disabledGhost: {
    backgroundColor: 'transparent',
  },
  
  // Disabled text
  disabledText: {
    color: Colors.lightText,
  },
});