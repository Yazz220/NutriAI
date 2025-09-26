import HealthConcernsImage from '@/assets/images/nosh/Health Concerns.svg';
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { OnboardingScreenWrapper, OnboardingButton, BehindTheQuestion, OnboardingHeader, useOnboarding } from '@/components/onboarding';
import { Colors } from '@/constants/colors';
import { Typography, Spacing } from '@/constants/spacing';

const HEALTH_CONCERNS = [
  { id: 'none', label: "I don't have any of these", icon: '🧘' },
  { id: 'hypertension', label: 'Hypertension', icon: '🫀' },
  { id: 'high-cholesterol', label: 'High Cholesterol', icon: '🩺' },
  { id: 'obesity', label: 'Obesity', icon: '🍩' },
  { id: 'diabetes', label: 'Diabetes', icon: '💉' },
  { id: 'heart-disease', label: 'Heart Disease', icon: '❤️' },
];

export default function HealthConcernsScreen() {
  const { onboardingData, updateOnboardingData, nextStep, previousStep } = useOnboarding();
  const [selected, setSelected] = useState<string[]>(onboardingData.healthConcerns || []);

  useEffect(() => {
    updateOnboardingData('healthConcerns', selected);
  }, [selected]);

  const toggle = (id: string) => {
    if (id === 'none') {
      setSelected(['none']);
      return;
    }
    const next = new Set(selected.filter(v => v !== 'none'));
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected([...next]);
  };

  const isSelected = (id: string) => selected.includes(id);

  return (
    <OnboardingScreenWrapper>
      <View style={styles.container}>
        <OnboardingHeader
          title="Any health concerns?"
          renderImage={(size) => (
            <HealthConcernsImage width={size} height={size} />
          )}
          imageTranslateExtraRatio={0.20}
          imageVisualExtraScale={1.10}
        />

        <BehindTheQuestion
          title="Behind the question"
          subtitle="Safe Exercise Recommendations"
          content={[
            { title: 'Why we ask', description: 'Certain conditions affect safe calorie targets and training load.' },
            { title: 'Personalization', description: 'We tailor recommendations to be safe and effective for you.' },
          ]}
        />

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={{ gap: Spacing.sm }}>
            {HEALTH_CONCERNS.map(opt => (
              <TouchableOpacity
                key={opt.id}
                onPress={() => toggle(opt.id)}
                style={[styles.row, isSelected(opt.id) && styles.rowSelected]}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isSelected(opt.id) }}
              >
                <Text style={styles.rowIcon}>{opt.icon}</Text>
                <Text style={[styles.rowLabel, isSelected(opt.id) && styles.rowLabelSelected]}>{opt.label}</Text>
                <View style={[styles.checkbox, isSelected(opt.id) && styles.checkboxChecked]}>
                  {isSelected(opt.id) && <View style={styles.checkboxDot} />}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

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
  header: { marginBottom: Spacing.lg },
  title: { fontSize: 28, fontWeight: Typography.weights.bold, color: Colors.text, lineHeight: 36 },
  content: { flex: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 16,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  rowSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '08',
  },
  rowIcon: { fontSize: 24, marginRight: Spacing.md },
  rowLabel: { flex: 1, fontSize: 16, color: Colors.text },
  rowLabelSelected: { color: Colors.primary, fontWeight: Typography.weights.semibold },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
  },
  checkboxChecked: { borderColor: Colors.primary, backgroundColor: Colors.primary + '10' },
  checkboxDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.primary },
  footer: { paddingTop: Spacing.lg, paddingBottom: Spacing.md },
  buttonRow: { flexDirection: 'row', gap: Spacing.md, justifyContent: 'center', alignItems: 'center' },
});
