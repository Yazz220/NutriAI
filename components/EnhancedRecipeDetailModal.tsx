// Enhanced Recipe Detail Modal
// Shows comprehensive recipe information from external APIs

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Share,
  Alert,
  Image,
} from 'react-native';
import {
  X,
  Clock,
  Users,
  Heart,
  Star,
  Bookmark,
  BookmarkPlus,
  Share2,
} from 'lucide-react-native';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { LoadingSpinner } from './ui/LoadingSpinner';
import { Colors } from '../constants/colors';
import { ExternalRecipe, RecipeInformationResponse } from '../utils/recipeProvider';
import { useRecipeStore } from '../hooks/useRecipeStore';
import { Meal } from '../types';

interface EnhancedRecipeDetailModalProps {
  visible: boolean;
  onClose: () => void;
  recipe: ExternalRecipe;
}

export const EnhancedRecipeDetailModal: React.FC<EnhancedRecipeDetailModalProps> = ({
  visible,
  onClose,
  recipe,
}) => {
  const [recipeDetails, setRecipeDetails] = useState<RecipeInformationResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  const { saveExternalRecipe, removeLocalRecipe, localRecipes, recipeProvider } = useRecipeStore();

  // Load recipe details when modal opens
  useEffect(() => {
    if (recipe && !recipeDetails) {
      loadRecipeDetails();
    }
  }, [recipe, recipeDetails]);

  // Check if recipe is saved
  useEffect(() => {
    if (recipe && localRecipes) {
      const matched = localRecipes.find((saved: any) => saved?.externalData?.externalId === recipe.id);
      setIsSaved(!!matched);
    }
  }, [recipe, localRecipes]);

  const loadRecipeDetails = async () => {
    if (!recipe) return;
    if (!recipeProvider) {
      setError('Recipe provider not initialized.');
      return;
    }
    
    try {
      setIsLoading(true);
      // Load detailed recipe information via shared provider (preserves proxy & logging)
      const details = await recipeProvider.getRecipeInformation(recipe.id);
      if (details) {
        setRecipeDetails(details);
      }
    } catch (error) {
      console.error('Error loading recipe details:', error);
      setError('Failed to load recipe details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveRecipe = async () => {
    if (!recipe) return;
    try {
      await saveExternalRecipe(recipe);
      setIsSaved(true);
      Alert.alert('Success', 'Recipe saved to your collection!');
    } catch (error) {
      console.error('Error saving recipe:', error);
      Alert.alert('Error', 'Failed to save recipe');
    }
  };

  const handleRemoveRecipe = async () => {
    if (!recipe) return;
    try {
      const matched = localRecipes.find((saved: any) => saved?.externalData?.externalId === recipe.id);
      if (matched) {
        await removeLocalRecipe(matched.id);
        setIsSaved(false);
        Alert.alert('Success', 'Recipe removed from your collection!');
      }
    } catch (error) {
      console.error('Error removing recipe:', error);
      Alert.alert('Error', 'Failed to remove recipe');
    }
  };

  const handleShareRecipe = async () => {
    if (!recipe) return;
    
    try {
      await Share.share({
        message: `Check out this recipe: ${recipe.title}\n\n${recipeDetails?.instructions || ''}`,
        title: recipe.title,
      });
    } catch (error) {
      console.error('Error sharing recipe:', error);
    }
  };

  if (!recipe) return null;

  return (
    <Modal visible={visible} onClose={onClose} title="Recipe Details" size="full" hasHeader={false}>
      <View style={styles.modal}>
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 24 }}
        >
          <View style={styles.header}>
            <Text style={styles.title}>{recipe.title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>
          {recipe.image && (
            <View style={styles.imageContainer}>
              <Image source={{ uri: recipe.image }} style={styles.image} />
            </View>
          )}

          {isLoading ? (
            <LoadingSpinner />
          ) : error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : (
            <>
              {/* Recipe Stats */}
              <View style={styles.statsContainer}>
                {(() => {
                  const mins = (recipeDetails?.readyInMinutes ?? recipe.readyInMinutes ?? 0);
                  return mins > 0 ? (
                    <View style={styles.stat}>
                      <Clock size={16} color={Colors.primary} />
                      <Text style={styles.statText}>{mins} min</Text>
                    </View>
                  ) : null;
                })()}
                {(() => {
                  const sv = (recipeDetails?.servings ?? recipe.servings ?? 0);
                  return sv > 0 ? (
                    <View style={styles.stat}>
                      <Users size={16} color={Colors.primary} />
                      <Text style={styles.statText}>{sv} servings</Text>
                    </View>
                  ) : null;
                })()}
                {typeof recipeDetails?.aggregateLikes === 'number' && (
                  <View style={styles.stat}>
                    <Heart size={16} color={Colors.primary} />
                    <Text style={styles.statText}>{recipeDetails.aggregateLikes} likes</Text>
                  </View>
                )}
                {typeof recipeDetails?.spoonacularScore === 'number' && (
                  <View style={styles.stat}>
                    <Star size={16} color={Colors.primary} />
                    <Text style={styles.statText}>{Math.round(recipeDetails.spoonacularScore)}%</Text>
                  </View>
                )}
              </View>

              {/* Action Buttons */}
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  onPress={isSaved ? handleRemoveRecipe : handleSaveRecipe}
                  style={[styles.actionButton, isSaved ? styles.savedButton : styles.saveButton]}
                >
                  {isSaved ? (
                    <>
                      <Bookmark size={20} color={Colors.white} />
                      <Text style={styles.actionButtonText}>Saved</Text>
                    </>
                  ) : (
                    <>
                      <BookmarkPlus size={20} color={Colors.white} />
                      <Text style={styles.actionButtonText}>Save Recipe</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleShareRecipe}
                  style={[styles.actionButton, styles.shareButton]}
                >
                  <Share2 size={20} color={Colors.white} />
                  <Text style={styles.actionButtonText}>Share</Text>
                </TouchableOpacity>
              </View>

              {/* Recipe Summary */}
              {(recipeDetails?.instructions || recipe.instructions) && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Summary</Text>
                  <Text style={styles.summaryText}>
                    {(recipeDetails?.instructions || recipe.instructions || '').replace(/<[^>]*>/g, '')}
                  </Text>
                </View>
              )}

              {/* Ingredients */}
              {(recipeDetails?.ingredients?.length || recipe.ingredients?.length) ? (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Ingredients</Text>
                  {(recipeDetails?.ingredients || recipe.ingredients || []).map((ingredient: any, index: number) => (
                    <View key={index} style={styles.ingredientItem}>
                      <Text style={styles.ingredientText}>
                        • {ingredient.original}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : null}

              {/* Instructions */}
              {(recipeDetails?.analyzedInstructions?.length || recipe.analyzedInstructions?.length || recipe.instructions) ? (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Instructions</Text>
                  {(() => {
                    const steps: string[] = recipeDetails?.analyzedInstructions?.[0]?.steps?.map((s: any) => s.step)
                      || recipe.analyzedInstructions?.[0]?.steps?.map((s: any) => s.step)
                      || (recipeDetails?.instructions || recipe.instructions || '').split('\n').filter(Boolean);
                    return steps.map((step: string, index: number) => (
                      <View key={index} style={styles.instructionStep}>
                        <Text style={styles.stepNumber}>{index + 1}</Text>
                        <Text style={styles.instructionText}>{step}</Text>
                      </View>
                    ));
                  })()}
                </View>
              ) : null}

              {/* Nutrition Info */}
              {recipeDetails?.nutrition?.nutrients && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Nutrition</Text>
                  <View style={styles.nutritionGrid}>
                    {recipeDetails.nutrition.nutrients
                      .filter((nutrient: any) => ['Calories', 'Protein', 'Carbohydrates', 'Total Fat', 'Fiber'].includes(nutrient.name))
                      .map((nutrient: any, index: number) => (
                        <View key={index} style={styles.nutritionItem}>
                          <Text style={styles.nutritionLabel}>{nutrient.name}</Text>
                          <Text style={styles.nutritionValue}>
                            {Math.round(nutrient.amount)}{nutrient.unit}
                          </Text>
                        </View>
                      ))}
                  </View>
                </View>
              )}
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  modal: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    flex: 1,
    marginRight: 16,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  imageContainer: {
    width: '100%',
    height: 200,
    marginBottom: 16,
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: Colors.lightGray,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
  },
  stat: {
    alignItems: 'center',
  },
  statText: {
    fontSize: 12,
    color: Colors.text,
    marginTop: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  saveButton: {
    backgroundColor: Colors.primary,
  },
  savedButton: {
    backgroundColor: Colors.success,
  },
  shareButton: {
    backgroundColor: Colors.info,
  },
  actionButtonText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 12,
  },
  summaryText: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.lightText,
  },
  ingredientItem: {
    marginBottom: 8,
  },
  ingredientText: {
    fontSize: 14,
    color: Colors.text,
  },
  instructionStep: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  instructionText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.text,
  },
  nutritionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  nutritionItem: {
    backgroundColor: Colors.lightGray,
    padding: 12,
    borderRadius: 8,
    minWidth: (width - 64) / 2 - 6,
    alignItems: 'center',
  },
  nutritionLabel: {
    fontSize: 12,
    color: Colors.lightText,
    marginBottom: 4,
  },
  nutritionValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
  },
  errorText: {
    fontSize: 16,
    color: Colors.error,
    textAlign: 'center',
    padding: 20,
  },
});
