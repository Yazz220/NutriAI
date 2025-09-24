import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { OnboardingScreenWrapper, OnboardingButton, HorizontalRulerPicker, useOnboarding } from '@/components/onboarding';
import { Colors } from '@/constants/colors';
import { Typography, Spacing } from '@/constants/spacing';

type UnitSystem = 'metric' | 'imperial';

export default function TargetWeightScreen() {
  const { onboardingData, updateOnboardingData, nextStep, previousStep } = useOnboarding();
  const currentWeight = onboardingData.basicProfile.weight || 70;
  const healthGoal = onboardingData.healthGoal;
  const [targetWeight, setTargetWeight] = useState(
    onboardingData.basicProfile.targetWeight || currentWeight
  );
  const [unitSystem, setUnitSystem] = useState<UnitSystem>('metric');

  // Only show this screen for weight loss/gain goals
  const shouldShowTargetWeight = healthGoal === 'lose-weight' || healthGoal === 'gain-weight';

  useEffect(() => {
    if (shouldShowTargetWeight) {
      updateOnboardingData('basicProfile', { targetWeight });
    }
  }, [targetWeight, shouldShowTargetWeight]);

  // Skip this screen if not needed
  useEffect(() => {
    if (!shouldShowTargetWeight) {
      nextStep();
    }
  }, [shouldShowTargetWeight]);

  const kgToLbs = (kg: number) => kg * 2.20462;
  const lbsToKg = (lbs: number) => lbs / 2.20462;

  const minKg = 30;
  const maxKg = 200;
  const minLbs = 66;
  const maxLbs = 440;

  const displayValue = useMemo(
    () => unitSystem === 'metric' ? parseFloat(targetWeight.toFixed(1)) : Math.round(kgToLbs(targetWeight)),
    [unitSystem, targetWeight]
  );
  const displayMin = unitSystem === 'metric' ? minKg : minLbs;
  const displayMax = unitSystem === 'metric' ? maxKg : maxLbs;
  const step = unitSystem === 'metric' ? 0.5 : 1;

  const handleRulerChange = (val: number) => {
    if (unitSystem === 'metric') {
      const clamped = Math.max(minKg, Math.min(maxKg, Math.round(val * 2) / 2));
      setTargetWeight(clamped);
    } else {
      const clampedLbs = Math.max(minLbs, Math.min(maxLbs, Math.round(val)));
      setTargetWeight(parseFloat(lbsToKg(clampedLbs).toFixed(1)));
    }
  };

  const getDisplayWeight = (weight: number) => {
    if (unitSystem === 'metric') {
      return weight;
    } else {
      return Math.round(weight * 2.20462);
    }
  };

  const getDisplayUnit = () => {
    return unitSystem === 'metric' ? 'Kg' : 'Lbs';
  };

  const getWeightDifference = () => {
    const diff = Math.abs(targetWeight - currentWeight);
    const percentage = ((diff / currentWeight) * 100).toFixed(1);
    return { diff, percentage };
  };

  const getRecommendationText = () => {
    const { percentage } = getWeightDifference();
    const isLosing = healthGoal === 'lose-weight';
    
    if (parseFloat(percentage) <= 5) {
      return {
        badge: 'Realistic Target',
        text: `You will ${isLosing ? 'lose' : 'gain'} ${percentage}% of your weight`,
        description: 'There is scientific evidence that overweight people are more likely to have good metabolic health with some weight loss.'
      };
    } else if (parseFloat(percentage) <= 10) {
      return {
        badge: 'Moderate Target',
        text: `You will ${isLosing ? 'lose' : 'gain'} ${percentage}% of your weight`,
        description: 'This is an achievable goal with consistent effort and lifestyle changes.'
      };
    } else {
      return {
        badge: 'Ambitious Target',
        text: `You will ${isLosing ? 'lose' : 'gain'} ${percentage}% of your weight`,
        description: 'This is a significant change that will require dedication and time to achieve safely.'
      };
    }
  };

  // +/- controls removed: swipe on ruler only

  if (!shouldShowTargetWeight) {
    return null; // Component will auto-skip
  }

  const recommendation = getRecommendationText();

  return (
    <OnboardingScreenWrapper>
      <View style={styles.container}>
        <View style={styles.header}>
          <Image
            source={require('@/assets/images/nosh/What\'s your target weight.png')}
            defaultSource={require('@/assets/images/nosh/What\'s your target weight.png')}
            fadeDuration={0}
            style={styles.noshImage}
            resizeMode="contain"
            accessibilityIgnoresInvertColors
          />
          <View style={styles.headerText}>
            <Text style={styles.title}>What's your target weight?</Text>
            
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
          </View>
        </View>

        <View style={styles.content}>
          <View style={styles.weightDisplay}>
            <Text style={styles.weightNumber}>{getDisplayWeight(targetWeight)}</Text>
            <Text style={styles.weightUnit}>{getDisplayUnit()}</Text>
            <View style={styles.currentWeightIndicator}>
              <Text style={styles.currentWeightText}>
                ← {getDisplayWeight(currentWeight)} {getDisplayUnit()}
              </Text>
            </View>
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

          <View style={styles.recommendationCard}>
            <View style={styles.recommendationBadge}>
              <Text style={styles.recommendationBadgeText}>{recommendation.badge}</Text>
            </View>
            <Text style={styles.recommendationTitle}>{recommendation.text}</Text>
            <Text style={styles.recommendationDescription}>{recommendation.description}</Text>
          </View>
          {/* +/- controls removed: swipe on ruler */}
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
  header: { marginBottom: Spacing.lg, alignItems: 'center', flexDirection: 'row', gap: Spacing.md },
  headerText: { flex: 1, alignItems: 'flex-start' },
  title: { 
    fontSize: 28, 
    fontWeight: Typography.weights.bold, 
    color: Colors.text, 
    textAlign: 'left',
    lineHeight: 36,
    marginBottom: Spacing.md
  },
  noshImage: {
    width: 112,
    height: 112,
  },
  unitToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.lightGray,
    borderRadius: 25,
    padding: 4,
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
  currentWeightIndicator: {
    marginTop: Spacing.sm,
  },
  currentWeightText: {
    fontSize: 14,
    color: Colors.lightText,
    fontStyle: 'italic'
  },
  rulerWrapper: { width: '100%', marginTop: Spacing.sm },
  scaleContainer: { 
    width: '90%', 
    height: 120, 
    justifyContent: 'center',
    position: 'relative',
    marginBottom: Spacing.lg
  },
  scale: { 
    flexDirection: 'row', 
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: '100%'
  },
  scaleMark: { 
    alignItems: 'center', 
    flex: 1,
    justifyContent: 'flex-end'
  },
  scaleMarkCenter: {},
  scaleTick: { 
    width: 2, 
    height: 25, 
    backgroundColor: Colors.lightGray 
  },
  scaleTickCenter: { 
    height: 50, 
    backgroundColor: Colors.primary,
    width: 4 
  },
  scaleTickMajor: { 
    height: 35,
    backgroundColor: Colors.text,
    width: 3
  },
  scaleLabel: { 
    fontSize: 12, 
    color: Colors.lightText, 
    marginTop: Spacing.xs,
    position: 'absolute',
    bottom: -20
  },
  centerIndicator: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 80,
    height: 4,
    backgroundColor: Colors.primary,
    borderRadius: 2,
    transform: [{ translateX: -40 }, { translateY: -2 }],
  },
  rangeHighlight: {
    position: 'absolute',
    top: '60%',
    height: 20,
    borderRadius: 10,
  },
  recommendationCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: Spacing.lg,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    shadowColor: Colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  recommendationBadge: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    marginBottom: Spacing.sm,
  },
  recommendationBadgeText: {
    fontSize: 12,
    fontWeight: Typography.weights.semibold,
    color: Colors.white,
  },
  recommendationTitle: {
    fontSize: 18,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  recommendationDescription: {
    fontSize: 14,
    color: Colors.lightText,
    lineHeight: 20,
  },
  weightControls: { 
    flexDirection: 'row', 
    gap: Spacing.xl, 
    marginTop: Spacing.sm 
  },
  controlButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlText: { 
    fontSize: 24, 
    fontWeight: Typography.weights.bold, 
    color: Colors.text 
  },
  footer: { paddingTop: Spacing.lg, paddingBottom: Spacing.md },
  buttonRow: { flexDirection: 'row', gap: Spacing.md, justifyContent: 'center', alignItems: 'center' },
});
