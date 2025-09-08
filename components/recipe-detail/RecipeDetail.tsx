import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Platform, Alert } from 'react-native';
import { X, Clock, Users, ExternalLink, Share2, BookmarkPlus, Bookmark, Utensils, MessageCircle, Plus } from 'lucide-react-native';
import { Button } from '../ui/Button';
import { IngredientIcon } from '@/components/common/IngredientIcon';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../constants/colors';
import { Spacing, Typography, Radii } from '@/constants/spacing';
import { slugifyIngredient } from '@/utils/ingredientSlug';
import type { CanonicalRecipe, RecipeDetailMode, CanonicalIngredient, Meal, MealType } from '../../types';
import { useInventory } from '@/hooks/useInventoryStore';
import { useShoppingList } from '@/hooks/useShoppingListStore';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { useNutritionWithMealPlan } from '@/hooks/useNutritionWithMealPlan';
import { useMealPlanner } from '@/hooks/useMealPlanner';
import { useMeals } from '@/hooks/useMealsStore';
import { calculateRecipeAvailability } from '@/utils/recipeAvailability';
import { ServingSizeChanger } from './ServingSizeChanger';
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

  const servingsBase = useMemo(() => Math.max(1, servings ?? 1), [servings]);
  const scaleFactor = useMemo(() => (desiredServings / servingsBase), [desiredServings, servingsBase]);

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
    try {
      const availability = calculateRecipeAvailability(mealLike as any, inventory as any);
      setMissingCount(availability.missingIngredients.length);
      setMissingList(availability.missingIngredients.map(mi => ({
        name: mi.name,
        quantity: typeof mi.quantity === 'number' && mi.quantity > 0 ? mi.quantity : 1,
        unit: mi.unit || 'pcs',
      })));
    } catch {}
  }, [mealLike, inventory]);

  // Convert CanonicalRecipe to Meal format for logging
  const convertToMeal = (canonicalRecipe: CanonicalRecipe, servings: number): Meal => {
    return {
      id: canonicalRecipe.id,
      name: canonicalRecipe.title,
      description: canonicalRecipe.description || '',
      image: canonicalRecipe.image,
      tags: canonicalRecipe.tags || [],
      prepTime: canonicalRecipe.prepTimeMinutes || 0,
      cookTime: canonicalRecipe.cookTimeMinutes || 0,
      servings: servings,
      steps: canonicalRecipe.steps || [],
      ingredients: (canonicalRecipe.ingredients || []).map(ing => ({
        name: ing.name,
        quantity: (typeof ing.amount === 'number' ? ing.amount : 1) * (servings / (canonicalRecipe.servings || 1)),
        unit: ing.unit || 'pcs',
        optional: !!ing.optional,
      })),
      nutritionPerServing: canonicalRecipe.nutritionPerServing ? {
        calories: canonicalRecipe.nutritionPerServing.calories || 0,
        protein: canonicalRecipe.nutritionPerServing.protein || 0,
        carbs: canonicalRecipe.nutritionPerServing.carbs || 0,
        fats: canonicalRecipe.nutritionPerServing.fats || 0,
      } : undefined,
      sourceUrl: canonicalRecipe.sourceUrl,
    };
  };

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

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: Spacing.xl }} showsVerticalScrollIndicator={false}>
        {/* Header Image */}
        {hasImage && (
          <View style={styles.imageContainer}>
            <Image source={{ uri: recipe.image }} style={styles.image} />
          </View>
        )}

        {/* Header Title + Close */}
        <View style={[styles.header, !hasImage && styles.headerSafeTop]}>
          <Text style={styles.title}>{recipe.title}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <X size={22} color={Colors.text} />
          </TouchableOpacity>
        </View>

        {/* Meta Row */}
        <View style={styles.metaRow}>
          {typeof time === 'number' && time > 0 && (
            <View style={styles.metaItem}>
              <Clock size={16} color={Colors.primary} />
              <Text style={styles.metaText}>{time} min</Text>
            </View>
          )}
        </View>

        {/* Compact Nutrition Card - Shows recipe nutrition only */}
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

        {/* Enhanced Serving Size Changer */}
        <View style={styles.section}>
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

        {/* Action Bar (mode-aware) */}
        <View style={styles.actionBar}>
          {mode === 'discover' && (
            <>
              <Button
                title={isSaved ? 'Saved' : 'Save'}
                onPress={() => (isSaved ? onRemove?.(recipe) : onSave?.(recipe))}
                size="xs"
                variant={isSaved ? 'primary' : 'primary'}
                icon={isSaved ? <Bookmark size={14} color={Colors.white} /> : <BookmarkPlus size={14} color={Colors.white} />}
              />
              <Button 
                title="Log" 
                onPress={() => setShowMealTypeSelector(true)} 
                size="xs" 
                variant="secondary" 
                icon={<Plus size={14} color={Colors.primary} />} 
              />
              <Button title="Plan" onPress={() => setShowPlanMealModal(true)} size="xs" variant="secondary" />
              {!!missingCount && missingCount > 0 && (
                <Button
                  title={`Add missing (${missingCount})`}
                  onPress={async () => {
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
                  }}
                  size="xs"
                  variant="secondary"
                />
              )}
              <Button
                title="Ask AI"
                onPress={async () => {
                  try { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
                  onAskAI?.(recipe);
                }}
                size="xs"
                variant="secondary"
                icon={<MessageCircle size={14} color={Colors.primary} />}
              />
              <Button title="Share" onPress={() => onShare?.(recipe)} size="xs" variant="secondary" icon={<Share2 size={14} color={Colors.primary} />} />
            </>
          )}
          {mode === 'library' && (
            <>
              <Button 
                title="Log" 
                onPress={() => setShowMealTypeSelector(true)} 
                size="xs" 
                variant="primary" 
                icon={<Plus size={14} color={Colors.white} />} 
              />
              <Button title="Plan" onPress={() => setShowPlanMealModal(true)} size="xs" variant="secondary" />
              {!!missingCount && missingCount > 0 && (
                <Button
                  title={`Add missing (${missingCount})`}
                  onPress={async () => {
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
                  }}
                  size="xs"
                  variant="secondary"
                />
              )}
              <Button title="Ask AI" onPress={() => onAskAI?.(recipe)} size="xs" variant="secondary" icon={<MessageCircle size={14} color={Colors.primary} />} />
              <Button title="Share" onPress={() => onShare?.(recipe)} size="xs" variant="secondary" icon={<Share2 size={14} color={Colors.primary} />} />
            </>
          )}
          {mode === 'ai' && (
            <>
              <Button title="Save" onPress={() => onSave?.(recipe)} size="xs" variant="primary" />
              <Button 
                title="Log" 
                onPress={() => setShowMealTypeSelector(true)} 
                size="xs" 
                variant="secondary" 
                icon={<Plus size={14} color={Colors.primary} />} 
              />
              <Button title="Share" onPress={() => onShare?.(recipe)} size="xs" variant="secondary" icon={<Share2 size={14} color={Colors.primary} />} />
            </>
          )}
        </View>

        {/* Summary */}
        {!!recipe.description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Summary</Text>
            <Text style={styles.bodyText}>{stripHtml(recipe.description)}</Text>
          </View>
        )}

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
                      {scaledIng.isScaled && (
                        <View style={styles.scaledIndicator}>
                          <Text style={styles.scaledIndicatorText}>×</Text>
                        </View>
                      )}
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
            {recipe.steps.map((s: string, i: number) => (
              <View key={`step-${i}`} style={styles.stepRow}>
                <View style={styles.stepBadge}><Text style={styles.stepBadgeText}>{i + 1}</Text></View>
                <Text style={styles.bodyText}>{s}</Text>
              </View>
            ))}
          </View>
        )}
        {/* Source */}
        {!!recipe.sourceUrl && (
          <View style={[styles.section, { paddingTop: 0 }] }>
            <Button
              title="View Source"
              onPress={() => onOpenSource?.(recipe)}
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
          const existing = meals.find(m => m.id === recipe.id);
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
    </View>
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
  imageContainer: { width: '100%', height: 260, marginBottom: Spacing.sm, overflow: 'hidden' },
  image: { width: '100%', height: '100%', resizeMode: 'cover' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  headerSafeTop: { paddingTop: Platform.OS === 'ios' ? 44 : Spacing.lg },
  title: { flex: 1, fontSize: Typography.h2.fontSize, fontWeight: Typography.h2.fontWeight, color: Colors.text, marginRight: Spacing.lg },
  closeBtn: { padding: Spacing.xs },
  metaRow: { flexDirection: 'row', gap: Spacing.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm },
  metaItem: { alignItems: 'center' },
  metaText: { fontSize: Typography.caption.fontSize, color: Colors.text, marginTop: 4 },
  actionBar: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.xs },
  section: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.xl },
  sectionTitle: { fontSize: Typography.h2.fontSize, fontWeight: Typography.h2.fontWeight, color: Colors.text, marginBottom: Spacing.sm },
  bodyText: { fontSize: Typography.body.fontSize, lineHeight: Typography.body.lineHeight, color: Colors.lightText },
  row: { backgroundColor: Colors.surfaceTile, borderWidth: 1, borderColor: Colors.border, borderRadius: Radii.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, marginBottom: Spacing.sm },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md, marginBottom: Spacing.sm },
  stepBadge: { width: 22, height: 22, borderRadius: 11, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  stepBadgeText: { color: Colors.white, fontSize: 12, fontWeight: '600' },
  nutritionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  nutritionItem: { backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md, borderRadius: Radii.md, minWidth: 140, alignItems: 'center' },
  nutritionLabel: { fontSize: Typography.caption.fontSize, color: Colors.lightText, marginBottom: Spacing.xs },
  nutritionValue: { fontSize: 16, fontWeight: '600', color: Colors.text },
  // Macro line items (used by MacroItem component)
  macroItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginRight: Spacing.md, marginBottom: Spacing.xs },
  macroDot: { width: 8, height: 8, borderRadius: 4, marginRight: 4 },
  macroLabel: { fontSize: Typography.caption.fontSize, color: Colors.lightText },
  macroValue: { fontSize: Typography.caption.fontSize, fontWeight: '600', color: Colors.text },
  // Servings selector styles
  servingsHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  servingsRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  servingsBtnSm: { width: 32, height: 32, borderRadius: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border },
  servingsBtnText: { fontSize: 16, color: Colors.text },
  servingsValueSm: { fontSize: 15, fontWeight: '700', color: Colors.text, minWidth: 22, textAlign: 'center' },
  servingsInlineLabel: { fontSize: Typography.caption.fontSize, color: Colors.lightText, marginLeft: Spacing.xs },
  servingsNote: { marginTop: Spacing.xs, fontSize: Typography.caption.fontSize, color: Colors.lightText },
  perServingHint: { marginTop: Spacing.xs, fontSize: Typography.caption.fontSize, color: Colors.lightText },
  caloriesBadge: { backgroundColor: Colors.surfaceTile, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: 9999 },
  caloriesBadgeText: { fontSize: Typography.caption.fontSize, fontWeight: '600', color: Colors.text },
  // Compact Nutrition Styles
  nutritionSection: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.md },
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
    fontSize: Typography.caption.fontSize,
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
    fontWeight: Typography.weights.medium,
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
    fontWeight: Typography.weights.bold,
  },
});

export default RecipeDetail;
