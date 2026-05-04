import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { OnboardingScreenWrapper, OnboardingButton, ONBOARDING_SCROLL_BOTTOM_INSET, useOnboarding } from '@/components/onboarding';
import { CookbookStylePicker } from '@/components/cookbook/CookbookStylePicker';
import { Colors } from '@/constants/colors';
import { Spacing, Typography } from '@/constants/spacing';
import type { CookbookTheme } from '@/types/cookbook';

export default function CookbookStyleScreen() {
  const { onboardingData, updateOnboardingData, nextStep, previousStep } = useOnboarding();
  const selected = onboardingData.cookbookStyle as CookbookTheme | null;

  return (
    <OnboardingScreenWrapper>
      <View style={styles.container}>
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>Choose your cookbook style</Text>
          <Text style={styles.subtitle}>Every recipe page will feel like it belongs in this book.</Text>
          <CookbookStylePicker
            value={selected}
            onChange={(theme) => updateOnboardingData('cookbookStyle', theme)}
          />
        </ScrollView>

        <View style={styles.footer}>
          <View style={styles.buttonRow}>
            <OnboardingButton title="Back" variant="ghost" onPress={previousStep} />
            <OnboardingButton
              title="Continue"
              variant="primary"
              onPress={nextStep}
              disabled={!selected}
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
  },
  scrollContent: {
    paddingBottom: ONBOARDING_SCROLL_BOTTOM_INSET,
  },
  title: {
    fontSize: Typography.sizes.xxl,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: Typography.sizes.md,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: Spacing.lg,
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
