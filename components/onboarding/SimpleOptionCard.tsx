import React, { useRef, useEffect } from 'react';
import {
  TouchableOpacity,
  Text,
  View,
  StyleSheet,
  Animated,
  AccessibilityRole
} from 'react-native';
import { Colors } from '@/constants/colors';
import { Spacing, Typography } from '@/constants/spacing';

interface SimpleOptionCardProps {
  title: string;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export function SimpleOptionCard({
  title,
  selected,
  onPress,
  disabled = false,
  accessibilityLabel,
  accessibilityHint
}: SimpleOptionCardProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const borderColorAnim = useRef(new Animated.Value(0)).current;
  const backgroundColorAnim = useRef(new Animated.Value(0)).current;

  // Animate selection state changes
  useEffect(() => {
    Animated.parallel([
      Animated.timing(borderColorAnim, {
        toValue: selected ? 1 : 0,
        duration: 200,
        useNativeDriver: false,
      }),
      Animated.timing(backgroundColorAnim, {
        toValue: selected ? 1 : 0,
        duration: 200,
        useNativeDriver: false,
      })
    ]).start();
  }, [selected]);

  const handlePressIn = () => {
    if (disabled) return;
    
    Animated.timing(scaleAnim, {
      toValue: 0.98,
      duration: 100,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    if (disabled) return;
    
    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: 100,
      useNativeDriver: true,
    }).start();
  };

  const animatedBorderColor = borderColorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [Colors.border, Colors.primary],
  });

  const animatedBackgroundColor = backgroundColorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [Colors.white, Colors.primary + '08'], // Very subtle background tint
  });

  const accessibilityRole: AccessibilityRole = 'radio';
  const accessibilityState = {
    selected,
    disabled,
    checked: selected,
  };

  return (
    <Animated.View
      style={{
        transform: [{ scale: scaleAnim }],
      }}
    >
      <TouchableOpacity
        style={[
          styles.card,
          disabled && styles.disabledCard,
        ]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        accessibilityRole={accessibilityRole}
        accessibilityLabel={accessibilityLabel || title}
        accessibilityHint={accessibilityHint || `Select ${title} as your goal`}
        accessibilityState={accessibilityState}
        activeOpacity={1} // We handle the press animation manually
      >
        <Animated.View
          style={[
            styles.cardContent,
            {
              borderColor: animatedBorderColor,
              backgroundColor: animatedBackgroundColor,
            }
          ]}
        >
          <Text style={[styles.title, disabled && styles.disabledText]}>
            {title}
          </Text>
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: Spacing.md,
  },
  cardContent: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    borderRadius: 16,
    borderWidth: 1.5,
    backgroundColor: Colors.white,
    minHeight: 64,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  disabledCard: {
    opacity: 0.6,
  },
  title: {
    fontSize: 18,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
    textAlign: 'center',
  },
  disabledText: {
    color: Colors.lightText,
  },
});
