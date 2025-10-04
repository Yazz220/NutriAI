import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { ArrowLeft, Save, Plus, X } from 'lucide-react-native';
import { useUserProfileStore } from '../../hooks/useEnhancedUserProfile';
import { Colors } from '../../constants/colors';
import { Spacing } from '../../constants/spacing';

interface CookingPreferencesSectionProps {
  onBack: () => void;
}

const TIME_OPTIONS = [
  { value: 15, label: '15 minutes or less' },
  { value: 30, label: '30 minutes or less' },
  { value: 45, label: '45 minutes or less' },
  { value: 60, label: '1 hour or less' },
  { value: 90, label: '1.5 hours or less' },
  { value: 120, label: '2 hours or less' },
];

const DEFAULT_MEAL_TYPES = [
  'Breakfast',
  'Lunch', 
  'Dinner',
  'Snacks',
  'Desserts',
  'Appetizers',
  'Side Dishes',
  'Soups & Stews',
  'Salads',
  'Beverages',
];

export function CookingPreferencesSection({ onBack }: CookingPreferencesSectionProps) {
  const { profile, setCookingPreferences } = useUserProfileStore();
  
  const [formData, setFormData] = useState({
    maxCookingTime: profile?.maxCookingTime || 60,
    preferredMealTypes: profile?.preferredMealTypes || [],
  });

  const [newMealType, setNewMealType] = useState('');

  const toggleMealType = (mealType: string) => {
    const current = formData.preferredMealTypes;
    const updated = current.includes(mealType)
      ? current.filter(t => t !== mealType)
      : [...current, mealType];
    
    setFormData({ ...formData, preferredMealTypes: updated });
  };

  const addCustomMealType = () => {
    const trimmed = newMealType.trim();
    if (!trimmed) return;
    
    if (!formData.preferredMealTypes.includes(trimmed)) {
      setFormData({
        ...formData,
        preferredMealTypes: [...formData.preferredMealTypes, trimmed],
      });
    }
    
    setNewMealType('');
  };

  const removeMealType = (mealType: string) => {
    setFormData({
      ...formData,
      preferredMealTypes: formData.preferredMealTypes.filter(t => t !== mealType),
    });
  };

  const handleSave = async () => {
    try {
      await setCookingPreferences({
        maxCookingTime: formData.maxCookingTime,
        preferredMealTypes: formData.preferredMealTypes,
      });
      
      Alert.alert('Success', 'Cooking preferences updated successfully!');
      onBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to update cooking preferences');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cooking Preferences</Text>
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
          <Text style={styles.sectionTitle}>Maximum Cooking Time</Text>
          <Text style={styles.sectionDescription}>
            What's the most time you usually want to spend cooking:
          </Text>
          
          <View style={styles.timeOptions}>
            {TIME_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.timeOption,
                  formData.maxCookingTime === option.value && styles.timeOptionSelected,
                ]}
                onPress={() => setFormData({ ...formData, maxCookingTime: option.value })}
              >
                <Text
                  style={[
                    styles.timeText,
                    formData.maxCookingTime === option.value && styles.timeTextSelected,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Preferred Meal Types</Text>
          <Text style={styles.sectionDescription}>
            Select the types of meals you enjoy cooking and eating:
          </Text>
          
          <View style={styles.mealTypeOptions}>
            {DEFAULT_MEAL_TYPES.map((mealType) => (
              <TouchableOpacity
                key={mealType}
                style={[
                  styles.mealTypeOption,
                  formData.preferredMealTypes.includes(mealType) && styles.mealTypeOptionSelected,
                ]}
                onPress={() => toggleMealType(mealType)}
              >
                <Text
                  style={[
                    styles.mealTypeText,
                    formData.preferredMealTypes.includes(mealType) && styles.mealTypeTextSelected,
                  ]}
                >
                  {mealType}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.customMealType}>
            <Text style={styles.label}>Add Custom Meal Type</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.textInput}
                value={newMealType}
                onChangeText={setNewMealType}
                placeholder="e.g., Quick Meals, Comfort Food"
                placeholderTextColor={Colors.lightText}
              />
              <TouchableOpacity
                style={styles.addButton}
                onPress={addCustomMealType}
              >
                <Plus size={20} color={Colors.white} />
              </TouchableOpacity>
            </View>
          </View>

          {formData.preferredMealTypes.filter(type => !DEFAULT_MEAL_TYPES.includes(type)).length > 0 && (
            <View style={styles.customMealTypesList}>
              <Text style={styles.label}>Custom Meal Types</Text>
              <View style={styles.tagContainer}>
                {formData.preferredMealTypes
                  .filter(type => !DEFAULT_MEAL_TYPES.includes(type))
                  .map((mealType) => (
                  <View key={mealType} style={styles.tag}>
                    <Text style={styles.tagText}>{mealType}</Text>
                    <TouchableOpacity
                      onPress={() => removeMealType(mealType)}
                      style={styles.tagRemove}
                    >
                      <X size={16} color={Colors.white} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>
          )}
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
  skillOptions: {
    gap: Spacing.md,
  },
  skillOption: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  skillOptionSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  skillTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.xs / 2,
  },
  skillTitleSelected: {
    color: Colors.white,
  },
  skillDescription: {
    fontSize: 14,
    color: Colors.lightText,
  },
  skillDescriptionSelected: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  timeOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  timeOption: {
    backgroundColor: Colors.card,
    borderRadius: 8,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  timeOptionSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  timeText: {
    fontSize: 14,
    color: Colors.text,
  },
  timeTextSelected: {
    color: Colors.white,
  },
  mealTypeOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  mealTypeOption: {
    backgroundColor: Colors.card,
    borderRadius: 8,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  mealTypeOptionSelected: {
    backgroundColor: Colors.accentPrimary,
    borderColor: Colors.accentPrimary,
  },
  mealTypeText: {
    fontSize: 14,
    color: Colors.text,
  },
  mealTypeTextSelected: {
    color: Colors.white,
  },
  customMealType: {
    marginTop: Spacing.md,
  },
  customMealTypesList: {
    marginTop: Spacing.lg,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  textInput: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 8,
    padding: Spacing.md,
    fontSize: 16,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  addButton: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    padding: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.accentPrimary,
    borderRadius: 16,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  tagText: {
    fontSize: 14,
    color: Colors.white,
    marginRight: Spacing.xs,
  },
  tagRemove: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 12,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});