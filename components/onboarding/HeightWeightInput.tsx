import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  AccessibilityInfo
} from 'react-native';
import { Colors } from '@/constants/colors';
import { Typography, Spacing } from '@/constants/spacing';

type UnitSystem = 'metric' | 'imperial';

interface HeightInputProps {
  value: number; // Always in cm
  onValueChange: (value: number) => void;
  unitSystem: UnitSystem;
  onUnitSystemChange: (system: UnitSystem) => void;
  disabled?: boolean;
}

interface WeightInputProps {
  value: number; // Always in kg
  onValueChange: (value: number) => void;
  unitSystem: UnitSystem;
  onUnitSystemChange: (system: UnitSystem) => void;
  disabled?: boolean;
}

export function HeightInput({
  value,
  onValueChange,
  unitSystem,
  onUnitSystemChange,
  disabled = false
}: HeightInputProps) {
  const [inputValue, setInputValue] = useState('');

  // Convert cm to display units
  const getDisplayValue = useCallback(() => {
    if (unitSystem === 'metric') {
      return Math.round(value).toString();
    } else {
      // Convert cm to feet and inches
      const totalInches = value / 2.54;
      const feet = Math.floor(totalInches / 12);
      const inches = Math.round(totalInches % 12);
      return `${feet}'${inches}"`;
    }
  }, [value, unitSystem]);

  // Update input value when value or unit system changes
  React.useEffect(() => {
    setInputValue(getDisplayValue());
  }, [getDisplayValue]);

  const handleInputChange = useCallback((text: string) => {
    setInputValue(text);
    
    if (unitSystem === 'metric') {
      // Parse cm directly
      const cm = parseFloat(text);
      if (!isNaN(cm) && cm >= 100 && cm <= 250) {
        onValueChange(cm);
      }
    } else {
      // Parse feet and inches (e.g., "5'8" or "5 8" or "68")
      const parsed = parseImperialHeight(text);
      if (parsed) {
        const cm = parsed * 2.54;
        if (cm >= 100 && cm <= 250) {
          onValueChange(cm);
        }
      }
    }
  }, [unitSystem, onValueChange]);

  const handleUnitToggle = useCallback(() => {
    const newSystem = unitSystem === 'metric' ? 'imperial' : 'metric';
    onUnitSystemChange(newSystem);
    AccessibilityInfo.announceForAccessibility(`Switched to ${newSystem} units`);
  }, [unitSystem, onUnitSystemChange]);

  return (
    <View style={styles.container}>
      <View style={styles.labelContainer}>
        <Text style={styles.label}>Height</Text>
        <TouchableOpacity
          style={styles.unitToggle}
          onPress={handleUnitToggle}
          disabled={disabled}
          accessibilityLabel={`Switch to ${unitSystem === 'metric' ? 'imperial' : 'metric'} units`}
          accessibilityRole="button"
        >
          <Text style={styles.unitText}>
            {unitSystem === 'metric' ? 'cm' : 'ft/in'}
          </Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.inputContainer}>
        <TextInput
          style={[styles.input, disabled && styles.disabledInput]}
          value={inputValue}
          onChangeText={handleInputChange}
          placeholder={unitSystem === 'metric' ? '170' : `5'8"`}
          placeholderTextColor={Colors.lightText}
          keyboardType="numeric"
          editable={!disabled}
          accessibilityLabel="Height input"
          accessibilityHint={`Enter your height in ${unitSystem === 'metric' ? 'centimeters' : 'feet and inches'}`}
        />
        <Text style={styles.unitLabel}>
          {unitSystem === 'metric' ? 'cm' : 'ft/in'}
        </Text>
      </View>
      
      <Text style={styles.helperText}>
        {unitSystem === 'metric' 
          ? 'Enter height in centimeters (e.g., 170)'
          : `Enter as feet'inches (e.g., 5'8") or total inches`
        }
      </Text>
    </View>
  );
}

export function WeightInput({
  value,
  onValueChange,
  unitSystem,
  onUnitSystemChange,
  disabled = false
}: WeightInputProps) {
  const [inputValue, setInputValue] = useState('');

  // Convert kg to display units
  const getDisplayValue = useCallback(() => {
    if (unitSystem === 'metric') {
      return value.toFixed(1);
    } else {
      // Convert kg to lbs
      const lbs = value * 2.20462;
      return Math.round(lbs).toString();
    }
  }, [value, unitSystem]);

  // Update input value when value or unit system changes
  React.useEffect(() => {
    setInputValue(getDisplayValue());
  }, [getDisplayValue]);

  const handleInputChange = useCallback((text: string) => {
    setInputValue(text);
    
    const numValue = parseFloat(text);
    if (isNaN(numValue)) return;
    
    let kg: number;
    if (unitSystem === 'metric') {
      kg = numValue;
    } else {
      // Convert lbs to kg
      kg = numValue / 2.20462;
    }
    
    // Validate range (30-300 kg)
    if (kg >= 30 && kg <= 300) {
      onValueChange(kg);
    }
  }, [unitSystem, onValueChange]);

  const handleUnitToggle = useCallback(() => {
    const newSystem = unitSystem === 'metric' ? 'imperial' : 'metric';
    onUnitSystemChange(newSystem);
    AccessibilityInfo.announceForAccessibility(`Switched to ${newSystem} units`);
  }, [unitSystem, onUnitSystemChange]);

  return (
    <View style={styles.container}>
      <View style={styles.labelContainer}>
        <Text style={styles.label}>Weight</Text>
        <TouchableOpacity
          style={styles.unitToggle}
          onPress={handleUnitToggle}
          disabled={disabled}
          accessibilityLabel={`Switch to ${unitSystem === 'metric' ? 'imperial' : 'metric'} units`}
          accessibilityRole="button"
        >
          <Text style={styles.unitText}>
            {unitSystem === 'metric' ? 'kg' : 'lbs'}
          </Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.inputContainer}>
        <TextInput
          style={[styles.input, disabled && styles.disabledInput]}
          value={inputValue}
          onChangeText={handleInputChange}
          placeholder={unitSystem === 'metric' ? '70.0' : '154'}
          placeholderTextColor={Colors.lightText}
          keyboardType="decimal-pad"
          editable={!disabled}
          accessibilityLabel="Weight input"
          accessibilityHint={`Enter your weight in ${unitSystem === 'metric' ? 'kilograms' : 'pounds'}`}
        />
        <Text style={styles.unitLabel}>
          {unitSystem === 'metric' ? 'kg' : 'lbs'}
        </Text>
      </View>
      
      <Text style={styles.helperText}>
        {unitSystem === 'metric' 
          ? 'Enter weight in kilograms (e.g., 70.5)'
          : 'Enter weight in pounds (e.g., 154)'
        }
      </Text>
    </View>
  );
}

// Helper function to parse imperial height input
function parseImperialHeight(input: string): number | null {
  // Remove spaces and convert to lowercase
  const cleaned = input.replace(/\s/g, '').toLowerCase();
  
  // Try to match patterns like "5'8", "5'8"", "5ft8in", etc.
  const feetInchesMatch = cleaned.match(/^(\d+)['ft]?(\d+)["in]?$/);
  if (feetInchesMatch) {
    const feet = parseInt(feetInchesMatch[1]);
    const inches = parseInt(feetInchesMatch[2]);
    return feet * 12 + inches;
  }
  
  // Try to match just feet like "5'" or "5ft"
  const feetOnlyMatch = cleaned.match(/^(\d+)['ft]?$/);
  if (feetOnlyMatch) {
    const feet = parseInt(feetOnlyMatch[1]);
    return feet * 12;
  }
  
  // Try to parse as total inches
  const totalInches = parseInt(cleaned);
  if (!isNaN(totalInches) && totalInches >= 36 && totalInches <= 96) {
    return totalInches;
  }
  
  return null;
}

const styles = StyleSheet.create({
  container: {
    marginVertical: Spacing.md,
  },
  labelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  label: {
    fontSize: 16,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
  },
  unitToggle: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    backgroundColor: Colors.primary + '15',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  unitText: {
    fontSize: 12,
    fontWeight: Typography.weights.semibold,
    color: Colors.primary,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: 12,
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  input: {
    flex: 1,
    paddingVertical: Spacing.md,
    fontSize: 16,
    color: Colors.text,
    fontWeight: Typography.weights.medium,
  },
  disabledInput: {
    color: Colors.lightText,
    backgroundColor: Colors.lightGray,
  },
  unitLabel: {
    fontSize: 14,
    color: Colors.lightText,
    fontWeight: Typography.weights.medium,
    marginLeft: Spacing.sm,
  },
  helperText: {
    fontSize: 12,
    color: Colors.lightText,
    marginTop: 4,
    fontStyle: 'italic',
  },
});