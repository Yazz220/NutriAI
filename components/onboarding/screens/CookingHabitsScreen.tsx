import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { ChefHat, Clock, ShoppingCart } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { Spacing, Typography } from '@/constants/spacing';
import { OnboardingLayout } from '../OnboardingLayout';
import { MultiSelectChips } from '../MultiSelectChips';
import { Button } from '@/components/ui/Button';
import { useOnboarding } from '../OnboardingProvider';
import { useOnboardingNavigation } from '@/hooks/useOnboardingNavigation';
import { useOnboardingAnalytics } from '@/hooks/useOnboardingAnalytics';
import { 
  COOKING_SKILL_OPTIONS, 
  COOKING_TIME_OPTIONS, 
  SHOPPING_FREQUENCY_OPTIONS,
  ONBOARDING_STEPS 
} from '@/constants/onboarding';
import { CookingSkill, CookingTime, ShoppingFrequency } from '@/types';

export const CookingHabitsScreen: React.FC = () => {
  const [cookingSkill, setCookingSkill] = useState<string[]>([]);
  const [cookingTime, setCookingTime] = useState<string[]>([]);
  const [shoppingFrequency, setShoppingFrequency] = useState<string[]>([]);

  const { state, updateUserData } = useOnboarding();
  const { navigateNext, navigateSkip } = useOnboardingNavigation();
  const { trackCookingHabitsSet, trackUserChoice } = useOnboardingAnalytics();

  // Load existing preferences if any
  useEffect(() => {
    if (state.userData.cookingSkill) {
      setCookingSkill([state.userData.cookingSkill]);
    }
    if (state.userData.cookingTime) {
      setCookingTime([state.userData.cookingTime]);
    }
    if (state.userData.shoppingFrequency) {
      setShoppingFrequency([state.userData.shoppingFrequency]);
    }
  }, [state.userData]);

  const handleContinue = async () => {
    // Update user data
    updateUserData({
      cookingSkill: cookingSkill[0] as CookingSkill,
      cookingTime: cookingTime[0] as CookingTime,
      shoppingFrequency: shoppingFrequency[0] as ShoppingFrequency,
    });

    // Track analytics
    trackCookingHabitsSet({
      cookingSkill: cookingSkill[0] || '',
      cookingTime: cookingTime[0] || '',
      shoppingFrequency: shoppingFrequency[0] || '',
    });

    trackUserChoice({
      step: 3, // OnboardingStep.COOKING_HABITS
      choiceType: 'habits_set',
      choiceValue: 'continue',
      context: {
        cookingSkill: cookingSkill[0],
        cookingTime: cookingTime[0],
        shoppingFrequency: shoppingFrequency[0],
      },
    });

    await navigateNext();
  };

  const handleSkip = async () => {
    trackUserChoice({
      step: 3, // OnboardingStep.COOKING_HABITS
      choiceType: 'habits_set',
      choiceValue: 'skip',
    });

    await navigateSkip();
  };

  const hasSelections = cookingSkill.length > 0 || cookingTime.length > 0 || shoppingFrequency.length > 0;
  const isComplete = cookingSkill.length > 0 && cookingTime.length > 0 && shoppingFrequency.length > 0;

  return (
    <OnboardingLayout
      title={ONBOARDING_STEPS.COOKING_HABITS.title}
      subtitle={ONBOARDING_STEPS.COOKING_HABITS.subtitle}
      showProgress={true}
      showSkip={true}
      onSkip={handleSkip}
      skipWarning="Without knowing your cooking habits, we can't provide the most relevant recipe suggestions and meal planning."
    >
      <ScrollView 
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Cooking Skill Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ChefHat size={20} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Cooking Skill Level</Text>
          </View>
          <Text style={styles.sectionDescription}>
            How would you describe your cooking experience?
          </Text>
          <MultiSelectChips
            options={COOKING_SKILL_OPTIONS}
            selectedValues={cookingSkill}
            onSelectionChange={setCookingSkill}
            maxSelections={1}
            searchable={false}
          />
        </View>

        {/* Cooking Time Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Clock size={20} color={Colors.warning} />
            <Text style={styles.sectionTitle}>Preferred Cooking Time</Text>
          </View>
          <Text style={styles.sectionDescription}>
            How much time do you typically like to spend cooking?
          </Text>
          <MultiSelectChips
            options={COOKING_TIME_OPTIONS}
            selectedValues={cookingTime}
            onSelectionChange={setCookingTime}
            maxSelections={1}
            searchable={false}
          />
        </View>

        {/* Shopping Frequency Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ShoppingCart size={20} color={Colors.success} />
            <Text style={styles.sectionTitle}>Shopping Frequency</Text>
          </View>
          <Text style={styles.sectionDescription}>
            How often do you typically go grocery shopping?
          </Text>
          <MultiSelectChips
            options={SHOPPING_FREQUENCY_OPTIONS}
            selectedValues={shoppingFrequency}
            onSelectionChange={setShoppingFrequency}
            maxSelections={1}
            searchable={false}
          />
        </View>

        {/* Summary Section */}
        {hasSelections && (
          <View style={styles.summarySection}>
            <Text style={styles.summaryTitle}>Your Cooking Profile</Text>
            
            {cookingSkill.length > 0 && (
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Skill Level:</Text>
                <Text style={styles.summaryValue}>
                  {COOKING_SKILL_OPTIONS.find(s => s.value === cookingSkill[0])?.label}
                </Text>
                <Text style={styles.summaryDescription}>
                  {COOKING_SKILL_OPTIONS.find(s => s.value === cookingSkill[0])?.description}
                </Text>
              </View>
            )}

            {cookingTime.length > 0 && (
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Preferred Time:</Text>
                <Text style={styles.summaryValue}>
                  {COOKING_TIME_OPTIONS.find(t => t.value === cookingTime[0])?.label}
                </Text>
                <Text style={styles.summaryDescription}>
                  {COOKING_TIME_OPTIONS.find(t => t.value === cookingTime[0])?.description}
                </Text>
              </View>
            )}

            {shoppingFrequency.length > 0 && (
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Shopping:</Text>
                <Text style={styles.summaryValue}>
                  {SHOPPING_FREQUENCY_OPTIONS.find(f => f.value === shoppingFrequency[0])?.label}
                </Text>
                <Text style={styles.summaryDescription}>
                  {SHOPPING_FREQUENCY_OPTIONS.find(f => f.value === shoppingFrequency[0])?.description}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Personalization Preview */}
        {isComplete && (
          <View style={styles.previewSection}>
            <Text style={styles.previewTitle}>🎯 How this helps personalize your experience:</Text>
            <View style={styles.previewItems}>
              <Text style={styles.previewItem}>
                • Recipe difficulty will match your {COOKING_SKILL_OPTIONS.find(s => s.value === cookingSkill[0])?.label.toLowerCase()} level
              </Text>
              <Text style={styles.previewItem}>
                • We'll prioritize recipes that take {COOKING_TIME_OPTIONS.find(t => t.value === cookingTime[0])?.label.toLowerCase()}
              </Text>
              <Text style={styles.previewItem}>
                • Meal plans will consider your {SHOPPING_FREQUENCY_OPTIONS.find(f => f.value === shoppingFrequency[0])?.label.toLowerCase()} shopping schedule
              </Text>
            </View>
          </View>
        )}

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            💡 These preferences help us suggest recipes that fit your lifestyle. You can always adjust them later as your cooking journey evolves!
          </Text>
        </View>
      </ScrollView>

      {/* Bottom Actions */}
      <View style={styles.bottomActions}>
        <Button
          title={isComplete ? "Continue" : hasSelections ? "Continue" : "Skip for Now"}
          onPress={hasSelections ? handleContinue : handleSkip}
          variant="primary"
          size="lg"
          fullWidth={true}
          testID="cooking-habits-continue-button"
        />
        
        {hasSelections && (
          <Button
            title="Skip This Step"
            onPress={handleSkip}
            variant="ghost"
            size="md"
            fullWidth={true}
            style={styles.skipButton}
          />
        )}
      </View>
    </OnboardingLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing.xxxl,
  },

  // Section
  section: {
    marginBottom: Spacing.xxxl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
    marginLeft: Spacing.sm,
  },
  sectionDescription: {
    fontSize: Typography.sizes.md,
    color: Colors.lightText,
    lineHeight: Typography.sizes.md * 1.4,
    marginBottom: Spacing.lg,
  },

  // Summary
  summarySection: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  summaryTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  summaryItem: {
    marginBottom: Spacing.md,
  },
  summaryLabel: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    color: Colors.lightText,
    marginBottom: Spacing.xs / 2,
  },
  summaryValue: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
    marginBottom: Spacing.xs / 2,
  },
  summaryDescription: {
    fontSize: Typography.sizes.sm,
    color: Colors.lightText,
    lineHeight: Typography.sizes.sm * 1.3,
  },

  // Preview
  previewSection: {
    backgroundColor: Colors.success + '20',
    borderRadius: 12,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.success + '40',
  },
  previewTitle: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    color: Colors.success,
    marginBottom: Spacing.md,
  },
  previewItems: {
    gap: Spacing.sm,
  },
  previewItem: {
    fontSize: Typography.sizes.sm,
    color: Colors.success,
    lineHeight: Typography.sizes.sm * 1.4,
  },

  // Info Box
  infoBox: {
    backgroundColor: Colors.info + '20',
    borderRadius: 8,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.info + '40',
    marginBottom: Spacing.lg,
  },
  infoText: {
    fontSize: Typography.sizes.sm,
    color: Colors.info,
    lineHeight: Typography.sizes.sm * 1.4,
    textAlign: 'center',
  },

  // Bottom Actions
  bottomActions: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  skipButton: {
    marginTop: Spacing.md,
  },
});