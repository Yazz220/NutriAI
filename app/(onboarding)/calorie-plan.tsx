import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, TextInput } from 'react-native';
import { OnboardingScreenWrapper, OnboardingButton, BehindTheQuestion, ONBOARDING_SCROLL_BOTTOM_INSET, useOnboarding } from '@/components/onboarding';
import { RecipeNutritionCard } from '@/components/recipe-detail/RecipeNutritionCard';
import { Colors } from '@/constants/colors';
import { Typography, Spacing } from '@/constants/spacing';
import { OnboardingProfileIntegration } from '@/utils/onboardingProfileIntegration';
import { HealthGoal, GoalDirection, healthGoalToProfileMapping } from '@/types/onboarding';

interface RecommendationSummary {
  calories: number;
  macros: {
    protein: number;
    carbs: number;
    fats: number;
  };
}

const educationalContent = [
  {
    title: 'The Mifflin-St Jeor equation',
    description:
      'We use the Mifflin-St Jeor equation, proven more accurate than older formulas. It calculates your Basal Metabolic Rate (BMR) based on age, height, weight, and sex, then applies activity multipliers for Total Daily Energy Expenditure (TDEE).',
    reference: 'American Journal of Clinical Nutrition, 1990; Used by MyFitnessPal',
  },
  {
    title: 'Research-backed calorie adjustments',
    description:
      'For weight loss, we create a 500-calorie deficit (0.5-1 lb/week). For muscle gain, a 350-calorie surplus optimizes the muscle-to-fat gain ratio. These are safe, sustainable rates validated by nutrition research.',
    reference: 'Sports Medicine & Nutrition Science, 2021',
  },
  {
    title: 'Smart macro distribution',
    description:
      'We use a 40% carbs, 30% protein, 30% fat split—the same evidence-based ratio used by successful apps like MyFitnessPal. Higher protein preserves muscle during weight loss and supports muscle building.',
    reference: 'PMC Nutrition Studies; MyFitnessPal Standards',
  },
];

const goalDirectionFromHealthGoal = (goal: HealthGoal | null): GoalDirection => {
  if (!goal) return 'maintain';
  return healthGoalToProfileMapping[goal]?.goalType ?? 'maintain';
};

const referenceGoalFromDirection = (direction: GoalDirection): HealthGoal => {
  switch (direction) {
    case 'lose':
      return 'lose-weight';
    case 'gain':
      return 'gain-weight';
    default:
      return 'maintain-weight';
  }
};

export default function CaloriePlanScreen() {
  const { onboardingData, updateOnboardingData, nextStep, previousStep } = useOnboarding();
  const { basicProfile, healthGoal, goalPreferences } = onboardingData;

  const goalDirection: GoalDirection =
    goalPreferences.goalType ?? goalDirectionFromHealthGoal(healthGoal);

  const macroReferenceGoal: HealthGoal =
    healthGoal && healthGoal !== 'custom'
      ? healthGoal
      : referenceGoalFromDirection(goalDirection);

  const canCalculate = Boolean(
    basicProfile.age &&
      basicProfile.height &&
      basicProfile.weight &&
      basicProfile.activityLevel
  );

  const recommendation: RecommendationSummary | null = useMemo(() => {
    if (!canCalculate) {
      return null;
    }

    const calories = OnboardingProfileIntegration.calculateDailyCalories({
      age: basicProfile.age!,
      height: basicProfile.height!,
      weight: basicProfile.weight!,
      gender: basicProfile.gender || 'other',
      activityLevel: basicProfile.activityLevel!,
      goalType: goalDirection,
      targetWeight: basicProfile.targetWeight,
    });

    const macros = OnboardingProfileIntegration.calculateMacroTargets(calories, macroReferenceGoal);
    return { calories, macros };
  }, [canCalculate, basicProfile.age, basicProfile.height, basicProfile.weight, basicProfile.gender, basicProfile.activityLevel, basicProfile.targetWeight, goalDirection, macroReferenceGoal]);

  const [useCustom, setUseCustom] = useState(goalPreferences.useCustomCalories);
  const [customCaloriesInput, setCustomCaloriesInput] = useState(() => {
    if (goalPreferences.customCalorieTarget) {
      return String(goalPreferences.customCalorieTarget);
    }
    if (recommendation?.calories) {
      return String(recommendation.calories);
    }
    return '';
  });
  const [error, setError] = useState<string | null>(null);

  const recommendedCalories = recommendation?.calories;
  const recommendedMacros = recommendation?.macros;
  const storedCustomCalories = goalPreferences.customCalorieTarget;
  const storedCustomMacros = goalPreferences.customMacroTargets;

  useEffect(() => {
    if (recommendation) {
      const needsUpdate =
        goalPreferences.goalType !== goalDirection ||
        goalPreferences.recommendedCalories !== recommendation.calories ||
        !goalPreferences.recommendedMacros ||
        goalPreferences.recommendedMacros.protein !== recommendation.macros.protein ||
        goalPreferences.recommendedMacros.carbs !== recommendation.macros.carbs ||
        goalPreferences.recommendedMacros.fats !== recommendation.macros.fats;

      if (needsUpdate) {
        updateOnboardingData('goalPreferences', {
          goalType: goalDirection,
          recommendedCalories: recommendation.calories,
          recommendedMacros: recommendation.macros,
        });
      }
    }
  }, [recommendation?.calories, recommendation?.macros.protein, recommendation?.macros.carbs, recommendation?.macros.fats, goalDirection]);

  useEffect(() => {
    if (goalPreferences.useCustomCalories !== useCustom) {
      updateOnboardingData('goalPreferences', { useCustomCalories: useCustom });
    }
  }, [useCustom]);

  useEffect(() => {
    if (!useCustom) {
      if (goalPreferences.customCalorieTarget !== undefined || goalPreferences.customMacroTargets) {
        updateOnboardingData('goalPreferences', {
          customCalorieTarget: undefined,
          customMacroTargets: undefined,
        });
      }
      return;
    }

    const parsed = parseFloat(customCaloriesInput);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return;
    }

    const rounded = Math.round(parsed);
    if (storedCustomCalories === rounded && storedCustomMacros) {
      return;
    }

    const customMacros = OnboardingProfileIntegration.calculateMacroTargets(rounded, macroReferenceGoal);
    updateOnboardingData('goalPreferences', {
      customCalorieTarget: rounded,
      customMacroTargets: customMacros,
    });
  }, [useCustom, customCaloriesInput, macroReferenceGoal, storedCustomCalories, storedCustomMacros?.protein, storedCustomMacros?.carbs, storedCustomMacros?.fats]);

  useEffect(() => {
    if (useCustom && !customCaloriesInput && recommendedCalories) {
      setCustomCaloriesInput(String(recommendedCalories));
    }
  }, [useCustom, recommendedCalories]);

  const activeCalories = useCustom && storedCustomCalories ? storedCustomCalories : recommendedCalories;
  const activeMacros = useCustom && storedCustomMacros ? storedCustomMacros : recommendedMacros;

  const handleToggleCustom = (value: boolean) => {
    setUseCustom(value);
    setError(null);
  };

  const handleContinue = () => {
    if (!useCustom && !recommendedCalories) {
      setError('Complete your basic profile so we can calculate a target.');
      return;
    }

    if (useCustom) {
      const parsed = parseFloat(customCaloriesInput);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        setError('Enter a positive calorie target.');
        return;
      }

      const rounded = Math.round(parsed);
      if (rounded < 800 || rounded > 6000) {
        setError('Custom calories should be between 800 and 6000 for safety.');
        return;
      }

      const customMacros = OnboardingProfileIntegration.calculateMacroTargets(rounded, macroReferenceGoal);
      updateOnboardingData('goalPreferences', {
        goalType: goalDirection,
        useCustomCalories: true,
        customCalorieTarget: rounded,
        customMacroTargets: customMacros,
        recommendedCalories,
        recommendedMacros,
      });
    } else if (recommendation) {
      updateOnboardingData('goalPreferences', {
        goalType: goalDirection,
        useCustomCalories: false,
        recommendedCalories: recommendation.calories,
        recommendedMacros: recommendation.macros,
        customCalorieTarget: undefined,
        customMacroTargets: undefined,
      });
    }

    setError(null);
    nextStep();
  };

  const renderNutritionCard = (title: string, calories?: number | null, macros?: RecommendationSummary['macros'] | null) => {
    const hasData = typeof calories === 'number' && Number.isFinite(calories) && !!macros;
    return (
      <View style={styles.recommendationCard}>
        <Text style={styles.cardHeading}>{title}</Text>
        <RecipeNutritionCard
          title=""
          calories={hasData ? calories! : 0}
          protein={hasData ? macros!.protein : 0}
          carbs={hasData ? macros!.carbs : 0}
          fats={hasData ? macros!.fats : 0}
          showGrams={true}
        />
        {!hasData ? (
          <Text style={styles.cardHint}>Complete your basic profile to calculate a personalized target.</Text>
        ) : null}
      </View>
    );
  };
  const handleBack = () => {
    previousStep();
  };

  return (
    <OnboardingScreenWrapper>
      <View style={styles.container}>
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>Personalize your daily calories</Text>
          <Text style={styles.subtitle}>
            We start with a science-backed recommendation based on your profile. Switch to a custom value if you already know what works for you.
          </Text>

          {renderNutritionCard('Recommended target', recommendedCalories, recommendedMacros)}
          <View style={styles.toggleRow}>
            <View style={styles.toggleTextContainer}>
              <Text style={styles.toggleTitle}>Use a custom calorie goal</Text>
              <Text style={styles.toggleSubtitle}>Set a manual target if you already track a specific intake.</Text>
            </View>
            <Switch value={useCustom} onValueChange={handleToggleCustom} thumbColor={useCustom ? Colors.primary : Colors.lightGray} />
          </View>

          {useCustom && (
            <View style={styles.customCard}>
              <Text style={styles.customLabel}>Daily calories</Text>
              <TextInput
                value={customCaloriesInput}
                onChangeText={text => {
                  setCustomCaloriesInput(text.replace(/[^0-9.]/g, ''));
                  setError(null);
                }}
                keyboardType="numeric"
                placeholder="e.g. 2100"
                style={styles.customInput}
              />
              <Text style={styles.customHint}>
                We will adjust macros automatically based on this target.
              </Text>
              {storedCustomCalories && storedCustomMacros ? (
                <View style={styles.customRingWrapper}>
                  <RecipeNutritionCard
                    title="Custom target"
                    calories={storedCustomCalories}
                    protein={storedCustomMacros.protein}
                    carbs={storedCustomMacros.carbs}
                    fats={storedCustomMacros.fats}
                    showGrams={true}
                  />
                </View>
              ) : null}
            </View>
          )}

          {!useCustom && activeCalories && (
            <View style={styles.activeSummary}>
              <Text style={styles.activeSummaryText}>
                {`Your plan will start at ${activeCalories?.toLocaleString?.() ?? '--'} kcal with balanced macros.`}
              </Text>
            </View>
          )}

          <BehindTheQuestion
            title="How we calculate this"
            subtitle="Get clarity on your calorie target"
            content={educationalContent}
          />
        </ScrollView>

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.footer}>
          <View style={styles.buttonRow}>
            <OnboardingButton title="Back" variant="ghost" onPress={handleBack} />
            <OnboardingButton title="Continue" variant="primary" onPress={handleContinue} />
          </View>
        </View>
      </View>
    </OnboardingScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.md,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: ONBOARDING_SCROLL_BOTTOM_INSET,
  },
  title: {
    fontSize: 26,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    marginBottom: Spacing.sm,
    marginTop: Spacing.lg,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.lightText,
    marginBottom: Spacing.lg,
    lineHeight: 20,
  },
  recommendationCard: { marginBottom: Spacing.lg },
  cardHeading: { fontSize: 16, fontWeight: Typography.weights.semibold, color: Colors.text, marginBottom: Spacing.sm },
  cardHint: { fontSize: 13, color: Colors.lightText, marginTop: Spacing.sm },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    marginBottom: Spacing.lg,
  },
  toggleTextContainer: {
    flex: 1,
    marginRight: Spacing.md,
  },
  toggleTitle: {
    fontSize: 16,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
  },
  toggleSubtitle: {
    fontSize: 13,
    color: Colors.lightText,
    marginTop: 2,
  },
  customCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  customLabel: {
    fontSize: 14,
    color: Colors.lightText,
  },
  customInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 18,
    color: Colors.text,
    marginTop: Spacing.sm,
  },
  customHint: {
    fontSize: 12,
    color: Colors.lightText,
    marginTop: Spacing.sm,
  },
  customRingWrapper: { marginTop: Spacing.lg },
  activeSummary: {
    padding: Spacing.md,
    borderRadius: 12,
    backgroundColor: Colors.primary + '12',
    borderWidth: 1,
    borderColor: Colors.primary + '30',
    marginBottom: Spacing.lg,
  },
  activeSummaryText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: Typography.weights.medium,
  },
  errorContainer: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.error + '10',
    borderRadius: 8,
    marginBottom: Spacing.md,
  },
  errorText: {
    fontSize: 14,
    color: Colors.error,
    textAlign: 'center',
  },
  footer: {
    paddingBottom: Spacing.md,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
});


