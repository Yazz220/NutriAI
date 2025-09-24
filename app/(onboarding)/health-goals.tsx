import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
  Modal,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Image,
  ViewStyle,
} from 'react-native';
import {
  OnboardingScreenWrapper,
  OnboardingButton,
  SimpleOptionCard,
  BehindTheQuestion,
  useOnboarding,
} from '@/components/onboarding';

import { HealthGoal, GoalDirection, healthGoalToProfileMapping, OnboardingCustomGoal } from '@/types/onboarding';
import { Colors } from '@/constants/colors';
import { Typography, Spacing } from '@/constants/spacing';

const healthGoalOptions: Array<{ id: HealthGoal; title: string }> = [
  { id: 'lose-weight', title: 'Lose weight' },
  { id: 'maintain-weight', title: 'Maintain weight' },
  { id: 'gain-weight', title: 'Gain weight' },
  { id: 'build-muscle', title: 'Build muscle' },
  { id: 'improve-health', title: 'Improve health' },
  { id: 'manage-restrictions', title: 'Manage dietary restrictions' },
];

const goalDirectionOptions: Array<{ id: GoalDirection; label: string; description: string }> = [
  { id: 'lose', label: 'Lose', description: 'Calorie deficit with higher protein focus' },
  { id: 'maintain', label: 'Maintain', description: 'Balanced intake to sustain your progress' },
  { id: 'gain', label: 'Gain', description: 'Calorie surplus to build strength or mass' },
];

const goalDirectionLabels: Record<GoalDirection, string> = {
  lose: 'Focus on gradual fat loss',
  maintain: 'Balanced maintenance approach',
  gain: 'Support healthy weight or muscle gain',
};

const educationalContent = [
  {
    title: 'Personalized Nutrition Plans',
    description:
      'Your goal shapes the type of nutritional guidance we provide. For example, weight loss focuses on creating sustainable calorie deficits, while muscle building emphasizes adequate protein intake and timing.',
    reference: 'Journal of the International Society of Sports Nutrition, 2022',
  },
  {
    title: 'Optimized Meal Recommendations',
    description:
      'Each goal requires a unique approach to macronutrient distribution. Weight loss plans prioritize satiety and metabolic health, while maintenance focuses on balanced nutrition and lifestyle sustainability.',
    reference: 'American Journal of Clinical Nutrition, 2021',
  },
  {
    title: 'Progress Tracking Effectiveness',
    description:
      'Knowing your primary goal allows us to monitor relevant metrics, such as body composition changes, energy levels, or dietary adherence, ensuring you stay on track to achieve your objectives.',
    reference: 'Nutrition Reviews, 2023',
  },
];

export default function HealthGoalsScreen() {
  const { updateOnboardingData, nextStep, previousStep, onboardingData, validateCurrentStep } = useOnboarding();

  const [selectedGoal, setSelectedGoal] = useState<HealthGoal | null>(onboardingData.healthGoal);
  const [error, setError] = useState<string | null>(null);

  const [isCustomModalVisible, setIsCustomModalVisible] = useState(false);
  const [customGoalTitle, setCustomGoalTitle] = useState(onboardingData.customGoal?.title ?? '');
  const [customGoalMotivation, setCustomGoalMotivation] = useState(onboardingData.customGoal?.motivation ?? '');
  const [customGoalDirection, setCustomGoalDirection] = useState<GoalDirection>(
    onboardingData.customGoal?.goalType ?? onboardingData.goalPreferences.goalType ?? 'maintain'
  );
  const [modalError, setModalError] = useState<string | null>(null);

  const goalCards = [...healthGoalOptions, { id: 'custom' as HealthGoal, title: 'Create a custom goal', isCustom: true }];

  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerTranslateY = useRef(new Animated.Value(-20)).current;
  const cardAnimations = useRef(goalCards.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    const headerAnimation = Animated.parallel([
      Animated.timing(headerOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(headerTranslateY, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]);

    const cardAnimTimings = cardAnimations.map((anim, index) =>
      Animated.timing(anim, {
        toValue: 1,
        duration: 400,
        delay: index * 100,
        useNativeDriver: true,
      })
    );

    Animated.sequence([
      headerAnimation,
      Animated.delay(200),
      Animated.stagger(100, cardAnimTimings),
    ]).start();
  }, [cardAnimations, headerOpacity, headerTranslateY]);

  const handleGoalSelect = (goal: HealthGoal) => {
    setSelectedGoal(goal);
    updateOnboardingData('healthGoal', goal);
    if (goal !== 'custom') {
      updateOnboardingData('customGoal', null);
      const mappedType = healthGoalToProfileMapping[goal]?.goalType ?? 'maintain';
      updateOnboardingData('goalPreferences', { goalType: mappedType });
      setCustomGoalDirection(mappedType);
    }
    setError(null);
  };

  const handleCustomGoalPress = () => {
    const existing = onboardingData.customGoal;
    setCustomGoalTitle(existing?.title ?? customGoalTitle ?? '');
    setCustomGoalMotivation(existing?.motivation ?? customGoalMotivation ?? '');
    setCustomGoalDirection(existing?.goalType ?? onboardingData.goalPreferences.goalType ?? customGoalDirection);
    setModalError(null);
    setIsCustomModalVisible(true);
  };

  const handleGoalDirectionSelect = (direction: GoalDirection) => {
    setCustomGoalDirection(direction);
  };

  const handleCustomGoalSave = () => {
    const trimmedTitle = customGoalTitle.trim();
    const trimmedMotivation = customGoalMotivation.trim();

    if (!trimmedTitle) {
      setModalError('Please describe your custom goal');
      return;
    }

    const customGoalPayload: OnboardingCustomGoal = {
      title: trimmedTitle,
      goalType: customGoalDirection,
      motivation: trimmedMotivation.length > 0 ? trimmedMotivation : undefined,
    };

    updateOnboardingData('healthGoal', 'custom');
    updateOnboardingData('customGoal', customGoalPayload);
    updateOnboardingData('goalPreferences', { goalType: customGoalDirection });

    setSelectedGoal('custom');
    setCustomGoalTitle(trimmedTitle);
    setCustomGoalMotivation(trimmedMotivation);
    setModalError(null);
    setIsCustomModalVisible(false);
    setError(null);
  };

  const handleCustomGoalCancel = () => {
    setModalError(null);
    setIsCustomModalVisible(false);
  };

  const handleContinue = () => {
    if (!selectedGoal) {
      setError('Please select a health goal to continue');
      return;
    }

    if (selectedGoal === 'custom' && !onboardingData.customGoal) {
      setError('Save your custom goal before continuing');
      return;
    }

    const validation = validateCurrentStep();
    if (!validation.canProceed) {
      setError(validation.missingFields.join(', '));
      return;
    }

    nextStep();
  };

  const handleBack = () => {
    previousStep();
  };

  const currentCustomGoal = onboardingData.customGoal;

  return (
    <OnboardingScreenWrapper>
      <View style={styles.container}>
        <Animated.View
          style={[
            styles.header,
            {
              opacity: headerOpacity,
              transform: [{ translateY: headerTranslateY }],
            },
          ]}
        >
          <Image
            source={require('@/assets/images/nosh/What\'s your goal.png')}
            defaultSource={require('@/assets/images/nosh/What\'s your goal.png')}
            fadeDuration={0}
            style={styles.noshImage}
            resizeMode="contain"
            accessibilityIgnoresInvertColors
          />
          <Text numberOfLines={2} style={styles.title}>What goal do you have in mind?</Text>
        </Animated.View>

        <BehindTheQuestion
          title="Behind the question"
          subtitle="Personalized nutrition plans based on your goals..."
          content={educationalContent}
        />

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {goalCards.map((option, index) => {
            const animationStyle = {
              opacity: cardAnimations[index],
              transform: [
                {
                  translateY: cardAnimations[index].interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  }),
                },
              ],
            } as Animated.WithAnimatedObject<ViewStyle>;

            const isCustom = 'isCustom' in option && option.isCustom;
            const isSelected = isCustom ? selectedGoal === 'custom' : selectedGoal === option.id;
            const handlePress = isCustom ? handleCustomGoalPress : () => handleGoalSelect(option.id);
            const accessibilityLabel = isCustom
              ? 'Create a custom goal'
              : `Select ${option.title} as your health goal`;
            const accessibilityHint = isCustom
              ? 'Open a modal to describe your own goal'
              : `Choose ${option.title} as your primary health goal`;

            return (
              <SimpleOptionCard
                key={option.id}
                title={option.title}
                selected={isSelected}
                onPress={handlePress}
                accessibilityLabel={accessibilityLabel}
                accessibilityHint={accessibilityHint}
                animationStyle={animationStyle}
              />
            );
          })}

          {selectedGoal === 'custom' && currentCustomGoal && (
            <View style={styles.customSummary}>
              <View style={styles.customSummaryHeader}>
                <Text style={styles.customSummaryTitle}>{currentCustomGoal.title}</Text>
                <TouchableOpacity onPress={handleCustomGoalPress} accessibilityRole="button">
                  <Text style={styles.customSummaryEditText}>Edit</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.customSummaryMeta}>{goalDirectionLabels[currentCustomGoal.goalType]}</Text>
              {currentCustomGoal.motivation ? (
                <Text style={styles.customSummaryMotivation}>{currentCustomGoal.motivation}</Text>
              ) : (
                <Text style={styles.customSummaryPlaceholder}>Add a motivation to stay on track</Text>
              )}
            </View>
          )}
        </ScrollView>

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
              accessibilityLabel="Go back to welcome screen"
            />
            <OnboardingButton
              title="Continue"
              onPress={handleContinue}
              variant="primary"
              accessibilityLabel="Continue to the next step"
            />
          </View>
        </View>
      </View>

      <Modal
        visible={isCustomModalVisible}
        transparent
        animationType="fade"
        onRequestClose={handleCustomGoalCancel}
      >
        <View style={styles.modalBackdrop}>
          <KeyboardAvoidingView
            behavior={Platform.select({ ios: 'padding', android: undefined })}
            style={styles.modalWrapper}
          >
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Create your custom goal</Text>
              <Text style={styles.modalSubtitle}>
                Describe what you want to achieve and how you want Nosh to support you.
              </Text>

              <TextInput
                value={customGoalTitle}
                onChangeText={setCustomGoalTitle}
                placeholder="E.g. Prepare for a 10K race"
                style={styles.modalInput}
                accessibilityLabel="Custom goal title"
              />

              <TextInput
                value={customGoalMotivation}
                onChangeText={setCustomGoalMotivation}
                placeholder="Why does this matter to you?"
                style={[styles.modalInput, styles.modalTextarea]}
                multiline
                accessibilityLabel="Custom goal motivation"
              />

              <Text style={styles.sectionHeading}>Which direction fits best?</Text>
              <View style={styles.directionGroup}>
                {goalDirectionOptions.map(option => {
                  const isSelected = customGoalDirection === option.id;
                  return (
                    <TouchableOpacity
                      key={option.id}
                      style={[styles.directionChip, isSelected && styles.directionChipSelected]}
                      onPress={() => handleGoalDirectionSelect(option.id)}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: isSelected }}
                    >
                      <Text
                        style={[styles.directionChipTitle, isSelected && styles.directionChipTitleSelected]}
                      >
                        {option.label}
                      </Text>
                      <Text style={styles.directionChipDescription}>{option.description}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {modalError && <Text style={styles.modalError}>{modalError}</Text>}

              <View style={styles.modalActions}>
                <OnboardingButton title="Cancel" variant="ghost" onPress={handleCustomGoalCancel} />
                <OnboardingButton title="Save" variant="primary" onPress={handleCustomGoalSave} />
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </OnboardingScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    marginBottom: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  title: {
    fontSize: 22,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    marginBottom: 0,
    lineHeight: 28,
    flexShrink: 1,
    flexWrap: 'wrap',
  },
  subtitle: {
    fontSize: 16,
    color: Colors.lightText,
    lineHeight: 24,
    fontWeight: Typography.weights.medium,
  },
  content: {
    flex: 1,
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
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  customSummary: {
    marginTop: Spacing.lg,
    padding: Spacing.lg,
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  customSummaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  customSummaryTitle: {
    fontSize: 16,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
  },
  customSummaryEditText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: Typography.weights.semibold,
  },
  customSummaryMeta: {
    fontSize: 13,
    color: Colors.lightText,
    marginBottom: Spacing.xs,
  },
  customSummaryMotivation: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
  customSummaryPlaceholder: {
    fontSize: 14,
    color: Colors.lightText,
  },
  noshImage: {
    alignSelf: 'center',
    marginBottom: 0,
    width: 112,
    height: 112,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: Colors.text + '40',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  modalWrapper: {
    flex: 1,
    justifyContent: 'center',
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: Spacing.lg,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  modalSubtitle: {
    fontSize: 14,
    color: Colors.lightText,
    marginBottom: Spacing.md,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 16,
    color: Colors.text,
    marginBottom: Spacing.md,
    backgroundColor: Colors.white,
  },
  modalTextarea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  directionGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  directionChip: {
    flexGrow: 1,
    minWidth: '30%',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.card,
  },
  directionChipSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  directionChipTitle: {
    fontSize: 14,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
  },
  directionChipTitleSelected: {
    color: Colors.primary,
  },
  directionChipDescription: {
    fontSize: 12,
    color: Colors.lightText,
    marginTop: 4,
  },
  modalError: {
    color: Colors.error,
    fontSize: 13,
    marginBottom: Spacing.sm,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
});
