import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { OnboardingScreenWrapper, OnboardingButton, OnboardingHeader, ONBOARDING_SCROLL_BOTTOM_INSET, useOnboarding } from '@/components/onboarding';
import { Colors } from '@/constants/colors';
import { Typography, Spacing } from '@/constants/spacing';
 

export default function AllergiesScreen() {
  const { onboardingData, updateOnboardingData, nextStep, previousStep } = useOnboarding();

  const [allergies, setAllergies] = useState<string[]>(onboardingData.dietaryPreferences.allergies || []);
  const [input, setInput] = useState('');

  useEffect(() => {
    updateOnboardingData('dietaryPreferences', {
      ...onboardingData.dietaryPreferences,
      allergies,
    });
  }, [allergies]);

  const handleAdd = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    if (!allergies.includes(trimmed)) setAllergies([...allergies, trimmed]);
    setInput('');
  };

  const handleRemove = (value: string) => {
    setAllergies(allergies.filter(a => a !== value));
  };

  return (
    <OnboardingScreenWrapper>
      <View style={styles.container}>
        <OnboardingHeader
          imageSource={require('@/assets/images/nosh/Do you have any allergies.png')}
          title="Any food allergies?"
          imageTranslateExtraRatio={0.20}
          imageVisualExtraScale={1.10}
        />

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.inputRow}>
            <TextInput
              style={styles.textInput}
              value={input}
              onChangeText={setInput}
              placeholder="e.g., peanuts, shellfish, eggs"
              placeholderTextColor={Colors.lightText}
              onSubmitEditing={handleAdd}
              returnKeyType="done"
            />
            <TouchableOpacity
              onPress={handleAdd}
              disabled={!input.trim()}
              style={[styles.addButton, !input.trim() && styles.addButtonDisabled]}
            >
              <Text style={[styles.addButtonText, !input.trim() && styles.addButtonTextDisabled]}>Add</Text>
            </TouchableOpacity>
          </View>

          {allergies.length > 0 && (
            <View style={styles.tags}>
              {allergies.map(item => (
                <TouchableOpacity key={item} style={styles.tag} onPress={() => handleRemove(item)}>
                  <Text style={styles.tagText}>{item}</Text>
                  <Text style={styles.tagRemove}>×</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
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
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: ONBOARDING_SCROLL_BOTTOM_INSET,
  },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
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
  addButton: { backgroundColor: Colors.primary, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: 8 },
  addButtonDisabled: { backgroundColor: Colors.lightGray },
  addButtonText: { color: Colors.white, fontSize: 14, fontWeight: Typography.weights.semibold },
  addButtonTextDisabled: { color: Colors.lightText },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.md },
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
  tagText: { fontSize: 14, color: Colors.primary, fontWeight: Typography.weights.medium, marginRight: 4 },
  tagRemove: { fontSize: 16, color: Colors.primary, fontWeight: Typography.weights.bold, marginLeft: 4 },
  footer: { paddingTop: Spacing.lg, paddingBottom: Spacing.md },
  buttonRow: { flexDirection: 'row', gap: Spacing.md, justifyContent: 'center', alignItems: 'center' },
});





