import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { OnboardingScreenWrapper, OnboardingButton, OptionCard, useOnboarding } from '@/components/onboarding';

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
  const [allergies, setAllergies] = useState<string[]>(
    onboardingData.dietaryPreferences.allergies || []
  );
  const [customRestrictions, setCustomRestrictions] = useState<string[]>(
    onboardingData.dietaryPreferences.customRestrictions || []
  );
  const [allergyInput, setAllergyInput] = useState('');
  const [customInput, setCustomInput] = useState('');

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

  const handleAddAllergy = () => {
    const trimmed = allergyInput.trim();
    if (trimmed && !allergies.includes(trimmed)) {
      setAllergies([...allergies, trimmed]);
      setAllergyInput('');
    }
  };

  const handleRemoveAllergy = (allergy: string) => {
    setAllergies(allergies.filter(a => a !== allergy));
  };

  const handleAddCustomRestriction = () => {
    const trimmed = customInput.trim();
    if (trimmed && !customRestrictions.includes(trimmed)) {
      setCustomRestrictions([...customRestrictions, trimmed]);
      setCustomInput('');
    }
  };

  const handleRemoveCustomRestriction = (restriction: string) => {
    setCustomRestrictions(customRestrictions.filter(r => r !== restriction));
  };

  const handleContinue = () => {
    nextStep();
  };

  const handleBack = () => {
    previousStep();
  };

  return (
    <OnboardingScreenWrapper>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Tell us about your dietary preferences</Text>
          <Text style={styles.subtitle}>
            This helps us suggest recipes that fit your lifestyle
          </Text>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Dietary Restrictions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Dietary Restrictions</Text>
            <Text style={styles.sectionSubtitle}>Select all that apply</Text>
            
            <View style={styles.optionsGrid}>
              {dietaryOptions.map((option) => (
                <View key={option.id} style={styles.optionWrapper}>
                  <OptionCard
                    title={option.title}
                    description={option.description}
                    icon={<Text style={styles.optionIcon}>{option.icon}</Text>}
                    selected={selectedRestrictions.includes(option.id)}
                    onPress={() => handleRestrictionToggle(option.id)}
                    multiSelect={!option.isStandard}
                    accessibilityLabel={`${option.isStandard ? 'Select' : 'Toggle'} ${option.title}`}
                    accessibilityHint={option.description}
                  />
                </View>
              ))}
            </View>
          </View>

          {/* Allergies */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Food Allergies</Text>
            <Text style={styles.sectionSubtitle}>
              Let us know about any foods you're allergic to
            </Text>
            
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.textInput}
                value={allergyInput}
                onChangeText={setAllergyInput}
                placeholder="e.g., peanuts, shellfish, eggs"
                placeholderTextColor={Colors.lightText}
                onSubmitEditing={handleAddAllergy}
                returnKeyType="done"
                accessibilityLabel="Add food allergy"
                accessibilityHint="Type an allergy and press done to add it"
              />
              <TouchableOpacity
                style={[styles.addButton, !allergyInput.trim() && styles.disabledButton]}
                onPress={handleAddAllergy}
                disabled={!allergyInput.trim()}
                accessibilityLabel="Add allergy"
                accessibilityRole="button"
              >
                <Text style={[styles.addButtonText, !allergyInput.trim() && styles.disabledButtonText]}>
                  Add
                </Text>
              </TouchableOpacity>
            </View>

            {allergies.length > 0 && (
              <View style={styles.tagsContainer}>
                {allergies.map((allergy) => (
                  <TouchableOpacity
                    key={allergy}
                    style={styles.tag}
                    onPress={() => handleRemoveAllergy(allergy)}
                    accessibilityLabel={`Remove ${allergy} allergy`}
                    accessibilityRole="button"
                  >
                    <Text style={styles.tagText}>{allergy}</Text>
                    <Text style={styles.tagRemove}>×</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Custom Restrictions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Other Restrictions</Text>
            <Text style={styles.sectionSubtitle}>
              Any other foods you avoid or prefer not to eat
            </Text>
            
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.textInput}
                value={customInput}
                onChangeText={setCustomInput}
                placeholder="e.g., spicy food, raw fish"
                placeholderTextColor={Colors.lightText}
                onSubmitEditing={handleAddCustomRestriction}
                returnKeyType="done"
                accessibilityLabel="Add custom restriction"
                accessibilityHint="Type a food restriction and press done to add it"
              />
              <TouchableOpacity
                style={[styles.addButton, !customInput.trim() && styles.disabledButton]}
                onPress={handleAddCustomRestriction}
                disabled={!customInput.trim()}
                accessibilityLabel="Add restriction"
                accessibilityRole="button"
              >
                <Text style={[styles.addButtonText, !customInput.trim() && styles.disabledButtonText]}>
                  Add
                </Text>
              </TouchableOpacity>
            </View>

            {customRestrictions.length > 0 && (
              <View style={styles.tagsContainer}>
                {customRestrictions.map((restriction) => (
                  <TouchableOpacity
                    key={restriction}
                    style={styles.tag}
                    onPress={() => handleRemoveCustomRestriction(restriction)}
                    accessibilityLabel={`Remove ${restriction} restriction`}
                    accessibilityRole="button"
                  >
                    <Text style={styles.tagText}>{restriction}</Text>
                    <Text style={styles.tagRemove}>×</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
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
  header: {
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    marginBottom: 8,
    lineHeight: 36,
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
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: Colors.lightText,
    marginBottom: Spacing.md,
    lineHeight: 20,
  },
  optionsGrid: {
    gap: Spacing.sm,
  },
  optionWrapper: {
    marginBottom: Spacing.sm,
  },
  optionIcon: {
    fontSize: 24,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  textInput: {
    flex: 1,
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 16,
    color: Colors.text,
    backgroundColor: Colors.white,
  },
  addButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: Colors.lightGray,
  },
  addButtonText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: Typography.weights.semibold,
  },
  disabledButtonText: {
    color: Colors.lightText,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary + '15',
    borderRadius: 20,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  tagText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: Typography.weights.medium,
    marginRight: 4,
  },
  tagRemove: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: Typography.weights.bold,
    marginLeft: 4,
  },
  footer: {
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
});