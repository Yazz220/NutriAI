import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { OnboardingScreenWrapper, OnboardingButton, BehindTheQuestion, OnboardingHeader, useOnboarding } from '@/components/onboarding';

import { Colors } from '@/constants/colors';
import { Typography, Spacing } from '@/constants/spacing';
import MaleIcon from '@/assets/icons/male.svg';
import FemaleIcon from '@/assets/icons/Female.svg';
import OtherIcon from '@/assets/icons/other.svg';

interface GenderOption {
  id: 'male' | 'female' | 'other' | 'prefer-not-to-say';
  label: string;
  icon?: React.ReactNode;
}

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

  const genderOptions: GenderOption[] = [
    { id: 'male', label: 'Male', icon: <MaleIcon width={58} height={58} /> },
    { id: 'female', label: 'Female', icon: <FemaleIcon width={58} height={58} /> },
    { id: 'other', label: 'Other', icon: <OtherIcon width={58} height={58} /> },
    { id: 'prefer-not-to-say', label: 'Prefer not to say' }
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
        <View style={styles.infoRow}>
          <BehindTheQuestion
            title="Behind the question"
            subtitle="Gender-specific nutrition requirements..."
            content={genderEducationalContent}
            variant="icon"
          />
        </View>
        <OnboardingHeader
          imageSource={require("@/assets/images/nosh/What's your gender.png")}
          title="What's your gender?"
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
                {option.icon && (
                  <View style={styles.genderIcon}>
                    {typeof option.icon === 'string' ? (
                      <Text style={styles.genderIconText}>{option.icon}</Text>
                    ) : (
                      option.icon
                    )}
                  </View>
                )}
                <Text
                  style={[
                    styles.genderLabel,
                    selectedGender === option.id && styles.selectedGenderLabel
                  ]}
                >
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
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  genderContainer: {
    width: '100%',
    gap: Spacing.md,
  },
  genderOption: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.card,
    borderRadius: 24,
    borderWidth: 2.5,
    borderColor: Colors.border,
    minHeight: 64,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 2,
    elevation: 1,
  },
  selectedGenderOption: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  genderIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  genderIconText: {
    fontSize: 18,
  },
  genderLabel: {
    fontSize: 18,
    color: Colors.text,
    fontWeight: Typography.weights.semibold,
    textAlign: 'left',
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
  infoRow: { alignSelf: 'flex-end', marginBottom: Spacing.sm },
  buttonRow: { flexDirection: 'row', gap: Spacing.md, justifyContent: 'center', alignItems: 'center' },
});
