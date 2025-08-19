// Enhanced Recipe Discovery Component
// Provides trending recipes, search, and discovery features

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
  LayoutChangeEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { Spacing, Typography } from '@/constants/spacing';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useRecipeStore } from '@/hooks/useRecipeStore';
import { ExternalRecipe } from '@/types/external';
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
  const insets = useSafeAreaInsets();
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

  // Load discovery data (dataset-only)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (trendingRecipes.length === 0) {
          await getTrendingRecipes();
        }
        if (externalRecipes.length === 0) {
          await getRandomRecipes(['main course', 'healthy'], 12, true);
        }
      } catch (e) {
        console.error('[EnhancedDiscovery] Failed to load discovery lists', e);
      }
    })();
    return () => { cancelled = true; };
  }, [getTrendingRecipes, trendingRecipes.length, externalRecipes.length, getRandomRecipes]);

  // Debug: log when data changes
  useEffect(() => {
    console.log('[Discovery] lengths changed', { trending: trendingRecipes.length, external: externalRecipes.length, isLoading });
  }, [trendingRecipes.length, externalRecipes.length, isLoading]);

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        getTrendingRecipes(),
        getRandomRecipes(['main course', 'healthy'], 10),
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  // Open search with pre-filled filters
  const openSearchWith = async (params: Partial<typeof filters>) => {
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

  // Grid layout constants/state
  const [gridWidth, setGridWidth] = useState(0);
  const GUTTER = 16;
  const COLUMN_GAP = 16;
  const ROW_GAP = 20;
  const onGridLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w && Math.floor(w) !== Math.floor(gridWidth)) setGridWidth(Math.floor(w));
  };

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
    <View style={styles.container} onLayout={onGridLayout}>
      <FlatList
        data={(externalRecipes.length ? externalRecipes : trendingRecipes)}
        keyExtractor={(item) => String(item.id)}
        numColumns={2}
        contentContainerStyle={{
          paddingHorizontal: GUTTER,
          paddingTop: 12,
          // Ensure footer button and last items are not hidden behind tab bar
          paddingBottom: 24 + Math.max(insets.bottom, 12),
        }}
        ListHeaderComponent={
          <View style={{ marginBottom: Spacing.sm }}>
            <TouchableOpacity style={styles.searchBar} onPress={() => setShowSearch(true)} activeOpacity={0.85}>
              <Search size={18} color={Colors.lightText} />
              <Text style={styles.searchBarText}>Search recipes</Text>
            </TouchableOpacity>
          </View>
        }
        ListFooterComponent={
          <View style={{ marginTop: Spacing.sm }}>
            <Button
              title={isLoading ? 'Loading…' : 'Load more'}
              onPress={() => getRandomRecipes(undefined, 12, true)}
              disabled={isLoading}
            />
          </View>
        }
        refreshing={refreshing}
        onRefresh={handleRefresh}
        renderItem={({ item, index }) => {
          // compute item width
          const containerInner = Math.max(gridWidth - (GUTTER * 2), 0);
          const rawWidth = (containerInner - COLUMN_GAP) / 2;
          const itemWidth = Math.floor(rawWidth);
          if (!itemWidth) return null;
          const imageHeight = Math.floor(itemWidth * 0.75); // 4:3 aspect

          const calories = getCalories(item);
          const isLeft = index % 2 === 0;
          return (
            <View style={{ width: itemWidth, marginRight: isLeft ? COLUMN_GAP : 0, marginBottom: ROW_GAP }}>
              <TouchableOpacity activeOpacity={0.85} onPress={() => handleRecipePress(item)}>
                <View style={[styles.gridImageContainer, { width: itemWidth, height: imageHeight }] }>
                  {!!item.image && (
                    <Image source={{ uri: String(item.image) }} style={styles.gridImage} />
                  )}
                </View>
                <View style={styles.gridInfoBox}>
                  <Text style={styles.gridTitle} numberOfLines={2} ellipsizeMode="tail">{item.title}</Text>
                  {calories !== null && (
                    <Text style={styles.gridMeta}>{calories} kcal</Text>
                  )}
                </View>
              </TouchableOpacity>
            </View>
          );
        }}
      />
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
    fontWeight: Typography.weights.medium,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.tabBackground,
  },
  searchBarText: {
    color: Colors.lightText,
    fontSize: Typography.sizes.md,
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
    fontWeight: Typography.weights.semibold,
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
  gridImageContainer: {
    backgroundColor: Colors.surfaceTile,
    borderRadius: 0,
    overflow: 'hidden',
  },
  gridImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
    borderRadius: 0,
  },
  gridInfoBox: {
    marginTop: 8,
  },
  gridTitle: {
    color: Colors.text,
    fontSize: Typography.sizes.md,
    lineHeight: 22,
    fontWeight: Typography.weights.semibold,
  },
  gridMeta: {
    marginTop: 2,
    color: Colors.lightText,
    fontSize: 13,
    lineHeight: 18,
  },
  actionsCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  actionsTitle: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
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
    fontWeight: Typography.weights.medium,
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
    fontWeight: Typography.weights.semibold,
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
    fontWeight: Typography.weights.semibold,
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
    fontWeight: Typography.weights.semibold,
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
    fontWeight: Typography.weights.medium,
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
    fontWeight: Typography.weights.semibold,
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
    fontWeight: Typography.weights.semibold,
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
    fontWeight: Typography.weights.semibold,
  },
  // Horizontal card wrapper for favorites carousel
  hCardWrapper: {
    width: 240,
    marginRight: Spacing.sm,
  },
});
