import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Modal, 
  ScrollView,
  Image,
  Platform
} from 'react-native';
import { Colors } from '@/constants/colors';
import { Meal } from '@/types';
import { X, Clock, Users, ShoppingBag, ChefHat } from 'lucide-react-native';
import { useMeals } from '@/hooks/useMealsStore';
import { useShoppingList } from '@/hooks/useShoppingListStore';

interface MealDetailModalProps {
  visible: boolean;
  onClose: () => void;
  meal: Meal | null;
}

export const MealDetailModal: React.FC<MealDetailModalProps> = ({ 
  visible, 
  onClose, 
  meal 
}) => {
  const { cookMeal, checkIngredientsAvailability } = useMeals();
  const { addMealIngredientsToList } = useShoppingList();
  
  if (!meal) return null;
  
  const totalTime = meal.prepTime + meal.cookTime;
  const { available, missingIngredients } = checkIngredientsAvailability(meal.id);
  
  const handleCook = () => {
    cookMeal(meal.id);
    onClose();
  };
  
  const handleAddToList = () => {
    addMealIngredientsToList(meal.id);
    onClose();
  };
  
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <ScrollView style={styles.scrollView}>
            <Image 
              source={{ uri: meal.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c' }} 
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
              <Text style={styles.description}>{meal.description}</Text>
              
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
              
              <View style={styles.tagsContainer}>
                {meal.tags.map((tag, index) => (
                  <View key={index} style={styles.tag}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>
              
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Ingredients</Text>
                {meal.ingredients.map((ingredient, index) => (
                  <View key={index} style={styles.ingredientItem}>
                    <Text style={styles.ingredientText}>
                      {ingredient.quantity} {ingredient.unit} {ingredient.name}
                      {ingredient.optional ? ' (optional)' : ''}
                    </Text>
                    {missingIngredients.some(
                      mi => mi.name.toLowerCase() === ingredient.name.toLowerCase()
                    ) && (
                      <Text style={styles.missingText}>Missing</Text>
                    )}
                  </View>
                ))}
              </View>
              
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Instructions</Text>
                {meal.steps.map((step, index) => (
                  <View key={index} style={styles.stepItem}>
                    <Text style={styles.stepNumber}>{index + 1}</Text>
                    <Text style={styles.stepText}>{step}</Text>
                  </View>
                ))}
              </View>
            </View>
          </ScrollView>
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={[styles.button, styles.listButton]}
              onPress={handleAddToList}
              testID="add-to-list-button"
            >
              <ShoppingBag size={20} color={Colors.text} />
              <Text style={styles.listButtonText}>Add to List</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.button, 
                styles.cookButton,
                !available && styles.disabledButton
              ]}
              onPress={handleCook}
              disabled={!available}
              testID="cook-meal-button"
            >
              <ChefHat size={20} color={Colors.white} />
              <Text style={styles.cookButtonText}>
                {available ? 'Cook Now' : 'Missing Ingredients'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
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
  buttonContainer: {
    flexDirection: 'row',
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 40 : 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
  },
  listButton: {
    backgroundColor: Colors.secondary,
    marginRight: 8,
  },
  cookButton: {
    backgroundColor: Colors.primary,
    marginLeft: 8,
  },
  disabledButton: {
    backgroundColor: Colors.lightText,
    opacity: 0.7,
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