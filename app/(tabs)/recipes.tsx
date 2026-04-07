import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image,
  FlatList, TextInput, ScrollView, Alert,
} from 'react-native';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Plus, Clock } from 'phosphor-react-native';
import { X } from 'lucide-react-native';
import RecipePageIcon from '@/assets/icons/Recipe page.svg';
import SearchIcon from '@/assets/icons/search.svg';
import { Colors } from '@/constants/colors';
import { Typography as Type } from '@/constants/typography';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { MealDetailModal } from '@/components/MealDetailModal';
import { ImportRecipeModal } from '@/components/ImportRecipeModal';
import { EditRecipeModal } from '@/components/EditRecipeModal';
import { useMeals } from '@/hooks/useMealsStore';
import { Meal, MEAL_CATEGORIES, MEAL_CATEGORY_LABELS, MealCategory } from '@/types';
import { ImportedRecipe } from '@/types/importedRecipe';

export default function RecipesScreen() {
  const insets = useSafeAreaInsets();
  const { meals, addMeal, updateMeal, removeMeal } = useMeals();

  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null);
  const [showMealDetail, setShowMealDetail] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editRecipe, setEditRecipe] = useState<Meal | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const isMeaningful = (m: Meal) =>
    !!m?.name?.trim() && ((m?.ingredients?.length ?? 0) > 0 || (m?.steps?.length ?? 0) > 0);

  const filteredMeals = useMemo(() => {
    let result = meals.filter(isMeaningful);
    if (selectedCategory !== 'all') result = result.filter(m => m.category === selectedCategory);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        m => m.name.toLowerCase().includes(q) ||
          m.ingredients?.some(i => i.name.toLowerCase().includes(q))
      );
    }
    return [...result].reverse();
  }, [meals, selectedCategory, searchQuery]);

  const categoryCounts = useMemo(() => {
    const meaningful = meals.filter(isMeaningful);
    const counts: Record<string, number> = { all: meaningful.length };
    MEAL_CATEGORIES.forEach(cat => { counts[cat] = meaningful.filter(m => m.category === cat).length; });
    return counts;
  }, [meals]);

  const handleRecipePress = (recipe: Meal) => { setSelectedMeal(recipe); setShowMealDetail(true); };

  const handleRecipeMenuPress = (recipe: Meal) =>
    Alert.alert(recipe.name, '', [
      { text: 'Edit', onPress: () => { setEditRecipe(recipe); setShowEditModal(true); } },
      {
        text: 'Delete', style: 'destructive',
        onPress: () => Alert.alert('Delete Recipe', `Delete "${recipe.name}"?`, [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: () => removeMeal(recipe.id) },
        ]),
      },
      { text: 'Cancel', style: 'cancel' },
    ], { cancelable: true });

  const handleImport = async (recipe: ImportedRecipe) => {
    const meal: Meal = {
      id: recipe.id,
      name: recipe.title,
      description: recipe.description || '',
      image: recipe.image || '',
      ingredients: recipe.ingredients?.map(ing => ({ name: ing.name, quantity: ing.amount || 0, unit: ing.unit || '' })) || [],
      steps: recipe.instructions?.map(inst => inst.text) || [],
      prepTime: recipe.prepTime || 0,
      cookTime: recipe.cookTime || 0,
      servings: recipe.servings || 4,
      tags: recipe.tags || [],
      sourceUrl: recipe.sourceUrl,
    };
    await addMeal(meal);
    Alert.alert('Success', 'Recipe imported successfully!');
    setShowImportModal(false);
  };

  const renderCard = ({ item, index }: { item: Meal; index: number }) => {
    const totalTime = (item.prepTime || 0) + (item.cookTime || 0);
    return (
      <TouchableOpacity
        style={[styles.card, index % 2 === 0 ? styles.cardLeft : styles.cardRight]}
        onPress={() => handleRecipePress(item)}
        onLongPress={() => handleRecipeMenuPress(item)}
        activeOpacity={0.85}
      >
        {item.image
          ? <Image source={{ uri: item.image }} style={styles.cardImage} />
          : <View style={styles.cardImagePlaceholder}><RecipePageIcon width={40} height={40} color={Colors.border} /></View>
        }
        <View style={styles.cardBody}>
          {item.category && (
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>
                {MEAL_CATEGORY_LABELS[item.category as MealCategory] ?? item.category}
              </Text>
            </View>
          )}
          <Text style={styles.cardTitle} numberOfLines={2}>{item.name}</Text>
          <View style={styles.cardMeta}>
            {totalTime > 0 && (
              <View style={styles.metaItem}>
                <Clock size={12} color={Colors.lightText} />
                <Text style={styles.metaText}>{totalTime}m</Text>
              </View>
            )}
            {(item.ingredients?.length ?? 0) > 0 && (
              <Text style={styles.metaText}>{item.ingredients.length} ingr.</Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <RecipePageIcon width={64} height={64} color={Colors.border} />
      <Text style={styles.emptyTitle}>No recipes yet</Text>
      <Text style={styles.emptyBody}>
        {searchQuery || selectedCategory !== 'all'
          ? 'No recipes match your search or filter.'
          : 'Tap + to import your first recipe.'}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: '', headerShown: false }} />
      <ScreenHeader
        title="Recipes"
        icon={
          <View style={{ width: 28, height: 28, alignItems: 'center', justifyContent: 'center', overflow: 'visible' }}>
            <RecipePageIcon width={84} height={84} color={Colors.text} />
          </View>
        }
      />

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <SearchIcon width={24} height={24} color={Colors.lightText} />
          <TextInput
            placeholder="Search recipes or ingredients"
            placeholderTextColor={Colors.lightText}
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={{ padding: 6 }}>
              <X size={14} color={Colors.lightText} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Category chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0 }} contentContainerStyle={styles.chipsContent}>
        <TouchableOpacity
          style={[styles.chip, selectedCategory === 'all' && styles.chipActive]}
          onPress={() => setSelectedCategory('all')}
        >
          <Text style={[styles.chipText, selectedCategory === 'all' && styles.chipTextActive]}>
            All{categoryCounts.all > 0 ? ` (${categoryCounts.all})` : ''}
          </Text>
        </TouchableOpacity>
        {MEAL_CATEGORIES.map(cat => (
          <TouchableOpacity key={cat}
            style={[styles.chip, selectedCategory === cat && styles.chipActive]}
            onPress={() => setSelectedCategory(cat)}
          >
            <Text style={[styles.chipText, selectedCategory === cat && styles.chipTextActive]}>
              {MEAL_CATEGORY_LABELS[cat]}{categoryCounts[cat] > 0 ? ` (${categoryCounts[cat]})` : ''}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* 2-column grid */}
      <FlatList
        data={filteredMeals}
        keyExtractor={item => item.id}
        renderItem={renderCard}
        numColumns={2}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={[styles.gridContent, { paddingBottom: Math.max(150, (insets?.bottom ?? 0) + 118) }]}
        columnWrapperStyle={styles.columnWrapper}
      />

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { bottom: Math.max(20, (insets?.bottom ?? 0) + 90) }]}
        onPress={() => setShowImportModal(true)}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel="Import a recipe"
      >
        <Plus size={24} color={Colors.white} />
      </TouchableOpacity>

      <MealDetailModal visible={showMealDetail} meal={selectedMeal as any} onClose={() => setShowMealDetail(false)} />
      <ImportRecipeModal visible={showImportModal} onClose={() => setShowImportModal(false)} onImport={handleImport} />
      <EditRecipeModal
        visible={showEditModal}
        recipe={editRecipe}
        onClose={() => { setShowEditModal(false); setEditRecipe(null); }}
        onSave={updated => updateMeal(updated)}
      />
    </View>
  );
}

const CARD_GAP = 10;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  searchContainer: { paddingHorizontal: 16, paddingVertical: 12 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.tabBackground, borderRadius: 12,
    borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 12,
  },
  searchInput: { flex: 1, ...Type.body, paddingVertical: 12, marginLeft: 8, color: Colors.text },
  chipsContent: { paddingHorizontal: 16, paddingBottom: 8, gap: 8, alignItems: 'center' },
  chip: {
    paddingVertical: 7, paddingHorizontal: 14, borderRadius: 20,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.card,
  },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { ...Type.caption, color: Colors.lightText },
  chipTextActive: { ...Type.caption, color: Colors.white },
  gridContent: { paddingHorizontal: 16, paddingTop: 8 },
  columnWrapper: { gap: CARD_GAP, marginBottom: CARD_GAP },
  card: {
    flex: 1, backgroundColor: Colors.card, borderRadius: 16,
    borderWidth: 1, borderColor: Colors.border, overflow: 'hidden',
    shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12, shadowRadius: 8, elevation: 6,
  },
  cardLeft: { marginRight: CARD_GAP / 2 },
  cardRight: { marginLeft: CARD_GAP / 2 },
  cardImage: { width: '100%', height: 120, resizeMode: 'cover' },
  cardImagePlaceholder: {
    width: '100%', height: 120, backgroundColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  cardBody: { padding: 10 },
  categoryBadge: {
    alignSelf: 'flex-start', backgroundColor: Colors.primary + '22',
    paddingVertical: 2, paddingHorizontal: 8, borderRadius: 8, marginBottom: 6,
  },
  categoryBadgeText: { ...Type.caption, color: Colors.primary, fontSize: 10 },
  cardTitle: { ...Type.h3, fontSize: 13, color: Colors.text, lineHeight: 18, marginBottom: 6 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { ...Type.caption, color: Colors.lightText, fontSize: 11 },
  emptyState: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 32, gap: 12 },
  emptyTitle: { ...Type.h3, color: Colors.text, fontSize: 18 },
  emptyBody: { ...Type.body, color: Colors.lightText, textAlign: 'center', lineHeight: 22 },
  fab: {
    position: 'absolute', right: 20, width: 56, height: 56, borderRadius: 28,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 8, zIndex: 100,
  },
});
