import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { X, ChefHat, Clock, Users, CheckCircle } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { PlannedMeal, Meal } from '@/types';
import { useMeals } from '@/hooks/useMealsStore';
import { useInventory } from '@/hooks/useInventoryStore';
import { useMealPlanner } from '@/hooks/useMealPlanner';

interface CookMealModalProps {
  visible: boolean;
  plannedMeal: PlannedMeal | null;
  onClose: () => void;
}

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
  recipeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    padding: 12,
    backgroundColor: Colors.lightGray,
    borderRadius: 8,
  },
  recipeDetails: {
    flex: 1,
    marginLeft: 12,
  },
  recipeName: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  recipeMetadata: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metadataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  metadataText: {
    fontSize: 14,
    color: Colors.lightText,
    marginLeft: 4,
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
  ingredientsList: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    padding: 12,
  },
  ingredientItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  ingredientName: {
    fontSize: 14,
    color: Colors.text,
    flex: 1,
  },
  ingredientQuantity: {
    fontSize: 14,
    color: Colors.lightText,
  },
  stepsList: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    padding: 12,
  },
  stepItem: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.white,
  },
  stepText: {
    fontSize: 14,
    color: Colors.text,
    flex: 1,
    lineHeight: 20,
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
  cookButton: {
    backgroundColor: Colors.primary,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButtonText: {
    color: Colors.text,
  },
  cookButtonText: {
    color: Colors.white,
  },
  completedContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  completedIcon: {
    marginBottom: 12,
  },
  completedText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.primary,
    marginBottom: 8,
  },
  completedSubtext: {
    fontSize: 14,
    color: Colors.lightText,
    textAlign: 'center',
  },
});

export const CookMealModal: React.FC<CookMealModalProps> = ({
  visible,
  plannedMeal,
  onClose,
}) => {
  const { meals } = useMeals();
  const { deductMealIngredients } = useInventory();
  const { completeMeal } = useMealPlanner();
  const [isCompleted, setIsCompleted] = useState(false);

  if (!plannedMeal) return null;

  const recipe = meals.find(m => m.id === plannedMeal.recipeId);
  if (!recipe) return null;

  const handleCookMeal = () => {
    Alert.alert(
      'Cook This Meal?',
      'This will deduct the required ingredients from your inventory.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Cook',
          onPress: () => {
            try {
              // Calculate ingredients needed based on servings
              const adjustedIngredients = recipe.ingredients.map(ingredient => ({
                ...ingredient,
                quantity: ingredient.quantity * (plannedMeal.servings / recipe.servings),
              }));

              // Deduct ingredients from inventory
              deductMealIngredients(adjustedIngredients);
              
              // Mark meal as completed
              completeMeal(plannedMeal.id);
              
              setIsCompleted(true);
            } catch (error) {
              Alert.alert('Error', 'Failed to cook meal. Please try again.');
            }
          },
        },
      ]
    );
  };

  const formatPrepTime = (prepTime: number | string): string => {
    if (typeof prepTime === 'number') {
      return `${prepTime} min`;
    }
    return prepTime;
  };

  if (isCompleted) {
    return (
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={onClose}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.completedContainer}>
              <View style={styles.completedIcon}>
                <CheckCircle size={48} color={Colors.primary} />
              </View>
              <Text style={styles.completedText}>Meal Completed!</Text>
              <Text style={styles.completedSubtext}>
                Ingredients have been deducted from your inventory.
              </Text>
            </View>
            
            <TouchableOpacity
              style={[styles.button, styles.cookButton]}
              onPress={() => {
                setIsCompleted(false);
                onClose();
              }}
            >
              <Text style={[styles.buttonText, styles.cookButtonText]}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

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
            <Text style={styles.title}>Cook Meal</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <X size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.recipeInfo}>
            <ChefHat size={24} color={Colors.primary} />
            <View style={styles.recipeDetails}>
              <Text style={styles.recipeName}>{recipe.name}</Text>
              <View style={styles.recipeMetadata}>
                <View style={styles.metadataItem}>
                  <Clock size={14} color={Colors.lightText} />
                  <Text style={styles.metadataText}>
                    {formatPrepTime(recipe.prepTime)}
                  </Text>
                </View>
                <View style={styles.metadataItem}>
                  <Users size={14} color={Colors.lightText} />
                  <Text style={styles.metadataText}>
                    {plannedMeal.servings} servings
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Ingredients */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Ingredients</Text>
              <View style={styles.ingredientsList}>
                {recipe.ingredients.map((ingredient, index) => {
                  const adjustedQuantity = ingredient.quantity * (plannedMeal.servings / recipe.servings);
                  return (
                    <View key={index} style={styles.ingredientItem}>
                      <Text style={styles.ingredientName}>{ingredient.name}</Text>
                      <Text style={styles.ingredientQuantity}>
                        {adjustedQuantity} {ingredient.unit}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Instructions */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Instructions</Text>
              <View style={styles.stepsList}>
                {recipe.steps.map((step, index) => (
                  <View key={index} style={styles.stepItem}>
                    <View style={styles.stepNumber}>
                      <Text style={styles.stepNumberText}>{index + 1}</Text>
                    </View>
                    <Text style={styles.stepText}>{step}</Text>
                  </View>
                ))}
              </View>
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={onClose}>
              <Text style={[styles.buttonText, styles.cancelButtonText]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.cookButton]} onPress={handleCookMeal}>
              <Text style={[styles.buttonText, styles.cookButtonText]}>Cook This Meal</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};