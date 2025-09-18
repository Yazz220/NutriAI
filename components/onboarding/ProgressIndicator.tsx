import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, AccessibilityInfo } from 'react-native';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/spacing';

interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
  animated?: boolean;
}

export function ProgressIndicator({ 
  currentStep, 
  totalSteps, 
  animated = true 
}: ProgressIndicatorProps) {
  const progressAnim = useRef(new Animated.Value(0)).current;
  const progress = currentStep / totalSteps;

  useEffect(() => {
    if (animated) {
      Animated.timing(progressAnim, {
        toValue: progress,
        duration: 300,
        useNativeDriver: false,
      }).start();
    } else {
      progressAnim.setValue(progress);
    }

    // Announce progress change for screen readers
    const progressText = `Step ${currentStep} of ${totalSteps}`;
    AccessibilityInfo.announceForAccessibility(progressText);
  }, [progress, animated, currentStep, totalSteps]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.container}>
      <View style={styles.progressBarContainer}>
        <View style={styles.progressBarBackground}>
          <Animated.View 
            style={[
              styles.progressBarFill,
              { width: progressWidth }
            ]}
          />
        </View>
      </View>
      
      <Text 
        style={styles.progressText}
        accessibilityLabel={`Step ${currentStep} of ${totalSteps}`}
        accessibilityRole="text"
      >
        {currentStep} of {totalSteps}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressBarContainer: {
    flex: 1,
    marginRight: 16,
  },
  progressBarBackground: {
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  progressText: {
    fontSize: 14,
    fontWeight: Typography.weights.medium,
    color: Colors.lightText,
    minWidth: 50,
    textAlign: 'right',
  },
});