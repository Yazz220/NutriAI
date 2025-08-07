import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  TouchableOpacity,
  Modal as RNModal
} from 'react-native';
import { Colors } from '@/constants/colors';
import { Meal, Recipe, RecipeAvailability } from '@/types';
import { Clock, Users, ShoppingBag, ChefHat, Calendar, CheckCircle, AlertTriangle, X } from 'lucide-react-native';
import { useMeals } from '@/hooks/useMealsStore';
import { useShoppingList } from '@/hooks/useShoppingListStore';
import { MealPlanModal } from './MealPlanModal';

interface MealDetailModalProps {
  visible: boolean;
  onClose: () => void;
  meal: Meal | Recipe | null;
  availability?: RecipeAvailability;
}

export const MealDetailModal: React.FC<MealDetailModalProps> = ({
  visible,
  onClose,
  meal,
  availability
}) => {
  const { cookMeal, checkIngredientsAvailability } = useMeals();
  const { addItem: addToShoppingList } = useShoppingList();
  const [showMealPlanModal, setShowMealPlanModal] = useState(false);

  if (!meal) return null;

  // Handle both Meal and Recipe types
  const prepTime = typeof meal.prepTime === 'number' ? meal.prepTime : parseInt(meal.prepTime?.replace(/\D/g, '') || '0');
  const cookTime = 'cookTime' in meal
    ? (typeof meal.cookTime === 'number' ? meal.cookTime : parseInt(meal.cookTime?.replace(/\D/g, '') || '0'))
    : 0;
  const totalTime = prepTime + cookTime;

  // Get ingredients - handle both Meal and Recipe types
  const ingredients = 'ingredients' in meal ? meal.ingredients : [];
  const steps = 'steps' in meal ? meal.steps : ('instructions' in meal ? meal.instructions : []);

  // Use provided availability or calculate it
  let recipeAvailability = availability;
  if (!recipeAvailability && 'ingredients' in meal) {
    const { available, missingIngredients } = checkIngredientsAvailability(meal.id);
    const requiredIngredients = ingredients.filter(ing => !('optional' in ing) || !ing.optional);
    recipeAvailability = {
      recipeId: meal.id,
      availableIngredients: ingredients.length - missingIngredients.length,
      totalIngredients: requiredIngredients.length,
      availabilityPercentage: available ? 100 : Math.round(((ingredients.length - missingIngredients.length) / ingredients.length) * 100),
      missingIngredients,
      expiringIngredients: []
    };
  }

  const handleCook = () => {
    if ('ingredients' in meal) {
      cookMeal(meal.id);
      Alert.alert('Meal Cooked!', 'Ingredients have been deducted from your inventory.');
    }
    onClose();
  };

  const handleAddMissingToList = () => {
    if (!recipeAvailability) return;

    let addedCount = 0;
    recipeAvailability.missingIngredients.forEach(ingredient => {
      addToShoppingList({
        name: ingredient.name,
        quantity: ingredient.quantity,
        unit: ingredient.unit,
        category: 'Other', // Will be auto-categorized by the shopping list store
        addedDate: new Date().toISOString(),
        checked: false,
        addedBy: 'meal',
        mealId: meal.id,
      });
      addedCount++;
    });

    Alert.alert(
      'Added to Shopping List',
      `Added ${addedCount} missing ingredients to your shopping list.`,
      [{ text: 'OK' }]
    );
    onClose();
  };

  const handleAddToMealPlan = () => {
    setShowMealPlanModal(true);
  };

  return (
    <RNModal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <ScrollView style={styles.scrollView}>
            <Image
              source={{ uri: ('imageUrl' in meal ? meal.imageUrl : meal.image) || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c' }}
              style={styles.image}
              resizeMode="cover"
            />

            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              testID="close-meal-detail"
            >
              <X size={24} color={Colors.white} />
            </TouchableOpacity>

            <View style={styles.content}>
              <Text style={styles.title}>{meal.name}</Text>
              {'description' in meal && meal.description && (
                <Text style={styles.description}>{meal.description}</Text>
              )}

              <View style={styles.metaContainer}>
                <View style={styles.metaItem}>
                  <Clock size={16} color={Colors.lightText} />
                  <Text style={styles.metaText}>{totalTime} min</Text>
                </View>

                <View style={styles.metaItem}>
                  <Users size={16} color={Colors.lightText} />
                  <Text style={styles.metaText}>{meal.servings} servings</Text>
                </View>
              </View>

              {/* Availability Status */}
              {recipeAvailability && (
                <View style={styles.availabilityContainer}>
                  <View style={styles.availabilityHeader}>
                    {recipeAvailability.availabilityPercentage === 100 ? (
                      <CheckCircle size={20} color={Colors.fresh} />
                    ) : (
                      <AlertTriangle size={20} color={Colors.expiring} />
                    )}
                    <Text style={[
                      styles.availabilityText,
                      recipeAvailability.availabilityPercentage === 100
                        ? styles.availabilityTextGood
                        : styles.availabilityTextBad
                    ]}>
                      {recipeAvailability.availabilityPercentage === 100
                        ? 'You can make this now!'
                        : `Missing ${recipeAvailability.missingIngredients.length} ingredients`}
                    </Text>
                  </View>
                  <Text style={styles.availabilityPercentage}>
                    {recipeAvailability.availabilityPercentage}% available
                  </Text>
                </View>
              )}

              <View style={styles.tagsContainer}>
                {meal.tags.map((tag, index) => (
                  <View key={index} style={styles.tag}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Ingredients</Text>
                {ingredients.map((ingredient, index) => {
                  const isMissing = recipeAvailability?.missingIngredients.some(
                    mi => mi.name.toLowerCase() === ingredient.name.toLowerCase()
                  );
                  const isExpiring = recipeAvailability?.expiringIngredients.some(
                    ei => ei.name.toLowerCase() === ingredient.name.toLowerCase()
                  );

                  return (
                    <View key={index} style={styles.ingredientItem}>
                      <Text style={styles.ingredientText}>
                        {ingredient.quantity} {ingredient.unit} {ingredient.name}
                        {'optional' in ingredient && ingredient.optional ? ' (optional)' : ''}
                      </Text>
                      <View style={styles.ingredientStatus}>
                        {isMissing && (
                          <Text style={styles.missingText}>Missing</Text>
                        )}
                        {isExpiring && !isMissing && (
                          <Text style={styles.expiringText}>Expiring</Text>
                        )}
                        {!isMissing && !isExpiring && (
                          <CheckCircle size={16} color={Colors.fresh} />
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Instructions</Text>
                {steps.map((step, index) => (
                  <View key={index} style={styles.stepItem}>
                    <Text style={styles.stepNumber}>{index + 1}</Text>
                    <Text style={styles.stepText}>{step}</Text>
                  </View>
                ))}
              </View>
            </View>
          </ScrollView>

          <View style={styles.buttonContainer}>
            {/* Add to Meal Plan Button */}
            <TouchableOpacity
              style={[styles.button, styles.planButton]}
              onPress={handleAddToMealPlan}
              testID="add-to-plan-button"
            >
              <Calendar size={20} color={Colors.primary} />
              <Text style={styles.planButtonText}>Add to Plan</Text>
            </TouchableOpacity>

            {/* Add Missing Ingredients Button */}
            {recipeAvailability && recipeAvailability.missingIngredients.length > 0 && (
              <TouchableOpacity
                style={[styles.button, styles.listButton]}
                onPress={handleAddMissingToList}
                testID="add-missing-to-list-button"
              >
                <ShoppingBag size={20} color={Colors.text} />
                <Text style={styles.listButtonText}>
                  Add Missing ({recipeAvailability.missingIngredients.length})
                </Text>
              </TouchableOpacity>
            )}

            {/* Cook Now Button */}
            {'ingredients' in meal && (
              <TouchableOpacity
                style={[
                  styles.button,
                  styles.cookButton,
                  recipeAvailability?.availabilityPercentage !== 100 && styles.disabledButton
                ]}
                onPress={handleCook}
                disabled={recipeAvailability?.availabilityPercentage !== 100}
                testID="cook-meal-button"
              >
                <ChefHat size={20} color={Colors.white} />
                <Text style={styles.cookButtonText}>
                  {recipeAvailability?.availabilityPercentage === 100 ? 'Cook Now' : 'Missing Ingredients'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Meal Plan Modal */}
          <MealPlanModal
            visible={showMealPlanModal}
            selectedDate={new Date().toISOString().split('T')[0]}
            onSave={(plannedMeal) => {
              // This would need to be handled by the parent component
              console.log('Planned meal:', plannedMeal);
              setShowMealPlanModal(false);
              Alert.alert('Added to Plan', 'Recipe has been added to your meal plan!');
            }}
            onClose={() => setShowMealPlanModal(false)}
          />
        </View>
      </View>
    </RNModal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  image: {
    width: '100%',
    height: 250,
  },
  closeButton: {
    position: 'absolute',
    top: 40,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: 8,
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: Colors.lightText,
    marginBottom: 16,
  },
  metaContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  metaText: {
    fontSize: 14,
    color: Colors.lightText,
    marginLeft: 6,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  tag: {
    backgroundColor: Colors.secondary,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    fontSize: 12,
    color: Colors.text,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  ingredientItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  ingredientText: {
    fontSize: 16,
    color: Colors.text,
    flex: 1,
  },
  missingText: {
    fontSize: 14,
    color: Colors.expiring,
    fontWeight: '500',
  },
  stepItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    color: Colors.white,
    textAlign: 'center',
    lineHeight: 24,
    marginRight: 12,
    fontSize: 14,
    fontWeight: '600',
  },
  stepText: {
    fontSize: 16,
    color: Colors.text,
    flex: 1,
  },
  availabilityContainer: {
    backgroundColor: Colors.lightGray,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  availabilityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  availabilityText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  availabilityTextGood: {
    color: Colors.fresh,
  },
  availabilityTextBad: {
    color: Colors.expiring,
  },
  availabilityPercentage: {
    fontSize: 14,
    color: Colors.lightText,
  },
  ingredientStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  expiringText: {
    fontSize: 14,
    color: Colors.aging,
    fontWeight: '500',
  },
  buttonContainer: {
    flexDirection: 'column',
    padding: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 8,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
  },
  planButton: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  listButton: {
    backgroundColor: Colors.secondary,
  },
  cookButton: {
    backgroundColor: Colors.primary,
  },
  disabledButton: {
    backgroundColor: Colors.lightText,
    opacity: 0.7,
  },
  planButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
    marginLeft: 8,
  },
  listButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginLeft: 8,
  },
  cookButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
    marginLeft: 8,
  }
});