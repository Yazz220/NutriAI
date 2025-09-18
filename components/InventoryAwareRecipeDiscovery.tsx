import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, FlatList, LayoutChangeEvent, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Heart, Clock, Flame, ShoppingCart } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useRecipeStore } from '@/hooks/useRecipeStore';
import { useInventory } from '@/hooks/useInventoryStore';
import { ExternalRecipe } from '@/types/external';
import { RecipeAvailabilityBadge } from '@/components/recipe/RecipeAvailabilityBadge';
import {
  calculateRecipeAvailability,
  getRecipesWithAvailability,
  RecipeAvailability
} from '@/utils/inventoryRecipeMatching';
import AsyncStorage from '@react-native-async-storage/async-storage';

const GUTTER = 16;
const COLUMN_GAP = 16;

interface InventoryAwareRecipeDiscoveryProps {
  onRecipePress: (recipe: ExternalRecipe) => void;
  onSaveRecipe: (recipe: ExternalRecipe) => void;
}

interface EnhancedRecipe extends ExternalRecipe {
  availability?: RecipeAvailability;
}

export const InventoryAwareRecipeDiscovery: React.FC<InventoryAwareRecipeDiscoveryProps> = ({
  onRecipePress,
  onSaveRecipe,
}) => {
  const insets = useSafeAreaInsets();
  const { inventory } = useInventory();
  const { trendingRecipes, externalRecipes, isLoading, isSearching, getTrendingRecipes, getRandomRecipes } = useRecipeStore();

  const [refreshing, setRefreshing] = useState(false);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  // Filters removed for initial integration
 
  // Helper to merge unique recipes
  const mergeUnique = useCallback((a: ExternalRecipe[], b: ExternalRecipe[]): ExternalRecipe[] => {
    const map = new Map<string, ExternalRecipe>();
    a.forEach(r => map.set(String(r.id), r));
    b.forEach(r => { const k = String(r.id); if (!map.has(k)) map.set(k, r); });
    return Array.from(map.values());
  }, []);

  // Enhanced recipes with availability data (merged pools)
  const enhancedRecipes = useMemo(() => {
    const baseRecipes = mergeUnique(trendingRecipes, externalRecipes);
    return baseRecipes.map(recipe => ({
      ...recipe,
      availability: calculateRecipeAvailability(recipe, inventory)
    }));
  }, [externalRecipes, trendingRecipes, inventory, mergeUnique]);

  // No client-side filters — placeholder for future filters
  const filteredRecipes = useMemo(() => enhancedRecipes, [enhancedRecipes]);

  // Expiring section removed

  // Initial load
  useEffect(() => {
    (async () => {
      try {
        if (!trendingRecipes.length) await getTrendingRecipes();
        if (!externalRecipes.length) await getRandomRecipes(undefined, 12, true);
        // Safety: if still empty, trigger another random batch with defaults
        if (trendingRecipes.length + externalRecipes.length === 0) {
          await getRandomRecipes(undefined, 12, true);
        }
      } catch (e) {
        console.error('[Discover] init load failed', e);
      }
    })();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await getTrendingRecipes();
      await getRandomRecipes(undefined, 12, false); // replace randoms
    } finally {
      setRefreshing(false);
    }
  };

  // Load saved bookmarks from storage
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem('discover_saved_ids');
        if (raw) setSavedIds(new Set(JSON.parse(raw)));
      } catch { }
    })();
  }, []);

  const toggleSave = async (recipe: ExternalRecipe) => {
    const id = String(recipe.id);
    setSavedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      AsyncStorage.setItem('discover_saved_ids', JSON.stringify(Array.from(next))).catch(() => { });
      return next;
    });
    if (!savedIds.has(id)) {
      try { await onSaveRecipe(recipe); } catch { }
    }
  };

  const [gridWidth, setGridWidth] = useState(0);
  const onGridLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w && Math.floor(w) !== Math.floor(gridWidth)) setGridWidth(Math.floor(w));
  };

  const renderRecipeCard = ({ item, index }: { item: EnhancedRecipe; index: number }) => {
    const containerInner = Math.max(gridWidth - GUTTER * 2, 0);
    const itemWidth = Math.floor((containerInner - COLUMN_GAP) / 2);
    if (!itemWidth) return null;
    const imageHeight = Math.floor(itemWidth * 0.75);

    return (
      <TouchableOpacity
        style={[styles.card, { width: itemWidth, marginRight: index % 2 === 0 ? COLUMN_GAP : 0 }]}
        activeOpacity={0.9}
        onPress={() => onRecipePress(item)}
      >
        <Image
          source={{ uri: item.image }}
          style={{ width: '100%', height: imageHeight, borderRadius: 12, backgroundColor: Colors.secondary }}
          resizeMode="cover"
        />

        <View style={{ paddingVertical: 10 }}>
          <Text style={styles.title} numberOfLines={2}>{item.title}</Text>

          <View style={styles.metaRow}>
            {/* Time */}
            {typeof item.readyInMinutes === 'number' && item.readyInMinutes > 0 ? (
              <View style={styles.metaItem}>
                <Clock size={12} color={Colors.lightText} />
                <Text style={styles.metaText}>{formatCookTime(item.readyInMinutes)}</Text>
              </View>
            ) : <View />}

            {/* Calories (if provided on recipe.nutrition) */}
            {'nutrition' in item && (item as any)?.nutrition?.nutrients?.length ? (
              (() => {
                const cal = ((item as any).nutrition.nutrients.find((n: any) => (n.name || '').toLowerCase() === 'calories')?.amount) as number | undefined;
                if (!cal || isNaN(cal)) return <View />;
                return (
                  <View style={styles.metaItem}>
                    <Flame size={12} color={Colors.lightText} />
                    <Text style={styles.metaText}>{Math.round(cal)} kcal</Text>
                  </View>
                );
              })()
            ) : <View />}

            {/* Availability with cart icon */}
            {item.availability ? (
              <View style={styles.metaItem}>
                <ShoppingCart size={12} color={item.availability.canCookNow ? Colors.success : Colors.lightText} />
                <Text style={[styles.metaText, {
                  color: item.availability.canCookNow
                    ? Colors.success
                    : item.availability.availabilityPercentage >= 75
                    ? Colors.warning
                    : Colors.lightText,
                }]}>
                  {item.availability.availabilityPercentage}%
                </Text>
              </View>
            ) : <View />}
          </View>

          {/* Expiring urgency indicator removed */}
        </View>

        <TouchableOpacity style={styles.bookmark} onPress={() => toggleSave(item)}>
          <Heart size={16} color={savedIds.has(String(item.id)) ? '#e5484d' : Colors.lightText} fill={savedIds.has(String(item.id)) ? '#e5484d' : 'transparent'} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container} onLayout={onGridLayout}>
      <View style={{ paddingHorizontal: GUTTER, paddingTop: 8 }}>
        <View style={styles.headerRow}>
          <Text style={styles.heading}>Recipe Discovery</Text>
        </View>
        {inventory.length > 0 && (
          <Text style={styles.inventoryHint}>
            Showing recipes based on your {inventory.length} ingredients
          </Text>
        )}
      </View>

      {/* Expiring section removed */}

      {/* Filters removed */}

      <View style={{ flex: 1 }}>
        <FlatList
          data={filteredRecipes}
          keyExtractor={(item) => String(item.id)}
          numColumns={2}
          contentContainerStyle={{ paddingHorizontal: GUTTER, paddingTop: 12, paddingBottom: 24 + Math.max(insets.bottom, 12) }}
          onEndReachedThreshold={0.6}
          onEndReached={() => {
            getRandomRecipes(undefined, 12, true);
          }}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          ListEmptyComponent={
            (isLoading || isSearching) ? (
              <LoadingSpinner />
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No recipes found</Text>
                <Text style={styles.emptySubtext}>Try adjusting your filters or add more ingredients to your inventory</Text>
              </View>
            )
          }
          renderItem={renderRecipeCard}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  heading: { fontSize: 24, fontWeight: '700', color: Colors.text },
  filterButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inventoryHint: {
    fontSize: 12,
    color: Colors.lightText,
    marginBottom: 8,
  },
  expiringSection: {
    paddingVertical: Spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.error,
    paddingHorizontal: GUTTER,
    marginBottom: Spacing.sm,
  },
  expiringList: {
    flexDirection: 'row',
    paddingHorizontal: GUTTER,
    gap: Spacing.sm,
  },
  expiringCard: {
    width: 120,
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: Spacing.sm,
    borderWidth: 2,
    borderColor: Colors.error,
  },
  expiringImage: {
    width: '100%',
    height: 80,
    borderRadius: 8,
    marginBottom: Spacing.xs,
  },
  expiringTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  expiringUrgency: {
    fontSize: 10,
    color: Colors.error,
    fontWeight: '500',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card
  },
  chipActive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: Colors.text
  },
  chipText: { color: Colors.lightText, fontWeight: '600' },
  chipActiveText: { color: Colors.white, fontWeight: '700' },
  sortSection: {
    paddingHorizontal: GUTTER,
    paddingBottom: Spacing.sm,
  },
  sortTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  sortOptions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  sortOption: {
    backgroundColor: Colors.card,
    borderRadius: 8,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    minWidth: 100,
  },
  sortOptionActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  sortOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  sortOptionTextActive: {
    color: Colors.white,
  },
  sortOptionDescription: {
    fontSize: 10,
    color: Colors.lightText,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
    position: 'relative'
  },
  title: { fontSize: 16, fontWeight: '600', color: Colors.text, marginBottom: 4 },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: { fontSize: 12, color: Colors.lightText },
  availabilityText: {
    fontSize: 11,
    fontWeight: '600',
  },
  urgencyIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  urgencyText: {
    fontSize: 11,
    color: Colors.error,
    fontWeight: '500',
  },
  bookmark: {
    position: 'absolute',
    right: 12,
    top: 12,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.9)'
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    textAlign: 'center',
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    textAlign: 'center',
    color: Colors.lightText,
    fontSize: 14,
  },
});

function formatCookTime(mins: number) {
  if (!mins || mins <= 0) return '';
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}