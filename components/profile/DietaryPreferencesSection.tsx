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
import { ArrowLeft, Save, Plus, X } from 'lucide-react-native';
import { useUserProfileStore } from '../../hooks/useEnhancedUserProfile';
import { DietaryRestriction } from '../../types';
import { Colors } from '../../constants/colors';
import { Spacing } from '../../constants/spacing';

interface DietaryPreferencesSectionProps {
  onBack: () => void;
}

const DIETARY_RESTRICTION_OPTIONS: { value: DietaryRestriction; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'vegetarian', label: 'Vegetarian' },
  { value: 'vegan', label: 'Vegan' },
  { value: 'pescatarian', label: 'Pescatarian' },
  { value: 'keto', label: 'Keto' },
  { value: 'paleo', label: 'Paleo' },
  { value: 'gluten-free', label: 'Gluten-Free' },
  { value: 'dairy-free', label: 'Dairy-Free' },
  { value: 'nut-free', label: 'Nut-Free' },
  { value: 'low-carb', label: 'Low-Carb' },
  { value: 'low-sodium', label: 'Low-Sodium' },
  { value: 'halal', label: 'Halal' },
  { value: 'kosher', label: 'Kosher' },
];

export function DietaryPreferencesSection({ onBack }: DietaryPreferencesSectionProps) {
  const { profile, setDietaryPreferences } = useUserProfileStore();
  
  const [formData, setFormData] = useState({
    dietaryRestrictions: profile?.dietaryRestrictions || [],
    allergies: profile?.allergies || [],
    dislikedFoods: profile?.dislikedFoods || [],
    preferredCuisines: profile?.preferredCuisines || [],
  });

  const [newAllergy, setNewAllergy] = useState('');
  const [newDislike, setNewDislike] = useState('');
  const [newCuisine, setNewCuisine] = useState('');

  // Update form data when profile changes
  useEffect(() => {
    if (profile) {
      setFormData({
        dietaryRestrictions: profile.dietaryRestrictions || [],
        allergies: profile.allergies || [],
        dislikedFoods: profile.dislikedFoods || [],
        preferredCuisines: profile.preferredCuisines || [],
      });
    }
  }, [profile]);

  const toggleDietaryRestriction = (restriction: DietaryRestriction) => {
    const current = formData.dietaryRestrictions;
    const updated = current.includes(restriction)
      ? current.filter(r => r !== restriction)
      : [...current, restriction];
    
    setFormData({ ...formData, dietaryRestrictions: updated });
  };

  const addItem = (type: 'allergies' | 'dislikedFoods' | 'preferredCuisines', value: string) => {
    if (!value.trim()) return;
    
    const current = formData[type];
    if (!current.includes(value.trim())) {
      setFormData({
        ...formData,
        [type]: [...current, value.trim()],
      });
    }
    
    // Clear the input
    if (type === 'allergies') setNewAllergy('');
    if (type === 'dislikedFoods') setNewDislike('');
    if (type === 'preferredCuisines') setNewCuisine('');
  };

  const removeItem = (type: 'allergies' | 'dislikedFoods' | 'preferredCuisines', index: number) => {
    const current = formData[type];
    setFormData({
      ...formData,
      [type]: current.filter((_, i) => i !== index),
    });
  };

  const handleSave = async () => {
    try {
      await setDietaryPreferences(formData);
      Alert.alert(
        'Success', 
        'Your dietary preferences have been saved and will be applied to your nutrition tracking and recipe recommendations!',
        [{ text: 'OK', onPress: onBack }]
      );
    } catch (error) {
      console.error('Error saving dietary preferences:', error);
      Alert.alert(
        'Error', 
        'Failed to save dietary preferences. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const renderTagList = (
    items: string[],
    onRemove: (index: number) => void,
    placeholder: string
  ) => (
    <View style={styles.tagContainer}>
      {items.map((item, index) => (
        <View key={index} style={styles.tag}>
          <Text style={styles.tagText}>{item}</Text>
          <TouchableOpacity onPress={() => onRemove(index)} style={styles.tagRemove}>
            <X size={16} color={Colors.white} />
          </TouchableOpacity>
        </View>
      ))}
      {items.length === 0 && (
        <Text style={styles.placeholderText}>{placeholder}</Text>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Dietary Preferences</Text>
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
          <Text style={styles.sectionTitle}>Dietary Restrictions</Text>
          <Text style={styles.sectionDescription}>
            Select any dietary restrictions you follow:
          </Text>
          
          <View style={styles.checkboxGroup}>
            {DIETARY_RESTRICTION_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.checkboxOption,
                  formData.dietaryRestrictions.includes(option.value) && styles.checkboxOptionSelected,
                ]}
                onPress={() => toggleDietaryRestriction(option.value)}
              >
                <Text
                  style={[
                    styles.checkboxText,
                    formData.dietaryRestrictions.includes(option.value) && styles.checkboxTextSelected,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Allergies</Text>
          <Text style={styles.sectionDescription}>
            Add foods you're allergic to (this is critical for recipe safety):
          </Text>
          
          <View style={styles.inputRow}>
            <TextInput
              style={styles.textInput}
              value={newAllergy}
              onChangeText={setNewAllergy}
              placeholder="Add allergy (e.g., peanuts, shellfish)"
              placeholderTextColor={Colors.lightText}
            />
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => addItem('allergies', newAllergy)}
            >
              <Plus size={20} color={Colors.white} />
            </TouchableOpacity>
          </View>
          
          {renderTagList(
            formData.allergies,
            (index) => removeItem('allergies', index),
            'No allergies added yet'
          )}
        </View>

        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Disliked Foods</Text>
          <Text style={styles.sectionDescription}>
            Add foods you prefer to avoid in recipes:
          </Text>
          
          <View style={styles.inputRow}>
            <TextInput
              style={styles.textInput}
              value={newDislike}
              onChangeText={setNewDislike}
              placeholder="Add disliked food (e.g., mushrooms, olives)"
              placeholderTextColor={Colors.lightText}
            />
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => addItem('dislikedFoods', newDislike)}
            >
              <Plus size={20} color={Colors.white} />
            </TouchableOpacity>
          </View>
          
          {renderTagList(
            formData.dislikedFoods,
            (index) => removeItem('dislikedFoods', index),
            'No dislikes added yet'
          )}
        </View>

        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Preferred Cuisines</Text>
          <Text style={styles.sectionDescription}>
            Add cuisines you enjoy for better recipe recommendations:
          </Text>
          
          <View style={styles.inputRow}>
            <TextInput
              style={styles.textInput}
              value={newCuisine}
              onChangeText={setNewCuisine}
              placeholder="Add cuisine (e.g., Italian, Thai, Mexican)"
              placeholderTextColor={Colors.lightText}
            />
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => addItem('preferredCuisines', newCuisine)}
            >
              <Plus size={20} color={Colors.white} />
            </TouchableOpacity>
          </View>
          
          {renderTagList(
            formData.preferredCuisines,
            (index) => removeItem('preferredCuisines', index),
            'No cuisine preferences added yet'
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
  checkboxGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  checkboxOption: {
    backgroundColor: Colors.card,
    borderRadius: 8,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  checkboxOptionSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  checkboxText: {
    fontSize: 14,
    color: Colors.text,
  },
  checkboxTextSelected: {
    color: Colors.white,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
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
    minHeight: 40,
    alignItems: 'center',
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
  placeholderText: {
    fontSize: 14,
    color: Colors.lightText,
    fontStyle: 'italic',
  },
});