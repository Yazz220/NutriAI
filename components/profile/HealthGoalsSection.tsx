import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { ArrowLeft, Save } from 'lucide-react-native';
import { useUserProfileStore } from '../../hooks/useEnhancedUserProfile';
import { GoalDirection, HealthGoal } from '../../types';
import { Colors } from '../../constants/colors';
import { Spacing } from '../../constants/spacing';

interface HealthGoalsSectionProps {
  onBack: () => void;
}

const HEALTH_GOAL_OPTIONS: Array<{ value: HealthGoal; label: string; description: string }> = [
  {
    value: 'lose-weight',
    label: 'Lose weight',
    description: 'Create a gentle calorie deficit paired with higher-protein meals.',
  },
  {
    value: 'maintain-weight',
    label: 'Maintain weight',
    description: 'Stay consistent with balanced nutrition and steady habits.',
  },
  {
    value: 'gain-weight',
    label: 'Gain weight',
    description: 'Prioritize strength and healthy calorie surplus to build up gradually.',
  },
  {
    value: 'custom',
    label: 'Custom goal',
    description: 'Define your own focus with a personalized title and motivation.',
  },
];

const GOAL_DIRECTION_OPTIONS: Array<{ id: GoalDirection; title: string; helper: string }> = [
  { id: 'lose', title: 'Lose', helper: 'Calorie deficit + metabolic support' },
  { id: 'maintain', title: 'Maintain', helper: 'Balanced intake + routine consistency' },
  { id: 'gain', title: 'Gain', helper: 'Nutrient surplus + gradual build' },
];

const goalToDirection = (goal: HealthGoal, fallback: GoalDirection): GoalDirection => {
  switch (goal) {
    case 'lose-weight':
      return 'lose';
    case 'gain-weight':
      return 'gain';
    case 'custom':
      return fallback;
    default:
      return 'maintain';
  }
};

export function HealthGoalsSection({ onBack }: HealthGoalsSectionProps) {
  const { profile, setHealthGoals } = useUserProfileStore();

  const [formData, setFormData] = useState(() => ({
    selectedGoal: (profile?.healthGoals ?? [])[0] ?? null,
    goalDirection: profile?.goalDirection ?? 'maintain',
    customGoalTitle: profile?.customGoalTitle ?? '',
    customGoalMotivation: profile?.customGoalMotivation ?? '',
    targetWeight: profile?.targetWeight ? profile.targetWeight.toString() : '',
    dailyCalorieTarget: profile?.dailyCalorieTarget ? profile.dailyCalorieTarget.toString() : '',
    dailyProteinTarget: profile?.dailyProteinTarget ? profile.dailyProteinTarget.toString() : '',
    dailyCarbTarget: profile?.dailyCarbTarget ? profile.dailyCarbTarget.toString() : '',
    dailyFatTarget: profile?.dailyFatTarget ? profile.dailyFatTarget.toString() : '',
  }));

  useEffect(() => {
    if (!profile) return;
    setFormData({
      selectedGoal: (profile.healthGoals ?? [])[0] ?? null,
      goalDirection: profile.goalDirection ?? 'maintain',
      customGoalTitle: profile.customGoalTitle ?? '',
      customGoalMotivation: profile.customGoalMotivation ?? '',
      targetWeight: profile.targetWeight ? profile.targetWeight.toString() : '',
      dailyCalorieTarget: profile.dailyCalorieTarget ? profile.dailyCalorieTarget.toString() : '',
      dailyProteinTarget: profile.dailyProteinTarget ? profile.dailyProteinTarget.toString() : '',
      dailyCarbTarget: profile.dailyCarbTarget ? profile.dailyCarbTarget.toString() : '',
      dailyFatTarget: profile.dailyFatTarget ? profile.dailyFatTarget.toString() : '',
    });
  }, [profile]);

  const handleSelectGoal = (goal: HealthGoal) => {
    setFormData((prev) => ({
      ...prev,
      selectedGoal: goal,
      goalDirection: goalToDirection(goal, prev.goalDirection),
    }));
  };

  const handleSelectDirection = (direction: GoalDirection) => {
    setFormData((prev) => ({
      ...prev,
      goalDirection: direction,
    }));
  };

  const handleSave = async () => {
    const { selectedGoal, goalDirection, customGoalTitle, customGoalMotivation } = formData;
    if (!selectedGoal) {
      Alert.alert('Pick a goal', 'Choose one of the goal options before saving.');
      return;
    }

    if (selectedGoal === 'custom' && !customGoalTitle.trim()) {
      Alert.alert('Add a title', 'Give your custom goal a clear title so we can highlight it across the app.');
      return;
    }

    const parsedTargetWeight = formData.targetWeight.trim().length
      ? parseFloat(formData.targetWeight.trim())
      : undefined;
    const parsedCalories = formData.dailyCalorieTarget.trim().length
      ? parseInt(formData.dailyCalorieTarget.trim(), 10)
      : undefined;
    const parsedProtein = formData.dailyProteinTarget.trim().length
      ? parseInt(formData.dailyProteinTarget.trim(), 10)
      : undefined;
    const parsedCarbs = formData.dailyCarbTarget.trim().length
      ? parseInt(formData.dailyCarbTarget.trim(), 10)
      : undefined;
    const parsedFats = formData.dailyFatTarget.trim().length
      ? parseInt(formData.dailyFatTarget.trim(), 10)
      : undefined;

    try {
      await setHealthGoals({
        healthGoals: selectedGoal ? [selectedGoal] : [],
        goalDirection,
        customGoalTitle: selectedGoal === 'custom' ? customGoalTitle.trim() : undefined,
        customGoalMotivation: selectedGoal === 'custom' ? customGoalMotivation.trim() : undefined,
        targetWeight: parsedTargetWeight,
        dailyCalorieTarget: parsedCalories,
        dailyProteinTarget: parsedProtein,
        dailyCarbTarget: parsedCarbs,
        dailyFatTarget: parsedFats,
      });

      Alert.alert(
        'Goals updated',
        'Your focus, nutrition targets, and custom goal (if any) are now synced across Coach and Progress.',
        [{ text: 'OK', onPress: onBack }]
      );
    } catch (error) {
      console.error('Error saving health goals:', error);
      Alert.alert('Error', 'We could not save your goals right now. Please try again.');
    }
  };

  const renderGoalOption = (option: (typeof HEALTH_GOAL_OPTIONS)[number]) => {
    const isSelected = formData.selectedGoal === option.value;
    const isCustom = option.value === 'custom';
    const customSubtitle = isCustom && formData.customGoalTitle.trim().length
      ? formData.customGoalTitle.trim()
      : option.description;

    return (
      <TouchableOpacity
        key={option.value}
        style={[styles.goalOption, isSelected && styles.goalOptionSelected]}
        onPress={() => handleSelectGoal(option.value)}
      >
        <Text style={[styles.goalTitle, isSelected && styles.goalTitleSelected]}>{option.label}</Text>
        <Text style={[styles.goalDescription, isSelected && styles.goalDescriptionSelected]}>
          {customSubtitle}
        </Text>
      </TouchableOpacity>
    );
  };

  const shouldShowTargetWeight = formData.selectedGoal === 'lose-weight' || formData.selectedGoal === 'gain-weight';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Health Goals</Text>
        <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
          <Save size={24} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{ paddingBottom: Spacing.xxl }}
      >
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Primary focus</Text>
          <Text style={styles.sectionDescription}>
            Select the goal that best aligns with what you want to accomplish right now.
          </Text>

          <View style={styles.goalsList}>{HEALTH_GOAL_OPTIONS.map(renderGoalOption)}</View>
        </View>

        {formData.selectedGoal === 'custom' && (
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Custom goal details</Text>
            <Text style={styles.sectionDescription}>
              Give this goal context so Coach can keep you motivated.
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Goal title</Text>
              <TextInput
                style={styles.input}
                value={formData.customGoalTitle}
                onChangeText={(text) => setFormData((prev) => ({ ...prev, customGoalTitle: text }))}
                placeholder="E.g., Finish a half-marathon"
                placeholderTextColor={Colors.lightText}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Why this matters</Text>
              <TextInput
                style={[styles.input, styles.multilineInput]}
                value={formData.customGoalMotivation}
                onChangeText={(text) => setFormData((prev) => ({ ...prev, customGoalMotivation: text }))}
                placeholder="Share your motivation or the habit you want to build"
                placeholderTextColor={Colors.lightText}
                multiline
              />
            </View>

            <Text style={styles.label}>What type of progress fits this goal?</Text>
            <View style={styles.directionChips}>
              {GOAL_DIRECTION_OPTIONS.map((direction) => {
                const active = formData.goalDirection === direction.id;
                return (
                  <TouchableOpacity
                    key={direction.id}
                    style={[styles.directionChip, active && styles.directionChipActive]}
                    onPress={() => handleSelectDirection(direction.id)}
                  >
                    <Text style={[styles.directionChipTitle, active && styles.directionChipTitleActive]}>
                      {direction.title}
                    </Text>
                    <Text style={[styles.directionChipHelper, active && styles.directionChipHelperActive]}>
                      {direction.helper}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {shouldShowTargetWeight && (
          <View style={styles.formSection}>
            <Text style={styles.label}>Target weight (kg)</Text>
            <TextInput
              style={styles.input}
              value={formData.targetWeight}
              onChangeText={(text) => setFormData((prev) => ({ ...prev, targetWeight: text }))}
              placeholder="e.g., 68"
              placeholderTextColor={Colors.lightText}
              keyboardType="numeric"
            />
          </View>
        )}

        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Daily targets</Text>
          <Text style={styles.sectionDescription}>
            Override your calorie and macro goals if you already know what works for you.
          </Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Daily calories</Text>
            <TextInput
              style={styles.input}
              value={formData.dailyCalorieTarget}
              onChangeText={(text) => setFormData((prev) => ({ ...prev, dailyCalorieTarget: text }))}
              placeholder="e.g., 2100"
              placeholderTextColor={Colors.lightText}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.macroRow}>
            <View style={styles.macroInput}>
              <Text style={styles.label}>Protein (g)</Text>
              <TextInput
                style={styles.input}
                value={formData.dailyProteinTarget}
                onChangeText={(text) => setFormData((prev) => ({ ...prev, dailyProteinTarget: text }))}
                placeholder="e.g., 150"
                placeholderTextColor={Colors.lightText}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.macroInput}>
              <Text style={styles.label}>Carbs (g)</Text>
              <TextInput
                style={styles.input}
                value={formData.dailyCarbTarget}
                onChangeText={(text) => setFormData((prev) => ({ ...prev, dailyCarbTarget: text }))}
                placeholder="e.g., 225"
                placeholderTextColor={Colors.lightText}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.macroInput}>
              <Text style={styles.label}>Fats (g)</Text>
              <TextInput
                style={styles.input}
                value={formData.dailyFatTarget}
                onChangeText={(text) => setFormData((prev) => ({ ...prev, dailyFatTarget: text }))}
                placeholder="e.g., 70"
                placeholderTextColor={Colors.lightText}
                keyboardType="numeric"
              />
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    padding: Spacing.xs,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
    textAlign: 'center',
  },
  saveButton: {
    padding: Spacing.xs,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  formSection: {
    paddingVertical: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  sectionDescription: {
    fontSize: 14,
    color: Colors.lightText,
    marginBottom: Spacing.lg,
  },
  goalsList: {
    gap: Spacing.md,
  },
  goalOption: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  goalOptionSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  goalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.xs / 2,
  },
  goalTitleSelected: {
    color: Colors.white,
  },
  goalDescription: {
    fontSize: 14,
    color: Colors.lightText,
  },
  goalDescriptionSelected: {
    color: 'rgba(255, 255, 255, 0.9)',
  },
  inputGroup: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  input: {
    backgroundColor: Colors.card,
    borderRadius: 8,
    padding: Spacing.md,
    fontSize: 16,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  multilineInput: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  directionChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  directionChip: {
    flexBasis: '48%',
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
  },
  directionChipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  directionChipTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  directionChipTitleActive: {
    color: Colors.primary,
  },
  directionChipHelper: {
    fontSize: 12,
    color: Colors.lightText,
  },
  directionChipHelperActive: {
    color: Colors.primary,
  },
  macroRow: {
    flexDirection: 'row',
    gap: 8,
  },
  macroInput: {
    flex: 1,
  },
});
