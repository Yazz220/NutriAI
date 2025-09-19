import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { OnboardingScreenWrapper, OnboardingButton, BehindTheQuestion, useOnboarding } from '@/components/onboarding';

import { AgeSlider } from '@/components/onboarding/AgeSlider';
import { HeightInput, WeightInput } from '@/components/onboarding/HeightWeightInput';
import { ActivityLevelSelector, ActivityLevel } from '@/components/onboarding/ActivityLevelSelector';
import { TargetWeightInput } from '@/components/onboarding/TargetWeightInput';
import { Colors } from '@/constants/colors';
import { Typography, Spacing } from '@/constants/spacing';

type UnitSystem = 'metric' | 'imperial';

const basicProfileEducationalContent = [
  {
    title: "Accurate Calorie Calculations",
    description: "Age, gender, height, and weight are essential factors in calculating your Basal Metabolic Rate (BMR) - the calories your body needs at rest. This forms the foundation of your personalized nutrition plan.",
    reference: "Mifflin-St Jeor Equation, American Journal of Clinical Nutrition, 1990"
  },
  {
    title: "Activity-Based Adjustments",
    description: "Your activity level helps us determine your Total Daily Energy Expenditure (TDEE). This ensures your meal recommendations match your lifestyle and energy needs for optimal health outcomes.",
    reference: "Sports Medicine Research, 2021"
  },
  {
    title: "Safe Goal Setting",
    description: "Understanding your current metrics allows us to set realistic, medically-safe targets for weight changes. We follow evidence-based guidelines to ensure sustainable and healthy progress.",
    reference: "American Heart Association Guidelines, 2022"
  }
];

export default function BasicProfileScreen() {
  const { updateOnboardingData, nextStep, previousStep, onboardingData, validateCurrentStep } = useOnboarding();

  // Local state for form data
  const [age, setAge] = useState(onboardingData.basicProfile.age || 25);
  const [height, setHeight] = useState(onboardingData.basicProfile.height || 170);
  const [weight, setWeight] = useState(onboardingData.basicProfile.weight || 70);
  const [activityLevel, setActivityLevel] = useState<ActivityLevel | null>(
    onboardingData.basicProfile.activityLevel as ActivityLevel || null
  );
  const [targetWeight, setTargetWeight] = useState(onboardingData.basicProfile.targetWeight);
  const [gender, setGender] = useState<'male' | 'female' | 'other' | 'prefer-not-to-say'>(
    onboardingData.basicProfile.gender || 'prefer-not-to-say'
  );
  const [unitSystem, setUnitSystem] = useState<UnitSystem>('metric');
  const [error, setError] = useState<string | null>(null);

  // Update onboarding data when local state changes
  useEffect(() => {
    updateOnboardingData('basicProfile', {
      age,
      height,
      weight,
      activityLevel,
      targetWeight,
      gender
    });
  }, [age, height, weight, activityLevel, targetWeight, gender, updateOnboardingData]);

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

  const genderOptions = [
    { id: 'male', label: 'Male', icon: '♂️' },
    { id: 'female', label: 'Female', icon: '♀️' },
    { id: 'other', label: 'Other', icon: '⚧️' },
    { id: 'prefer-not-to-say', label: 'Prefer not to say', icon: '❓' }
  ];

  return (
    <OnboardingScreenWrapper>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Tell us about yourself</Text>
        </View>

        <BehindTheQuestion
          title="Behind the question"
          subtitle="Scientific approach to personalized nutrition..."
          content={basicProfileEducationalContent}
        />

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Gender Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Gender</Text>
            <View style={styles.genderContainer}>
              {genderOptions.map((option) => (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.genderOption,
                    gender === option.id && styles.selectedGenderOption
                  ]}
                  onPress={() => setGender(option.id as any)}
                  accessibilityLabel={`Select ${option.label}`}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: gender === option.id }}
                >
                  <Text style={styles.genderIcon}>{option.icon}</Text>
                  <Text style={[
                    styles.genderLabel,
                    gender === option.id && styles.selectedGenderLabel
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Age Input */}
          <View style={styles.section}>
            <AgeSlider
              value={age}
              onValueChange={setAge}
              minimumValue={13}
              maximumValue={120}
            />
          </View>

          {/* Height and Weight Inputs */}
          <View style={styles.section}>
            <HeightInput
              value={height}
              onValueChange={setHeight}
              unitSystem={unitSystem}
              onUnitSystemChange={setUnitSystem}
            />
          </View>

          <View style={styles.section}>
            <WeightInput
              value={weight}
              onValueChange={setWeight}
              unitSystem={unitSystem}
              onUnitSystemChange={setUnitSystem}
            />
          </View>

          {/* Target Weight (conditional) */}
          <TargetWeightInput
            value={targetWeight}
            onValueChange={setTargetWeight}
            currentWeight={weight}
            height={height}
            healthGoal={onboardingData.healthGoal}
            unitSystem={unitSystem}
          />

          {/* Activity Level */}
          <View style={styles.section}>
            <ActivityLevelSelector
              value={activityLevel}
              onValueChange={setActivityLevel}
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
              accessibilityLabel="Go back to health goals"
            />
            <OnboardingButton
              title="Continue"
              onPress={handleContinue}
              variant="primary"
              disabled={!activityLevel}
              accessibilityLabel="Continue to dietary preferences"
              accessibilityHint={activityLevel ? 'Continue with profile setup' : 'Complete all fields first'}
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
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  genderContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  genderOption: {
    flex: 1,
    minWidth: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  selectedGenderOption: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  genderIcon: {
    fontSize: 20,
    marginRight: Spacing.sm,
  },
  genderLabel: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: Typography.weights.medium,
    flex: 1,
  },
  selectedGenderLabel: {
    color: Colors.primary,
    fontWeight: Typography.weights.semibold,
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