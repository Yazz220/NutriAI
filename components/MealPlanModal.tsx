import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import { X, Calendar, Clock, Users, Search } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { PlannedMeal, MealType, Recipe, Meal } from '@/types';
import { useMeals } from '@/hooks/useMealsStore';

interface MealPlanModalProps {
  visible: boolean;
  selectedDate: string;
  selectedMealType?: MealType;
  existingMeal?: PlannedMeal;
  onSave: (plannedMeal: Omit<PlannedMeal, 'id'>) => void;
  onClose: () => void;
}

const MEAL_TYPES: { value: MealType; label: string }[] = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'snack', label: 'Snack' },
];

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text,
  },
  closeButton: {
    padding: 4,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  dateTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.lightGray,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  dateTimeText: {
    fontSize: 14,
    color: Colors.text,
    marginLeft: 8,
  },
  mealTypeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  mealTypeButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  mealTypeButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  mealTypeText: {
    fontSize: 14,
    color: Colors.text,
  },
  mealTypeTextActive: {
    color: Colors.white,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.lightGray,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: Colors.text,
    marginLeft: 8,
  },
  recipeList: {
    maxHeight: 200,
  },
  recipeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  recipeItemSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  recipeInfo: {
    flex: 1,
  },
  recipeName: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
  },
  recipeNameSelected: {
    color: Colors.white,
  },
  recipeDetails: {
    fontSize: 12,
    color: Colors.lightText,
    marginTop: 2,
  },
  recipeDetailsSelected: {
    color: Colors.white,
    opacity: 0.8,
  },
  servingsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  servingsControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  servingsButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  servingsText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginHorizontal: 16,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: Colors.text,
    textAlignVertical: 'top',
    minHeight: 80,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: Colors.lightGray,
  },
  saveButton: {
    backgroundColor: Colors.primary,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButtonText: {
    color: Colors.text,
  },
  saveButtonText: {
    color: Colors.white,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyStateText: {
    fontSize: 14,
    color: Colors.lightText,
    textAlign: 'center',
  },
});

export const MealPlanModal: React.FC<MealPlanModalProps> = ({
  visible,
  selectedDate,
  selectedMealType,
  existingMeal,
  onSave,
  onClose,
}) => {
  const { meals } = useMeals();
  const [mealType, setMealType] = useState<MealType>(selectedMealType || 'dinner');
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | Meal | null>(null);
  const [servings, setServings] = useState(2);
  const [notes, setNotes] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Reset form when modal opens/closes or when existingMeal changes
  useEffect(() => {
    if (visible) {
      if (existingMeal) {
        setMealType(existingMeal.mealType);
        setServings(existingMeal.servings);
        setNotes(existingMeal.notes || '');
        // Find the recipe for the existing meal
        const recipe = meals.find(m => m.id === existingMeal.recipeId);
        setSelectedRecipe(recipe || null);
      } else {
        setMealType(selectedMealType || 'dinner');
        setSelectedRecipe(null);
        setServings(2);
        setNotes('');
      }
      setSearchQuery('');
    }
  }, [visible, existingMeal, selectedMealType, meals]);

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const filteredRecipes = meals.filter(recipe =>
    recipe.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    recipe.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleSave = () => {
    if (!selectedRecipe) {
      Alert.alert('Error', 'Please select a recipe for your meal.');
      return;
    }

    const plannedMeal: Omit<PlannedMeal, 'id'> = {
      recipeId: selectedRecipe.id,
      date: selectedDate,
      mealType,
      servings,
      notes: notes.trim() || undefined,
      isCompleted: false,
    };

    onSave(plannedMeal);
    onClose();
  };

  const adjustServings = (delta: number) => {
    const newServings = Math.max(1, servings + delta);
    setServings(newServings);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>
              {existingMeal ? 'Edit Meal' : 'Plan Meal'}
            </Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <X size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Date Display */}
            <View style={styles.section}>
              <View style={styles.dateTimeContainer}>
                <Calendar size={16} color={Colors.primary} />
                <Text style={styles.dateTimeText}>{formatDate(selectedDate)}</Text>
              </View>
            </View>

            {/* Meal Type Selection */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Meal Type</Text>
              <View style={styles.mealTypeContainer}>
                {MEAL_TYPES.map(type => (
                  <TouchableOpacity
                    key={type.value}
                    style={[
                      styles.mealTypeButton,
                      mealType === type.value && styles.mealTypeButtonActive,
                    ]}
                    onPress={() => setMealType(type.value)}
                  >
                    <Text
                      style={[
                        styles.mealTypeText,
                        mealType === type.value && styles.mealTypeTextActive,
                      ]}
                    >
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Recipe Selection */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Select Recipe</Text>
              
              <View style={styles.searchContainer}>
                <Search size={16} color={Colors.lightText} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search recipes..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholderTextColor={Colors.lightText}
                />
              </View>

              <ScrollView style={styles.recipeList} nestedScrollEnabled>
                {filteredRecipes.length > 0 ? (
                  filteredRecipes.map(recipe => (
                    <TouchableOpacity
                      key={recipe.id}
                      style={[
                        styles.recipeItem,
                        selectedRecipe?.id === recipe.id && styles.recipeItemSelected,
                      ]}
                      onPress={() => setSelectedRecipe(recipe)}
                    >
                      <View style={styles.recipeInfo}>
                        <Text
                          style={[
                            styles.recipeName,
                            selectedRecipe?.id === recipe.id && styles.recipeNameSelected,
                          ]}
                        >
                          {recipe.name}
                        </Text>
                        <Text
                          style={[
                            styles.recipeDetails,
                            selectedRecipe?.id === recipe.id && styles.recipeDetailsSelected,
                          ]}
                        >
                          {recipe.prepTime} min • {recipe.servings} servings
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))
                ) : (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyStateText}>
                      {searchQuery ? 'No recipes found matching your search.' : 'No recipes available.'}
                    </Text>
                  </View>
                )}
              </ScrollView>
            </View>

            {/* Servings */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Servings</Text>
              <View style={styles.servingsContainer}>
                <View style={styles.servingsControls}>
                  <TouchableOpacity
                    style={styles.servingsButton}
                    onPress={() => adjustServings(-1)}
                  >
                    <Text style={{ fontSize: 18, color: Colors.text }}>−</Text>
                  </TouchableOpacity>
                  <Text style={styles.servingsText}>{servings}</Text>
                  <TouchableOpacity
                    style={styles.servingsButton}
                    onPress={() => adjustServings(1)}
                  >
                    <Text style={{ fontSize: 18, color: Colors.text }}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Notes */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Notes (Optional)</Text>
              <TextInput
                style={styles.notesInput}
                placeholder="Add any notes about this meal..."
                value={notes}
                onChangeText={setNotes}
                multiline
                placeholderTextColor={Colors.lightText}
              />
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={onClose}>
              <Text style={[styles.buttonText, styles.cancelButtonText]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.saveButton]} onPress={handleSave}>
              <Text style={[styles.buttonText, styles.saveButtonText]}>
                {existingMeal ? 'Update' : 'Add to Plan'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};