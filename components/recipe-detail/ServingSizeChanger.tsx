import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Vibration,
  Platform,
} from 'react-native';
import { Minus, Plus, Users, Calculator } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/colors';
import { Spacing, Typography } from '@/constants/spacing';

interface ServingSizeChangerProps {
  originalServings: number;
  currentServings: number;
  onServingsChange: (servings: number) => void;
  minServings?: number;
  maxServings?: number;
  allowFractions?: boolean;
  showNutritionPreview?: boolean;
  caloriesPerServing?: number;
  style?: any;
}

export const ServingSizeChanger: React.FC<ServingSizeChangerProps> = ({
  originalServings,
  currentServings,
  onServingsChange,
  minServings = 0.5,
  maxServings = 20,
  allowFractions = true,
  showNutritionPreview = true,
  caloriesPerServing,
  style,
}) => {
  const [scaleAnimation] = useState(new Animated.Value(1));
  const [isChanging, setIsChanging] = useState(false);

  // Calculate scale factor and total calories
  const scaleFactor = currentServings / originalServings;
  const totalCalories = caloriesPerServing ? Math.round(caloriesPerServing * currentServings) : null;
  const isScaled = Math.abs(currentServings - originalServings) > 0.01;

  // Animate when servings change
  useEffect(() => {
    if (isChanging) {
      Animated.sequence([
        Animated.timing(scaleAnimation, {
          toValue: 1.1,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnimation, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start(() => setIsChanging(false));
    }
  }, [currentServings]);

  const handleServingsChange = (newServings: number) => {
    // Clamp to min/max bounds
    const clampedServings = Math.max(minServings, Math.min(maxServings, newServings));
    
    if (clampedServings !== currentServings) {
      setIsChanging(true);
      onServingsChange(clampedServings);
      
      // Haptic feedback
      if (Platform.OS === 'ios') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } else {
        Vibration.vibrate(10);
      }
    }
  };

  const increment = () => {
    const step = allowFractions ? 0.5 : 1;
    handleServingsChange(currentServings + step);
  };

  const decrement = () => {
    const step = allowFractions ? 0.5 : 1;
    handleServingsChange(currentServings - step);
  };

  const formatServings = (servings: number): string => {
    // Smart formatting for display
    if (servings === Math.floor(servings)) {
      return servings.toString();
    } else {
      return servings.toFixed(1);
    }
  };

  const getScaleDescription = (): string => {
    if (!isScaled) return '';
    
    if (scaleFactor > 1) {
      return `${scaleFactor.toFixed(1)}x larger than original`;
    } else {
      return `${(1/scaleFactor).toFixed(1)}x smaller than original`;
    }
  };

  const canDecrement = currentServings > minServings;
  const canIncrement = currentServings < maxServings;

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity
        style={[styles.controlButton, !canDecrement && styles.controlButtonDisabled]}
        onPress={decrement}
        disabled={!canDecrement}
        accessibilityRole="button"
        accessibilityLabel="Decrease servings"
      >
        <Minus size={20} color={canDecrement ? Colors.text : Colors.lightText} />
      </TouchableOpacity>

      <Animated.View
        style={[
          styles.servingsDisplay,
          { transform: [{ scale: scaleAnimation }] }
        ]}
      >
        <Text style={styles.servingsNumber}>{formatServings(currentServings)}</Text>
      </Animated.View>

      <TouchableOpacity
        style={[styles.controlButton, !canIncrement && styles.controlButtonDisabled]}
        onPress={increment}
        disabled={!canIncrement}
        accessibilityRole="button"
        accessibilityLabel="Increase servings"
      >
        <Plus size={20} color={canIncrement ? Colors.text : Colors.lightText} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  header: {
    marginBottom: Spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  title: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
    flex: 1,
    marginLeft: Spacing.sm,
  },
  caloriesBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 10,
  },
  caloriesText: {
    color: Colors.white,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.medium,
  },
  scaleDescription: {
    fontSize: Typography.sizes.xs,
    color: Colors.lightText,
    fontStyle: 'italic',
  },
  controlContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  controlButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlButtonDisabled: {
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    opacity: 0.5,
  },
  servingsDisplay: {
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: Spacing.sm,
    minWidth: 60,
  },
  servingsNumber: {
    fontSize: 20,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    lineHeight: 24,
  },
  servingsLabel: {
    fontSize: Typography.sizes.xs,
    color: Colors.lightText,
    fontWeight: Typography.weights.medium,
    marginTop: 1,
  },
  scaleIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.tints.brandTintSoft,
    borderRadius: 6,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  scaleText: {
    fontSize: Typography.sizes.xs,
    color: Colors.primary,
    fontWeight: Typography.weights.medium,
    marginLeft: Spacing.xs,
  },
});