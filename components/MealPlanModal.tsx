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
  Platform,
} from 'react-native';
import { X, Calendar, Clock, Users, Search, ChefHat, Plus, Minus } from 'lucide-react-native';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/constants/colors';

import { PlannedMeal, MealType, Recipe, Meal } from '@/types';
import { useMeals } from '@/hooks/useMealsStore';
import { useRecipeFolders } from '@/hooks/useRecipeFoldersStore';
import { trackEvent } from '@/utils/analytics';

interface MealPlanModalProps {
  visible: boolean;
  selectedDate: string;
  selectedMealType?: MealType;
  existingMeal?: PlannedMeal;
  initialRecipeId?: string;
  initialFolderId?: string;
  onSave: (plannedMeal: Omit<PlannedMeal, 'id'>) => void;
  onClose: () => void;
}

const MEAL_TYPES: { value: MealType; label: string }[] = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'snack', label: 'Snack' },
];

function inferMealTypeByTime(): MealType {
  try {
    const hour = new Date().getHours();
    if (hour < 11) return 'breakfast';
    if (hour < 15) return 'lunch';
    if (hour < 20) return 'dinner';
    return 'snack';
  } catch (err) {
    return 'dinner';
  }
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 12,
  },
  header: {
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.white,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginLeft: 8,
  },
  dateTimeContainer: {
    backgroundColor: Colors.card,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  dateTimeText: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: '600',
    textAlign: 'center',
  },
  mealTypeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  mealTypeButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  mealTypeButtonActive: {
    backgroundColor: Colors.primary + '15',
    borderColor: Colors.primary,
  },
  mealTypeText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
  },
  mealTypeTextActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.secondary,
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
    maxHeight: 420,
  },
  recipeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: Colors.card,
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
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.primary + '30',
  },
  servingsText: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginHorizontal: 20,
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
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  cancelButton: {
    backgroundColor: Colors.card,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  saveButton: {
    backgroundColor: Colors.primary,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
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
  initialRecipeId,
  initialFolderId,
  onSave,
  onClose,
}) => {
  const { meals } = useMeals();
  const { folders } = useRecipeFolders();
  const [mealType, setMealType] = useState<MealType>(selectedMealType || inferMealTypeByTime());
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | Meal | null>(null);
  const [servings, setServings] = useState<number>(2);
  const [notes, setNotes] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Reset form when modal opens/closes or when existingMeal changes
  useEffect(() => {
    if (visible) {
  // Analytics: modal opened
  trackEvent({ type: 'plan_modal_open', data: { source: initialRecipeId ? 'quick_plan' : 'manual', recipeId: initialRecipeId || null } });
      if (existingMeal) {
        setMealType(existingMeal.mealType);
        setServings(existingMeal.servings);
        setNotes(existingMeal.notes || '');
        // Find the recipe for the existing meal
        const recipe = meals.find(m => m.id === existingMeal.recipeId);
        setSelectedRecipe(recipe || null);
      } else if (initialRecipeId) {
        // Pre-select a recipe when provided (e.g., from a "Plan" action)
        const recipe = meals.find(m => m.id === initialRecipeId);
  setSelectedRecipe(recipe || null);
  // If the recipe specifies servings, use it as a sensible default
  if (recipe && typeof (recipe as any).servings === 'number') setServings((recipe as any).servings || 2);
      } else if (initialFolderId) {
        // If opened scoped to a folder, pre-select the first recipe in that folder if available
        const folder = folders.find(f => f.id === initialFolderId);
        if (folder) {
          const existingMealInFolder = meals.find(m => folder.recipeIds.includes(m.id));
          if (existingMealInFolder) setSelectedRecipe(existingMealInFolder);
        }
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

  const filteredRecipes = meals
    .filter((recipe) => {
      if (initialFolderId) {
        const folder = folders.find((f) => f.id === initialFolderId);
        if (!folder) return false;
        return folder.recipeIds.includes(recipe.id);
      }
      return true;
    })
    .filter((recipe) =>
      recipe.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      recipe.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
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
  // Analytics: plan saved
  trackEvent({ type: 'plan_saved', data: { recipeId: plannedMeal.recipeId, mealType: plannedMeal.mealType, date: plannedMeal.date, servings: plannedMeal.servings } });
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
          {/* Dark Header Gradient matching global theme */}
          <ExpoLinearGradient
            colors={[Colors.background, Colors.card, Colors.secondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.header}
          >
            <View style={styles.headerContent}>
              <View style={styles.headerTitleRow}>
                <View style={styles.headerIcon}>
                  <ChefHat size={20} color={Colors.white} />
                </View>
                <Text style={styles.title}>
                  {existingMeal ? 'Edit Meal' : 'Plan Meal'}
                </Text>
              </View>
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <X size={20} color={Colors.white} />
              </TouchableOpacity>
            </View>
          </ExpoLinearGradient>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollContent}>
            {/* Date Display */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Calendar size={20} color={Colors.primary} />
                <Text style={styles.sectionTitle}>Date</Text>
              </View>
              <View style={styles.dateTimeContainer}>
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