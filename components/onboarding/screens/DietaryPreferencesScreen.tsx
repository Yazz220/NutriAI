import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Utensils, AlertTriangle, Target } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { Spacing, Typography } from '@/constants/spacing';
import { OnboardingLayout } from '../OnboardingLayout';
import { MultiSelectChips } from '../MultiSelectChips';
import { Button } from '@/components/ui/Button';
import { useOnboarding } from '../OnboardingProvider';
import { useOnboardingNavigation } from '@/hooks/useOnboardingNavigation';
import { useOnboardingAnalytics } from '@/hooks/useOnboardingAnalytics';
import { 
  DIETARY_TYPES, 
  ALLERGY_OPTIONS, 
  GOAL_OPTIONS,
  ONBOARDING_STEPS 
} from '@/constants/onboarding';

export const DietaryPreferencesScreen: React.FC = () => {
  const [dietaryTypes, setDietaryTypes] = useState<string[]>([]);
  const [allergies, setAllergies] = useState<string[]>([]);
  const [goals, setGoals] = useState<string[]>([]);

  const { state, updateUserData } = useOnboarding();
  const { navigateNext, navigateSkip } = useOnboardingNavigation();
  const { trackDietaryPreferencesSet, trackUserChoice } = useOnboardingAnalytics();

  // Load existing preferences if any
  useEffect(() => {
    if (state.userData.dietaryPreferences) {
      setDietaryTypes(state.userData.dietaryPreferences);
    }
    if (state.userData.allergies) {
      setAllergies(state.userData.allergies);
    }
    if (state.userData.goals) {
      setGoals(state.userData.goals);
    }
  }, [state.userData]);

  const handleContinue = async () => {
    // Update user data
    updateUserData({
      dietaryPreferences: dietaryTypes,
      allergies,
      goals,
    });

    // Track analytics
    trackDietaryPreferencesSet({
      dietaryTypes,
      allergies,
      goals,
    });

    trackUserChoice({
      step: 2, // OnboardingStep.DIETARY_PREFERENCES
      choiceType: 'preferences_set',
      choiceValue: 'continue',
      context: {
        dietaryTypesCount: dietaryTypes.length,
        allergiesCount: allergies.length,
        goalsCount: goals.length,
      },
    });

    await navigateNext();
  };

  const handleSkip = async () => {
    trackUserChoice({
      step: 2, // OnboardingStep.DIETARY_PREFERENCES
      choiceType: 'preferences_set',
      choiceValue: 'skip',
    });

    await navigateSkip();
  };

  const hasSelections = dietaryTypes.length > 0 || allergies.length > 0 || goals.length > 0;

  return (
    <OnboardingLayout
      title={ONBOARDING_STEPS.DIETARY_PREFERENCES.title}
      subtitle={ONBOARDING_STEPS.DIETARY_PREFERENCES.subtitle}
      showProgress={true}
      showSkip={true}
      onSkip={handleSkip}
      skipWarning="Without dietary preferences, we can't personalize your recipe recommendations and meal suggestions."
    >
      <ScrollView 
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Dietary Types Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Utensils size={20} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Dietary Preferences</Text>
          </View>
          <Text style={styles.sectionDescription}>
            What best describes your eating style?
          </Text>
          <MultiSelectChips
            options={DIETARY_TYPES}
            selectedValues={dietaryTypes}
            onSelectionChange={setDietaryTypes}
            maxSelections={2}
            searchable={false}
          />
        </View>

        {/* Allergies Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <AlertTriangle size={20} color={Colors.error} />
            <Text style={styles.sectionTitle}>Food Allergies & Avoidances</Text>
          </View>
          <Text style={styles.sectionDescription}>
            Select any foods you need to avoid for health or personal reasons.
          </Text>
          <MultiSelectChips
            options={ALLERGY_OPTIONS}
            selectedValues={allergies}
            onSelectionChange={setAllergies}
            searchable={true}
            placeholder="Search allergies..."
          />
        </View>

        {/* Goals Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Target size={20} color={Colors.success} />
            <Text style={styles.sectionTitle}>Health & Nutrition Goals</Text>
          </View>
          <Text style={styles.sectionDescription}>
            What are you hoping to achieve with your nutrition?
          </Text>
          <MultiSelectChips
            options={GOAL_OPTIONS}
            selectedValues={goals}
            onSelectionChange={setGoals}
            maxSelections={3}
            searchable={false}
          />
        </View>

        {/* Summary Section */}
        {hasSelections && (
          <View style={styles.summarySection}>
            <Text style={styles.summaryTitle}>Your Preferences Summary</Text>
            
            {dietaryTypes.length > 0 && (
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Dietary Type:</Text>
                <Text style={styles.summaryValue}>
                  {dietaryTypes.map(type => 
                    DIETARY_TYPES.find(d => d.value === type)?.label
                  ).join(', ')}
                </Text>
              </View>
            )}

            {allergies.length > 0 && (
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Avoiding:</Text>
                <Text style={styles.summaryValue}>
                  {allergies.map(allergy => 
                    ALLERGY_OPTIONS.find(a => a.value === allergy)?.label
                  ).join(', ')}
                </Text>
              </View>
            )}

            {goals.length > 0 && (
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Goals:</Text>
                <Text style={styles.summaryValue}>
                  {goals.map(goal => 
                    GOAL_OPTIONS.find(g => g.value === goal)?.label
                  ).join(', ')}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            💡 Don't worry if you're not sure about everything. You can always update these preferences later in your profile settings.
          </Text>
        </View>
      </ScrollView>

      {/* Bottom Actions */}
      <View style={styles.bottomActions}>
        <Button
          title={hasSelections ? "Continue" : "Skip for Now"}
          onPress={hasSelections ? handleContinue : handleSkip}
          variant="primary"
          size="lg"
          fullWidth={true}
          testID="dietary-preferences-continue-button"
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
    marginBottom: Spacing.sm,
  },
  summaryLabel: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    color: Colors.lightText,
    marginBottom: Spacing.xs / 2,
  },
  summaryValue: {
    fontSize: Typography.sizes.md,
    color: Colors.text,
    lineHeight: Typography.sizes.md * 1.3,
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