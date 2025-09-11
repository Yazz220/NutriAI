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
import { HealthGoal } from '../../types';
import { Colors } from '../../constants/colors';
import { Spacing } from '../../constants/spacing';

interface HealthGoalsSectionProps {
  onBack: () => void;
}

const HEALTH_GOAL_OPTIONS: { value: HealthGoal; label: string; description: string }[] = [
  { value: 'weight-loss', label: 'Weight Loss', description: 'Focus on creating a caloric deficit' },
  { value: 'weight-gain', label: 'Weight Gain', description: 'Focus on healthy weight gain' },
  { value: 'muscle-gain', label: 'Muscle Gain', description: 'Build muscle mass with adequate protein' },
  { value: 'maintenance', label: 'Maintenance', description: 'Maintain current weight and health' },
  { value: 'general-health', label: 'General Health', description: 'Improve overall health and nutrition' },
];

export function HealthGoalsSection({ onBack }: HealthGoalsSectionProps) {
  const { profile, setHealthGoals } = useUserProfileStore();
  
  const [formData, setFormData] = useState({
    healthGoals: profile?.healthGoals || [],
    targetWeight: profile?.targetWeight?.toString() || '',
    dailyCalorieTarget: profile?.dailyCalorieTarget?.toString() || '',
    dailyProteinTarget: profile?.dailyProteinTarget?.toString() || '',
    dailyCarbTarget: profile?.dailyCarbTarget?.toString() || '',
    dailyFatTarget: profile?.dailyFatTarget?.toString() || '',
  });

  // Update form data when profile changes
  useEffect(() => {
    if (profile) {
      setFormData({
        healthGoals: profile.healthGoals || [],
        targetWeight: profile.targetWeight?.toString() || '',
        dailyCalorieTarget: profile.dailyCalorieTarget?.toString() || '',
        dailyProteinTarget: profile.dailyProteinTarget?.toString() || '',
        dailyCarbTarget: profile.dailyCarbTarget?.toString() || '',
        dailyFatTarget: profile.dailyFatTarget?.toString() || '',
      });
    }
  }, [profile]);

  const toggleHealthGoal = (goal: HealthGoal) => {
    const current = formData.healthGoals;
    const updated = current.includes(goal)
      ? current.filter(g => g !== goal)
      : [...current, goal];
    
    setFormData({ ...formData, healthGoals: updated });
  };

  const handleSave = async () => {
    try {
      await setHealthGoals({
        healthGoals: formData.healthGoals,
        targetWeight: formData.targetWeight ? parseFloat(formData.targetWeight) : undefined,
        dailyCalorieTarget: formData.dailyCalorieTarget ? parseInt(formData.dailyCalorieTarget) : undefined,
        dailyProteinTarget: formData.dailyProteinTarget ? parseInt(formData.dailyProteinTarget) : undefined,
        dailyCarbTarget: formData.dailyCarbTarget ? parseInt(formData.dailyCarbTarget) : undefined,
        dailyFatTarget: formData.dailyFatTarget ? parseInt(formData.dailyFatTarget) : undefined,
      });
      
      Alert.alert(
        'Success', 
        'Your health goals and nutrition targets have been updated and will be reflected in your calorie tracking and progress monitoring!',
        [{ text: 'OK', onPress: onBack }]
      );
    } catch (error) {
      console.error('Error saving health goals:', error);
      Alert.alert(
        'Error', 
        'Failed to save health goals. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

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

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Primary Goals</Text>
          <Text style={styles.sectionDescription}>
            Select your main health and fitness goals:
          </Text>
          
          <View style={styles.goalsList}>
            {HEALTH_GOAL_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.goalOption,
                  formData.healthGoals.includes(option.value) && styles.goalOptionSelected,
                ]}
                onPress={() => toggleHealthGoal(option.value)}
              >
                <View style={styles.goalContent}>
                  <Text
                    style={[
                      styles.goalTitle,
                      formData.healthGoals.includes(option.value) && styles.goalTitleSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                  <Text
                    style={[
                      styles.goalDescription,
                      formData.healthGoals.includes(option.value) && styles.goalDescriptionSelected,
                    ]}
                  >
                    {option.description}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Target Weight</Text>
          <Text style={styles.sectionDescription}>
            Set your target weight (optional, for weight goals):
          </Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Target Weight (kg)</Text>
            <TextInput
              style={styles.input}
              value={formData.targetWeight}
              onChangeText={(text) => setFormData({ ...formData, targetWeight: text })}
              placeholder="Enter target weight"
              placeholderTextColor={Colors.lightText}
              keyboardType="numeric"
            />
          </View>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Daily Nutrition Targets</Text>
          <Text style={styles.sectionDescription}>
            Set your daily nutrition goals (optional, helps with meal planning):
          </Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Daily Calories</Text>
            <TextInput
              style={styles.input}
              value={formData.dailyCalorieTarget}
              onChangeText={(text) => setFormData({ ...formData, dailyCalorieTarget: text })}
              placeholder="e.g., 2000"
              placeholderTextColor={Colors.lightText}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Daily Protein (g)</Text>
            <TextInput
              style={styles.input}
              value={formData.dailyProteinTarget}
              onChangeText={(text) => setFormData({ ...formData, dailyProteinTarget: text })}
              placeholder="e.g., 120"
              placeholderTextColor={Colors.lightText}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Daily Carbs (g)</Text>
            <TextInput
              style={styles.input}
              value={formData.dailyCarbTarget}
              onChangeText={(text) => setFormData({ ...formData, dailyCarbTarget: text })}
              placeholder="e.g., 200"
              placeholderTextColor={Colors.lightText}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Daily Fats (g)</Text>
            <TextInput
              style={styles.input}
              value={formData.dailyFatTarget}
              onChangeText={(text) => setFormData({ ...formData, dailyFatTarget: text })}
              placeholder="e.g., 70"
              placeholderTextColor={Colors.lightText}
              keyboardType="numeric"
            />
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
  goalContent: {
    flex: 1,
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
    color: 'rgba(255, 255, 255, 0.8)',
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
});