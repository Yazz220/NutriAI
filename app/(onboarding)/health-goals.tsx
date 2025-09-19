import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Animated } from 'react-native';
import { OnboardingScreenWrapper, OnboardingButton, SimpleOptionCard, BehindTheQuestion, useOnboarding } from '@/components/onboarding';

import { HealthGoal } from '@/types/onboarding';
import { Colors } from '@/constants/colors';
import { Typography, Spacing } from '@/constants/spacing';

const healthGoalOptions: Array<{
  id: HealthGoal;
  title: string;
}> = [
  {
    id: 'lose-weight',
    title: 'Lose weight',
  },
  {
    id: 'maintain-weight',
    title: 'Maintain weight',
  },
  {
    id: 'gain-weight',
    title: 'Gain weight',
  },
  {
    id: 'build-muscle',
    title: 'Build muscle',
  },
  {
    id: 'improve-health',
    title: 'Improve health',
  },
  {
    id: 'manage-restrictions',
    title: 'Manage dietary restrictions',
  },
];

const educationalContent = [
  {
    title: "Personalized Nutrition Plans",
    description: "Your goal shapes the type of nutritional guidance we provide. For example, weight loss focuses on creating sustainable calorie deficits, while muscle building emphasizes adequate protein intake and timing.",
    reference: "Journal of the International Society of Sports Nutrition, 2022"
  },
  {
    title: "Optimized Meal Recommendations",
    description: "Each goal requires a unique approach to macronutrient distribution. Weight loss plans prioritize satiety and metabolic health, while maintenance focuses on balanced nutrition and lifestyle sustainability.",
    reference: "American Journal of Clinical Nutrition, 2021"
  },
  {
    title: "Progress Tracking Effectiveness",
    description: "Knowing your primary goal allows us to monitor relevant metrics, such as body composition changes, energy levels, or dietary adherence, ensuring you stay on track to achieve your objectives.",
    reference: "Nutrition Reviews, 2023"
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
          <Text style={styles.title}>What goal do you have in mind?</Text>
        </Animated.View>

        <BehindTheQuestion
          title="Behind the question"
          subtitle="Personalized nutrition plans based on your goals..."
          content={educationalContent}
        />

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
              <SimpleOptionCard
                title={option.title}
                selected={selectedGoal === option.id}
                onPress={() => handleGoalSelect(option.id)}
                accessibilityLabel={`Select ${option.title} as your health goal`}
                accessibilityHint={`Choose ${option.title} as your primary health goal`}
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
    justifyContent: 'center',
    alignItems: 'center',
  },
});