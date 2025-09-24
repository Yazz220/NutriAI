import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { OnboardingScreenWrapper, OnboardingButton, BehindTheQuestion, VerticalNumberPicker, useOnboarding } from '@/components/onboarding';
import { Colors } from '@/constants/colors';
import { Typography, Spacing } from '@/constants/spacing';

export default function AgeScreen() {
  const { onboardingData, updateOnboardingData, nextStep, previousStep } = useOnboarding();
  const currentYear = new Date().getFullYear();

  // Initialize from existing age if available; otherwise default to a reasonable birthyear
  const initialBirthYear = useMemo(() => {
    const initialAge = onboardingData.basicProfile.age || 25;
    return currentYear - initialAge;
  }, []);

  const [birthYear, setBirthYear] = useState<number>(initialBirthYear);

  // Persist computed age when birthYear changes (debounced for smoother scrolling)
  useEffect(() => {
    const age = Math.max(0, currentYear - birthYear);
    const t = setTimeout(() => {
      updateOnboardingData('basicProfile', { age });
    }, 120);
    return () => clearTimeout(t);
  }, [birthYear]);

  const minYear = currentYear - 100; // 100 years old
  const maxYear = currentYear - 13;  // Minimum age 13

  const clampYear = (y: number) => Math.min(maxYear, Math.max(minYear, y));
  const yearsWindow = useMemo(() => {
    const center = clampYear(birthYear);
    return [center - 2, center - 1, center, center + 1, center + 2].filter(y => y >= minYear && y <= maxYear);
  }, [birthYear]);

  return (
    <OnboardingScreenWrapper>
      <View style={styles.container}>
        <View style={styles.header}>
          <Image
            source={require('@/assets/images/nosh/How old are you.png')}
            defaultSource={require('@/assets/images/nosh/How old are you.png')}
            fadeDuration={0}
            style={styles.noshImage}
            resizeMode="contain"
            accessibilityIgnoresInvertColors
          />
          <View style={styles.headerText}>
            <Text style={styles.title}>When is your birthyear?</Text>
          </View>
        </View>

        <BehindTheQuestion
          title="Behind the question"
          subtitle="Why do we ask this?"
          content={[
            {
              title: 'Why birth year?',
              description: 'Your age helps us estimate basal metabolic rate and personalize your calorie and macro targets.',
            },
            {
              title: 'Privacy',
              description: 'We store only what we need to compute accurate recommendations and never sell your data.',
            },
          ]}
        />

        <View style={styles.content}>
          <VerticalNumberPicker
            min={minYear}
            max={maxYear}
            value={birthYear}
            onChange={(v: number) => setBirthYear(clampYear(v))}
            itemHeight={56}
          />
        </View>

        <View style={styles.footer}>
          <View style={styles.buttonRow}>
            <OnboardingButton title="Back" variant="ghost" onPress={previousStep} />
            <OnboardingButton title="Continue" variant="primary" onPress={nextStep} />
          </View>
        </View>
      </View>
    </OnboardingScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { marginBottom: Spacing.lg, flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  headerText: { flex: 1 },
  title: { 
    fontSize: 28, 
    fontWeight: Typography.weights.bold, 
    color: Colors.text, 
    textAlign: 'left',
    lineHeight: 36 
  },
  noshImage: {
    width: 108,
    height: 108,
  },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  yearList: { gap: Spacing.md },
  yearDisplay: { alignItems: 'center', marginBottom: Spacing.lg },
  yearNumber: { fontSize: 64, lineHeight: 72, fontWeight: Typography.weights.bold, color: Colors.text },
  rulerWrapper: { width: '100%', marginTop: Spacing.sm },
  yearItem: {
    alignSelf: 'center',
    width: '70%',
    paddingVertical: Spacing.lg,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: 'transparent',
  },
  yearItemSelected: {
    backgroundColor: Colors.primary + '10',
    borderColor: Colors.primary,
  },
  yearText: {
    fontSize: 28,
    color: Colors.lightText,
    fontWeight: Typography.weights.semibold,
  },
  yearTextSelected: {
    color: Colors.text,
  },
  // +/- controls removed for touch-based vertical picker
  footer: { paddingTop: Spacing.lg, paddingBottom: Spacing.md },
  buttonRow: { flexDirection: 'row', gap: Spacing.md, justifyContent: 'center', alignItems: 'center' },
});
