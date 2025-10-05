import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, InteractionManager } from 'react-native';
import { OnboardingScreenWrapper, OnboardingButton, HorizontalRulerPicker, ONBOARDING_SCROLL_BOTTOM_INSET, OnboardingHeader, useOnboarding } from '@/components/onboarding';
import { Colors } from '@/constants/colors';
import { Typography, Spacing } from '@/constants/spacing';

type UnitSystem = 'metric' | 'imperial';

export default function WeightScreen() {
  const { onboardingData, updateOnboardingData, nextStep, previousStep } = useOnboarding();
  const [weight, setWeight] = useState(onboardingData.basicProfile.weight || 70);
  const [unitSystem, setUnitSystem] = useState<UnitSystem>('metric');
  // Defer mounting heavy components to avoid blocking initial paint of the character image
  const [uiReady, setUiReady] = useState(false);
  // Stage the rest of the page content one frame after mount so the header paints first
  const [contentReady, setContentReady] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      updateOnboardingData('basicProfile', { weight });
    }, 120);
    return () => clearTimeout(t);
  }, [weight]);

  // Allow the header image to render instantly; mount ruler after initial interactions
  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => setUiReady(true));
    return () => task.cancel?.();
  }, []);

  // Render heavy content (scroll + footer) after first frame to prioritize header image
  useEffect(() => {
    const id = requestAnimationFrame(() => setContentReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

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
          // Using same asset as defaultSource helps avoid fade-on-decode on some platforms
          defaultSource={require('@/assets/images/nosh/What is your current weight.png')}
          title="What's your current weight?"
          imageTranslateExtraRatio={0.15}
          imageVisualExtraScale={1.07}
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

        {contentReady && (
          <>
            <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
              <View style={styles.weightDisplay}>
                <Text style={styles.weightNumber}>{getDisplayWeight()}</Text>
                <Text style={styles.weightUnit}>{getDisplayUnit()}</Text>
              </View>

              <View style={styles.rulerWrapper}>
                {uiReady ? (
                  <HorizontalRulerPicker
                    min={displayMin}
                    max={displayMax}
                    step={step}
                    value={displayValue}
                    onChange={handleRulerChange}
                    majorTickInterval={unitSystem === 'metric' ? 5 : 10}
                  />
                ) : (
                  // lightweight placeholder to stabilize layout while ruler mounts
                  <View style={{ height: 80 }} />
                )}
              </View>

              {/* +/- controls removed: swipe on ruler */}
            </ScrollView>

            <View style={styles.footer}>
              <View style={styles.buttonRow}>
                <OnboardingButton title="Back" variant="ghost" onPress={previousStep} />
                <OnboardingButton title="Continue" variant="primary" onPress={nextStep} />
              </View>
            </View>
          </>
        )}
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
  contentContainer: { alignItems: 'center', paddingBottom: ONBOARDING_SCROLL_BOTTOM_INSET },
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

