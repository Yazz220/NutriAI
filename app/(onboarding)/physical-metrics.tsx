import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { OnboardingScreenWrapper, OnboardingButton, BehindTheQuestion, TargetWeightInput, useOnboarding } from '@/components/onboarding';

import { AgeSlider } from '@/components/onboarding/AgeSlider';
import { HeightInput, WeightInput } from '@/components/onboarding/HeightWeightInput';
import { Colors } from '@/constants/colors';
import { Typography, Spacing } from '@/constants/spacing';

type UnitSystem = 'metric' | 'imperial';

const physicalMetricsEducationalContent = [
  {
    title: "Basal Metabolic Rate Calculation",
    description: "Age, height, and weight are the core factors in calculating your BMR - the calories your body burns at rest. This forms the foundation of your personalized nutrition plan.",
    reference: "Mifflin-St Jeor Equation, American Journal of Clinical Nutrition, 1990"
  },
  {
    title: "Body Composition Analysis",
    description: "These metrics help us understand your body composition and create realistic, healthy targets for your goals while ensuring nutritional adequacy.",
    reference: "International Journal of Obesity, 2021"
  },
  {
    title: "Age-Specific Nutrition Needs",
    description: "Nutritional requirements change with age due to metabolic changes, muscle mass variations, and different health considerations at various life stages.",
    reference: "Nutrients Journal, 2022"
  }
];

export default function PhysicalMetricsScreen() {
  const { updateOnboardingData, nextStep, previousStep, onboardingData, validateCurrentStep } = useOnboarding();

  const [age, setAge] = useState(onboardingData.basicProfile.age || 25);
  const [height, setHeight] = useState(onboardingData.basicProfile.height || 170);
  const [weight, setWeight] = useState(onboardingData.basicProfile.weight || 70);
  const [unitSystem, setUnitSystem] = useState<UnitSystem>('metric');
  const [error, setError] = useState<string | null>(null);
  const healthGoal = onboardingData.healthGoal;

  // Update onboarding data when local state changes
  useEffect(() => {
    updateOnboardingData('basicProfile', {
      ...onboardingData.basicProfile,
      age,
      height,
      weight
    });
  }, [age, height, weight, updateOnboardingData]);

  const handleContinue = () => {
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
        <View style={styles.header}>
          <Text style={styles.title}>What's your age, height, and weight?</Text>
        </View>

        <BehindTheQuestion
          title="Behind the question"
          subtitle="Accurate metabolic calculations for your plan..."
          content={physicalMetricsEducationalContent}
        />

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.stack}>
            <AgeSlider
              value={age}
              onValueChange={setAge}
              accessibilityLabel="Select your age"
            />

            <HeightInput
              value={height}
              onValueChange={setHeight}
              unitSystem={unitSystem}
              onUnitSystemChange={setUnitSystem}
            />

            <WeightInput
              value={weight}
              onValueChange={setWeight}
              unitSystem={unitSystem}
              onUnitSystemChange={setUnitSystem}
            />

            <TargetWeightInput
              value={onboardingData.basicProfile.targetWeight}
              onValueChange={(v) => updateOnboardingData('basicProfile', { targetWeight: v })}
              currentWeight={weight}
              height={height}
              healthGoal={healthGoal}
              unitSystem={unitSystem}
            />
          </View>
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
              accessibilityLabel="Go back to previous step"
            />
            <OnboardingButton
              title="Continue"
              onPress={handleContinue}
              variant="primary"
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
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: 26,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    lineHeight: 32,
  },
  content: {
    flex: 1,
  },
  stack: {
    gap: Spacing.lg,
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
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
