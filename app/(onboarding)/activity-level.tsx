import React, { useState } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { OnboardingScreenWrapper, OnboardingButton, BehindTheQuestion, useOnboarding } from '@/components/onboarding';

import { ActivityLevelSelector, ActivityLevel } from '@/components/onboarding/ActivityLevelSelector';
import { Colors } from '@/constants/colors';
import { Typography, Spacing } from '@/constants/spacing';

const activityLevelEducationalContent = [
  {
    title: "Total Daily Energy Expenditure",
    description: "Your activity level helps us calculate your TDEE - the total calories you burn daily including exercise and daily activities. This ensures accurate calorie targets.",
    reference: "Sports Medicine Research, 2021"
  },
  {
    title: "Macronutrient Distribution",
    description: "More active individuals require different protein, carbohydrate, and fat ratios to support performance, recovery, and body composition goals.",
    reference: "Journal of the International Society of Sports Nutrition, 2022"
  },
  {
    title: "Meal Timing Optimization",
    description: "Activity patterns influence when and how much you should eat to maximize energy levels, performance, and recovery throughout the day.",
    reference: "Nutrition and Metabolism Journal, 2020"
  }
];

export default function ActivityLevelScreen() {
  const { updateOnboardingData, nextStep, previousStep, onboardingData } = useOnboarding();

  const [activityLevel, setActivityLevel] = useState<ActivityLevel | null>(
    onboardingData.basicProfile.activityLevel as ActivityLevel || null
  );
  const [error, setError] = useState<string | null>(null);

  const handleActivityLevelSelect = (level: ActivityLevel) => {
    setActivityLevel(level);
    updateOnboardingData('basicProfile', {
      ...onboardingData.basicProfile,
      activityLevel: level
    });
    setError(null);
  };

  const handleContinue = () => {
    if (!activityLevel) {
      setError('Please select your activity level to continue');
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
        <View style={styles.header}>
          <Image
            source={require('@/assets/images/nosh/How often do you work out.png')}
            defaultSource={require('@/assets/images/nosh/How often do you work out.png')}
            fadeDuration={0}
            style={styles.noshImage}
            resizeMode="contain"
            accessibilityIgnoresInvertColors
          />
          <Text style={styles.title}>What's your activity level?</Text>
        </View>

        <BehindTheQuestion
          title="Behind the question"
          subtitle="Activity-based calorie and nutrition adjustments..."
          content={activityLevelEducationalContent}
        />

        <View style={styles.content}>
          <ActivityLevelSelector
            value={activityLevel}
            onValueChange={handleActivityLevelSelect}
            variant="compact"
          />
        </View>

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
              accessibilityLabel="Go back to previous step"
            />
            <OnboardingButton
              title="Continue"
              onPress={handleContinue}
              variant="primary"
              disabled={!activityLevel}
              accessibilityLabel="Continue to next step"
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
    lineHeight: 36,
  },
  noshImage: {
    width: 112,
    height: 112,
    alignSelf: 'center',
    marginBottom: Spacing.md,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
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
    alignItems: 'center'
  },
});
