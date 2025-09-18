import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Animated,
  AccessibilityInfo
} from 'react-native';
import { Colors } from '@/constants/colors';
import { Typography, Spacing } from '@/constants/spacing';
import { HealthGoal } from '@/types/onboarding';
import { OnboardingProfileIntegration } from '@/utils/onboardingProfileIntegration';

type UnitSystem = 'metric' | 'imperial';

interface TargetWeightInputProps {
  value: number | undefined; // Always in kg
  onValueChange: (value: number | undefined) => void;
  currentWeight: number; // in kg
  height: number; // in cm
  healthGoal: HealthGoal | null;
  unitSystem: UnitSystem;
  disabled?: boolean;
}

export function TargetWeightInput({
  value,
  onValueChange,
  currentWeight,
  height,
  healthGoal,
  unitSystem,
  disabled = false
}: TargetWeightInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  
  // Animation values
  const slideAnim = React.useRef(new Animated.Value(0)).current;
  const opacityAnim = React.useRef(new Animated.Value(0)).current;

  // Check if target weight should be shown
  const shouldShowTargetWeight = healthGoal === 'lose-weight' || healthGoal === 'gain-weight';

  // Handle visibility changes with animation
  useEffect(() => {
    if (shouldShowTargetWeight && !isVisible) {
      setIsVisible(true);
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        })
      ]).start();
      
      AccessibilityInfo.announceForAccessibility('Target weight field is now available');
    } else if (!shouldShowTargetWeight && isVisible) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        })
      ]).start(() => {
        setIsVisible(false);
        onValueChange(undefined);
        setInputValue('');
        setValidationMessage(null);
      });
    }
  }, [shouldShowTargetWeight, isVisible]);

  // Convert kg to display units
  const getDisplayValue = useCallback(() => {
    if (!value) return '';
    
    if (unitSystem === 'metric') {
      return value.toFixed(1);
    } else {
      // Convert kg to lbs
      const lbs = value * 2.20462;
      return Math.round(lbs).toString();
    }
  }, [value, unitSystem]);

  // Update input value when value or unit system changes
  useEffect(() => {
    setInputValue(getDisplayValue());
  }, [getDisplayValue]);

  const validateTargetWeight = useCallback((targetKg: number) => {
    if (!height || !currentWeight) return null;
    
    const goalType = healthGoal === 'lose-weight' ? 'lose' : 'gain';
    const validation = OnboardingProfileIntegration.validateTargetWeight(
      currentWeight,
      targetKg,
      height,
      goalType
    );
    
    return validation.isValid ? null : validation.message;
  }, [currentWeight, height, healthGoal]);

  const handleInputChange = useCallback((text: string) => {
    setInputValue(text);
    
    const numValue = parseFloat(text);
    if (isNaN(numValue)) {
      setValidationMessage(null);
      return;
    }
    
    let kg: number;
    if (unitSystem === 'metric') {
      kg = numValue;
    } else {
      // Convert lbs to kg
      kg = numValue / 2.20462;
    }
    
    // Basic range validation
    if (kg < 30 || kg > 300) {
      setValidationMessage('Please enter a realistic weight');
      return;
    }
    
    // Advanced validation
    const validationMsg = validateTargetWeight(kg);
    setValidationMessage(validationMsg);
    
    if (!validationMsg) {
      onValueChange(kg);
    }
  }, [unitSystem, onValueChange, validateTargetWeight]);

  // Get ideal weight range for reference
  const idealRange = height ? OnboardingProfileIntegration.calculateIdealWeightRange(height) : null;
  
  // Get recommendation text
  const getRecommendationText = () => {
    if (!idealRange) return '';
    
    const unit = unitSystem === 'metric' ? 'kg' : 'lbs';
    const minDisplay = unitSystem === 'metric' 
      ? idealRange.min 
      : Math.round(idealRange.min * 2.20462);
    const maxDisplay = unitSystem === 'metric' 
      ? idealRange.max 
      : Math.round(idealRange.max * 2.20462);
    
    return `Healthy range: ${minDisplay}-${maxDisplay} ${unit}`;
  };

  if (!shouldShowTargetWeight) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: opacityAnim,
          transform: [{
            translateY: slideAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [-20, 0]
            })
          }]
        }
      ]}
    >
      <View style={styles.labelContainer}>
        <Text style={styles.label}>
          Target Weight
          <Text style={styles.required}> *</Text>
        </Text>
        <Text style={styles.goalText}>
          {healthGoal === 'lose-weight' ? 'Goal: Lose Weight' : 'Goal: Gain Weight'}
        </Text>
      </View>
      
      <View style={[styles.inputContainer, validationMessage && styles.errorInputContainer]}>
        <TextInput
          style={[styles.input, disabled && styles.disabledInput]}
          value={inputValue}
          onChangeText={handleInputChange}
          placeholder={unitSystem === 'metric' ? '65.0' : '143'}
          placeholderTextColor={Colors.lightText}
          keyboardType="decimal-pad"
          editable={!disabled}
          accessibilityLabel="Target weight input"
          accessibilityHint={`Enter your target weight in ${unitSystem === 'metric' ? 'kilograms' : 'pounds'}`}
        />
        <Text style={styles.unitLabel}>
          {unitSystem === 'metric' ? 'kg' : 'lbs'}
        </Text>
      </View>
      
      {validationMessage && (
        <Text style={styles.errorText}>{validationMessage}</Text>
      )}
      
      <View style={styles.infoContainer}>
        <Text style={styles.currentWeightText}>
          Current: {unitSystem === 'metric' 
            ? `${currentWeight.toFixed(1)} kg`
            : `${Math.round(currentWeight * 2.20462)} lbs`
          }
        </Text>
        
        {idealRange && (
          <Text style={styles.recommendationText}>
            {getRecommendationText()}
          </Text>
        )}
      </View>
      
      <Text style={styles.helperText}>
        {healthGoal === 'lose-weight' 
          ? 'Enter a realistic weight loss goal (1-2 lbs/week is recommended)'
          : 'Enter a realistic weight gain goal (0.5-1 lb/week is recommended)'
        }
      </Text>
    </Animated.View>
  );
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
  required: {
    color: Colors.error,
  },
  goalText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: Typography.weights.medium,
    fontStyle: 'italic',
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
  errorInputContainer: {
    borderColor: Colors.error,
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
  errorText: {
    fontSize: 12,
    color: Colors.error,
    marginTop: 4,
    fontWeight: Typography.weights.medium,
  },
  infoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
  },
  currentWeightText: {
    fontSize: 12,
    color: Colors.lightText,
    fontWeight: Typography.weights.medium,
  },
  recommendationText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: Typography.weights.medium,
  },
  helperText: {
    fontSize: 12,
    color: Colors.lightText,
    marginTop: 4,
    fontStyle: 'italic',
    lineHeight: 16,
  },
});