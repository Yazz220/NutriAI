// Minimal Discover implementation
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, FlatList, LayoutChangeEvent, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bookmark } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useRecipeStore } from '@/hooks/useRecipeStore';
import { ExternalRecipe } from '@/types/external';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface EnhancedRecipeDiscoveryProps {
  onRecipePress: (recipe: ExternalRecipe) => void;
  onSaveRecipe: (recipe: ExternalRecipe) => void;
  onSearch?: (params: any) => Promise<void>;
}

export const EnhancedRecipeDiscovery: React.FC<EnhancedRecipeDiscoveryProps> = ({ onRecipePress, onSaveRecipe, onSearch }) => {
  const insets = useSafeAreaInsets();
  const { trendingRecipes, externalRecipes, searchResults, isLoading, getTrendingRecipes, getRandomRecipes, searchRecipes } = useRecipeStore();

  const FILTERS = useMemo(() => ([
    { key: 'all', label: 'All', kind: 'query', value: '' },
    { key: 'breakfast', label: 'Breakfast', kind: 'type', value: 'breakfast' },
    { key: 'lunch', label: 'Lunch', kind: 'type', value: 'lunch' },
    { key: 'dinner', label: 'Dinner', kind: 'type', value: 'dinner' },
    { key: 'dessert', label: 'Dessert', kind: 'type', value: 'dessert' },
    { key: 'vegetarian', label: 'Vegetarian', kind: 'query', value: 'vegetarian' },
    { key: 'vegan', label: 'Vegan', kind: 'query', value: 'vegan' },
    { key: 'pasta', label: 'Pasta', kind: 'query', value: 'pasta' },
    { key: 'chicken', label: 'Chicken', kind: 'query', value: 'chicken' },
    { key: 'soup', label: 'Soup', kind: 'query', value: 'soup' },
    { key: 'salad', label: 'Salad', kind: 'query', value: 'salad' },
  ] as const), []);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  // Initial load
  useEffect(() => {
    (async () => {
      try {
        if (!trendingRecipes.length) await getTrendingRecipes();
        if (!externalRecipes.length) await getRandomRecipes(['popular'], 12, true);
      } catch (e) {
        console.error('[Discover] init load failed', e);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyFilter = useCallback(async (key: string, replace = true) => {
    setActiveFilter(key);
    const f = FILTERS.find(x => x.key === key);
    if (!f || f.key === 'all') {
      await getRandomRecipes(['popular'], 12, !replace);
      return;
    }
    const params: any = {};
    if (f.kind === 'type') params.type = f.value; else params.query = f.value;
    if (onSearch) await onSearch({ ...params, number: 20 }); else await searchRecipes({ ...params, number: 20 });
  }, [FILTERS, getRandomRecipes, onSearch, searchRecipes]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await getTrendingRecipes();
      await applyFilter(activeFilter, true);
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
      } catch {}
    })();
  }, []);

  const toggleSave = async (recipe: ExternalRecipe) => {
    const id = String(recipe.id);
    setSavedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      AsyncStorage.setItem('discover_saved_ids', JSON.stringify(Array.from(next))).catch(() => {});
      return next;
    });
    if (!savedIds.has(id)) {
      // On first save, also call upstream save handler
      try { await onSaveRecipe(recipe); } catch {}
    }
  };

  const [gridWidth, setGridWidth] = useState(0);
  const GUTTER = 16;
  const COLUMN_GAP = 16;
  const onGridLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w && Math.floor(w) !== Math.floor(gridWidth)) setGridWidth(Math.floor(w));
  };

  const data = useMemo(() => (searchResults.length ? searchResults : (externalRecipes.length ? externalRecipes : trendingRecipes)), [searchResults, externalRecipes, trendingRecipes]);

  return (
    <View style={styles.container} onLayout={onGridLayout}>
      <View style={{ paddingHorizontal: GUTTER, paddingTop: 8 }}>
        <Text style={styles.heading}>What others are saving</Text>
      </View>

      <View style={{ height: 50 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: GUTTER, paddingVertical: 8, gap: 8 }}>
          {FILTERS.map(f => (
            <TouchableOpacity key={f.key} style={activeFilter === f.key ? styles.chipActive : styles.chip} onPress={() => applyFilter(f.key)}>
            <Text style={activeFilter === f.key ? styles.chipActiveText : styles.chipText}>{f.label}</Text>
          </TouchableOpacity>
        ))}
        </ScrollView>
      </View>

      <View style={{ flex: 1 }}>
        <FlatList
          data={data}
          keyExtractor={(item) => String(item.id)}
        numColumns={2}
        contentContainerStyle={{ paddingHorizontal: GUTTER, paddingTop: 12, paddingBottom: 24 + Math.max(insets.bottom, 12) }}
        onEndReachedThreshold={0.6}
        onEndReached={() => getRandomRecipes(undefined, 12, true)}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        ListEmptyComponent={isLoading ? <LoadingSpinner /> : <Text style={styles.emptyText}>No recipes found</Text>}
        renderItem={({ item, index }) => {
          const containerInner = Math.max(gridWidth - (GUTTER * 2), 0);
          const rawWidth = (containerInner - COLUMN_GAP) / 2;
          const itemWidth = Math.floor(rawWidth);
          if (!itemWidth) return null;
          const imageHeight = Math.floor(itemWidth * 0.75);
          const isLeft = index % 2 === 0;
          return (
            <TouchableOpacity style={[styles.card, { width: itemWidth, marginRight: isLeft ? COLUMN_GAP : 0 }]} activeOpacity={0.9} onPress={() => onRecipePress(item)}>
              <Image source={{ uri: item.image }} style={{ width: '100%', height: imageHeight, borderRadius: 12, backgroundColor: Colors.secondary }} resizeMode="cover" />
              <View style={{ paddingVertical: 10 }}>
                <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
                {typeof item.readyInMinutes === 'number' && item.readyInMinutes > 0 ? (
                  <Text style={styles.metaText}>{formatCookTime(item.readyInMinutes)}</Text>
                ) : null}
              </View>
              <TouchableOpacity style={styles.bookmark} onPress={() => toggleSave(item)}>
                <Bookmark size={16} color={savedIds.has(String(item.id)) ? Colors.primary : Colors.lightText} />
              </TouchableOpacity>
            </TouchableOpacity>
          );
        }}
      />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  heading: { fontSize: 24, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 16, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.card },
  chipActive: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 16, backgroundColor: Colors.text },
  chipText: { color: Colors.lightText, fontWeight: '600' },
  chipActiveText: { color: Colors.white, fontWeight: '700' },
  card: { backgroundColor: Colors.card, borderRadius: 16, padding: 10, borderWidth: 1, borderColor: Colors.border, marginBottom: 16, position: 'relative' },
  title: { fontSize: 16, fontWeight: '600', color: Colors.text, marginBottom: 4 },
  metaText: { fontSize: 12, color: Colors.lightText },
  bookmark: { position: 'absolute', right: 12, top: 12, width: 28, height: 28, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.04)' },
  emptyText: { textAlign: 'center', color: Colors.lightText, paddingVertical: 20 },
});

function formatCookTime(mins: number) {
  if (!mins || mins <= 0) return '';
  if (mins < 60) return `${mins}m cook time`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m cook time` : `${h}h cook time`;
}
