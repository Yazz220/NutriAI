import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
import { Plus, Clock, BookOpen } from 'phosphor-react-native';
import { Colors } from '@/constants/colors';
import { Typography as Type } from '@/constants/typography';
import { useMeals } from '@/hooks/useMealsStore';
import { useRecipeFolders } from '@/hooks/useRecipeFoldersStore';
import { ImportRecipeModal } from '@/components/ImportRecipeModal';
import { MealDetailModal } from '@/components/MealDetailModal';
import ScreenHeader from '@/components/ui/ScreenHeader';
import HomeIcon from '@/assets/icons/Dashboard.svg';
import { Meal } from '@/types';
import { ImportedRecipe } from '@/types/importedRecipe';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { meals, addMeal } = useMeals();
  const { folders } = useRecipeFolders();
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null);
  const [showMealDetail, setShowMealDetail] = useState(false);

  // Get recent recipes (last 6 meaningful ones)
  const recentRecipes = useMemo(() => {
    const meaningful = meals.filter(
      (m) => m.name?.trim() && (m.ingredients?.length || m.steps?.length)
    );
    return meaningful.slice(-6).reverse();
  }, [meals]);

  const handleImport = async (recipe: ImportedRecipe) => {
    const meal: Meal = {
      id: recipe.id,
      name: recipe.title,
      description: recipe.description || '',
      image: recipe.image || '',
      ingredients: recipe.ingredients?.map((ing) => ({
        name: ing.name,
        quantity: ing.amount || 0,
        unit: ing.unit || '',
      })) || [],
      steps: recipe.instructions?.map((inst) => inst.text) || [],
      prepTime: recipe.prepTime || 0,
      cookTime: recipe.cookTime || 0,
      servings: recipe.servings || 4,
      tags: recipe.tags || [],
      sourceUrl: recipe.sourceUrl,
    };
    await addMeal(meal);
    setShowImportModal(false);
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <ExpoLinearGradient
        colors={[Colors.background, Colors.background]}
        style={styles.hero}
      >
        <ScreenHeader
          title="RecipeBox"
          icon={
            <View style={{ width: 28, height: 28, alignItems: 'center', justifyContent: 'center', overflow: 'visible' }}>
              <HomeIcon width={38} height={38} color={Colors.text} />
            </View>
          }
          includeStatusBarSpacer
          containerStyle={{ paddingBottom: 0, paddingHorizontal: 20 }}
        />
      </ExpoLinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: (insets?.bottom ?? 0) + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Quick Import CTA */}
        <TouchableOpacity
          style={styles.importCta}
          onPress={() => setShowImportModal(true)}
          activeOpacity={0.85}
        >
          <ExpoLinearGradient
            colors={[Colors.primary, Colors.primaryDark ?? Colors.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.importCtaGradient}
          >
            <View style={styles.importCtaContent}>
              <View style={styles.importCtaIcon}>
                <Plus size={28} color={Colors.white} weight="bold" />
              </View>
              <View style={styles.importCtaText}>
                <Text style={styles.importCtaTitle}>Import a Recipe</Text>
                <Text style={styles.importCtaSubtitle}>
                  From TikTok, Instagram, YouTube, or any website
                </Text>
              </View>
            </View>
          </ExpoLinearGradient>
        </TouchableOpacity>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{meals.filter((m) => m.name?.trim() && (m.ingredients?.length || m.steps?.length)).length}</Text>
            <Text style={styles.statLabel}>Saved Recipes</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{folders.length}</Text>
            <Text style={styles.statLabel}>Collections</Text>
          </View>
        </View>

        {/* Recent Recipes */}
        {recentRecipes.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Recipes</Text>
            {recentRecipes.map((recipe) => (
              <TouchableOpacity
                key={recipe.id}
                style={styles.recipeRow}
                onPress={() => {
                  setSelectedMeal(recipe);
                  setShowMealDetail(true);
                }}
                activeOpacity={0.75}
              >
                {recipe.image ? (
                  <Image source={{ uri: recipe.image }} style={styles.recipeThumb} />
                ) : (
                  <View style={[styles.recipeThumb, styles.recipeThumbPlaceholder]}>
                    <BookOpen size={24} color={Colors.lightText} />
                  </View>
                )}
                <View style={styles.recipeRowInfo}>
                  <Text style={styles.recipeRowTitle} numberOfLines={1}>
                    {recipe.name}
                  </Text>
                  <View style={styles.recipeRowMeta}>
                    {(recipe.cookTime || recipe.prepTime) ? (
                      <View style={styles.metaItem}>
                        <Clock size={13} color={Colors.lightText} />
                        <Text style={styles.metaText}>
                          {(recipe.cookTime || 0) + (recipe.prepTime || 0)}m
                        </Text>
                      </View>
                    ) : null}
                    {recipe.servings ? (
                      <Text style={styles.metaText}>{recipe.servings} servings</Text>
                    ) : null}
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Empty state */}
        {recentRecipes.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No recipes yet</Text>
            <Text style={styles.emptySubtitle}>
              Import your first recipe from social media or any cooking website to get started.
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => setShowImportModal(true)}
            >
              <Plus size={16} color={Colors.white} />
              <Text style={styles.emptyButtonText}>Import Recipe</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <ImportRecipeModal
        visible={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={handleImport}
      />

      <MealDetailModal
        visible={showMealDetail}
        meal={selectedMeal as any}
        onClose={() => setShowMealDetail(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  hero: {
    paddingBottom: 8,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  importCta: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
  importCtaGradient: {
    padding: 20,
  },
  importCtaContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  importCtaIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  importCtaText: {
    flex: 1,
  },
  importCtaTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.white,
    marginBottom: 4,
  },
  importCtaSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 18,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  statLabel: {
    ...Type.caption,
    color: Colors.lightText,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    ...Type.h3,
    fontSize: 18,
    color: Colors.text,
    marginBottom: 12,
  },
  recipeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  recipeThumb: {
    width: 60,
    height: 60,
    borderRadius: 10,
    marginRight: 12,
  },
  recipeThumbPlaceholder: {
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recipeRowInfo: {
    flex: 1,
  },
  recipeRowTitle: {
    ...Type.body,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  recipeRowMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    ...Type.caption,
    color: Colors.lightText,
  },
  emptyState: {
    marginTop: 40,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  emptyTitle: {
    ...Type.h3,
    fontSize: 20,
    color: Colors.text,
    marginBottom: 10,
    textAlign: 'center',
  },
  emptySubtitle: {
    ...Type.body,
    color: Colors.lightText,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 14,
    gap: 8,
  },
  emptyButtonText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '600',
  },
});
