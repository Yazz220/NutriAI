import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { OnboardingScreenWrapper, OnboardingButton, BehindTheQuestion, useOnboarding } from '@/components/onboarding';

import { Colors } from '@/constants/colors';
import { Typography, Spacing } from '@/constants/spacing';

const genderEducationalContent = [
  {
    title: "Accurate Metabolic Calculations",
    description: "Gender affects metabolic rate due to differences in muscle mass, hormone levels, and body composition. This helps us calculate your precise calorie needs.",
    reference: "Journal of Clinical Endocrinology & Metabolism, 2021"
  },
  {
    title: "Personalized Nutrition Requirements",
    description: "Different genders have varying nutritional needs for vitamins, minerals, and macronutrients. This ensures your meal plans meet your specific requirements.",
    reference: "American Journal of Clinical Nutrition, 2020"
  },
  {
    title: "Health Goal Optimization",
    description: "Gender influences how the body responds to different dietary approaches, helping us tailor recommendations for optimal results.",
    reference: "Nutrition Reviews, 2022"
  }
];

export default function GenderScreen() {
  const { updateOnboardingData, nextStep, previousStep, onboardingData } = useOnboarding();

  const [selectedGender, setSelectedGender] = useState<'male' | 'female' | 'other' | 'prefer-not-to-say'>(
    onboardingData.basicProfile.gender || 'prefer-not-to-say'
  );
  const [error, setError] = useState<string | null>(null);

  const genderOptions = [
    { id: 'male', label: 'Male', icon: '♂️' },
    { id: 'female', label: 'Female', icon: '♀️' },
    { id: 'other', label: 'Other', icon: '⚧️' },
    { id: 'prefer-not-to-say', label: 'Prefer not to say', icon: '❓' }
  ];

  const handleGenderSelect = (gender: 'male' | 'female' | 'other' | 'prefer-not-to-say') => {
    setSelectedGender(gender);
    updateOnboardingData('basicProfile', {
      ...onboardingData.basicProfile,
      gender
    });
    setError(null);
  };

  const handleContinue = () => {
    if (!selectedGender) {
      setError('Please select a gender option to continue');
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
          <Text style={styles.title}>What's your gender?</Text>
        </View>

        <BehindTheQuestion
          title="Behind the question"
          subtitle="Gender-specific nutrition requirements..."
          content={genderEducationalContent}
        />

        <View style={styles.content}>
          <View style={styles.genderContainer}>
            {genderOptions.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.genderOption,
                  selectedGender === option.id && styles.selectedGenderOption
                ]}
                onPress={() => handleGenderSelect(option.id as any)}
                accessibilityLabel={`Select ${option.label}`}
                accessibilityRole="radio"
                accessibilityState={{ selected: selectedGender === option.id }}
              >
                <Text style={styles.genderIcon}>{option.icon}</Text>
                <Text style={[
                  styles.genderLabel,
                  selectedGender === option.id && styles.selectedGenderLabel
                ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
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
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  genderContainer: {
    gap: Spacing.md,
  },
  genderOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  selectedGenderOption: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  genderIcon: {
    fontSize: 24,
    marginRight: Spacing.md,
  },
  genderLabel: {
    fontSize: 18,
    fontWeight: Typography.weights.medium,
    color: Colors.text,
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
  buttonRow: { flexDirection: 'row', gap: Spacing.md, justifyContent: 'center', alignItems: 'center' },
});
