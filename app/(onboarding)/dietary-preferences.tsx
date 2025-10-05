import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { OnboardingScreenWrapper, OnboardingButton, OnboardingHeader, ONBOARDING_SCROLL_BOTTOM_INSET, useOnboarding } from '@/components/onboarding';

import { DietaryRestriction } from '@/types/index';
import { Colors } from '@/constants/colors';
import { Typography, Spacing } from '@/constants/spacing';

const dietaryOptions: Array<{
  id: DietaryRestriction;
  title: string;
  description: string;
  icon: string;
  isStandard?: boolean;
}> = [
  {
    id: 'none',
    title: 'No Restrictions',
    description: 'I eat everything',
    icon: '🍽️',
    isStandard: true
  },
  {
    id: 'vegetarian',
    title: 'Vegetarian',
    description: 'No meat, but dairy and eggs are okay',
    icon: '🥬'
  },
  {
    id: 'vegan',
    title: 'Vegan',
    description: 'No animal products at all',
    icon: '🌱'
  },
  {
    id: 'pescatarian',
    title: 'Pescatarian',
    description: 'Fish and seafood, but no other meat',
    icon: '🐟'
  },
  {
    id: 'keto',
    title: 'Keto',
    description: 'Very low carb, high fat diet',
    icon: '🥑'
  },
  {
    id: 'paleo',
    title: 'Paleo',
    description: 'Whole foods, no processed items',
    icon: '🥩'
  },
  {
    id: 'gluten-free',
    title: 'Gluten-Free',
    description: 'No wheat, barley, or rye',
    icon: '🌾'
  },
  {
    id: 'dairy-free',
    title: 'Dairy-Free',
    description: 'No milk, cheese, or dairy products',
    icon: '🥛'
  },
  {
    id: 'nut-free',
    title: 'Nut-Free',
    description: 'No tree nuts or peanuts',
    icon: '🥜'
  },
  {
    id: 'low-carb',
    title: 'Low-Carb',
    description: 'Reduced carbohydrate intake',
    icon: '🍞'
  },
  {
    id: 'low-sodium',
    title: 'Low-Sodium',
    description: 'Reduced salt intake',
    icon: '🧂'
  },
  {
    id: 'halal',
    title: 'Halal',
    description: 'Following Islamic dietary laws',
    icon: '☪️'
  },
  {
    id: 'kosher',
    title: 'Kosher',
    description: 'Following Jewish dietary laws',
    icon: '✡️'
  }
];

export default function DietaryPreferencesScreen() {
  const { updateOnboardingData, nextStep, previousStep, onboardingData } = useOnboarding();

  const [selectedRestrictions, setSelectedRestrictions] = useState<DietaryRestriction[]>(
    onboardingData.dietaryPreferences.restrictions || []
  );
  const [allergies] = useState<string[]>(onboardingData.dietaryPreferences.allergies || []);
  const [customRestrictions] = useState<string[]>(onboardingData.dietaryPreferences.customRestrictions || []);

  useEffect(() => {
    updateOnboardingData('dietaryPreferences', {
      restrictions: selectedRestrictions,
      allergies,
      customRestrictions
    });
  }, [selectedRestrictions, allergies, customRestrictions, updateOnboardingData]);

  const handleRestrictionToggle = (restriction: DietaryRestriction) => {
    if (restriction === 'none') {
      setSelectedRestrictions(['none']);
    } else {
      const newRestrictions = selectedRestrictions.filter(r => r !== 'none');

      if (selectedRestrictions.includes(restriction)) {
        setSelectedRestrictions(newRestrictions.filter(r => r !== restriction));
      } else {
        setSelectedRestrictions([...newRestrictions, restriction]);
      }
    }
  };

  // Allergies and custom restrictions moved to dedicated pages

  const handleContinue = () => {
    nextStep();
  };

  const handleBack = () => {
    previousStep();
  };

  return (
    <OnboardingScreenWrapper>
      <View style={styles.container}>
        <OnboardingHeader
          imageSource={require('@/assets/images/nosh/What do you like to eat.png')}
          title="What do you like?"
          imageTranslateExtraRatio={0.20}
        />
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.gridHeader}>
            <Text style={styles.gridSubtitle}>Select any that apply</Text>
          </View>

          <View style={styles.circleGrid}>
            {dietaryOptions.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={[styles.circleItem, selectedRestrictions.includes(option.id) && styles.circleItemSelected]}
                onPress={() => handleRestrictionToggle(option.id)}
                accessibilityLabel={`Toggle ${option.title}`}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: selectedRestrictions.includes(option.id) }}
              >
                <View style={[
                  styles.circleIconWrap,
                  selectedRestrictions.includes(option.id) && styles.circleIconWrapSelected
                ]}>
                  <Text style={styles.circleIcon}>{option.icon}</Text>
                </View>
                <Text style={[styles.circleLabel, selectedRestrictions.includes(option.id) && styles.circleLabelSelected]}>
                  {option.title}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <View style={styles.buttonRow}>
            <OnboardingButton
              title="Back"
              onPress={handleBack}
              variant="ghost"
              accessibilityLabel="Go back to basic profile"
            />
            <OnboardingButton
              title="Continue"
              onPress={handleContinue}
              variant="primary"
              accessibilityLabel="Continue to pantry setup"
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
  subtitle: {
    fontSize: 16,
    color: Colors.lightText,
    lineHeight: 24,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: ONBOARDING_SCROLL_BOTTOM_INSET,
  },
  gridHeader: {
    marginBottom: Spacing.md,
  },
  gridSubtitle: {
    fontSize: 14,
    color: Colors.lightText,
  },
  circleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: Spacing.lg,
  },
  circleItem: {
    width: '30%',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  circleItemSelected: {},
  circleIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleIconWrapSelected: {
    backgroundColor: Colors.primary + '25',
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  circleIcon: {
    fontSize: 28,
  },
  circleLabel: {
    fontSize: 12,
    color: Colors.text,
    textAlign: 'center',
  },
  circleLabelSelected: {
    color: Colors.primary,
    fontWeight: Typography.weights.semibold,
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





