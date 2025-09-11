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
import { ActivityLevel } from '../../types';
import { Colors } from '../../constants/colors';
import { Spacing } from '../../constants/spacing';

interface PersonalInfoSectionProps {
  onBack: () => void;
}

export function PersonalInfoSection({ onBack }: PersonalInfoSectionProps) {
  const { profile, setPersonalInfo } = useUserProfileStore();
  
  const [formData, setFormData] = useState({
    name: profile?.name || '',
    age: profile?.age?.toString() || '',
    height: profile?.height?.toString() || '',
    weight: profile?.weight?.toString() || '',
    gender: profile?.gender || 'prefer-not-to-say',
    activityLevel: profile?.activityLevel || 'lightly-active',
  });

  // Update form when profile changes
  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || '',
        age: profile.age?.toString() || '',
        height: profile.height?.toString() || '',
        weight: profile.weight?.toString() || '',
        gender: profile.gender || 'prefer-not-to-say',
        activityLevel: profile.activityLevel || 'lightly-active',
      });
    }
  }, [profile]);

  const handleSave = async () => {
    try {
      const updatedInfo = {
        name: formData.name.trim() || undefined,
        age: formData.age ? parseInt(formData.age) : undefined,
        height: formData.height ? parseInt(formData.height) : undefined,
        weight: formData.weight ? parseFloat(formData.weight) : undefined,
        gender: formData.gender as any,
        activityLevel: formData.activityLevel as ActivityLevel,
      };

      await setPersonalInfo(updatedInfo);
      
      Alert.alert('Success', 'Personal information updated successfully!', [
        {
          text: 'OK',
          onPress: () => {
            onBack();
          }
        }
      ]);
    } catch (error) {
      console.error('Error saving personal info:', error);
      Alert.alert('Error', 'Failed to update personal information. Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Personal Information</Text>
        <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
          <Save size={24} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
              placeholder="Enter your name"
              placeholderTextColor={Colors.lightText}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Age</Text>
            <TextInput
              style={styles.input}
              value={formData.age}
              onChangeText={(text) => setFormData({ ...formData, age: text })}
              placeholder="Enter your age"
              placeholderTextColor={Colors.lightText}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Height (cm)</Text>
            <TextInput
              style={styles.input}
              value={formData.height}
              onChangeText={(text) => setFormData({ ...formData, height: text })}
              placeholder="Enter your height in cm"
              placeholderTextColor={Colors.lightText}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Weight (kg)</Text>
            <TextInput
              style={styles.input}
              value={formData.weight}
              onChangeText={(text) => setFormData({ ...formData, weight: text })}
              placeholder="Enter your weight in kg"
              placeholderTextColor={Colors.lightText}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Gender</Text>
            <View style={styles.radioGroup}>
              {[
                { value: 'male', label: 'Male' },
                { value: 'female', label: 'Female' },
                { value: 'other', label: 'Other' },
                { value: 'prefer-not-to-say', label: 'Prefer not to say' },
              ].map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.radioOption,
                    formData.gender === option.value && styles.radioOptionSelected,
                  ]}
                  onPress={() => setFormData({ ...formData, gender: option.value as any })}
                >
                  <Text
                    style={[
                      styles.radioText,
                      formData.gender === option.value && styles.radioTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Activity Level</Text>
            <View style={styles.radioGroup}>
              {[
                { value: 'sedentary', label: 'Sedentary (little/no exercise)' },
                { value: 'lightly-active', label: 'Lightly Active (light exercise)' },
                { value: 'moderately-active', label: 'Moderately Active (moderate exercise)' },
                { value: 'very-active', label: 'Very Active (hard exercise)' },
                { value: 'extremely-active', label: 'Extremely Active (very hard exercise)' },
              ].map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.radioOption,
                    formData.activityLevel === option.value && styles.radioOptionSelected,
                  ]}
                  onPress={() => setFormData({ ...formData, activityLevel: option.value as ActivityLevel })}
                >
                  <Text
                    style={[
                      styles.radioText,
                      formData.activityLevel === option.value && styles.radioTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
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
    marginBottom: Spacing.lg,
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
  radioGroup: {
    gap: Spacing.xs,
  },
  radioOption: {
    backgroundColor: Colors.card,
    borderRadius: 8,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  radioOptionSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  radioText: {
    fontSize: 16,
    color: Colors.text,
  },
  radioTextSelected: {
    color: Colors.white,
  },
});