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
    borderRadius: 28, // More organic rounded shape
    minHeight: 56,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2.5, // Consistent border for organic look
    shadowColor: '#000',
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
  
  // Primary button - Solid green (like filled rectangles in your design)
  primaryButton: {
    backgroundColor: '#8FBC8F', // Soft sage green
    borderColor: '#6B8E6B', // Darker green border
  },
  primaryText: {
    color: '#2F4F2F', // Dark green text for contrast
  },
  disabledPrimary: {
    backgroundColor: '#D3D3D3',
    borderColor: '#B0B0B0',
  },
  
  // Secondary button - Light green with border (like outlined shapes)
  secondaryButton: {
    backgroundColor: '#F0F8F0', // Very light green
    borderColor: '#8FBC8F', // Sage green border
  },
  secondaryText: {
    color: '#2F4F2F', // Dark green text
  },
  disabledSecondary: {
    backgroundColor: '#F5F5F5',
    borderColor: '#D3D3D3',
  },
  
  // Ghost button - Orange accent (like the orange elements in your design)
  ghostButton: {
    backgroundColor: 'transparent',
    borderColor: '#CD853F', // Sandy brown/orange
    shadowOpacity: 0,
    elevation: 0,
  },
  ghostText: {
    color: '#CD853F', // Orange text
  },
  disabledGhost: {
    backgroundColor: 'transparent',
    borderColor: '#D3D3D3',
  },
  
  // Disabled text
  disabledText: {
    color: '#999999',
  },
});