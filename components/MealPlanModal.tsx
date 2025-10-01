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
  Image,
} from 'react-native';
import { X, Calendar, Clock, Users, Search, ChefHat, Check } from 'lucide-react-native';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/spacing';

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
  onDelete?: () => void; // Optional callback to delete the planned meal
  // When true, lock the meal type selection to selectedMealType and filter recipes for that type
  lockMealType?: boolean;
  // When true (default), the modal closes after saving. For Plan All flows, set false to keep it open.
  autoCloseOnSave?: boolean;
  // Optional: mark meal types that were already planned in a Plan All session
  plannedTypes?: MealType[];
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
    fontWeight: Typography.weights.semibold,
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
    fontWeight: Typography.weights.semibold,
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
    fontWeight: Typography.weights.medium,
    textAlign: 'center',
  },
  mealTypeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  // Grid/card styles to match RecipeDetail PlanMealModal
  mealTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  mealTypeCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.border,
    padding: 12,
    alignItems: 'center',
    minHeight: 100,
  },
  mealTypeCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  mealTypeHeader: {
    position: 'relative',
    alignItems: 'center',
    marginBottom: 6,
  },
  mealTypeIcon: {
    fontSize: 28,
    marginBottom: 2,
  },
  checkIcon: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealTypeLabel: {
    fontSize: 14,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
    textAlign: 'center',
  },
  mealTypeLabelSelected: {
    color: Colors.white,
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
    fontWeight: Typography.weights.medium,
    color: Colors.text,
  },
  mealTypeTextActive: {
    color: Colors.primary,
    fontWeight: Typography.weights.semibold,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.tabBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
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
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  recipeThumb: {
    width: 56,
    height: 56,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: Colors.secondary,
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
    fontWeight: Typography.weights.medium,
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
    gap: 4,
    marginLeft: 8,
  },
  servingsButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.primary + '30',
  },
  servingsText: {
    fontSize: 15,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
    marginHorizontal: 6,
    minWidth: 24,
    textAlign: 'center',
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
  deleteButton: {
    backgroundColor: Colors.error || '#dc2626',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: Typography.weights.semibold,
  },
  cancelButtonText: {
    color: Colors.text,
  },
  saveButtonText: {
    color: Colors.white,
  },
  deleteButtonText: {
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
  onDelete,
  lockMealType = false,
  autoCloseOnSave = true,
  plannedTypes = [],
}) => {
  const { meals } = useMeals();
  const { folders } = useRecipeFolders();
  const [mealType, setMealType] = useState<MealType>(selectedMealType || inferMealTypeByTime());
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | Meal | null>(null);
  // Servings and notes removed from UI; we will use defaults on save
  const [searchQuery, setSearchQuery] = useState('');
  // Track per-recipe servings for quick adjustment in the list
  const [servingsById, setServingsById] = useState<Record<string, number>>({});

  // Reset form when modal opens/closes or when existingMeal changes
  useEffect(() => {
    if (visible) {
  // Analytics: modal opened
  trackEvent({ type: 'plan_modal_open', data: { source: initialRecipeId ? 'quick_plan' : 'manual', recipeId: initialRecipeId || null } });
      if (existingMeal) {
        setMealType(existingMeal.mealType);
        // servings/notes removed from UI
        // Find the recipe for the existing meal
        const recipe = meals.find(m => m.id === existingMeal.recipeId);
        setSelectedRecipe(recipe || null);
        if (existingMeal.recipeId) {
          setServingsById(prev => ({ ...prev, [existingMeal.recipeId]: existingMeal.servings || 1 }));
        }
      } else if (initialRecipeId) {
        // Pre-select a recipe when provided (e.g., from a "Plan" action)
        const recipe = meals.find(m => m.id === initialRecipeId);
        setSelectedRecipe(recipe || null);
        if (initialRecipeId && recipe) {
          setServingsById(prev => ({ ...prev, [initialRecipeId]: (recipe as any)?.servings || 1 }));
        }
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
        // servings/notes removed from UI
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

    const servingsToSave = servingsById[selectedRecipe.id] ?? (selectedRecipe as any)?.servings ?? 1;
    const plannedMeal: Omit<PlannedMeal, 'id'> = {
      recipeId: selectedRecipe.id,
      date: selectedDate,
      mealType,
      servings: servingsToSave,
      // notes removed from UI; not sending
      isCompleted: false,
    };

    onSave(plannedMeal);
  // Analytics: plan saved
  trackEvent({ type: 'plan_saved', data: { recipeId: plannedMeal.recipeId, mealType: plannedMeal.mealType, date: plannedMeal.date, servings: plannedMeal.servings } });
  if (autoCloseOnSave) {
    onClose();
  }
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

            {/* Meal Type Selection or Fixed Type */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Meal Type</Text>
              {lockMealType && selectedMealType ? (
                <View style={[styles.mealTypeContainer, { gap: 0 }]}>
                  <View style={[styles.mealTypeButton, styles.mealTypeButtonActive]}> 
                    <Text style={[styles.mealTypeText, styles.mealTypeTextActive]}>
                      {MEAL_TYPES.find(t => t.value === selectedMealType)?.label ?? selectedMealType}
                    </Text>
                  </View>
                </View>
              ) : (
                <View style={styles.mealTypeGrid}>
                  {(
                    [
                      { value: 'breakfast' as MealType, label: 'Breakfast', icon: '🌅' },
                      { value: 'lunch' as MealType, label: 'Lunch', icon: '☀️' },
                      { value: 'dinner' as MealType, label: 'Dinner', icon: '🌙' },
                      { value: 'snack' as MealType, label: 'Snack', icon: '🍎' },
                    ]
                  ).map((opt) => {
                    const selected = mealType === opt.value;
                    const completed = plannedTypes?.includes(opt.value);
                    return (
                      <TouchableOpacity
                        key={opt.value}
                        style={[styles.mealTypeCard, selected && styles.mealTypeCardSelected]}
                        onPress={() => setMealType(opt.value)}
                      >
                        <View style={styles.mealTypeHeader}>
                          <Text style={styles.mealTypeIcon}>{opt.icon}</Text>
                          {completed && (
                            <View style={styles.checkIcon}>
                              <Check size={16} color={Colors.white} />
                            </View>
                          )}
                        </View>
                        <Text style={[styles.mealTypeLabel, selected && styles.mealTypeLabelSelected]}>
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
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
                      {recipe.image ? (
                        <Image source={{ uri: recipe.image }} style={styles.recipeThumb} />
                      ) : (
                        <View style={[styles.recipeThumb]} />
                      )}
                      <View style={styles.recipeInfo}>
                        <Text
                          style={[
                            styles.recipeName,
                            selectedRecipe?.id === recipe.id && styles.recipeNameSelected,
                          ]}
                          numberOfLines={1}
                        >
                          {recipe.name}
                        </Text>
                        <Text
                          style={[
                            styles.recipeDetails,
                            selectedRecipe?.id === recipe.id && styles.recipeDetailsSelected,
                          ]}
                          numberOfLines={1}
                        >
                          {recipe.prepTime} min • {(servingsById[recipe.id] ?? (recipe as any)?.servings ?? 1)} servings
                          {typeof (recipe as any)?.nutritionPerServing?.calories === 'number'
                            ? ` • ${Math.round((recipe as any).nutritionPerServing.calories * (servingsById[recipe.id] ?? (recipe as any)?.servings ?? 1))} kcal`
                            : ''}
                        </Text>
                      </View>
                      <View style={styles.servingsControls}>
                        <TouchableOpacity
                          style={styles.servingsButton}
                          onPress={() => {
                            const current = servingsById[recipe.id] ?? (recipe as any)?.servings ?? 1;
                            const next = Math.max(0.5, Number((current - 0.5).toFixed(1)));
                            setServingsById(prev => ({ ...prev, [recipe.id]: next }));
                          }}
                          accessibilityLabel={`Decrease servings for ${recipe.name}`}
                          accessibilityRole="button"
                        >
                          <Text style={styles.buttonText}>-</Text>
                        </TouchableOpacity>
                        <Text style={styles.servingsText}>{servingsById[recipe.id] ?? (recipe as any)?.servings ?? 1}</Text>
                        <TouchableOpacity
                          style={styles.servingsButton}
                          onPress={() => {
                            const current = servingsById[recipe.id] ?? (recipe as any)?.servings ?? 1;
                            const next = Math.min(20, Number((current + 0.5).toFixed(1)));
                            setServingsById(prev => ({ ...prev, [recipe.id]: next }));
                          }}
                          accessibilityLabel={`Increase servings for ${recipe.name}`}
                          accessibilityRole="button"
                        >
                          <Text style={styles.buttonText}>+</Text>
                        </TouchableOpacity>
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

            {/* Servings and Notes removed from UI per product requirement */}
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            {existingMeal && onDelete ? (
              <>
                <TouchableOpacity style={[styles.button, styles.deleteButton]} onPress={() => {
                  Alert.alert(
                    'Remove Planned Meal',
                    'Are you sure you want to remove this planned meal?',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Remove',
                        style: 'destructive',
                        onPress: () => {
                          onDelete();
                          onClose();
                        },
                      },
                    ]
                  );
                }}>
                  <Text style={[styles.buttonText, styles.deleteButtonText]}>Remove</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.button, styles.saveButton]} onPress={handleSave}>
                  <Text style={[styles.buttonText, styles.saveButtonText]}>Update</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={onClose}>
                  <Text style={[styles.buttonText, styles.cancelButtonText]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.button, styles.saveButton]} onPress={handleSave}>
                  <Text style={[styles.buttonText, styles.saveButtonText]}>Add to Plan</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default MealPlanModal;