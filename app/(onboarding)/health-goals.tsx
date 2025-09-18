import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Animated } from 'react-native';
import { OnboardingScreenWrapper, OnboardingButton, OptionCard, useOnboarding } from '@/components/onboarding';

import { HealthGoal } from '@/types/onboarding';
import { Colors } from '@/constants/colors';
import { Typography, Spacing } from '@/constants/spacing';

const healthGoalOptions: Array<{
  id: HealthGoal;
  title: string;
  description: string;
  icon: string;
}> = [
  {
    id: 'lose-weight',
    title: 'Lose Weight',
    description: 'Create a calorie deficit and lose weight safely',
    icon: '📉'
  },
  {
    id: 'gain-weight',
    title: 'Gain Weight',
    description: 'Build healthy mass with proper nutrition',
    icon: '📈'
  },
  {
    id: 'maintain-weight',
    title: 'Maintain Weight',
    description: 'Keep your current weight with balanced nutrition',
    icon: '⚖️'
  },
  {
    id: 'build-muscle',
    title: 'Build Muscle',
    description: 'Optimize protein intake for muscle growth',
    icon: '💪'
  },
  {
    id: 'improve-health',
    title: 'Improve Health',
    description: 'Focus on overall wellness and nutrition quality',
    icon: '❤️'
  },
  {
    id: 'manage-restrictions',
    title: 'Manage Dietary Restrictions',
    description: 'Navigate food allergies and dietary limitations',
    icon: '🚫'
  }
];

export default function HealthGoalsScreen() {
  const { updateOnboardingData, nextStep, previousStep, onboardingData, validateCurrentStep } = useOnboarding();

  const [selectedGoal, setSelectedGoal] = useState<HealthGoal | null>(onboardingData.healthGoal);
  const [error, setError] = useState<string | null>(null);
  
  // Animation values
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerTranslateY = useRef(new Animated.Value(-20)).current;
  const cardAnimations = useRef<Animated.Value[]>(
    healthGoalOptions.map(() => new Animated.Value(0))
  ).current;

  useEffect(() => {
    // Entrance animations
    const headerAnimation = Animated.parallel([
      Animated.timing(headerOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(headerTranslateY, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      })
    ]);

    const cardAnimTimings = cardAnimations.map((anim: Animated.Value, index: number) => (
      Animated.timing(anim, {
        toValue: 1,
        duration: 400,
        delay: index * 100,
        useNativeDriver: true,
      })
    ));

    Animated.sequence([
      headerAnimation,
      Animated.delay(200),
      Animated.stagger(100, cardAnimTimings)
    ]).start();
  }, []);

  const handleGoalSelect = (goal: HealthGoal) => {
    setSelectedGoal(goal);
    updateOnboardingData('healthGoal', goal);
    setError(null);
  };

  const handleContinue = () => {
    if (!selectedGoal) {
      setError('Please select a health goal to continue');
      return;
    }

    const validation = validateCurrentStep();
    if (!validation.canProceed) {
      setError(validation.missingFields.join(', '));
      return;
    }

    nextStep();
  };

  const handleBack = () => {
    previousStep();
  };

  return (
    <OnboardingScreenWrapper>
      <View style={styles.container}>
        <Animated.View 
          style={[
            styles.header,
            {
              opacity: headerOpacity,
              transform: [{ translateY: headerTranslateY }]
            }
          ]}
        >
          <Text style={styles.title}>What's your primary goal?</Text>
          <Text style={styles.subtitle}>
            This helps us personalize your nutrition recommendations and calorie targets
          </Text>
        </Animated.View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {healthGoalOptions.map((option, index) => (
            <Animated.View
              key={option.id}
              style={{
                opacity: cardAnimations[index],
                transform: [{
                  translateY: cardAnimations[index].interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0]
                  })
                }]
              }}
            >
              <OptionCard
                title={option.title}
                description={option.description}
                icon={<Text style={styles.optionIcon}>{option.icon}</Text>}
                selected={selectedGoal === option.id}
                onPress={() => handleGoalSelect(option.id)}
                accessibilityLabel={`Select ${option.title} as your health goal`}
                accessibilityHint={option.description}
              />
            </Animated.View>
          ))}
        </ScrollView>

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.footer}>
          <View style={styles.buttonRow}>
            <OnboardingButton
              title="Back"
              onPress={handleBack}
              variant="ghost"
              accessibilityLabel="Go back to welcome screen"
            />
            <OnboardingButton
              title="Continue"
              onPress={handleContinue}
              variant="primary"
              disabled={!selectedGoal}
              accessibilityLabel="Continue to basic profile setup"
              accessibilityHint={selectedGoal ? `Continue with ${selectedGoal} goal` : 'Select a goal first'}
            />
          </View>
        </View>
      </View>
    </OnboardingScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    marginBottom: 8,
    lineHeight: 36,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.lightText,
    lineHeight: 24,
    fontWeight: Typography.weights.medium,
  },
  content: {
    flex: 1,
  },
  optionIcon: {
    fontSize: 24,
  },
  errorContainer: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.error + '10',
    borderRadius: 8,
    marginBottom: Spacing.md,
  },
  errorText: {
    color: Colors.error,
    fontSize: 14,
    fontWeight: Typography.weights.medium,
    textAlign: 'center',
  },
  footer: {
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
});