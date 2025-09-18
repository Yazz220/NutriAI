import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  AccessibilityInfo
} from 'react-native';
import { Colors } from '@/constants/colors';
import { Typography, Spacing } from '@/constants/spacing';

interface AgeSliderProps {
  value: number;
  onValueChange: (value: number) => void;
  minimumValue?: number;
  maximumValue?: number;
  step?: number;
  disabled?: boolean;
  accessibilityLabel?: string;
}

export function AgeSlider({
  value,
  onValueChange,
  minimumValue = 13,
  maximumValue = 120,
  step = 1,
  disabled = false,
  accessibilityLabel = 'Age input'
}: AgeSliderProps) {
  
  const handleDecrease = useCallback(() => {
    if (disabled || value <= minimumValue) return;
    const newValue = Math.max(minimumValue, value - step);
    onValueChange(newValue);
    AccessibilityInfo.announceForAccessibility(`Age decreased to ${newValue} years`);
  }, [value, minimumValue, step, disabled, onValueChange]);

  const handleIncrease = useCallback(() => {
    if (disabled || value >= maximumValue) return;
    const newValue = Math.min(maximumValue, value + step);
    onValueChange(newValue);
    AccessibilityInfo.announceForAccessibility(`Age increased to ${newValue} years`);
  }, [value, maximumValue, step, disabled, onValueChange]);

  return (
    <View style={styles.container}>
      <View style={styles.labelContainer}>
        <Text style={styles.label}>Age</Text>
        <Text style={styles.valueText}>{value} years</Text>
      </View>
      
      <View style={styles.inputContainer}>
        <TouchableOpacity
          style={[styles.button, (disabled || value <= minimumValue) && styles.disabledButton]}
          onPress={handleDecrease}
          disabled={disabled || value <= minimumValue}
          accessibilityLabel="Decrease age"
          accessibilityRole="button"
        >
          <Text style={[styles.buttonText, (disabled || value <= minimumValue) && styles.disabledButtonText]}>
            −
          </Text>
        </TouchableOpacity>
        
        <View style={styles.valueContainer}>
          <Text style={styles.displayValue}>{value}</Text>
          <Text style={styles.categoryText}>{getAgeCategory(value)}</Text>
        </View>
        
        <TouchableOpacity
          style={[styles.button, (disabled || value >= maximumValue) && styles.disabledButton]}
          onPress={handleIncrease}
          disabled={disabled || value >= maximumValue}
          accessibilityLabel="Increase age"
          accessibilityRole="button"
        >
          <Text style={[styles.buttonText, (disabled || value >= maximumValue) && styles.disabledButtonText]}>
            +
          </Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.rangeLabels}>
        <Text style={styles.rangeLabel}>Min: {minimumValue}</Text>
        <Text style={styles.rangeLabel}>Max: {maximumValue}</Text>
      </View>
    </View>
  );
}

function getAgeCategory(age: number): string {
  if (age < 18) return 'Teen';
  if (age < 25) return 'Young Adult';
  if (age < 35) return 'Adult';
  if (age < 50) return 'Middle Age';
  if (age < 65) return 'Mature Adult';
  return 'Senior';
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: Spacing.md,
  },
  labelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: 16,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
  },
  valueText: {
    fontSize: 16,
    fontWeight: Typography.weights.medium,
    color: Colors.lightText,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: Spacing.md,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  button: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  disabledButton: {
    backgroundColor: Colors.lightGray,
  },
  buttonText: {
    fontSize: 24,
    fontWeight: Typography.weights.bold,
    color: Colors.white,
  },
  disabledButtonText: {
    color: Colors.lightText,
  },
  valueContainer: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: Spacing.lg,
  },
  displayValue: {
    fontSize: 32,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    marginBottom: 4,
  },
  categoryText: {
    fontSize: 14,
    color: Colors.lightText,
    fontWeight: Typography.weights.medium,
    fontStyle: 'italic',
  },
  rangeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.sm,
  },
  rangeLabel: {
    fontSize: 12,
    color: Colors.lightText,
    fontWeight: Typography.weights.medium,
  },
});