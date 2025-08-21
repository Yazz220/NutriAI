import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Platform, Alert } from 'react-native';
import { X, Clock, Users, ExternalLink, Share2, BookmarkPlus, Bookmark, Utensils, MessageCircle } from 'lucide-react-native';
import Svg, { Circle } from 'react-native-svg';
import { Button } from '../ui/Button';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../constants/colors';
import type { CanonicalRecipe, RecipeDetailMode, CanonicalIngredient } from '../../types';
import { useInventory } from '@/hooks/useInventoryStore';
import { useShoppingList } from '@/hooks/useShoppingListStore';
import { calculateRecipeAvailability } from '@/utils/recipeAvailability';

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
  onCook?: (r: CanonicalRecipe) => void;
  isSaved?: boolean;
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
  onCook,
  isSaved,
}) => {
  const servings = recipe.servings;
  const [desiredServings, setDesiredServings] = useState<number>(Math.max(1, servings ?? 1));
  const time = recipe.totalTimeMinutes ?? ((recipe.prepTimeMinutes ?? 0) + (recipe.cookTimeMinutes ?? 0));

  const hasImage = !!recipe.image;

  // Inventory + shopping list integration for missing ingredients
  const { inventory } = useInventory();
  const { addItem } = useShoppingList();
  const [missingCount, setMissingCount] = useState(0);
  const [missingList, setMissingList] = useState<Array<{ name: string; quantity: number; unit: string }>>([]);

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
    ingredients: (recipe.ingredients ?? []).map(ing => ({
      name: ing.name,
      quantity: (typeof ing.amount === 'number' ? ing.amount : 1) as number,
      unit: ing.unit ?? 'pcs',
      optional: !!ing.optional,
    })),
  }), [recipe, desiredServings]);

  const servingsBase = useMemo(() => Math.max(1, servings ?? 1), [servings]);
  const scaleFactor = useMemo(() => (desiredServings / servingsBase), [desiredServings, servingsBase]);

  const nutritionForSelection = useMemo(() => {
    const per = recipe.nutritionPerServing;
    if (!per) return undefined;
    return {
      calories: typeof per.calories === 'number' ? per.calories * desiredServings : undefined,
      protein: typeof per.protein === 'number' ? per.protein * desiredServings : undefined,
      carbs: typeof per.carbs === 'number' ? per.carbs * desiredServings : undefined,
      fats: typeof per.fats === 'number' ? per.fats * desiredServings : undefined,
    } as typeof recipe.nutritionPerServing;
  }, [recipe.nutritionPerServing, desiredServings]);

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

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
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
          {typeof servingsBase === 'number' && servingsBase > 0 && (
            <View style={styles.metaItem}>
              <Users size={16} color={Colors.primary} />
              <Text style={styles.metaText}>{servingsBase} base servings</Text>
            </View>
          )}
        </View>

        {/* Enhanced Nutrition Section - Prominently displayed after header */}
        {!!recipe.nutritionPerServing && (
          <View style={styles.enhancedNutritionSection}>
            <Text style={styles.sectionTitle}>Nutrition Facts</Text>
            <View style={styles.nutritionOverview}>
              <View style={styles.caloriesCard}>
                <Text style={styles.caloriesLabel}>Calories</Text>
                <Text style={styles.caloriesValue}>
                  {Math.round(nutritionForSelection?.calories || recipe.nutritionPerServing.calories * desiredServings)}
                </Text>
                <Text style={styles.caloriesUnit}>kcal</Text>
              </View>
              <View style={styles.macrosGrid}>
                <MacroItem
                  label="Protein"
                  value={nutritionForSelection?.protein || (recipe.nutritionPerServing.protein || 0) * desiredServings}
                  unit="g"
                  color={Colors.fresh}
                />
                <MacroItem
                  label="Carbs"
                  value={nutritionForSelection?.carbs || (recipe.nutritionPerServing.carbs || 0) * desiredServings}
                  unit="g"
                  color={Colors.info}
                />
                <MacroItem
                  label="Fats"
                  value={nutritionForSelection?.fats || (recipe.nutritionPerServing.fats || 0) * desiredServings}
                  unit="g"
                  color={Colors.warning}
                />
              </View>
            </View>
            <Text style={styles.nutritionNote}>
              Per {desiredServings} serving{desiredServings === 1 ? '' : 's'}
            </Text>
          </View>
        )}

        {/* Servings (compact) + Calories tracker */}
        <View style={[styles.section, { marginBottom: 12 }]}>
          <View style={styles.servingsHeaderRow}>
            <Text style={styles.sectionTitle}>Servings</Text>
            {typeof nutritionForSelection?.calories === 'number' && (
              <View style={styles.caloriesBadge} accessibilityLabel="Calories for selected servings">
                <Text style={styles.caloriesBadgeText}>{Math.round(nutritionForSelection.calories)} kcal</Text>
              </View>
            )}
          </View>
          <View style={styles.servingsRow}>
            <TouchableOpacity
              onPress={() => setDesiredServings((s) => Math.max(1, s - 1))}
              style={styles.servingsBtnSm}
              accessibilityRole="button"
              accessibilityLabel="Decrease servings"
            >
              <Text style={styles.servingsBtnText}>−</Text>
            </TouchableOpacity>
            <Text style={styles.servingsValueSm}>{desiredServings}</Text>
            <TouchableOpacity
              onPress={() => setDesiredServings((s) => Math.min(99, s + 1))}
              style={styles.servingsBtnSm}
              accessibilityRole="button"
              accessibilityLabel="Increase servings"
            >
              <Text style={styles.servingsBtnText}>+</Text>
            </TouchableOpacity>
            <Text style={styles.servingsInlineLabel}>servings</Text>
          </View>
          {!!servings && servings !== desiredServings && (
            <Text style={styles.servingsNote}>Scaled from base {servings} servings</Text>
          )}
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
              <Button title="Plan" onPress={() => onPlan?.(recipe)} size="xs" variant="secondary" />
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
              <Button title="Cook" onPress={() => onCook?.(recipe)} size="xs" variant="primary" icon={<Utensils size={14} color={Colors.white} />} />
              <Button title="Plan" onPress={() => onPlan?.(recipe)} size="xs" variant="secondary" />
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

        {/* Ingredients (scaled) */}
        {!!recipe.ingredients?.length && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ingredients</Text>
            {recipe.ingredients.map((ing: CanonicalIngredient, idx: number) => (
              <View key={`${ing.name}-${idx}`} style={styles.row}>
                <Text style={styles.bodyText}>
                  {formatIngredientScaled(ing, scaleFactor)}
                </Text>
              </View>
            ))}
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

        {/* Nutrition (detailed breakdown - now more concise) */}
        {!!recipe.nutritionPerServing && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Per Serving Breakdown</Text>
            <Text style={styles.perServingHint}>
              {renderInlinePerServing(recipe.nutritionPerServing)}
            </Text>
            <Text style={styles.nutritionNote}>
              * Values scale with servings adjustment above
            </Text>
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
    </View>
  );
};

const stripHtml = (html?: string) => (html ? html.replace(/<[^>]*>/g, '') : '');

const formatIngredient = (ing: CanonicalRecipe['ingredients'][number]) => {
  const parts: (string | number)[] = [];
  if (typeof ing.amount === 'number') parts.push(ing.amount);
  if (ing.unit) parts.push(ing.unit);
  parts.push(ing.name);
  return parts.join(' ');
};

// Format ingredient with scaling applied
const formatIngredientScaled = (ing: CanonicalRecipe['ingredients'][number], scale: number) => {
  const parts: string[] = [];
  if (typeof ing.amount === 'number') {
    const scaled = ing.amount * (Number.isFinite(scale) && scale > 0 ? scale : 1);
    const rounded = Math.abs(scaled - Math.round(scaled)) < 1e-3 ? String(Math.round(scaled)) : String(Number(scaled.toFixed(2)));
    parts.push(rounded);
  }
  if (ing.unit) parts.push(ing.unit);
  parts.push(ing.name);
  return parts.join(' ');
};

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
  imageContainer: { width: '100%', height: 260, marginBottom: 8 },
  image: { width: '100%', height: '100%', resizeMode: 'cover' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  headerSafeTop: { paddingTop: Platform.OS === 'ios' ? 44 : 16 },
  title: { flex: 1, fontSize: 20, fontWeight: '600', color: Colors.text, marginRight: 16 },
  closeBtn: { padding: 4 },
  metaRow: { flexDirection: 'row', gap: 16, paddingHorizontal: 16, paddingVertical: 8 },
  metaItem: { alignItems: 'center' },
  metaText: { fontSize: 12, color: Colors.text, marginTop: 4 },
  actionBar: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 16, paddingVertical: 6 },
  section: { paddingHorizontal: 16, marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: Colors.text, marginBottom: 10 },
  bodyText: { fontSize: 14, lineHeight: 20, color: Colors.lightText },
  row: { backgroundColor: Colors.secondary, borderWidth: 1, borderColor: Colors.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 8 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
  stepBadge: { width: 22, height: 22, borderRadius: 11, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  stepBadgeText: { color: Colors.white, fontSize: 12, fontWeight: '600' },
  nutritionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  nutritionItem: { backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, padding: 12, borderRadius: 8, minWidth: 140, alignItems: 'center' },
  nutritionLabel: { fontSize: 12, color: Colors.lightText, marginBottom: 4 },
  nutritionValue: { fontSize: 16, fontWeight: '600', color: Colors.text },
  // Servings selector styles
  servingsHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  servingsRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  servingsBtnSm: { width: 32, height: 32, borderRadius: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border },
  servingsBtnText: { fontSize: 16, color: Colors.text },
  servingsValueSm: { fontSize: 15, fontWeight: '700', color: Colors.text, minWidth: 22, textAlign: 'center' },
  servingsInlineLabel: { fontSize: 12, color: Colors.lightText, marginLeft: 4 },
  servingsNote: { marginTop: 6, fontSize: 12, color: Colors.lightText },
  perServingHint: { marginTop: 8, fontSize: 12, color: Colors.lightText },
  caloriesBadge: { backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 9999 },
  caloriesBadgeText: { fontSize: 12, fontWeight: '600', color: Colors.text },
  // Enhanced Nutrition Styles
  enhancedNutritionSection: { paddingHorizontal: 16, marginBottom: 20 },
  nutritionOverview: { backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, borderRadius: 16, padding: 16 },
  caloriesCard: { backgroundColor: Colors.primary, borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 16 },
  caloriesLabel: { color: Colors.white, fontSize: 12, fontWeight: '600', marginBottom: 4 },
  caloriesValue: { color: Colors.white, fontSize: 32, fontWeight: '700', marginBottom: 2 },
  caloriesUnit: { color: Colors.white, fontSize: 14, opacity: 0.8 },
  macrosGrid: { flexDirection: 'row', justifyContent: 'space-around' },
  macroItem: { alignItems: 'center', flex: 1 },
  macroDot: { width: 12, height: 12, borderRadius: 6, marginBottom: 6 },
  macroLabel: { color: Colors.lightText, fontSize: 12, fontWeight: '600', marginBottom: 4 },
  macroValue: { color: Colors.text, fontSize: 16, fontWeight: '600' },
  nutritionNote: { textAlign: 'center', fontSize: 12, color: Colors.lightText, marginTop: 8 },
});

export default RecipeDetail;
