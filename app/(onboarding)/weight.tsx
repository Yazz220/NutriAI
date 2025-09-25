import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { OnboardingScreenWrapper, OnboardingButton, HorizontalRulerPicker, OnboardingHeader, useOnboarding } from '@/components/onboarding';
import { Colors } from '@/constants/colors';
import { Typography, Spacing } from '@/constants/spacing';

type UnitSystem = 'metric' | 'imperial';

export default function WeightScreen() {
  const { onboardingData, updateOnboardingData, nextStep, previousStep } = useOnboarding();
  const [weight, setWeight] = useState(onboardingData.basicProfile.weight || 70);
  const [unitSystem, setUnitSystem] = useState<UnitSystem>('metric');

  useEffect(() => {
    updateOnboardingData('basicProfile', { weight });
  }, [weight]);

  const kgToLbs = (kg: number) => kg * 2.20462;
  const lbsToKg = (lbs: number) => lbs / 2.20462;

  const minKg = 30;
  const maxKg = 200;
  const minLbs = 66;
  const maxLbs = 440;

  const displayValue = useMemo(
    () => unitSystem === 'metric' ? parseFloat(weight.toFixed(1)) : Math.round(kgToLbs(weight)),
    [unitSystem, weight]
  );
  const displayMin = unitSystem === 'metric' ? minKg : minLbs;
  const displayMax = unitSystem === 'metric' ? maxKg : maxLbs;
  const step = unitSystem === 'metric' ? 0.5 : 1;

  const handleRulerChange = (val: number) => {
    if (unitSystem === 'metric') {
      const clamped = Math.max(minKg, Math.min(maxKg, Math.round(val * 2) / 2));
      setWeight(clamped);
    } else {
      const clampedLbs = Math.max(minLbs, Math.min(maxLbs, Math.round(val)));
      setWeight(parseFloat(lbsToKg(clampedLbs).toFixed(1)));
    }
  };

  const getDisplayWeight = () => displayValue;
  const getDisplayUnit = () => (unitSystem === 'metric' ? 'Kg' : 'Lbs');

  // +/- controls removed: swipe on ruler only

  return (
    <OnboardingScreenWrapper>
      <View style={styles.container}>
        <OnboardingHeader
          imageSource={require('@/assets/images/nosh/What is your current weight.png')}
          title="What's your current weight?"
        >
          <View style={styles.unitToggle}>
            <TouchableOpacity
              style={[styles.unitButton, unitSystem === 'metric' && styles.unitButtonActive]}
              onPress={() => setUnitSystem('metric')}
            >
              <Text style={[styles.unitText, unitSystem === 'metric' && styles.unitTextActive]}>
                Kg
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.unitButton, unitSystem === 'imperial' && styles.unitButtonActive]}
              onPress={() => setUnitSystem('imperial')}
            >
              <Text style={[styles.unitText, unitSystem === 'imperial' && styles.unitTextActive]}>
                Lbs
              </Text>
            </TouchableOpacity>
          </View>
        </OnboardingHeader>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.weightDisplay}>
            <Text style={styles.weightNumber}>{getDisplayWeight()}</Text>
            <Text style={styles.weightUnit}>{getDisplayUnit()}</Text>
          </View>

          <View style={styles.rulerWrapper}>
            <HorizontalRulerPicker
              min={displayMin}
              max={displayMax}
              step={step}
              value={displayValue}
              onChange={handleRulerChange}
              majorTickInterval={unitSystem === 'metric' ? 5 : 10}
            />
          </View>

          {/* +/- controls removed: swipe on ruler */}
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
  unitToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.lightGray,
    borderRadius: 25,
    padding: 4,
    alignSelf: 'center',
    marginBottom: Spacing.lg,
  },
  unitButton: {
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 20,
  },
  unitButtonActive: {
    backgroundColor: Colors.primary,
  },
  unitText: {
    fontSize: 16,
    fontWeight: Typography.weights.medium,
    color: Colors.lightText,
  },
  unitTextActive: {
    color: Colors.white,
  },
  content: { flex: 1 },
  contentContainer: { alignItems: 'center', paddingBottom: Spacing.xl },
  weightDisplay: { alignItems: 'center', marginBottom: Spacing.lg },
  weightNumber: { 
    fontSize: 72, 
    fontWeight: Typography.weights.bold, 
    color: Colors.text,
    lineHeight: 80 
  },
  weightUnit: { 
    fontSize: 18, 
    color: Colors.lightText, 
    marginTop: Spacing.sm 
  },
  rulerWrapper: { width: '100%', marginTop: Spacing.sm },
  footer: { paddingTop: Spacing.lg, paddingBottom: Spacing.md },
  buttonRow: { flexDirection: 'row', gap: Spacing.md, justifyContent: 'center', alignItems: 'center' },
});
