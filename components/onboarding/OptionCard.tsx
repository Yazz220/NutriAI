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

interface OptionCardProps {
  title: string;
  description?: string;
  icon: React.ReactNode;
  selected: boolean;
  onPress: () => void;
  multiSelect?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export function OptionCard({
  title,
  description,
  icon,
  selected,
  onPress,
  multiSelect = false,
  disabled = false,
  accessibilityLabel,
  accessibilityHint
}: OptionCardProps) {
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
    outputRange: [Colors.card, Colors.primary + '10'], // 10% opacity
  });

  const accessibilityRole: AccessibilityRole = multiSelect ? 'checkbox' : 'radio';
  const accessibilityState = {
    selected,
    disabled,
    checked: selected, // For checkbox role
  };

  const selectionIndicator = multiSelect ? (
    <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
      {selected && <View style={styles.checkboxInner} />}
    </View>
  ) : (
    <View style={[styles.radio, selected && styles.radioSelected]}>
      {selected && <View style={styles.radioInner} />}
    </View>
  );

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
        accessibilityHint={accessibilityHint || (description ? `${title}. ${description}` : title)}
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
          <View style={styles.iconContainer}>
            {icon}
          </View>
          
          <View style={styles.textContainer}>
            <Text style={[styles.title, disabled && styles.disabledText]}>
              {title}
            </Text>
            {description && (
              <Text style={[styles.description, disabled && styles.disabledText]}>
                {description}
              </Text>
            )}
          </View>
          
          <View style={styles.selectionContainer}>
            {selectionIndicator}
          </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    borderRadius: 16,
    borderWidth: 2,
    backgroundColor: Colors.card,
    minHeight: 80, // Ensures adequate touch target
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  disabledCard: {
    opacity: 0.6,
  },
  iconContainer: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  textContainer: {
    flex: 1,
    marginRight: Spacing.md,
  },
  title: {
    fontSize: 16,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: Colors.lightText,
    lineHeight: 20,
  },
  disabledText: {
    color: Colors.lightText,
  },
  selectionContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Checkbox styles (for multi-select)
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  checkboxInner: {
    width: 12,
    height: 12,
    backgroundColor: Colors.white,
    borderRadius: 2,
  },
  
  // Radio button styles (for single select)
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioSelected: {
    borderColor: Colors.primary,
  },
  radioInner: {
    width: 12,
    height: 12,
    backgroundColor: Colors.primary,
    borderRadius: 6,
  },
});