import React, { useEffect, useMemo, useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Platform, Alert, Share as RNShare, Animated, Dimensions } from 'react-native';
import { ChevronLeft, Clock, Users, ExternalLink, Share2, BookmarkPlus, Bookmark, Utensils, MessageCircle, Plus } from 'lucide-react-native';
import { Button } from '../ui/Button';
import { IngredientIcon } from '@/components/common/IngredientIcon';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../constants/colors';
import { Spacing, Typography as LegacyType, Radii } from '@/constants/spacing';
import { Typography as Type } from '@/constants/typography';
import { slugifyIngredient } from '@/utils/ingredientSlug';
import type { CanonicalRecipe, RecipeDetailMode, CanonicalIngredient, Meal, MealType, InventoryItem } from '../../types';
// Local fallback conversion to Meal shape; if a shared utility exists, replace this with an import
const convertToMeal = (r: CanonicalRecipe, servings: number): Omit<Meal, 'id'> & { id: string } => ({
  id: r.id,
  name: r.title,
  description: r.description || '',
  ingredients: (r.ingredients || []).map((ing: any) => ({
    name: ing.name,
    quantity: typeof ing.amount === 'number' ? ing.amount : 1,
    unit: ing.unit || 'pcs',
  })),
  steps: r.steps || [],
  image: r.image,
  tags: r.tags || [],
  prepTime: r.prepTimeMinutes || 0,
  cookTime: r.cookTimeMinutes || 0,
  servings: servings,
  sourceUrl: r.sourceUrl,
  nutritionPerServing: r.nutritionPerServing ? {
    calories: r.nutritionPerServing.calories || 0,
    protein: r.nutritionPerServing.protein || 0,
    carbs: r.nutritionPerServing.carbs || 0,
    fats: r.nutritionPerServing.fats || 0,
  } : undefined,
});
import { useInventory } from '@/hooks/useInventoryStore';
import { useShoppingList } from '@/hooks/useShoppingListStore';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { useNutritionWithMealPlan } from '@/hooks/useNutritionWithMealPlan';
import { useMealPlanner } from '@/hooks/useMealPlanner';
import { useMeals } from '@/hooks/useMealsStore';
import { calculateRecipeAvailability } from '@/utils/recipeAvailability';
import { ServingSizeChanger } from './ServingSizeChanger';
import { RecipeChatModal } from '@/components/recipe-detail/RecipeChatModal';
import { MealTypeSelector } from './MealTypeSelector';
import { RecipeNutritionCard } from './RecipeNutritionCard';
import { PlanMealModal } from './PlanMealModal';
import { scaleIngredients, formatIngredientDisplay, scaleNutrition } from '@/utils/ingredientScaling';

export interface RecipeDetailProps {
  visible?: boolean; // parent (modal) controls visibility; present for parity
  onClose: () => void;
  recipe: CanonicalRecipe;
  mode: RecipeDetailMode;
  // Optional action callbacks provided by parent containers
  onSave?: (r: CanonicalRecipe) => Promise<void> | void;
  onRemove?: (r: CanonicalRecipe) => Promise<void> | void;
  onPlan?: (r: CanonicalRecipe) => Promise<void> | void;
  onShare?: (r: CanonicalRecipe) => Promise<void> | void;
  onOpenSource?: (r: CanonicalRecipe) => Promise<void> | void;
  onAskAI?: (r: CanonicalRecipe) => void; // let parent switch to AI tab if desired
  onLog?: (r: CanonicalRecipe, mealType: MealType, servings: number) => void; // Changed from onCook to onLog
  isSaved?: boolean;
  selectedDate?: string; // Optional date to log meals to (defaults to today)
}

export const RecipeDetail: React.FC<RecipeDetailProps> = ({
  visible,
  onClose,
  recipe,
  mode,
  onSave,
  onRemove,
  onPlan,
  onShare,
  onOpenSource,
  onAskAI,
  onLog,
  isSaved,
  selectedDate,
}) => {
  const servings = recipe.servings;
  const [desiredServings, setDesiredServings] = useState<number>(Math.max(1, servings ?? 1));
  const time = recipe.totalTimeMinutes ?? ((recipe.prepTimeMinutes ?? 0) + (recipe.cookTimeMinutes ?? 0));

  const hasImage = !!recipe.image;
  const imageAnim = useRef(new Animated.Value(0));
  const translateAnim = useRef(new Animated.Value(0));

  // Inventory + shopping list integration for missing ingredients
  const { inventory } = useInventory();
  const { addItem } = useShoppingList();
  const { preferences } = useUserPreferences();
  const { logMealFromRecipe } = useNutritionWithMealPlan();
  const { addPlannedMeal } = useMealPlanner();
  const { meals, addMeal } = useMeals();
  const [missingCount, setMissingCount] = useState(0);
  const [missingList, setMissingList] = useState<Array<{ name: string; quantity: number; unit: string }>>([]);
  const [showMealTypeSelector, setShowMealTypeSelector] = useState(false);
  const [showPlanMealModal, setShowPlanMealModal] = useState(false);
  const [missingIngredientsAdded, setMissingIngredientsAdded] = useState(false);
  const [showAiChat, setShowAiChat] = useState(false);
  const [summaryExpanded, setSummaryExpanded] = useState(false);

  const servingsBase = useMemo(() => Math.max(1, servings ?? 1), [servings]);
  const scaleFactor = useMemo(() => (desiredServings / servingsBase), [desiredServings, servingsBase]);

  // Reset desired servings when recipe changes so we start from the recipe's base
  useEffect(() => {
    setDesiredServings(Math.max(1, servings ?? 1));
    setSummaryExpanded(false);
  }, [recipe?.id, servings]);

  // Scale ingredients using the smart scaling utility
  const scaledIngredients = useMemo(() => {
    return scaleIngredients(recipe.ingredients ?? [], scaleFactor);
  }, [recipe.ingredients, scaleFactor]);

  // Scale nutrition information
  const scaledNutrition = useMemo(() => {
    return scaleNutrition(recipe.nutritionPerServing, desiredServings);
  }, [recipe.nutritionPerServing, desiredServings]);

  const mealLike = useMemo(() => ({
    id: recipe.id,
    name: recipe.title,
    description: recipe.description ?? '',
    image: recipe.image,
    tags: recipe.tags ?? [],
    prepTime: recipe.prepTimeMinutes ?? 0,
    cookTime: recipe.cookTimeMinutes ?? 0,
    servings: desiredServings,
    steps: recipe.steps ?? [],
    ingredients: scaledIngredients.map(ing => ({
      name: ing.name,
      quantity: ing.scaledAmount ?? (typeof ing.amount === 'number' ? ing.amount : 1),
      unit: ing.unit ?? 'pcs',
      optional: !!ing.optional,
    })),
  }), [recipe, desiredServings, scaledIngredients]);

  // Legacy nutrition for backward compatibility
  const nutritionForSelection = scaledNutrition;

  useEffect(() => {
    // Animate header image from bottom into place when present and visible.
    const shouldAnimate = typeof visible === 'undefined' ? true : !!visible;
    if (hasImage && shouldAnimate) {
      imageAnim.current.setValue(0);
      Animated.timing(imageAnim.current, { toValue: 1, duration: 420, useNativeDriver: true }).start();
    } else if (!hasImage) {
      imageAnim.current.setValue(0);
    }
    // Reset translate animation when opening
    const shouldResetTranslate = typeof visible === 'undefined' ? true : !!visible;
    if (shouldResetTranslate) {
      translateAnim.current.setValue(0);
    }
  }, [hasImage, visible, recipe?.id]);


  const handleLogMeal = async (mealType: MealType, logDate?: string) => {
    try {
      // Convert recipe to meal format
      const meal = convertToMeal(recipe, desiredServings);
      
      // Log the meal for the selected date (priority: logDate > selectedDate > today)
      const targetDate = logDate || selectedDate || new Date().toISOString().split('T')[0];
      const loggedId = logMealFromRecipe(meal, targetDate, mealType, desiredServings);
      
      // Haptic feedback
      if (Platform.OS === 'ios') {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      
      // Show success message with nutrition info
      const totalCalories = scaledNutrition?.calories || 0;
      const totalProtein = scaledNutrition?.protein || 0;
      
      Alert.alert(
        'Meal Logged Successfully! 🎉',
        `${recipe.title} (${desiredServings} servings) has been added to your ${mealType} for today.\n\nCalories: ${totalCalories}\nProtein: ${totalProtein}g\n\nCheck your Coach dashboard to see your updated progress!`,
        [
          {
            text: 'View Progress',
            onPress: () => {
              // Close the recipe detail to go back to main app
              onClose();
            },
          },
          { text: 'OK' },
        ]
      );
      
      // Call parent callback if provided
      onLog?.(recipe, mealType, desiredServings);
      
    } catch (error) {
      console.error('Error logging meal:', error);
      Alert.alert(
        'Error Logging Meal',
        'There was an issue logging your meal. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleShare = async () => {
    try {
      // Prefer parent-provided handler if available
      if (onShare) {
        await onShare(recipe);
        return;
      }

      // Fallback: use native share
      const ingredientsText = (recipe.ingredients || []).map((i: any) => `- ${i.name}${i.amount ? ` (${i.amount}${i.unit ? ` ${i.unit}` : ''})` : ''}`).join('\n');
      const textParts = [recipe.title, stripHtml(recipe.description), '', 'Ingredients:', ingredientsText];
      if (recipe.sourceUrl) textParts.push('', `Source: ${recipe.sourceUrl}`);
      const message = textParts.filter(Boolean).join('\n');

      await RNShare.share({ message, title: recipe.title, url: recipe.sourceUrl });
    } catch (err) {
      console.warn('Share failed', err);
      Alert.alert('Share failed', 'Unable to share this recipe.');
    }
  };

  const handleClose = () => {
    try {
      const { width } = Dimensions.get('window');
      Animated.timing(translateAnim.current, { toValue: width, duration: 240, useNativeDriver: true }).start(() => {
        onClose();
      });
    } catch (e) {
      // Fallback to immediate close
      onClose();
    }
  };

  return (
    <Animated.View style={[styles.container, { transform: [{ translateX: translateAnim.current }] }] as any}>
      <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: Spacing.xl }} showsVerticalScrollIndicator={false}>
        {/* Header Image */}
        {hasImage && (
          <View style={styles.imageContainer} pointerEvents="none">
            <Animated.Image
              source={{ uri: recipe.image }}
              style={[
                styles.image,
                {
                  opacity: imageAnim.current,
                  transform: [
                    {
                      translateY: imageAnim.current.interpolate({ inputRange: [0, 1], outputRange: [28, 0] }),
                    },
                  ],
                },
              ]}
            />
          </View>
        )}

        {/* Header with left back button */}
        <View style={[styles.header, !hasImage && styles.headerSafeTop]}>
          <TouchableOpacity onPress={onClose} style={styles.backBtn} accessibilityLabel="Back">
            <ChevronLeft size={22} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.title} numberOfLines={2}>{recipe.title}</Text>
        </View>

        {/* Meta Row with time (left) and servings control (right) */}
        <View style={styles.metaRow}>
          <View style={{ flexDirection: 'row', gap: Spacing.md }}>
            {typeof time === 'number' && time > 0 && (
              <View style={styles.metaItem}>
                <Clock size={16} color={Colors.primary} />
                <Text style={styles.metaText}>{time} min</Text>
              </View>
            )}
          </View>
          <View style={styles.metaRight}>
            <ServingSizeChanger
              originalServings={servingsBase}
              currentServings={desiredServings}
              onServingsChange={setDesiredServings}
              minServings={0.5}
              maxServings={20}
              allowFractions={true}
              showNutritionPreview={true}
              caloriesPerServing={recipe.nutritionPerServing?.calories}
            />
          </View>
        </View>

        {/* Compact Nutrition Card - now sits below meta row */}
        {!!recipe.nutritionPerServing && (
          <View style={styles.nutritionSection}>
            <RecipeNutritionCard
              calories={scaledNutrition?.calories || 0}
              protein={scaledNutrition?.protein || 0}
              carbs={scaledNutrition?.carbs || 0}
              fats={scaledNutrition?.fats || 0}
              servings={desiredServings}
            />
          </View>
        )}

        {/* Servings control moved above nutrition card (top-right overlay). */}

        {/* Action Bar (mode-aware) */}
        <View style={styles.actionBar}>
          {mode === 'discover' && (
            <>
              <Button
                title={isSaved ? 'Saved' : 'Save'}
                onPress={() => (isSaved ? onRemove?.(recipe) : onSave?.(recipe))}
                size="xs"
                variant={isSaved ? 'primary' : 'primary'}
                shape="capsule"
                icon={isSaved ? <Bookmark size={14} color={Colors.white} /> : <BookmarkPlus size={14} color={Colors.white} />}
              />
              <Button
                title="Log"
                onPress={() => setShowMealTypeSelector(true)}
                size="xs"
                variant="secondary"
                shape="capsule"
                icon={<Plus size={14} color={Colors.primary} />}
              />
              <Button title="Plan" onPress={() => setShowPlanMealModal(true)} size="xs" variant="secondary" shape="capsule" />

              {!!missingCount && missingCount > 0 && (
                <Button
                  title={missingIngredientsAdded ? 'Added' : `Add missing (${missingCount})`}
                  onPress={async () => {
                    if (missingIngredientsAdded) return;
                    try { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
                    let added = 0;
                    for (const m of missingList) {
                      await addItem({
                        name: m.name,
                        quantity: m.quantity,
                        unit: m.unit,
                        category: 'Other',
                        addedDate: new Date().toISOString(),
                        checked: false,
                        addedBy: 'meal',
                        mealId: recipe.id,
                      });
                      added++;
                    }
                    Alert.alert('Added to Shopping List', `${added} missing ingredient${added === 1 ? '' : 's'} were added.`);
                    setMissingIngredientsAdded(true);
                  }}
                  size="xs"
                  variant={missingIngredientsAdded ? 'primary' : 'secondary'}
                  shape="capsule"
                  disabled={missingIngredientsAdded}
                />
              )}

              <Button
                title="Ask AI"
                onPress={async () => {
                  try { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
                  // Open contextual AI chat modal (ChatModal will seed context)
                  setShowAiChat(true);
                }}
                size="xs"
                variant="secondary"
                shape="capsule"
                icon={<MessageCircle size={14} color={Colors.primary} />}
              />
              <Button title="Share" onPress={() => handleShare()} size="xs" variant="secondary" shape="capsule" icon={<Share2 size={14} color={Colors.primary} />} />
            </>
          )}

          {mode === 'library' && (
            <>
              <Button
                title="Log"
                onPress={() => setShowMealTypeSelector(true)}
                size="xs"
                variant="primary"
                shape="capsule"
                icon={<Plus size={14} color={Colors.white} />}
              />
              <Button title="Plan" onPress={() => setShowPlanMealModal(true)} size="xs" variant="secondary" shape="capsule" />

              {!!missingCount && missingCount > 0 && (
                <Button
                  title={missingIngredientsAdded ? 'Added' : `Add missing (${missingCount})`}
                  onPress={async () => {
                    if (missingIngredientsAdded) return;
                    try { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
                    let added = 0;
                    for (const m of missingList) {
                      await addItem({
                        name: m.name,
                        quantity: m.quantity,
                        unit: m.unit,
                        category: 'Other',
                        addedDate: new Date().toISOString(),
                        checked: false,
                        addedBy: 'meal',
                        mealId: recipe.id,
                      });
                      added++;
                    }
                    Alert.alert('Added to Shopping List', `${added} missing ingredient${added === 1 ? '' : 's'} were added.`);
                    setMissingIngredientsAdded(true);
                  }}
                  size="xs"
                  variant={missingIngredientsAdded ? 'primary' : 'secondary'}
                  disabled={missingIngredientsAdded}
                />
              )}

              <Button title="Ask AI" onPress={() => setShowAiChat(true)} size="xs" variant="secondary" shape="capsule" icon={<MessageCircle size={14} color={Colors.primary} />} />
              <Button title="Share" onPress={() => handleShare()} size="xs" variant="secondary" shape="capsule" icon={<Share2 size={14} color={Colors.primary} />} />
            </>
          )}

          {mode === 'ai' && (
            <>
              <Button title="Save" onPress={() => onSave?.(recipe)} size="xs" variant="primary" shape="capsule" />
              <Button
                title="Log"
                onPress={() => setShowMealTypeSelector(true)}
                size="xs"
                variant="secondary"
                shape="capsule"
                icon={<Plus size={14} color={Colors.primary} />}
              />
              <Button title="Share" onPress={() => handleShare()} size="xs" variant="secondary" shape="capsule" icon={<Share2 size={14} color={Colors.primary} />} />
            </>
          )}
        </View>

    {/* Summary (collapsed if long, hidden if instruction-like)
      We avoid duplicating instructions here. If the description looks like steps (bullets/numbering),
      we hide the Summary section entirely; otherwise clamp with Read more/less for long blurbs. */}
        {(() => {
          const desc = recipe.description ? stripHtml(recipe.description) : '';
          const isStepish = /(^\s*\d+\.|^\s*\d+\)|^\s*[-•*]\s+|^\s*step\s*\d+)/i.test(desc);
          if (!desc || isStepish) return null;
          const limit = 220;
          const needsClamp = desc.length > limit;
          const shown = summaryExpanded || !needsClamp ? desc : (desc.slice(0, limit) + '…');
          return (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Summary</Text>
              <Text style={styles.bodyText}>{shown}</Text>
              {needsClamp && (
                <TouchableOpacity onPress={() => setSummaryExpanded(e => !e)} style={{ marginTop: 6 }}>
                  <Text style={[styles.bodyText, { color: Colors.primary, fontWeight: '600' }]}>
                    {summaryExpanded ? 'Show less' : 'Read more'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })()}

        {/* Ingredients (intelligently scaled) */}
        {!!scaledIngredients?.length && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ingredients</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.ingredientsGrid}>
              {scaledIngredients.map((scaledIng, idx: number) => {
                const isMissing = missingList.some(item => item.name === scaledIng.name);
                return (
                  <View key={`${scaledIng.name}-${idx}`} style={styles.ingredientCard}>
                    <View style={styles.ingredientImageContainer}>
                      <IngredientIcon slug={slugifyIngredient(scaledIng.name)} displayName={scaledIng.name} size={56} />
                      {isMissing && <View style={styles.missingIndicator} />}
                    </View>
                    <Text style={styles.ingredientName}>{scaledIng.name}</Text>
                    <Text style={[
                      styles.ingredientQuantity,
                      scaledIng.isScaled && styles.ingredientQuantityScaled
                    ]}>
                      {formatIngredientDisplay(scaledIng)}
                    </Text>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Steps */}
        {!!recipe.steps?.length && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Instructions</Text>
            <View style={styles.stepsContainer}>
              {recipe.steps.map((s: string, i: number) => (
                <React.Fragment key={`step-${i}`}>
                  <View style={styles.stepItem}>
                    <View style={styles.stepLeft}>
                      <View style={styles.stepBullet} />
                      {i < recipe.steps.length - 1 && <View style={styles.stepConnector} />}
                    </View>
                    <View style={styles.stepRight}>
                      <Text style={styles.stepBody}>{s}</Text>
                    </View>
                  </View>
                </React.Fragment>
              ))}
            </View>
          </View>
        )}
        {/* Source */}
        {!!recipe.sourceUrl && (
          <View style={[styles.section, { paddingTop: 0 }] }>
            <Button
              title="View Source"
              onPress={() => onOpenSource?.(recipe)}
              shape="capsule"
              icon={<ExternalLink size={16} color={Colors.white} />}
            />
          </View>
        )}
      </ScrollView>

      {/* Meal Type Selector Modal */}
      <MealTypeSelector
        visible={showMealTypeSelector}
        onClose={() => setShowMealTypeSelector(false)}
        onConfirm={handleLogMeal}
        recipeName={recipe.title}
        servings={desiredServings}
        calories={scaledNutrition?.calories}
        defaultDate={selectedDate}
      />

      <PlanMealModal
        visible={showPlanMealModal}
        onClose={() => setShowPlanMealModal(false)}
        onConfirm={(mealType, date) => {
          // Ensure the recipe exists in the local meals store so tracker can resolve it
          let localMealId = recipe.id;
          const existing = meals.find((m: Meal) => m.id === recipe.id);
          if (!existing) {
            const asMeal = convertToMeal(recipe, desiredServings);
            // Convert to Omit<Meal,'id'> for store add
            const { id: _omit, ...rest } = asMeal as Meal;
            localMealId = addMeal(rest);
          }

          addPlannedMeal({
            recipeId: localMealId,
            date,
            mealType,
            servings: desiredServings,
            isCompleted: false,
          });
          setShowPlanMealModal(false);
          Alert.alert('Meal Planned', `${recipe.title} has been added to your meal plan.`);
        }}
        recipeName={recipe.title}
        servings={desiredServings}
        defaultDate={selectedDate}
      />
      {/* Recipe Chat Modal (contextual) */}
      <RecipeChatModal visible={showAiChat} onClose={() => setShowAiChat(false)} recipe={mealLike as any} />
    </Animated.View>
  );
};

const stripHtml = (html?: string) => (html ? html.replace(/<[^>]*>/g, '') : '');



const renderInlinePerServing = (per?: CanonicalRecipe['nutritionPerServing']) => {
  if (!per) return '—';
  const fmt = (n?: number, unit = '') => (typeof n === 'number' ? `${Math.round(n)}${unit}` : '—');
  return `${fmt(per.calories, ' kcal')} • ${fmt(per.protein, 'g P')} • ${fmt(per.carbs, 'g C')} • ${fmt(per.fats, 'g F')}`;
};

const MacroItem = ({ label, value, unit, color }: { label: string; value?: number; unit: string; color: string }) => {
  if (typeof value !== 'number') return null;

  return (
    <View style={styles.macroItem}>
      <View style={[styles.macroDot, { backgroundColor: color }]} />
      <Text style={styles.macroLabel}>{label}</Text>
      <Text style={styles.macroValue}>{Math.round(value)}{unit}</Text>
    </View>
  );
};

const renderNutrition = (label: string, value?: number, unit?: string) => (
  typeof value === 'number' ? (
    <View style={styles.nutritionItem}>
      <Text style={styles.nutritionLabel}>{label}</Text>
      <Text style={styles.nutritionValue}>{Math.round(value)}{unit ? unit : ''}</Text>
    </View>
  ) : null
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  imageContainer: { width: '100%', height: 320, marginBottom: Spacing.sm, overflow: 'hidden' },
  image: { width: '100%', height: '100%', resizeMode: 'cover' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  backBtn: { padding: Spacing.xs, marginRight: Spacing.sm },
  headerSafeTop: { paddingTop: Platform.OS === 'ios' ? 44 : Spacing.lg },
  title: { flex: 1, ...Type.h2, color: Colors.text, marginRight: Spacing.lg },
  closeBtn: { padding: Spacing.xs },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm },
  metaRight: { alignItems: 'flex-end' },
  metaItem: { alignItems: 'center' },
  metaText: { ...Type.caption, color: Colors.text, marginTop: 4 },
  actionBar: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.xs },
  section: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.xl },
  sectionTitle: { ...Type.h3, color: Colors.text, marginBottom: Spacing.sm },
  bodyText: { ...Type.body, color: Colors.lightText },
  row: { backgroundColor: Colors.surfaceTile, borderWidth: 1, borderColor: Colors.border, borderRadius: Radii.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, marginBottom: Spacing.sm },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md, marginBottom: Spacing.sm },
  // New styles for improved instructions/steps UI
  stepsContainer: { marginTop: Spacing.sm },
  stepItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: Spacing.lg },
  stepLeft: { width: 40, alignItems: 'center' },
  stepConnector: { borderLeftWidth: 2, borderLeftColor: Colors.border, borderStyle: 'dashed', marginTop: 6, opacity: 0.6, height: 48 },
  stepRight: { flex: 1, paddingLeft: Spacing.sm },
  stepTitle: { ...Type.caption, color: Colors.lightText, marginBottom: Spacing.xs },
  stepBody: { ...Type.body, lineHeight: Type.body.lineHeight + 6, color: Colors.lightText },
  stepBullet: { width: 10, height: 10, backgroundColor: Colors.primary, transform: [{ rotate: '45deg' }], borderRadius: 2, marginTop: 4, borderWidth: 1, borderColor: Colors.border },
  nutritionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  nutritionItem: { backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md, borderRadius: Radii.md, minWidth: 140, alignItems: 'center' },
  nutritionLabel: { ...Type.caption, color: Colors.lightText, marginBottom: Spacing.xs },
  nutritionValue: { fontSize: 16, fontWeight: '600', color: Colors.text },
  // Macro line items (used by MacroItem component)
  macroItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginRight: Spacing.md, marginBottom: Spacing.xs },
  macroDot: { width: 8, height: 8, borderRadius: 4, marginRight: 4 },
  macroLabel: { ...Type.caption, color: Colors.lightText },
  macroValue: { ...Type.caption, fontWeight: '600', color: Colors.text },
  // Servings selector styles
  servingsHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  servingsRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  servingsBtnSm: { width: 32, height: 32, borderRadius: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border },
  servingsBtnText: { fontSize: 16, color: Colors.text },
  servingsValueSm: { fontSize: 15, fontWeight: '700', color: Colors.text, minWidth: 22, textAlign: 'center' },
  servingsInlineLabel: { ...Type.caption, color: Colors.lightText, marginLeft: Spacing.xs },
  servingsNote: { marginTop: Spacing.xs, ...Type.caption, color: Colors.lightText },
  perServingHint: { marginTop: Spacing.xs, ...Type.caption, color: Colors.lightText },
  caloriesBadge: { backgroundColor: Colors.surfaceTile, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: 9999 },
  caloriesBadgeText: { ...Type.caption, fontWeight: '600', color: Colors.text },
  // Compact Nutrition Styles
  nutritionSection: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.md },
  // New: wrapper to allow absolute-positioned servings overlay
  nutritionSectionInner: { position: 'relative' },
  // New: servings control positioned top-right above the nutrition card
  servingsOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    zIndex: 2,
  },
  ingredientsGrid: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  ingredientCard: {
    width: 80,
    alignItems: 'center',
  },
  ingredientImageContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: Colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  missingIndicator: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.danger,
    borderWidth: 1,
    borderColor: Colors.white,
  },
  ingredientName: {
    ...Type.caption,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
  },
  ingredientQuantity: {
    fontSize: 10,
    color: Colors.lightText,
    textAlign: 'center',
  },
  ingredientQuantityScaled: {
    color: Colors.primary,
    fontWeight: LegacyType.weights.medium,
  },
  scaledIndicator: {
    position: 'absolute',
    top: -2,
    left: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scaledIndicatorText: {
    color: Colors.white,
    fontSize: 10,
    fontWeight: LegacyType.weights.bold,
  },
});

export default RecipeDetail;
