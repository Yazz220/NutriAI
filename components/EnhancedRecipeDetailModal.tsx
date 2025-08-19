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
  Linking,
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
  Utensils,
  Shuffle,
  MessageCircle,
  CheckCircle,
  ExternalLink,
} from 'lucide-react-native';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { LoadingSpinner } from './ui/LoadingSpinner';
import { Colors } from '../constants/colors';
import { ExternalRecipe } from '../types/external';
import { useRecipeStore } from '../hooks/useRecipeStore';
import { Meal } from '../types';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
import { Vibration } from 'react-native';
import { MealPlanModal } from './MealPlanModal';
import { useMealPlanner } from '@/hooks/useMealPlanner';
import { trackEvent } from '@/utils/analytics';

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
  const { addPlannedMeal } = useMealPlanner();
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [recipeDetails, setRecipeDetails] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  const { saveExternalRecipe, removeLocalRecipe, localRecipes } = useRecipeStore();

  // Load recipe details when modal opens
  useEffect(() => {
    if (recipe && !recipeDetails) {
      loadRecipeDetails();
    }
  }, [recipe, recipeDetails]);

  // Reset image error on recipe change
  useEffect(() => {
    setImageFailed(false);
  }, [recipe?.image]);

  // Check if recipe is saved
  useEffect(() => {
    if (recipe && localRecipes) {
      const matched = localRecipes.find((saved: any) => saved?.externalData?.externalId === recipe.id);
      setIsSaved(!!matched);
    }
  }, [recipe, localRecipes]);

  const loadRecipeDetails = async () => {
    if (!recipe) return;
    try {
      setIsLoading(true);
      // Dataset-only: rely on fields present on the recipe object; no external fetch
      setRecipeDetails(null);
      setError(null);
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
      const message = buildShareText();
      await Share.share({ message, title: recipe.title });
    } catch (error) {
      console.error('Error sharing recipe:', error);
    }
  };

  const buildShareText = (): string => {
    const lines: string[] = [];
    lines.push(recipe.title);
    const mins = (recipeDetails?.readyInMinutes ?? recipe.readyInMinutes);
    const sv = (recipeDetails?.servings ?? recipe.servings);
    const meta: string[] = [];
    if (typeof mins === 'number' && mins > 0) meta.push(`${mins} min`);
    if (typeof sv === 'number' && sv > 0) meta.push(`${sv} servings`);
    if (meta.length) lines.push(meta.join(' • '));

    // Ingredients (limit to 10 for brevity)
    const ingredients = (recipeDetails?.ingredients || recipe.ingredients) as any[] | undefined;
    if (ingredients?.length) {
      lines.push('');
      lines.push('Ingredients:');
      ingredients.slice(0, 10).forEach((ing: any) => {
        const text = ing?.original || ing?.name || '';
        if (text) lines.push(`• ${text}`);
      });
      if (ingredients.length > 10) lines.push(`…and ${ingredients.length - 10} more`);
    }

    // Instructions: prefer analyzed steps; otherwise use plain instructions
    const steps: string[] | undefined = recipeDetails?.analyzedInstructions?.[0]?.steps?.map((s: any) => s.step)
      || recipe.analyzedInstructions?.[0]?.steps?.map((s: any) => s.step)
      || undefined;
    const plainInstructions = (recipeDetails?.instructions || recipe.instructions || '').replace(/<[^>]*>/g, '');

    if (steps?.length) {
      lines.push('');
      lines.push('Instructions:');
      steps.slice(0, 5).forEach((s, idx) => lines.push(`${idx + 1}. ${s}`));
      if (steps.length > 5) lines.push(`…and ${steps.length - 5} more steps`);
    } else if (plainInstructions) {
      lines.push('');
      lines.push('Instructions:');
      lines.push(plainInstructions);
    }

    // Optional: source URL if present on details
    const sourceUrl = (recipeDetails as any)?.sourceUrl || (recipe as any)?.sourceUrl;
    if (sourceUrl) {
      lines.push('');
      lines.push(sourceUrl);
    }

    return lines.join('\n');
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
          {/* Hero Image with subtle overlay */}
          {recipe.image ? (
            <View style={styles.imageContainer}>
              {!imageFailed ? (
                <Image
                  source={{ uri: recipe.image }}
                  style={styles.image}
                  onError={() => setImageFailed(true)}
                />
              ) : (
                <View style={[styles.image, { alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.card }]}> 
                  <Text style={{ color: Colors.lightText }}>Image unavailable</Text>
                  <View style={{ marginTop: 8 }}>
                    <Button
                      title="Open Image"
                      onPress={() => Linking.openURL(recipe.image).catch(() => {})}
                    />
                  </View>
                </View>
              )}
              <ExpoLinearGradient
                colors={["rgba(0,0,0,0.0)", "rgba(0,0,0,0.6)"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={styles.imageOverlay}
              />
            </View>
          ) : null}
          <View style={styles.header}>
            <Text style={styles.title}>{recipe.title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>

          {isLoading ? (
            <LoadingSpinner />
          ) : error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : (
            <>
              {/* Primary Action Bar */}
              <View style={styles.primaryActions}>
                <ActionPill icon={<Utensils size={16} color={Colors.white} />} label="Cook" onPress={() => {}} />
                <ActionPill
                  icon={<BookmarkPlus size={16} color={Colors.white} />}
                  label="Plan"
                  onPress={() => {
                    trackEvent({ type: 'plan_button_tap', data: { source: 'detail', recipeId: recipe.id } });
                    setShowPlanModal(true);
                  }}
                />
                <ActionPill icon={<Shuffle size={16} color={Colors.white} />} label="Remix" onPress={() => {}} />
                <ActionPill icon={<MessageCircle size={16} color={Colors.white} />} label="Ask" onPress={() => { Alert.alert('AI', 'Open AI chat from Recipes tab > AI Chat'); }} />
              </View>

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

                {((recipeDetails as any)?.sourceUrl || (recipe as any)?.sourceUrl) && (
                  <TouchableOpacity
                    onPress={() => {
                      const url = (recipeDetails as any)?.sourceUrl || (recipe as any)?.sourceUrl;
                      if (url) Linking.openURL(url).catch(() => {});
                    }}
                    style={[styles.actionButton, styles.sourceButton]}
                  >
                    <ExternalLink size={20} color={Colors.white} />
                    <Text style={styles.actionButtonText}>View Source</Text>
                  </TouchableOpacity>
                )}
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
                    <View key={index} style={styles.rowItem}>
                      <CheckCircle size={16} color={Colors.border} />
                      <Text style={styles.rowText}>
                        {ingredient?.original || [ingredient?.amount, ingredient?.unit, ingredient?.name].filter(Boolean).join(' ')}
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
                      <View key={index} style={styles.rowItem}>
                        <View style={styles.stepBadge}><Text style={styles.stepBadgeText}>{index + 1}</Text></View>
                        <Text style={styles.rowText}>{step}</Text>
                      </View>
                    ));
                  })()}
                </View>
              ) : null}

              {/* Fallback: show helpful message and source link if no details */}
              {!(
                recipeDetails?.instructions ||
                recipe.instructions ||
                recipeDetails?.analyzedInstructions?.length ||
                recipe.analyzedInstructions?.length ||
                (recipeDetails?.ingredients?.length || recipe.ingredients?.length)
              ) && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>No details available</Text>
                  <Text style={styles.summaryText}>
                    This recipe currently has limited information in the dataset. You can still save it or open the source if available.
                  </Text>
                  {((recipeDetails as any)?.sourceUrl || (recipe as any)?.sourceUrl) && (
                    <View style={{ marginTop: 12 }}>
                      <Button
                        title="Open Source"
                        onPress={() => {
                          const url = (recipeDetails as any)?.sourceUrl || (recipe as any)?.sourceUrl;
                          if (url) Linking.openURL(url).catch(() => {});
                        }}
                      />
                    </View>
                  )}
                </View>
              )}

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

              {/* Meal Plan Modal (for Plan action) */}
              <MealPlanModal
                visible={showPlanModal}
                selectedDate={new Date().toISOString().split('T')[0]}
                initialRecipeId={String(recipe.id)}
                onClose={() => setShowPlanModal(false)}
                onSave={async (planned) => {
                  try {
                    await addPlannedMeal({
                      recipeId: planned.recipeId,
                      date: planned.date,
                      mealType: planned.mealType,
                      servings: planned.servings,
                      notes: planned.notes,
                      isCompleted: planned.isCompleted ?? false,
                    });
                    setShowPlanModal(false);
                    Alert.alert('Planned', 'Recipe added to your meal plan.');
                  } catch (err) {
                    console.error('Failed to add planned meal:', err);
                    Alert.alert('Error', 'Unable to add recipe to plan.');
                  }
                }}
              />
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
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
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
    height: 260,
    marginBottom: 8,
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  stat: {
    alignItems: 'center',
  },
  statText: {
    fontSize: 12,
    color: Colors.text,
    marginTop: 4,
  },
  primaryActions: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
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
  sourceButton: {
    backgroundColor: Colors.secondary,
    borderWidth: 1,
    borderColor: Colors.border,
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
  rowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.secondary,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  rowText: {
    flex: 1,
    color: Colors.text,
    fontSize: 14,
  },
  stepBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBadgeText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  nutritionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  nutritionItem: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
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

// Small pill-like action button with subtle haptics
const ActionPill = ({ icon, label, onPress }: { icon: React.ReactNode; label: string; onPress?: () => void }) => {
  const handlePress = async () => {
    try { Vibration.vibrate(10); } catch {}
    onPress?.();
  };
  return (
    <TouchableOpacity onPress={handlePress} style={pillStyles.pill}>
      <View style={pillStyles.icon}>{icon}</View>
      <Text style={pillStyles.label}>{label}</Text>
    </TouchableOpacity>
  );
};

const pillStyles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 8,
  },
  icon: {
    width: 18,
    alignItems: 'center',
  },
  label: {
    color: Colors.text,
    fontWeight: '600',
    fontSize: 13,
  },
});
