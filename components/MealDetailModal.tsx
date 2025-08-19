import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  TouchableOpacity,
  Modal as RNModal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Linking
} from 'react-native';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/spacing';
import { Meal, Recipe, RecipeAvailability, RecipeIngredient } from '@/types';
import { ShoppingBag, ChefHat, Calendar, CheckCircle, AlertTriangle, X, MessageCircle, Send, ExternalLink } from 'lucide-react-native';
import { useMeals } from '@/hooks/useMealsStore';
import { useShoppingList } from '@/hooks/useShoppingListStore';
import { MealPlanModal } from './MealPlanModal';
import { useRecipeChat } from '@/hooks/useRecipeChat';
import { StructuredMessage } from '@/components/StructuredMessage';
import { Button } from './ui/Button';

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
  const [activeTab, setActiveTab] = useState<'details' | 'chat'>('details');
  const [chatInput, setChatInput] = useState('');

  // Build a Recipe-shaped object for chat context (always call hooks)
  const recipeForChat: Recipe = useMemo(() => {
    if (!meal) {
      return {
        id: 'temp',
        name: '',
        image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c',
        tags: [],
        prepTime: '',
        cookTime: '',
        servings: 0,
        ingredients: [],
        instructions: [],
      } as Recipe;
    }
    const isRecipe = (meal as any).instructions !== undefined && (meal as any).image !== undefined;
    if (isRecipe) return meal as Recipe;
    // Fallback mapping Meal -> Recipe shape
    const cook = 'cookTime' in meal ? meal.cookTime : 0;
    const ing = 'ingredients' in meal ? (meal as any).ingredients : [];
    const steps = 'steps' in meal ? (meal as any).steps : ('instructions' in meal ? (meal as any).instructions : []);
    return {
      id: meal.id,
      name: meal.name,
      image: (meal as any).imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c',
      tags: meal.tags || [],
      prepTime: typeof meal.prepTime === 'number' ? `${meal.prepTime} mins` : String((meal as any).prepTime || ''),
      cookTime: typeof cook === 'number' ? `${cook} mins` : String((cook as any) || ''),
      servings: meal.servings || 0,
      ingredients: (ing as any[]).map((x: any) => ({ name: x.name, quantity: x.quantity, unit: x.unit })) as RecipeIngredient[],
      instructions: (steps as string[]) || [],
    } as Recipe;
  }, [meal]);

  // Memo availability for chat context safely
  const recipeAvailability = useMemo(() => {
    if (!meal || !('ingredients' in meal)) return availability;
    const ingredients = meal.ingredients as any[];
    const { available, missingIngredients } = checkIngredientsAvailability(meal.id);
    const requiredIngredients = ingredients.filter((ing: any) => !('optional' in ing) || !ing.optional);
    return {
      recipeId: meal.id,
      availableIngredients: ingredients.length - missingIngredients.length,
      totalIngredients: requiredIngredients.length,
      availabilityPercentage: available ? 100 : Math.round(((ingredients.length - missingIngredients.length) / Math.max(ingredients.length, 1)) * 100),
      missingIngredients,
      expiringIngredients: [] as any[],
    } as RecipeAvailability;
  }, [meal, availability, checkIngredientsAvailability]);

  const { messages, isTyping, sendMessage, quickChips, performInlineAction } = useRecipeChat(
    recipeForChat,
    recipeAvailability as any
  );

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

  // ingredients/steps computation happens after hooks; that's fine

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
          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            {/* Hero Image */}
            <View style={styles.heroContainer}>
              {(() => {
                const imageUri = (("imageUrl" in meal ? (meal as any).imageUrl : (meal as any).image) as string) || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c';
                return (
                  <Image
                    source={{ uri: imageUri }}
                    style={styles.image}
                    resizeMode="cover"
                  />
                );
              })()}

              {/* Enhanced Close Button */}
              <TouchableOpacity
                style={styles.closeButton}
                onPress={onClose}
                testID="close-meal-detail"
              >
                <X size={20} color={Colors.white} />
              </TouchableOpacity>
            </View>

            <View style={styles.content}>
              {/* Title and description under image */}
              <View style={styles.titleContainer}>
                <Text style={styles.title}>{meal.name}</Text>
                {'description' in meal && meal.description ? (
                  <Text style={styles.subtitle}>{meal.description}</Text>
                ) : null}
              </View>
              {/* Primary Action Bar */}
              <View style={styles.primaryActions}>
                <Button title="Cook" onPress={handleCook} size="sm" variant="primary" icon={<ChefHat size={16} color={Colors.white} />} />
                <Button title="Plan" onPress={handleAddToMealPlan} size="sm" variant="secondary" icon={<Calendar size={16} color={Colors.primary} />} />
                <Button title="Ask" onPress={() => setActiveTab('chat')} size="sm" variant="secondary" icon={<MessageCircle size={16} color={Colors.primary} />} />
                {(meal as Meal).sourceUrl && (
                  <Button title="Source" onPress={() => Linking.openURL((meal as Meal).sourceUrl!)} size="sm" variant="secondary" icon={<ExternalLink size={16} color={Colors.primary} />} />
                )}
              </View>

              {/* Enhanced Tab Navigation */}
              {/* Removed tab navigation to default to details; chat is opened via the Ask pill */}

              {/* Enhanced Availability Status */}
              {recipeAvailability && (
                <View style={styles.modernAvailabilityContainer}>
                  <View style={styles.availabilityHeader}>
                    <View style={styles.availabilityIconContainer}>
                      {recipeAvailability.availabilityPercentage === 100 ? (
                        <CheckCircle size={24} color={Colors.fresh} />
                      ) : (
                        <AlertTriangle size={24} color={Colors.error} />
                      )}
                    </View>
                    <View style={styles.availabilityTextContainer}>
                      <Text style={styles.modernAvailabilityTitle}>
                        {recipeAvailability.availabilityPercentage === 100
                          ? 'Ready to Cook!'
                          : 'Missing Ingredients'}
                      </Text>
                      <Text style={styles.modernAvailabilitySubtitle}>
                        {recipeAvailability.availabilityPercentage === 100
                          ? 'All ingredients are available'
                          : `${recipeAvailability.missingIngredients.length} ingredients needed`}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.availabilityProgressContainer}>
                    <View style={styles.availabilityProgressBar}>
                      <View
                        style={[styles.availabilityProgress, { width: `${recipeAvailability.availabilityPercentage}%` }]}
                      />
                    </View>
                    <Text style={styles.availabilityPercentageText}>{recipeAvailability.availabilityPercentage}%</Text>
                  </View>
                  {recipeAvailability.availabilityPercentage < 100 && (
                    <View style={{ marginTop: 12 }}>
                      <Button
                        title={`Add ${recipeAvailability.missingIngredients.length} to Shopping List`}
                        onPress={handleAddMissingToList}
                        size="sm"
                        variant="primary"
                        icon={<ShoppingBag size={16} color={Colors.white} />}
                      />
                    </View>
                  )}
                </View>
              )}

              {activeTab === 'details' ? (
                <>
                  {/* Tags removed per request */}

                  {/* Enhanced Ingredients Section */}
                  <View style={styles.modernSection}>
                    <View style={styles.modernSectionHeader}>
                      <ShoppingBag size={24} color={Colors.primary} />
                      <Text style={styles.modernSectionTitle}>Ingredients</Text>
                    </View>
                    <View style={styles.ingredientsContainer}>
                      {ingredients.map((ingredient, index) => {
                        const isMissing = recipeAvailability?.missingIngredients.some(
                          mi => mi.name.toLowerCase() === ingredient.name.toLowerCase()
                        );
                        const isExpiring = recipeAvailability?.expiringIngredients.some(
                          ei => ei.name.toLowerCase() === ingredient.name.toLowerCase()
                        );

                        return (
                          <View key={index} style={styles.rowItem}>
                            <View style={[styles.statusDot, isMissing ? styles.missingDot : isExpiring ? styles.expiringDot : styles.availableDot]} />
                            <Text style={styles.rowText}>
                              <Text style={styles.ingredientQuantity}>{ingredient.quantity} {ingredient.unit}</Text>
                              {' '}
                              <Text style={styles.ingredientName}>{ingredient.name}</Text>
                              {'optional' in ingredient && (ingredient as any).optional && (
                                <Text style={styles.optionalText}> (optional)</Text>
                              )}
                            </Text>
                            <View style={styles.modernIngredientStatus}>
                              {isMissing ? (
                                <View style={styles.statusBadge}><Text style={styles.missingBadgeText}>Missing</Text></View>
                              ) : isExpiring ? (
                                <View style={[styles.statusBadge, styles.expiringBadge]}><Text style={styles.expiringBadgeText}>Expiring</Text></View>
                              ) : (
                                <CheckCircle size={18} color={Colors.fresh} />
                              )}
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  </View>

                  {/* Enhanced Instructions Section */}
                  <View style={styles.modernSection}>
                    <View style={styles.modernSectionHeader}>
                      <ChefHat size={24} color={Colors.primary} />
                      <Text style={styles.modernSectionTitle}>Instructions</Text>
                    </View>
                    <View style={styles.stepsContainer}>
                      {steps.map((step, index) => (
                        <View key={index} style={styles.rowItem}>
                          <View style={styles.stepBadge}><Text style={styles.stepBadgeText}>{index + 1}</Text></View>
                          <Text style={styles.rowText}>{step}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </>
              ) : (
                <>
                  {/* Enhanced Chat Section */}
                  <View style={styles.modernSection}>
                    <View style={styles.modernSectionHeader}>
                      <MessageCircle size={24} color={Colors.primary} />
                      <Text style={styles.modernSectionTitle}>AI Recipe Assistant</Text>
                    </View>
                    <Text style={styles.chatDescription}>
                      Ask me anything about this recipe - substitutions, scaling, cooking tips, or nutritional info!
                    </Text>
                    <View style={styles.modernChipsContainer}>
                      {quickChips.map((chip) => (
                        <TouchableOpacity key={chip} style={styles.modernChip} onPress={() => sendMessage(chip)}>
                          <Text style={styles.modernChipText}>{chip}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <View style={{ marginTop: 12 }}>
                      {messages.map((m) => (
                        <View key={m.id} style={[styles.msg, m.role === 'user' ? styles.msgUser : styles.msgCoach]}>
                          {m.structuredData ? (
                            <StructuredMessage data={m.structuredData} />
                          ) : (
                            !!m.text && <Text style={styles.msgText}>{m.text}</Text>
                          )}
                          {m.role === 'coach' && !!m.source && (
                            <Text style={styles.msgSource}>{m.source === 'ai' ? 'AI' : 'Built-in'}</Text>
                          )}
                          {!!m.actions && (
                            <View style={styles.inlineActions}>
                              {m.actions.map((a, idx) => (
                                <TouchableOpacity key={`${m.id}-act-${idx}`} style={styles.inlineActionBtn} onPress={() => performInlineAction(a)}>
                                  <Text style={styles.inlineActionText}>{a.label}</Text>
                                </TouchableOpacity>
                              ))}
                            </View>
                          )}
                        </View>
                      ))}
                      {isTyping && (
                        <View style={[styles.msg, styles.msgCoach]}>
                          <Text style={styles.typingText}>AI is typing…</Text>
                        </View>
                      )}
                    </View>

                    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                      <View style={styles.modernComposerRow}>
                        <View style={styles.modernInputContainer}>
                          <TextInput
                            placeholder="Ask about substitutions, scaling, or steps…"
                            placeholderTextColor={Colors.lightText}
                            style={styles.modernInput}
                            value={chatInput}
                            onChangeText={setChatInput}
                            onSubmitEditing={(e) => { const v = e.nativeEvent.text.trim(); if (v) { sendMessage(v); setChatInput(''); } }}
                            returnKeyType="send"
                            multiline
                          />
                        </View>
                        <TouchableOpacity
                          style={styles.modernSendBtn}
                          onPress={() => { const v = chatInput.trim(); if (v) { sendMessage(v); setChatInput(''); } }}
                        >
                          <Send size={20} color={Colors.white} />
                        </TouchableOpacity>
                      </View>
                    </KeyboardAvoidingView>
                  </View>
                </>
              )}
            </View>
          </ScrollView>

          {/* Bottom Action Area: show Cook only when all ingredients available */}
          <View style={styles.modernButtonContainer}>
            {'ingredients' in meal && recipeAvailability?.availabilityPercentage === 100 && (
              <TouchableOpacity
                style={styles.modernPrimaryButton}
                onPress={handleCook}
                testID="cook-meal-button"
              >
                <ChefHat size={24} color={Colors.white} />
                <Text style={styles.modernPrimaryButtonText}>Cook This Recipe</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  heroContainer: {
    position: 'relative',
    height: 320,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  
  closeButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    right: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  
  content: {
    padding: 20,
    paddingTop: 24,
  },
  titleContainer: {
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.lightText,
  },
  
  modernSection: {
    marginBottom: 32,
  },
  modernSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  modernSectionTitle: {
    fontSize: 20,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
    marginLeft: 12,
  },
  ingredientsContainer: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modernIngredientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border + '30',
  },
  ingredientContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  ingredientStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  availableDot: {
    backgroundColor: '#4ECDC4',
  },
  missingDot: {
    backgroundColor: '#FF6B6B',
  },
  expiringDot: {
    backgroundColor: '#FFD93D',
  },
  modernIngredientText: {
    fontSize: 16,
    color: Colors.text,
    flex: 1,
  },
  ingredientQuantity: {
    fontWeight: Typography.weights.semibold,
    color: Colors.primary,
  },
  ingredientName: {
    fontWeight: Typography.weights.medium,
  },
  optionalText: {
    fontStyle: 'italic',
    color: Colors.lightText,
  },
  modernIngredientStatus: {
    alignItems: 'center',
  },
  statusBadge: {
    backgroundColor: '#FF6B6B15',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FF6B6B30',
  },
  expiringBadge: {
    backgroundColor: '#FFD93D15',
    borderColor: '#FFD93D30',
  },
  missingBadgeText: {
    fontSize: 10,
    color: '#FF6B6B',
    fontWeight: Typography.weights.semibold,
  },
  expiringBadgeText: {
    fontSize: 10,
    color: '#FFD93D',
    fontWeight: Typography.weights.semibold,
  },
  stepsContainer: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modernStepItem: {
    flexDirection: 'row',
    marginBottom: 20,
    alignItems: 'flex-start',
  },
  modernStepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  stepNumberText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: Typography.weights.semibold,
  },
  modernStepText: {
    fontSize: 16,
    color: Colors.text,
    flex: 1,
    lineHeight: 24,
    fontWeight: Typography.weights.medium,
  },
  modernAvailabilityContainer: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  availabilityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  availabilityIconContainer: {
    marginRight: 16,
  },
  availabilityTextContainer: {
    flex: 1,
  },
  modernAvailabilityTitle: {
    fontSize: 16,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
    marginBottom: 2,
  },
  modernAvailabilitySubtitle: {
    fontSize: 12,
    color: Colors.lightText,
    fontWeight: Typography.weights.medium,
  },
  availabilityProgressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  availabilityProgressBar: {
    flex: 1,
    height: 6,
    backgroundColor: Colors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  availabilityProgress: {
    height: '100%',
    backgroundColor: '#4ECDC4',
    borderRadius: 3,
  },
  availabilityPercentageText: {
    fontSize: 12,
    color: Colors.lightText,
  },
  ingredientStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  expiringText: {
    fontSize: 14,
    color: Colors.aging,
    fontWeight: Typography.weights.medium,
  },
  chatDescription: {
    fontSize: 16,
    color: Colors.lightText,
    marginBottom: 16,
    lineHeight: 22,
  },
  modernChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  modernChip: {
    backgroundColor: Colors.secondary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modernChipText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: Typography.weights.medium,
  },
  modernComposerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
    marginTop: 16,
  },
  modernInputContainer: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  modernInput: {
    fontSize: 16,
    color: Colors.text,
    maxHeight: 100,
  },
  modernSendBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  modernButtonContainer: {
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    backgroundColor: Colors.card,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  modernSecondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 8,
  },
  modernSecondaryButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  modernPrimaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    gap: 12,
  },
  modernPrimaryButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.white,
  },
  
  msg: {
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
    maxWidth: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  msgUser: {
    backgroundColor: Colors.primary,
    alignSelf: 'flex-end',
    borderBottomRightRadius: 8,
  },
  msgCoach: {
    backgroundColor: Colors.card,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: Colors.border,
    borderBottomLeftRadius: 8,
  },
  msgText: {
    color: Colors.text,
    fontSize: 15,
    lineHeight: 22,
  },
  msgSource: {
    marginTop: 8,
    fontSize: 11,
    color: Colors.lightText,
    fontWeight: '500',
  },
  inlineActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  inlineActionBtn: {
    backgroundColor: Colors.secondary,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  inlineActionText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  typingText: {
    color: Colors.lightText,
    fontStyle: 'italic',
    fontSize: 15,
  },
  primaryActions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
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
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
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
  label: {
    color: Colors.text,
    fontWeight: '600',
    fontSize: 13,
  },
});

// Removed custom ActionPill in favor of shared Button component