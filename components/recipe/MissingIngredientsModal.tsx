import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { X, ShoppingCart, AlertTriangle, Package } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { MissingIngredient } from '@/utils/inventoryRecipeMatching';

interface MissingIngredientsModalProps {
  visible: boolean;
  onClose: () => void;
  missingIngredients: MissingIngredient[];
  recipeName: string;
  onAddToShoppingList?: (items: string[]) => void;
  onAddAllToShoppingList?: () => void;
}

function formatIngredientAmount(ingredient: MissingIngredient): string {
  if (ingredient.availableQuantity > 0) {
    return `${ingredient.shortfall} ${ingredient.requiredUnit} more (have ${ingredient.availableQuantity})`;
  }
  return `${ingredient.requiredQuantity} ${ingredient.requiredUnit}`;
}

function categorizeIngredients(ingredients: MissingIngredient[]): {
  completelyMissing: MissingIngredient[];
  partiallyAvailable: MissingIngredient[];
} {
  const completelyMissing = ingredients.filter(ing => ing.availableQuantity === 0);
  const partiallyAvailable = ingredients.filter(ing => ing.availableQuantity > 0);
  
  return { completelyMissing, partiallyAvailable };
}

export const MissingIngredientsModal: React.FC<MissingIngredientsModalProps> = ({
  visible,
  onClose,
  missingIngredients,
  recipeName,
  onAddToShoppingList,
  onAddAllToShoppingList
}) => {
  const { completelyMissing, partiallyAvailable } = categorizeIngredients(missingIngredients);
  
  const handleAddSingleItem = (ingredient: MissingIngredient) => {
    const item = `${ingredient.name} (${formatIngredientAmount(ingredient)})`;
    onAddToShoppingList?.([item]);
  };

  const handleAddAllItems = () => {
    const items = missingIngredients.map(ingredient => 
      `${ingredient.name} (${formatIngredientAmount(ingredient)})`
    );
    onAddToShoppingList?.(items);
    onAddAllToShoppingList?.();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleSection}>
            <Package size={24} color={Colors.text} />
            <View>
              <Text style={styles.title}>Missing Ingredients</Text>
              <Text style={styles.subtitle}>{recipeName}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color={Colors.text} />
          </TouchableOpacity>
        </View>

        {/* Summary */}
        <View style={styles.summarySection}>
          <View style={styles.summaryCard}>
            <AlertTriangle size={20} color={Colors.warning} />
            <Text style={styles.summaryText}>
              You need {missingIngredients.length} ingredient{missingIngredients.length !== 1 ? 's' : ''} to make this recipe
            </Text>
          </View>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Completely Missing Ingredients */}
          {completelyMissing.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Need to Buy ({completelyMissing.length})
              </Text>
              {completelyMissing.map((ingredient, index) => (
                <View key={index} style={styles.ingredientCard}>
                  <View style={styles.ingredientInfo}>
                    <Text style={styles.ingredientName}>{ingredient.name}</Text>
                    <Text style={styles.ingredientAmount}>
                      {ingredient.requiredQuantity} {ingredient.requiredUnit}
                    </Text>
                    {ingredient.estimatedCost && (
                      <Text style={styles.ingredientCost}>
                        Est. ${ingredient.estimatedCost.toFixed(2)}
                      </Text>
                    )}
                  </View>
                  <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => handleAddSingleItem(ingredient)}
                  >
                    <ShoppingCart size={16} color={Colors.primary} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* Partially Available Ingredients */}
          {partiallyAvailable.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Need More ({partiallyAvailable.length})
              </Text>
              {partiallyAvailable.map((ingredient, index) => (
                <View key={index} style={[styles.ingredientCard, styles.partialCard]}>
                  <View style={styles.ingredientInfo}>
                    <Text style={styles.ingredientName}>{ingredient.name}</Text>
                    <Text style={styles.ingredientAmount}>
                      Need {ingredient.shortfall} {ingredient.requiredUnit} more
                    </Text>
                    <Text style={styles.ingredientHave}>
                      You have: {ingredient.availableQuantity} {ingredient.requiredUnit}
                    </Text>
                    {ingredient.estimatedCost && (
                      <Text style={styles.ingredientCost}>
                        Est. ${ingredient.estimatedCost.toFixed(2)}
                      </Text>
                    )}
                  </View>
                  <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => handleAddSingleItem(ingredient)}
                  >
                    <ShoppingCart size={16} color={Colors.primary} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* Shopping Tips */}
          <View style={styles.tipsSection}>
            <Text style={styles.tipsTitle}>💡 Shopping Tips</Text>
            <View style={styles.tipsList}>
              <Text style={styles.tipText}>
                • Check your pantry again before shopping - you might have missed something
              </Text>
              <Text style={styles.tipText}>
                • Look for substitutes if certain ingredients are expensive or unavailable
              </Text>
              <Text style={styles.tipText}>
                • Buy in bulk for pantry staples to save money on future recipes
              </Text>
              {partiallyAvailable.length > 0 && (
                <Text style={styles.tipText}>
                  • You already have some ingredients - just need to top up quantities
                </Text>
              )}
            </View>
          </View>
        </ScrollView>

        {/* Action Buttons */}
        <View style={styles.actionSection}>
          <TouchableOpacity
            style={styles.addAllButton}
            onPress={handleAddAllItems}
          >
            <ShoppingCart size={20} color={Colors.white} />
            <Text style={styles.addAllButtonText}>
              Add All to Shopping List
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={onClose}
          >
            <Text style={styles.cancelButtonText}>Maybe Later</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  titleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.lightText,
    marginTop: 2,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summarySection: {
    padding: Spacing.lg,
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.warningLight || '#FFFBEB',
    padding: Spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.warning,
  },
  summaryText: {
    flex: 1,
    fontSize: 14,
    color: Colors.warning,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  ingredientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  partialCard: {
    borderLeftWidth: 4,
    borderLeftColor: Colors.warning,
  },
  ingredientInfo: {
    flex: 1,
  },
  ingredientName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  ingredientAmount: {
    fontSize: 14,
    color: Colors.text,
    marginBottom: 2,
  },
  ingredientHave: {
    fontSize: 12,
    color: Colors.success,
    marginBottom: 2,
  },
  ingredientCost: {
    fontSize: 12,
    color: Colors.lightText,
    fontStyle: 'italic',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  tipsSection: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  tipsList: {
    gap: Spacing.sm,
  },
  tipText: {
    fontSize: 12,
    color: Colors.lightText,
    lineHeight: 16,
  },
  actionSection: {
    padding: Spacing.lg,
    gap: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  addAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: Spacing.md,
  },
  addAllButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  cancelButtonText: {
    color: Colors.lightText,
    fontSize: 14,
    fontWeight: '500',
  },
});