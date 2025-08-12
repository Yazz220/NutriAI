// Enhanced Recipe Discovery Component
// Provides trending recipes, search, and discovery features

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
  Platform,
} from 'react-native';
import { TrendingUp, Search, Sparkles, Clock, Users, Heart, Star } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { Spacing, Typography } from '@/constants/spacing';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useRecipeStore } from '@/hooks/useRecipeStore';
import { ExternalRecipe } from '@/utils/recipeProvider';
import { RecipeSearch } from './RecipeSearch';

interface EnhancedRecipeDiscoveryProps {
  onRecipePress: (recipe: ExternalRecipe) => void;
  onSaveRecipe: (recipe: ExternalRecipe) => void;
  onSearch: (params: any) => Promise<void>;
}

export const EnhancedRecipeDiscovery: React.FC<EnhancedRecipeDiscoveryProps> = ({
  onRecipePress,
  onSaveRecipe,
  onSearch,
}) => {
  const {
    trendingRecipes,
    externalRecipes,
    isLoading,
    getTrendingRecipes,
    getRandomRecipes,
    getRecipeRecommendations,
    searchResults,
    isSearching,
    error,
    recipeProvider,
  } = useRecipeStore();

  const [showSearch, setShowSearch] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filters, setFilters] = useState<{ 
    query?: string;
    diet?: string;
    cuisine?: string;
    type?: string;
    maxReadyTime?: number;
    maxCalories?: number;
    sort?: 'popularity' | 'healthiness' | 'time' | 'calories';
    sortDirection?: 'asc' | 'desc';
  }>({ sort: 'popularity', sortDirection: 'desc' });

  // Load after provider is initialized
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!recipeProvider) return;
        if (Platform.OS !== 'web') {
          if (trendingRecipes.length === 0) {
            await getTrendingRecipes();
          }
          if (externalRecipes.length === 0) {
            await getRandomRecipes(['main course', 'healthy'], 12, true);
          }
        }
      } catch (e) {
        console.error('[EnhancedDiscovery] Failed to load discovery lists', e);
      }
    })();
    return () => { cancelled = true; };
  }, [recipeProvider, getTrendingRecipes, trendingRecipes.length, externalRecipes.length, getRandomRecipes]);

  // Handle refresh
  const handleRefresh = async () => {
    if (!recipeProvider) return;
    setRefreshing(true);
    try {
      if (Platform.OS !== 'web') {
        await Promise.all([
          getTrendingRecipes(),
          getRandomRecipes(['main course', 'healthy'], 10),
        ]);
      }
    } finally {
      setRefreshing(false);
    }
  };

  // Open search with pre-filled filters
  const openSearchWith = async (params: Partial<typeof filters>) => {
    if (!recipeProvider) return;
    const next = { ...filters, ...params };
    setFilters(next);
    setShowSearch(true);
    await onSearch(next);
  };

  // Handle recipe press
  const handleRecipePress = (recipe: ExternalRecipe) => {
    onRecipePress(recipe);
  };

  // Handle save recipe
  const handleSaveRecipe = (recipe: ExternalRecipe) => {
    onSaveRecipe(recipe);
  };

  const getCalories = (r: ExternalRecipe): number | null => {
    const cal = r.nutrition?.nutrients?.find(n => (n.name?.toLowerCase() === 'calories' || n.name?.toLowerCase() === 'energy') && (n.unit?.toLowerCase() === 'kcal' || n.unit?.toLowerCase() === 'cal'));
    if (!cal) return null;
    // Spoonacular sometimes returns kcal, sometimes cal; normalize to kcal
    return Math.round(cal.unit?.toLowerCase() === 'cal' ? cal.amount / 1000 : cal.amount);
  };

  // Render recipe card (image-first, badges)
  const renderRecipeCard = (recipe: ExternalRecipe, showSaveButton: boolean = true) => (
    <TouchableOpacity
      style={styles.recipeCard}
      onPress={() => handleRecipePress(recipe)}
    >
      <Card style={styles.recipeCardContent}>
        <View style={styles.imageWrapper}>
          {recipe.image ? (
            <Image source={{ uri: recipe.image }} style={styles.image} />
          ) : (
            <View style={styles.recipeImageContainer}>
              <Text style={styles.recipeImagePlaceholder}>
                {recipe.title.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}

          {/* Top-right save button */}
          {showSaveButton && (
            <TouchableOpacity style={styles.fabSave} onPress={() => handleSaveRecipe(recipe)}>
              <Heart size={16} color={Colors.white} />
            </TouchableOpacity>
          )}

          {/* Bottom badges overlay */}
          <View style={styles.badgesRow}>
            <View style={[styles.badge, styles.badgeDark]}>
              <Clock size={12} color={Colors.white} />
              <Text style={styles.badgeText}>{recipe.readyInMinutes || 0}m</Text>
            </View>
            <View style={[styles.badge, styles.badgeDark]}>
              <Users size={12} color={Colors.white} />
              <Text style={styles.badgeText}>{recipe.servings || 1}</Text>
            </View>
            {getCalories(recipe) !== null && (
              <View style={[styles.badge, styles.badgeCal]}>
                <Text style={styles.badgeText}>{getCalories(recipe)} kcal</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.recipeInfo}>
          <Text style={styles.recipeTitle} numberOfLines={2}>
            {recipe.title}
          </Text>
          <View style={styles.recipeTags}>
            {recipe.cuisines?.slice(0, 1).map((c, i) => (
              <View key={i} style={styles.tag}><Text style={styles.tagText}>{c}</Text></View>
            ))}
            {recipe.vegetarian && (
              <View style={[styles.tag, styles.vegetarianTag]}><Text style={styles.tagText}>Veg</Text></View>
            )}
            {recipe.veryHealthy && (
              <View style={[styles.tag, styles.healthyTag]}><Text style={styles.tagText}>Healthy</Text></View>
            )}
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );

  // Show search component if enabled
  if (showSearch) {
    return (
      <View style={styles.container}>
        <View style={styles.searchHeader}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setShowSearch(false)}
          >
            <Text style={styles.backButtonText}>← Back to Discovery</Text>
          </TouchableOpacity>
        </View>
        
        <RecipeSearch
          onSearch={onSearch}
          onRecipePress={handleRecipePress}
          onSaveRecipe={handleSaveRecipe}
          searchResults={searchResults}
          isSearching={isSearching}
          error={error}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Discovery Header */}
      <Card style={styles.discoveryHeader}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Sparkles size={24} color={Colors.primary} />
            <Text style={styles.headerTitle}>Recipe Discovery</Text>
          </View>
          
          <TouchableOpacity
            style={styles.searchButton}
            onPress={() => recipeProvider && setShowSearch(true)}
          >
            <Search size={20} color={Colors.primary} />
          </TouchableOpacity>
        </View>
        
        <Text style={styles.headerDescription}>
          Discover thousands of professional recipes with nutrition data and smart recommendations
        </Text>
        {Platform.OS === 'web' && (
          <Text style={{ color: '#888', marginTop: 4 }}>
            Discovery sections are limited on web due to CORS. Use search or run the app on a device.
          </Text>
        )}

        {/* Filter chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersRow}>
          {[
            { key: 'vegetarian', label: 'Vegetarian', apply: () => ({ diet: 'vegetarian' }) },
            { key: 'vegan', label: 'Vegan', apply: () => ({ diet: 'vegan' }) },
            { key: 'quick', label: 'Quick < 20m', apply: () => ({ maxReadyTime: 20 }) },
            { key: 'lowcal', label: '≤ 400 kcal', apply: () => ({ maxCalories: 400, sort: 'calories' as const, sortDirection: 'asc' as const }) },
            { key: 'italian', label: 'Italian', apply: () => ({ cuisine: 'Italian' }) },
            { key: 'dessert', label: 'Dessert', apply: () => ({ type: 'dessert' }) },
          ].map(chip => (
            <TouchableOpacity
              key={chip.key}
              style={styles.chip}
              onPress={async () => {
                if (!recipeProvider) return;
                const next = { ...filters, ...chip.apply() };
                setFilters(next);
                await onSearch(next);
              }}
            >
              <Text style={styles.chipText}>{chip.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Sorting */}
        <View style={styles.sortRow}>
          {(['popularity','healthiness','time','calories'] as const).map(s => (
            <TouchableOpacity
              key={s}
              style={[styles.sortChip, filters.sort === s && styles.sortChipActive]}
              onPress={async () => {
                if (!recipeProvider) return;
                const next = { ...filters, sort: s };
                setFilters(next);
                await onSearch(next);
              }}
            >
              <Text style={[styles.sortChipText, filters.sort === s && styles.sortChipTextActive]}>{s}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={styles.dirChip}
            onPress={async () => {
              if (!recipeProvider) return;
              const newDir: 'asc' | 'desc' = filters.sortDirection === 'asc' ? 'desc' : 'asc';
              const next = { ...filters, sortDirection: newDir };
              setFilters(next);
              await onSearch(next);
            }}
          >
            <Text style={styles.dirChipText}>{filters.sortDirection === 'asc' ? 'Asc' : 'Desc'}</Text>
          </TouchableOpacity>
        </View>
      </Card>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Popular Categories (horizontal chips) */}
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Popular Categories</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.rowH}
            contentContainerStyle={styles.rowHContent}
          >
            {[
              { label: 'Breakfast', type: 'breakfast' },
              { label: 'Lunch', type: 'lunch' },
              { label: 'Dinner', type: 'dinner' },
              { label: 'Vegan', diet: 'vegan' },
              { label: 'High Protein', type: 'main course', diet: undefined, sort: 'healthiness' as const },
            ].map((c) => (
              <TouchableOpacity key={c.label} style={styles.catChip} onPress={() => openSearchWith({ type: c.type as any, diet: c.diet as any, sort: c.sort })}>
                <Text style={styles.catChipText}>{c.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Card>

        {/* Calorie Counters (grid) */}
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Calorie Counters</Text>
          </View>
          <View style={styles.grid2}>
            {[
              { label: '50–100 kcal', maxCalories: 100 },
              { label: '100–200 kcal', maxCalories: 200 },
              { label: '200–300 kcal', maxCalories: 300 },
              { label: '300–400 kcal', maxCalories: 400 },
              { label: '400–500 kcal', maxCalories: 500 },
              { label: '500–600 kcal', maxCalories: 600 },
            ].map((r) => (
              <TouchableOpacity key={r.label} style={styles.calTile} onPress={() => openSearchWith({ maxCalories: r.maxCalories, sort: 'calories', sortDirection: 'asc' })}>
                <Text style={styles.calTileText}>{r.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* Pick Your Meal (horizontal) */}
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Pick Your Meal</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.rowH} contentContainerStyle={styles.rowHContent}>
            {[
              { label: 'Bowls', type: 'salad' },
              { label: 'Soups', type: 'soup' },
              { label: 'Pasta', type: 'pasta' },
              { label: 'Desserts', type: 'dessert' },
              { label: 'Main Dishes', type: 'main course' },
            ].map((m) => (
              <TouchableOpacity key={m.label} style={styles.mealCard} onPress={() => openSearchWith({ type: m.type as any })}>
                <Text style={styles.mealCardText}>{m.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Card>

        {/* Pick Your Method (horizontal) */}
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Pick Your Method</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.rowH} contentContainerStyle={styles.rowHContent}>
            {[
              { label: 'Easy', maxReadyTime: 20 },
              { label: '5 Ingredients', query: '5 ingredient' },
              { label: 'One-Pot', query: 'one pot' },
              { label: 'On the go', query: 'wrap sandwich' },
            ].map((m) => (
              <TouchableOpacity key={m.label} style={styles.methodCard} onPress={() => openSearchWith({ query: m.query as any, maxReadyTime: m.maxReadyTime as any })}>
                <Text style={styles.methodCardText}>{m.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Card>

        {/* Pick Your Diet (grid) */}
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Pick Your Diet</Text>
          </View>
          <View style={styles.grid2}>
            {[
              { label: 'Vegetarian', diet: 'vegetarian' },
              { label: 'Vegan', diet: 'vegan' },
              { label: 'Low Carb', query: 'low carb' },
              { label: 'Low Fat', query: 'low fat' },
              { label: 'Low Calorie', maxCalories: 400 },
              { label: 'High Protein', query: 'high protein' },
            ].map((d) => (
              <TouchableOpacity key={d.label} style={styles.dietTile} onPress={() => openSearchWith({ diet: d.diet as any, query: d.query as any, maxCalories: d.maxCalories as any })}>
                <Text style={styles.dietTileText}>{d.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* Our Favorites (horizontal from trending) */}
        {trendingRecipes.length > 0 && (
          <Card style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Our Favorites</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.rowH}
              contentContainerStyle={styles.rowHContent}
            >
              {trendingRecipes.slice(0, 12).map((r, idx) => (
                <View key={`fav-${r.id}-${idx}`} style={styles.hCardWrapper}>
                  {renderRecipeCard(r)}
                </View>
              ))}
            </ScrollView>
          </Card>
        )}
        {/* Trending Recipes */}
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <TrendingUp size={20} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Trending Now</Text>
          </View>
          
          {isLoading && trendingRecipes.length === 0 ? (
            <LoadingSpinner text="Loading trending recipes..." />
          ) : trendingRecipes.length > 0 ? (
            <View style={styles.recipeGrid}>
              {trendingRecipes.slice(0, 6).map((recipe, idx) => (
                <View key={`trend-${recipe.id}-${idx}`}>{renderRecipeCard(recipe)}</View>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyText}>No trending recipes available</Text>
          )}
        </Card>

        {/* Quick Actions */}
        <Card style={styles.actionsCard}>
          <Text style={styles.actionsTitle}>Quick Discovery</Text>
          
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => recipeProvider && getRandomRecipes(['main course'], 10)}
            >
              <Star size={20} color={Colors.primary} />
              <Text style={styles.actionButtonText}>Main Dishes</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => recipeProvider && getRandomRecipes(['vegetarian'], 10)}
            >
              <Star size={20} color={Colors.secondary} />
              <Text style={styles.actionButtonText}>Vegetarian</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => recipeProvider && getRandomRecipes(['quick'], 10)}
            >
              <Clock size={20} color={Colors.warning} />
              <Text style={styles.actionButtonText}>Quick Meals</Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* Recent Discoveries */}
        {externalRecipes.length > 0 && (
          <Card style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Sparkles size={20} color={Colors.secondary} />
              <Text style={styles.sectionTitle}>Recent Discoveries</Text>
            </View>
            
            <View style={styles.recipeGrid}>
              {externalRecipes.map((recipe, idx) => (
              <View key={`recent-${recipe.id}-${idx}`}>{renderRecipeCard(recipe, true)}</View>
            ))}
            </View>

            <View style={{ marginTop: Spacing.sm }}>
              <Button
                title={isLoading ? 'Loading…' : 'Load more'}
                onPress={() => recipeProvider && getRandomRecipes(['main course', 'healthy'], 12, true)}
                disabled={isLoading || !recipeProvider}
              />
            </View>
          </Card>
        )}

        {/* Error Display */}
        {error && (
          <Card style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
            <Button
              title="Retry"
              onPress={handleRefresh}
              style={styles.retryButton}
            />
          </Card>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchHeader: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    paddingVertical: Spacing.sm,
  },
  backButtonText: {
    color: Colors.primary,
    fontSize: Typography.sizes.md,
    fontWeight: '500',
  },
  discoveryHeader: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: '600',
    color: Colors.text,
  },
  searchButton: {
    padding: Spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '08',
  },
  headerDescription: {
    fontSize: Typography.sizes.sm,
    color: Colors.lightText,
    lineHeight: 18,
  },
  content: {
    flex: 1,
  },
  sectionCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: Typography.sizes.md,
    fontWeight: '600',
    color: Colors.text,
  },
  recipeGrid: {
    gap: Spacing.md,
  },
  recipeCard: {
    marginBottom: Spacing.sm,
  },
  recipeCardContent: {
    padding: Spacing.sm,
    overflow: 'hidden',
  },
  imageWrapper: {
    height: 180,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: Colors.primary + '10',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  recipeImageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recipeImagePlaceholder: {
    fontSize: Typography.sizes.xl,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  recipeInfo: {
    flex: 1,
    paddingHorizontal: Spacing.sm,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  recipeTitle: {
    fontSize: Typography.sizes.md,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  recipeMeta: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  badgesRow: {
    position: 'absolute',
    bottom: Spacing.sm,
    left: Spacing.sm,
    right: Spacing.sm,
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  badgeDark: {
    backgroundColor: '#00000080',
  },
  badgeCal: {
    backgroundColor: Colors.warning,
  },
  badgeText: {
    color: Colors.white,
    fontSize: Typography.sizes.xs,
    fontWeight: '600',
  },
  recipeTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: Colors.border,
  },
  vegetarianTag: {
    backgroundColor: Colors.secondary + '20',
  },
  healthyTag: {
    backgroundColor: Colors.success + '20',
  },
  tagText: {
    fontSize: Typography.sizes.xs,
    color: Colors.text,
  },
  fabSave: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#00000080',
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButton: {
    padding: Spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.tabBackground,
    borderRadius: 10,
  },
  actionsCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  actionsTitle: {
    fontSize: Typography.sizes.md,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  filtersRow: {
    marginTop: Spacing.md,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: Spacing.xs,
    backgroundColor: Colors.white,
  },
  chipText: {
    fontSize: Typography.sizes.sm,
    color: Colors.text,
    fontWeight: '500',
  },
  sortRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
    alignItems: 'center',
  },
  sortChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: Colors.border,
  },
  sortChipActive: {
    backgroundColor: Colors.primary,
  },
  sortChipText: {
    fontSize: Typography.sizes.xs,
    color: Colors.text,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  sortChipTextActive: {
    color: Colors.white,
  },
  dirChip: {
    marginLeft: 'auto',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dirChipText: {
    fontSize: Typography.sizes.xs,
    color: Colors.text,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  actionButtonText: {
    fontSize: Typography.sizes.sm,
    color: Colors.text,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  emptyText: {
    textAlign: 'center',
    color: Colors.lightText,
    fontSize: Typography.sizes.md,
    paddingVertical: Spacing.lg,
  },
  errorCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    backgroundColor: Colors.expiring + '10',
    borderColor: Colors.expiring,
  },
  errorText: {
    color: Colors.expiring,
    textAlign: 'center',
    fontSize: Typography.sizes.md,
    marginBottom: Spacing.md,
  },
  retryButton: {
    width: '100%',
    backgroundColor: Colors.expiring,
  },
  // Horizontal rows
  rowH: {
    paddingVertical: Spacing.xs,
  },
  rowHContent: {
    gap: Spacing.xs,
    paddingRight: Spacing.lg,
  },
  // Popular Categories chip
  catChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: Spacing.xs,
  },
  catChipText: {
    fontSize: Typography.sizes.sm,
    color: Colors.text,
    fontWeight: '600',
  },
  // 2-column grid tiles
  grid2: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  calTile: {
    flexBasis: '48%',
    paddingVertical: Spacing.lg,
    borderRadius: 12,
    backgroundColor: Colors.tabBackground,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calTileText: {
    fontSize: Typography.sizes.sm,
    color: Colors.text,
    fontWeight: '500',
  },
  // Horizontal meal cards
  mealCard: {
    width: 140,
    height: 80,
    borderRadius: 12,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.xs,
  },
  mealCardText: {
    fontSize: Typography.sizes.sm,
    color: Colors.text,
    fontWeight: '600',
  },
  // Horizontal method cards
  methodCard: {
    width: 160,
    height: 80,
    borderRadius: 12,
    backgroundColor: Colors.tabBackground,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.xs,
  },
  methodCardText: {
    fontSize: Typography.sizes.sm,
    color: Colors.text,
    fontWeight: '600',
  },
  // Diet tiles
  dietTile: {
    flexBasis: '48%',
    paddingVertical: Spacing.md,
    borderRadius: 12,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dietTileText: {
    fontSize: Typography.sizes.sm,
    color: Colors.text,
    fontWeight: '600',
  },
  // Horizontal card wrapper for favorites carousel
  hCardWrapper: {
    width: 240,
    marginRight: Spacing.sm,
  },
});
