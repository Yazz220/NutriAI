import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Check } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { Spacing, Typography } from '@/constants/spacing';
import { OnboardingStep } from '@/types';

interface ProgressIndicatorProps {
  currentStep: OnboardingStep;
  completedSteps: Set<OnboardingStep>;
  totalSteps?: number;
  showLabels?: boolean;
  compact?: boolean;
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  currentStep,
  completedSteps,
  totalSteps = 7,
  showLabels = false,
  compact = false,
}) => {
  const progressAnim = useRef(new Animated.Value(0)).current;
  const scaleAnims = useRef(
    Array.from({ length: totalSteps }, () => new Animated.Value(1))
  ).current;

  // Calculate progress percentage
  const progressPercentage = ((currentStep + 1) / totalSteps) * 100;

  // Animate progress bar
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progressPercentage,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [progressPercentage, progressAnim]);

  // Animate step indicators
  useEffect(() => {
    scaleAnims.forEach((anim, index) => {
      const isActive = index === currentStep;
      const isCompleted = completedSteps.has(index as OnboardingStep);
      
      if (isActive || isCompleted) {
        Animated.spring(anim, {
          toValue: 1.1,
          useNativeDriver: true,
          tension: 300,
          friction: 10,
        }).start(() => {
          Animated.spring(anim, {
            toValue: 1,
            useNativeDriver: true,
            tension: 300,
            friction: 10,
          }).start();
        });
      }
    });
  }, [currentStep, completedSteps, scaleAnims]);

  const getStepLabel = (step: number): string => {
    const labels = [
      'Welcome',
      'Account',
      'Diet',
      'Habits',
      'Inventory',
      'AI Coach',
      'Complete',
    ];
    return labels[step] || `Step ${step + 1}`;
  };

  const renderStepIndicator = (step: number) => {
    const isActive = step === currentStep;
    const isCompleted = completedSteps.has(step as OnboardingStep);
    const isPast = step < currentStep;
    const isFuture = step > currentStep;

    let backgroundColor = Colors.gray[300];
    let borderColor = Colors.gray[300];
    let textColor = Colors.lightText;

    if (isCompleted) {
      backgroundColor = Colors.success;
      borderColor = Colors.success;
      textColor = Colors.white;
    } else if (isActive) {
      backgroundColor = Colors.primary;
      borderColor = Colors.primary;
      textColor = Colors.white;
    } else if (isPast) {
      backgroundColor = Colors.gray[400];
      borderColor = Colors.gray[400];
      textColor = Colors.lightText;
    }

    return (
      <Animated.View
        key={step}
        style={[
          styles.stepIndicator,
          compact && styles.stepIndicatorCompact,
          {
            backgroundColor,
            borderColor,
            transform: [{ scale: scaleAnims[step] }],
          },
        ]}
      >
        {isCompleted ? (
          <Check size={compact ? 12 : 16} color={Colors.white} />
        ) : (
          <Text
            style={[
              styles.stepNumber,
              compact && styles.stepNumberCompact,
              { color: textColor },
            ]}
          >
            {step + 1}
          </Text>
        )}
      </Animated.View>
    );
  };

  const renderStepLabel = (step: number) => {
    if (!showLabels) return null;

    const isActive = step === currentStep;
    const isCompleted = completedSteps.has(step as OnboardingStep);

    return (
      <Text
        key={`label-${step}`}
        style={[
          styles.stepLabel,
          compact && styles.stepLabelCompact,
          (isActive || isCompleted) && styles.stepLabelActive,
        ]}
      >
        {getStepLabel(step)}
      </Text>
    );
  };

  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      {/* Progress Bar Background */}
      <View style={[styles.progressTrack, compact && styles.progressTrackCompact]}>
        {/* Animated Progress Fill */}
        <Animated.View
          style={[
            styles.progressFill,
            compact && styles.progressFillCompact,
            {
              width: progressAnim.interpolate({
                inputRange: [0, 100],
                outputRange: ['0%', '100%'],
                extrapolate: 'clamp',
              }),
            },
          ]}
        />
      </View>

      {/* Step Indicators */}
      <View style={[styles.stepsContainer, compact && styles.stepsContainerCompact]}>
        {Array.from({ length: totalSteps }, (_, index) => (
          <View key={index} style={styles.stepWrapper}>
            {renderStepIndicator(index)}
            {renderStepLabel(index)}
          </View>
        ))}
      </View>

      {/* Progress Text */}
      {!compact && (
        <View style={styles.progressTextContainer}>
          <Text style={styles.progressText}>
            Step {currentStep + 1} of {totalSteps}
          </Text>
          <Text style={styles.progressPercentage}>
            {Math.round(progressPercentage)}% Complete
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
  },
  containerCompact: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },

  // Progress Track
  progressTrack: {
    height: 4,
    backgroundColor: Colors.gray[200],
    borderRadius: 2,
    marginBottom: Spacing.lg,
  },
  progressTrackCompact: {
    height: 2,
    marginBottom: Spacing.md,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  progressFillCompact: {
    backgroundColor: Colors.primary,
  },

  // Steps Container
  stepsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  stepsContainerCompact: {
    marginBottom: Spacing.sm,
  },

  // Step Wrapper
  stepWrapper: {
    alignItems: 'center',
    flex: 1,
  },

  // Step Indicator
  stepIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  stepIndicatorCompact: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: Spacing.xs / 2,
  },

  // Step Number
  stepNumber: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },
  stepNumberCompact: {
    fontSize: Typography.sizes.xs,
  },

  // Step Label
  stepLabel: {
    fontSize: Typography.sizes.xs,
    color: Colors.lightText,
    textAlign: 'center',
    fontWeight: Typography.weights.medium,
  },
  stepLabelCompact: {
    fontSize: 10,
  },
  stepLabelActive: {
    color: Colors.text,
    fontWeight: Typography.weights.semibold,
  },

  // Progress Text
  progressTextContainer: {
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  progressText: {
    fontSize: Typography.sizes.sm,
    color: Colors.text,
    fontWeight: Typography.weights.medium,
    marginBottom: Spacing.xs / 2,
  },
  progressPercentage: {
    fontSize: Typography.sizes.xs,
    color: Colors.lightText,
    fontWeight: Typography.weights.regular,
  },
});