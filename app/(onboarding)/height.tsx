import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { OnboardingScreenWrapper, OnboardingButton, VerticalRulerPicker, useOnboarding } from '@/components/onboarding';
import NoshHeightSvg from '@/assets/images/nosh/whats-your-height.svg';
import { Colors } from '@/constants/colors';
import { Typography, Spacing } from '@/constants/spacing';

type UnitSystem = 'metric' | 'imperial';

export default function HeightScreen() {
  const { onboardingData, updateOnboardingData, nextStep, previousStep } = useOnboarding();
  const [height, setHeight] = useState(onboardingData.basicProfile.height || 170);
  const [unitSystem, setUnitSystem] = useState<UnitSystem>('metric');

  useEffect(() => {
    const t = setTimeout(() => {
      updateOnboardingData('basicProfile', { height });
    }, 120);
    return () => clearTimeout(t);
  }, [height]);

  const cmToInches = (cm: number) => cm / 2.54;
  const inchesToCm = (inch: number) => inch * 2.54;

  const minCm = 120;
  const maxCm = 220;
  const minIn = 48; // 4ft
  const maxIn = 84; // 7ft

  const displayValue = useMemo(() => unitSystem === 'metric' ? height : Math.round(cmToInches(height)), [unitSystem, height]);
  const displayMin = unitSystem === 'metric' ? minCm : minIn;
  const displayMax = unitSystem === 'metric' ? maxCm : maxIn;
  const step = 1;

  const handleRulerChange = (val: number) => {
    if (unitSystem === 'metric') {
      const clamped = Math.max(minCm, Math.min(maxCm, Math.round(val)));
      setHeight(clamped);
    } else {
      const clampedIn = Math.max(minIn, Math.min(maxIn, Math.round(val)));
      setHeight(Math.round(inchesToCm(clampedIn)));
    }
  };

  const getDisplayHeight = () => {
    if (unitSystem === 'metric') {
      return height;
    } else {
      const feet = Math.floor(height / 30.48);
      const inches = Math.round((height / 2.54) % 12);
      return `${feet}'${inches}"`;
    }
  };

  const getDisplayUnit = () => {
    return unitSystem === 'metric' ? 'Cm' : 'Ft';
  };

  // +/- controls removed: swipe-only interaction

  return (
    <OnboardingScreenWrapper>
      <View style={styles.container}>
        <View style={styles.header}>
            <Image
              source={require('@/assets/images/nosh/What\'s your height.png')}
              defaultSource={require('@/assets/images/nosh/What\'s your height.png')}
              fadeDuration={0}
              style={styles.noshImage}
              resizeMode="contain"
              accessibilityIgnoresInvertColors
            />
            <View style={styles.headerRight}>
              <Text style={styles.title}>Your height</Text>
              <View style={styles.unitToggle}>
            <TouchableOpacity
              style={[styles.unitButton, unitSystem === 'metric' && styles.unitButtonActive]}
              onPress={() => setUnitSystem('metric')}
            >
              <Text style={[styles.unitText, unitSystem === 'metric' && styles.unitTextActive]}>
                Cm
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.unitButton, unitSystem === 'imperial' && styles.unitButtonActive]}
              onPress={() => setUnitSystem('imperial')}
            >
              <Text style={[styles.unitText, unitSystem === 'imperial' && styles.unitTextActive]}>
                Ft
              </Text>
            </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.contentRow}>
          <View style={styles.rulerColumn}>
            <VerticalRulerPicker
              min={displayMin}
              max={displayMax}
              step={1}
              value={displayValue}
              onChange={handleRulerChange}
              majorTickInterval={unitSystem === 'metric' ? 10 : 12}
            />
          </View>

          <View style={styles.contentColumn}>
            <View style={styles.heightDisplay}>
              <Text style={styles.heightNumber}>{getDisplayHeight()}</Text>
              <Text style={styles.heightUnit}>{getDisplayUnit()}</Text>
            </View>
          </View>
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
  header: { marginBottom: Spacing.xl, alignItems: 'center', flexDirection: 'row', gap: Spacing.md },
  noshImage: { width: 96, height: 96, marginRight: Spacing.md },
  headerRight: { flex: 1 },
  title: { 
    fontSize: 22, 
    fontWeight: Typography.weights.bold, 
    color: Colors.text, 
    textAlign: 'left',
    lineHeight: 28,
    marginBottom: Spacing.sm,
    flexShrink: 1,
  },
  unitToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.lightGray,
    borderRadius: 25,
    padding: 4,
    alignSelf: 'flex-start', // Prevent extending to full width
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
  content: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  contentRow: { flex: 1, flexDirection: 'row', width: '100%', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.md },
  rulerColumn: { width: 70, paddingLeft: Spacing.sm },
  contentColumn: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  heightDisplay: { alignItems: 'center', marginBottom: Spacing.xl },
  heightNumber: { 
    fontSize: 72, 
    fontWeight: Typography.weights.bold, 
    color: Colors.text,
    lineHeight: 80 
  },
  heightUnit: { 
    fontSize: 18, 
    color: Colors.lightText, 
    marginTop: Spacing.sm 
  },
  rulerWrapper: { width: '100%', marginTop: Spacing.sm },
  // +/- controls removed: swipe on ruler
  footer: { paddingTop: Spacing.lg, paddingBottom: Spacing.md },
  buttonRow: { flexDirection: 'row', gap: Spacing.md, justifyContent: 'center', alignItems: 'center' },
});
