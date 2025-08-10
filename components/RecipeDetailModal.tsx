// Recipe Detail Modal
// Displays comprehensive recipe information and allows saving

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
} from 'react-native';
import { X, Clock, Users, Heart, Star, Save, Share2, Calendar, Utensils } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { Spacing, Typography } from '@/constants/spacing';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ExternalRecipe } from '@/utils/recipeProvider';
import { useInventory } from '@/hooks/useInventoryStore';

interface RecipeDetailModalProps {
  recipe: ExternalRecipe | null;
  visible: boolean;
  onClose: () => void;
  onSave: (recipe: ExternalRecipe) => void;
  onAddToMealPlan?: (recipe: ExternalRecipe) => void;
}

export const RecipeDetailModal: React.FC<RecipeDetailModalProps> = ({
  recipe,
  visible,
  onClose,
  onSave,
  onAddToMealPlan,
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const { inventory } = useInventory();

  if (!recipe) return null;

  // Calculate ingredient availability
  const getIngredientAvailability = (ingredientName: string) => {
    const inventoryItem = inventory.find(item => 
      item.name.toLowerCase().includes(ingredientName.toLowerCase()) ||
      ingredientName.toLowerCase().includes(item.name.toLowerCase())
    );
    
    if (!inventoryItem) return { available: false, quantity: 0, unit: '' };
    
    return {
      available: true,
      quantity: inventoryItem.quantity,
      unit: inventoryItem.unit,
    };
  };

  // Handle save recipe
  const handleSaveRecipe = async () => {
    setIsSaving(true);
    try {
      await onSave(recipe);
      Alert.alert('Success', 'Recipe saved to your collection!');
    } catch (error) {
      Alert.alert('Error', 'Failed to save recipe. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle add to meal plan
  const handleAddToMealPlan = () => {
    if (onAddToMealPlan) {
      onAddToMealPlan(recipe);
      Alert.alert('Success', 'Recipe added to meal plan!');
    }
  };

  // Handle share recipe
  const handleShare = () => {
    // This would integrate with React Native's Share API
    Alert.alert('Share', 'Sharing functionality would be implemented here');
  };

  // Format nutrition value
  const formatNutrition = (nutrients: any[], name: string) => {
    const nutrient = nutrients?.find(n => n.name === name);
    return nutrient ? `${Math.round(nutrient.amount)}${nutrient.unit}` : 'N/A';
  };

  // Get health score color
  const getHealthScoreColor = (score: number) => {
    if (score >= 80) return Colors.success;
    if (score >= 60) return Colors.warning;
    return Colors.expiring;
  };

  return (
    <Modal visible={visible} onClose={onClose} style={styles.modal}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Recipe Details</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <X size={24} color={Colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Recipe Header */}
        <View style={styles.recipeHeader}>
          <View style={styles.recipeImageContainer}>
            <Text style={styles.recipeImagePlaceholder}>
              {recipe.title.charAt(0).toUpperCase()}
            </Text>
          </View>
          
          <View style={styles.recipeHeaderInfo}>
            <Text style={styles.recipeTitle} numberOfLines={3}>
              {recipe.title}
            </Text>
            
            <View style={styles.recipeMeta}>
              <View style={styles.metaItem}>
                <Clock size={16} color={Colors.lightText} />
                <Text style={styles.metaText}>{recipe.readyInMinutes}m</Text>
              </View>
              
              <View style={styles.metaItem}>
                <Users size={16} color={Colors.lightText} />
                <Text style={styles.metaText}>{recipe.servings} servings</Text>
              </View>
              
              {recipe.aggregateLikes && (
                <View style={styles.metaItem}>
                  <Heart size={16} color={Colors.lightText} />
                  <Text style={styles.metaText}>{recipe.aggregateLikes} likes</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Recipe Stats */}
        <Card style={styles.statsCard}>
          <View style={styles.statsGrid}>
            {recipe.healthScore && (
              <View style={styles.statItem}>
                <Text style={styles.statValue} numberOfLines={1}>
                  {recipe.healthScore}
                </Text>
                <Text style={styles.statLabel}>Health Score</Text>
                <View style={[styles.healthScoreBar, { backgroundColor: getHealthScoreColor(recipe.healthScore) }]} />
              </View>
            )}
            
            {recipe.spoonacularScore && (
              <View style={styles.statItem}>
                <Text style={styles.statValue} numberOfLines={1}>
                  {recipe.spoonacularScore}
                </Text>
                <Text style={styles.statLabel}>Spoonacular Score</Text>
                <View style={[styles.healthScoreBar, { backgroundColor: Colors.primary }]} />
              </View>
            )}
            
            {recipe.pricePerServing && (
              <View style={styles.statItem}>
                <Text style={styles.statValue} numberOfLines={1}>
                  ${(recipe.pricePerServing / 100).toFixed(2)}
                </Text>
                <Text style={styles.statLabel}>Price per Serving</Text>
              </View>
            )}
          </View>
        </Card>

        {/* Recipe Tags */}
        {(recipe.cuisines?.length || recipe.diets?.length || recipe.dishTypes?.length) && (
          <Card style={styles.tagsCard}>
            <Text style={styles.sectionTitle}>Tags</Text>
            <View style={styles.tagsContainer}>
              {recipe.cuisines?.map((cuisine, index) => (
                <View key={`cuisine-${index}`} style={[styles.tag, styles.cuisineTag]}>
                  <Text style={styles.tagText}>{cuisine}</Text>
                </View>
              ))}
              
              {recipe.diets?.map((diet, index) => (
                <View key={`diet-${index}`} style={[styles.tag, styles.dietTag]}>
                  <Text style={styles.tagText}>{diet}</Text>
                </View>
              ))}
              
              {recipe.dishTypes?.map((type, index) => (
                <View key={`type-${index}`} style={[styles.tag, styles.typeTag]}>
                  <Text style={styles.tagText}>{type}</Text>
                </View>
              ))}
              
              {recipe.vegetarian && (
                <View style={[styles.tag, styles.vegetarianTag]}>
                  <Text style={styles.tagText}>Vegetarian</Text>
                </View>
              )}
              
              {recipe.vegan && (
                <View style={[styles.tag, styles.veganTag]}>
                  <Text style={styles.tagText}>Vegan</Text>
                </View>
              )}
              
              {recipe.glutenFree && (
                <View style={[styles.tag, styles.glutenFreeTag]}>
                  <Text style={styles.tagText}>Gluten-Free</Text>
                </View>
              )}
            </View>
          </Card>
        )}

        {/* Nutrition Information */}
        {recipe.nutrition && (
          <Card style={styles.nutritionCard}>
            <Text style={styles.sectionTitle}>Nutrition per Serving</Text>
            <View style={styles.nutritionGrid}>
              <View style={styles.nutritionItem}>
                <Text style={styles.nutritionValue}>
                  {formatNutrition(recipe.nutrition.nutrients, 'Calories')}
                </Text>
                <Text style={styles.nutritionLabel}>Calories</Text>
              </View>
              
              <View style={styles.nutritionItem}>
                <Text style={styles.nutritionValue}>
                  {formatNutrition(recipe.nutrition.nutrients, 'Protein')}
                </Text>
                <Text style={styles.nutritionLabel}>Protein</Text>
              </View>
              
              <View style={styles.nutritionItem}>
                <Text style={styles.nutritionValue}>
                  {formatNutrition(recipe.nutrition.nutrients, 'Carbohydrates')}
                </Text>
                <Text style={styles.nutritionLabel}>Carbs</Text>
              </View>
              
              <View style={styles.nutritionItem}>
                <Text style={styles.nutritionValue}>
                  {formatNutrition(recipe.nutrition.nutrients, 'Fat')}
                </Text>
                <Text style={styles.nutritionLabel}>Fat</Text>
              </View>
            </View>
            
            {recipe.nutrition.caloricBreakdown && (
              <View style={styles.caloricBreakdown}>
                <Text style={styles.breakdownTitle}>Caloric Breakdown</Text>
                <View style={styles.breakdownBars}>
                  <View style={styles.breakdownBar}>
                    <View style={[styles.breakdownBarFill, { width: `${recipe.nutrition.caloricBreakdown.percentProtein}%`, backgroundColor: Colors.primary }]} />
                    <Text style={styles.breakdownLabel}>Protein {recipe.nutrition.caloricBreakdown.percentProtein}%</Text>
                  </View>
                  
                  <View style={styles.breakdownBar}>
                    <View style={[styles.breakdownBarFill, { width: `${recipe.nutrition.caloricBreakdown.percentCarbs}%`, backgroundColor: Colors.secondary }]} />
                    <Text style={styles.breakdownLabel}>Carbs {recipe.nutrition.caloricBreakdown.percentCarbs}%</Text>
                  </View>
                  
                  <View style={styles.breakdownBar}>
                    <View style={[styles.breakdownBarFill, { width: `${recipe.nutrition.caloricBreakdown.percentFat}%`, backgroundColor: Colors.warning }]} />
                    <Text style={styles.breakdownLabel}>Fat {recipe.nutrition.caloricBreakdown.percentFat}%</Text>
                  </View>
                </View>
              </View>
            )}
          </Card>
        )}

        {/* Ingredients */}
        <Card style={styles.ingredientsCard}>
          <Text style={styles.sectionTitle}>Ingredients</Text>
          <View style={styles.ingredientsList}>
            {recipe.ingredients?.map((ingredient, index) => {
              const availability = getIngredientAvailability(ingredient.name);
              return (
                <View key={index} style={styles.ingredientItem}>
                  <View style={styles.ingredientInfo}>
                    <Text style={styles.ingredientName}>
                      {ingredient.original}
                    </Text>
                    {availability.available && (
                      <Text style={styles.availabilityText}>
                        ✓ You have {availability.quantity} {availability.unit}
                      </Text>
                    )}
                  </View>
                  
                  {availability.available ? (
                    <View style={styles.availabilityBadge}>
                      <Text style={styles.availabilityBadgeText}>Available</Text>
                    </View>
                  ) : (
                    <View style={styles.missingBadge}>
                      <Text style={styles.missingBadgeText}>Missing</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </Card>

        {/* Instructions */}
        {recipe.instructions && (
          <Card style={styles.instructionsCard}>
            <Text style={styles.sectionTitle}>Instructions</Text>
            <Text style={styles.instructionsText}>
              {recipe.instructions}
            </Text>
          </Card>
        )}

        {/* Source Information */}
        {recipe.sourceName && (
          <Card style={styles.sourceCard}>
            <Text style={styles.sectionTitle}>Source</Text>
            <Text style={styles.sourceText}>
              Recipe from {recipe.sourceName}
            </Text>
            {recipe.sourceUrl && (
              <Text style={styles.sourceUrl} numberOfLines={1}>
                {recipe.sourceUrl}
              </Text>
            )}
          </Card>
        )}
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <View style={styles.actionRow}>
          <Button
            title="Save Recipe"
            onPress={handleSaveRecipe}
            disabled={isSaving}
            style={styles.saveButton}
            icon={<Save size={16} color={Colors.white} />}
          />
          
          {onAddToMealPlan && (
            <Button
              title="Add to Meal Plan"
              onPress={handleAddToMealPlan}
              style={styles.mealPlanButton}
              icon={<Calendar size={16} color={Colors.white} />}
            />
          )}
        </View>
        
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.secondaryButton} onPress={handleShare}>
            <Share2 size={16} color={Colors.primary} />
            <Text style={styles.secondaryButtonText}>Share</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  modal: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: '600',
    color: Colors.text,
  },
  closeButton: {
    padding: Spacing.sm,
  },
  content: {
    flex: 1,
  },
  recipeHeader: {
    flexDirection: 'row',
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  recipeImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: Colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recipeImagePlaceholder: {
    fontSize: Typography.sizes.xxl,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  recipeHeaderInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  recipeTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  recipeMeta: {
    gap: Spacing.sm,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: Typography.sizes.sm,
    color: Colors.lightText,
  },
  statsCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: Typography.sizes.xl,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: Typography.sizes.sm,
    color: Colors.lightText,
    textAlign: 'center',
    marginBottom: 8,
  },
  healthScoreBar: {
    height: 4,
    width: 40,
    borderRadius: 2,
  },
  tagsCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: Typography.sizes.md,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  tag: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 16,
  },
  cuisineTag: {
    backgroundColor: Colors.primary + '20',
  },
  dietTag: {
    backgroundColor: Colors.secondary + '20',
  },
  typeTag: {
    backgroundColor: Colors.warning + '20',
  },
  vegetarianTag: {
    backgroundColor: Colors.success + '20',
  },
  veganTag: {
    backgroundColor: Colors.success + '30',
  },
  glutenFreeTag: {
    backgroundColor: Colors.info + '20',
  },
  tagText: {
    fontSize: Typography.sizes.sm,
    color: Colors.text,
    fontWeight: '500',
  },
  nutritionCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  nutritionGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: Spacing.lg,
  },
  nutritionItem: {
    alignItems: 'center',
    flex: 1,
  },
  nutritionValue: {
    fontSize: Typography.sizes.lg,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 4,
  },
  nutritionLabel: {
    fontSize: Typography.sizes.sm,
    color: Colors.lightText,
    textAlign: 'center',
  },
  caloricBreakdown: {
    marginTop: Spacing.md,
  },
  breakdownTitle: {
    fontSize: Typography.sizes.sm,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  breakdownBars: {
    gap: Spacing.sm,
  },
  breakdownBar: {
    height: 20,
    backgroundColor: Colors.border,
    borderRadius: 10,
    overflow: 'hidden',
  },
  breakdownBarFill: {
    height: '100%',
    borderRadius: 10,
  },
  breakdownLabel: {
    position: 'absolute',
    left: Spacing.sm,
    top: 2,
    fontSize: Typography.sizes.xs,
    color: Colors.white,
    fontWeight: '600',
  },
  ingredientsCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  ingredientsList: {
    gap: Spacing.sm,
  },
  ingredientItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border + '30',
  },
  ingredientInfo: {
    flex: 1,
  },
  ingredientName: {
    fontSize: Typography.sizes.md,
    color: Colors.text,
    marginBottom: 2,
  },
  availabilityText: {
    fontSize: Typography.sizes.sm,
    color: Colors.success,
  },
  availabilityBadge: {
    backgroundColor: Colors.success + '20',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
  },
  availabilityBadgeText: {
    fontSize: Typography.sizes.xs,
    color: Colors.success,
    fontWeight: '600',
  },
  missingBadge: {
    backgroundColor: Colors.expiring + '20',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
  },
  missingBadgeText: {
    fontSize: Typography.sizes.xs,
    color: Colors.expiring,
    fontWeight: '600',
  },
  instructionsCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  instructionsText: {
    fontSize: Typography.sizes.md,
    color: Colors.text,
    lineHeight: 24,
  },
  sourceCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  sourceText: {
    fontSize: Typography.sizes.md,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  sourceUrl: {
    fontSize: Typography.sizes.sm,
    color: Colors.primary,
    textDecorationLine: 'underline',
  },
  actions: {
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.white,
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  saveButton: {
    flex: 1,
  },
  mealPlanButton: {
    flex: 1,
    backgroundColor: Colors.secondary,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
    gap: Spacing.xs,
  },
  secondaryButtonText: {
    color: Colors.primary,
    fontSize: Typography.sizes.md,
    fontWeight: '500',
  },
});
