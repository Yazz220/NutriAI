import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  TouchableOpacity,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Plus, BookOpen, ChefHat, Search, Brain } from 'lucide-react-native';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
import { Stack } from 'expo-router';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useMeals } from '@/hooks/useMealsStore';
import { useRecipeStore } from '@/hooks/useRecipeStore';
import { EnhancedRecipeCard } from '@/components/EnhancedRecipeCard';
import { ImportRecipeModal } from '@/components/ImportRecipeModal';
import { MealPlanModal } from '@/components/MealPlanModal';
import { EnhancedRecipeDiscovery } from '@/components/EnhancedRecipeDiscovery';
import { MealDetailModal } from '@/components/MealDetailModal';
import { EnhancedRecipeDetailModal } from '@/components/EnhancedRecipeDetailModal';
import { ExternalRecipe } from '@/types/external';
import { Meal } from '@/types';
import { useRecipeFolders } from '@/hooks/useRecipeFoldersStore';
// { FolderCard } removed in favor of RecipeFolderCard grid
import { NewFolderModal } from '@/components/folders/NewFolderModal';
import { AddToFolderSheet } from '@/components/folders/AddToFolderSheet';
import RecipeFolderCard from '@/components/folders/RecipeFolderCard';
import RecipeChatInterface from '@/components/RecipeChatInterface';

export default function RecipesScreen() {
  const [showImportModal, setShowImportModal] = useState(false);
  const [showEnhancedRecipeDetail, setShowEnhancedRecipeDetail] = useState(false);
  // Local recipe detail modal removed temporarily (mismatch with ExternalRecipe modal)
  const [selectedExternalRecipe, setSelectedExternalRecipe] = useState<ExternalRecipe | null>(null);
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null);
  const [showMealDetail, setShowMealDetail] = useState(false);
  const [activeTab, setActiveTab] = useState<'local' | 'discovery' | 'chat'>('discovery');
  const [refreshing, setRefreshing] = useState(false);
  // Folders UI state
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [folderModalMode, setFolderModalMode] = useState<'create' | 'rename'>('create');
  const [renameFolderId, setRenameFolderId] = useState<string | null>(null);
  const [addToFolderVisible, setAddToFolderVisible] = useState(false);
  const [selectedForFolderRecipeId, setSelectedForFolderRecipeId] = useState<string | null>(null);
  const [showMealPlanModal, setShowMealPlanModal] = useState(false);
  const [selectedPlanRecipeId, setSelectedPlanRecipeId] = useState<string | null>(null);

  // Favorites (persisted locally)
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  // Load favorites on mount
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem('favoriteRecipes');
        if (stored) {
          const arr: string[] = JSON.parse(stored);
          setFavoriteIds(new Set(arr));
        }
      } catch (e) {
        console.warn('Failed to load favorites', e);
      }
    })();
  }, []);

  const persistFavorites = useCallback(async (setRef: Set<string>) => {
    try {
      await AsyncStorage.setItem('favoriteRecipes', JSON.stringify(Array.from(setRef)));
    } catch (e) {
      console.warn('Failed to save favorites', e);
    }
  }, []);

  const toggleFavorite = useCallback((id: string) => {
    setFavoriteIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      // fire and forget
      persistFavorites(next);
      return next;
    });
  }, [persistFavorites]);

  // Use meals from the meals store for local recipes
  const { meals: localRecipes, addMeal, removeMeal, updateMeal } = useMeals();
  const { folders, createFolder, renameFolder, deleteFolder, getFoldersForRecipe, removeRecipeFromAllFolders, toggleRecipeInFolder, addRecipeToFolder } = useRecipeFolders();

  const {
    searchRecipes,
    getTrendingRecipes,
    getRandomRecipes,
  } = useRecipeStore();

  // Meal planner integration will be reintroduced when local modal returns

  // Note: fetching is handled inside EnhancedRecipeDiscovery after provider initializes

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        getTrendingRecipes(),
        // Refresh external recipes if discovery tab is active
        ...(activeTab === 'discovery' ? [getRandomRecipes(['main course', 'healthy'], 10)] : []),
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  // Handle recipe press (local recipes)
  const handleRecipePress = (recipe: Meal) => {
    setSelectedMeal(recipe);
    setShowMealDetail(true);
  };

  const handleLongPressRecipe = (recipe: Meal) => {
    if (activeFolderId) {
      // Quick toggle membership in the active folder
      toggleRecipeInFolder(activeFolderId, recipe.id);
      return;
    }
    setSelectedForFolderRecipeId(recipe.id);
    setAddToFolderVisible(true);
  };

  // Handle external recipe press
  const handleExternalRecipePress = (recipe: ExternalRecipe) => {
    setSelectedExternalRecipe(recipe);
    setShowEnhancedRecipeDetail(true);
  };

  // Handle save external recipe
  const handleSaveExternalRecipe = (recipe: ExternalRecipe) => {
    // Convert ExternalRecipe to Meal format and add to meals (provider-agnostic)
    const steps = recipe.analyzedInstructions?.[0]?.steps?.map((step: any) => step.step)
      || (recipe.instructions ? recipe.instructions.split('\n').filter(Boolean) : ['Follow recipe instructions']);

    const tags = [
      ...(recipe.cuisines || []),
      ...(recipe.diets || []),
      ...(recipe.dishTypes || []),
      recipe.vegetarian ? 'vegetarian' : '',
      recipe.vegan ? 'vegan' : '',
      recipe.glutenFree ? 'gluten-free' : '',
      recipe.dairyFree ? 'dairy-free' : '',
    ].filter(Boolean) as string[];

    const newMeal: Omit<Meal, 'id'> = {
      name: recipe.title,
      description: (recipe.instructions || 'Imported recipe').slice(0, 200),
      ingredients: (recipe.ingredients || []).map((ing: any) => ({
        name: ing.name,
        quantity: ing.amount || 1,
        unit: ing.unit || 'unit',
        optional: false,
      })),
      steps,
      image: recipe.image,
      tags,
      prepTime: recipe.preparationMinutes || recipe.readyInMinutes || 15,
      cookTime: recipe.cookingMinutes || 0,
      servings: recipe.servings || 1,
      sourceUrl: recipe.sourceUrl,
      // Nutrition array varies by provider; skip unless available via nutrients mapping
      nutritionPerServing: undefined,
    };

    const newId = addMeal(newMeal);
    // If a folder is active, drop it in immediately; else prompt via AddToFolderSheet
    if (activeFolderId) {
      addRecipeToFolder(activeFolderId, newId);
      Alert.alert('Saved', `${recipe.title} was added to your recipes and placed in the selected folder.`);
    } else {
      setSelectedForFolderRecipeId(newId);
      setAddToFolderVisible(true);
      Alert.alert('Recipe Saved', `${recipe.title} has been added to your recipes. Choose a folder to organize it.`);
    }
  };
  
  // (Optional) Remove-saved-recipe could be implemented in store later

  // Handle add to meal plan (handled within modal if needed)

  // Handle search
  const handleSearch = async (searchParams: any) => {
    try {
      await searchRecipes(searchParams);
    } catch (error) {
      console.error('Search error:', error);
    }
  };

  // Handle delete recipe
  const handleDeleteRecipe = (recipe: Meal) => {
    Alert.alert(
      'Delete Recipe',
      `Are you sure you want to delete "${recipe.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => {
            // Remove from local meals
            removeMeal(recipe.id);
            // Remove references from all folders in one pass (handles id normalization)
            removeRecipeFromAllFolders(recipe.id);
          }}
      ]
    );
  };

  // Handle edit recipe
  const handleEditRecipe = (recipe: Meal) => {
    // Guarded UX: editing to be implemented; for now, inform the user
    Alert.alert('Edit Recipe', 'Editing will be available soon. For external recipes, import/save first.');
  };

  // Folder actions
  const openCreateFolder = () => {
    setFolderModalMode('create');
    setRenameFolderId(null);
    setShowFolderModal(true);
  };

  const handleSubmitFolder = (name: string) => {
    if (folderModalMode === 'create') {
      const id = createFolder(name);
      setActiveFolderId(id);
    } else if (folderModalMode === 'rename' && renameFolderId) {
      renameFolder(renameFolderId, name);
    }
    setShowFolderModal(false);
  };

  const requestRenameFolder = (id: string) => {
    setFolderModalMode('rename');
    setRenameFolderId(id);
    setShowFolderModal(true);
  };

  const requestDeleteFolder = (id: string, name: string) => {
    Alert.alert('Delete Folder', `Delete "${name}"? Recipes remain available in All Recipes.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => {
        if (activeFolderId === id) setActiveFolderId(null);
        deleteFolder(id);
      } },
    ]);
  };

  // Render local recipes with enhanced cards and folders
  const renderLocalRecipes = () => (
    <View style={styles.tabContent}>


      {/* Folders grid */}
      <View style={{ marginBottom: Spacing.md }}>
        <View style={styles.foldersHeaderRowLarge}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity style={styles.newFolderBtn} onPress={openCreateFolder}>
              <Text style={styles.newFolderText}>+ New Folder</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.allFolderPill, !activeFolderId && styles.allFolderPillActive, { marginLeft: Spacing.sm }]} onPress={() => setActiveFolderId(null)}>
              <Text style={[styles.allFolderText, !activeFolderId && styles.allFolderTextActive]}>All recipes</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.foldersGrid}>
          {folders.length === 0 ? (
            <View style={{ padding: Spacing.md }}>
              <Text style={{ color: Colors.lightText }}>You haven't created any folders yet — use New Folder to get started.</Text>
            </View>
          ) : (
            folders.map((f) => (
              <View key={f.id} style={styles.folderGridItem}>
                <RecipeFolderCard
                  name={f.name}
                  recipeCount={f.recipeIds.length}
                  color={Colors.primary}
                  onPress={() => setActiveFolderId(f.id)}
                  onMore={() => Alert.alert(f.name, undefined, [
                    { text: 'Rename', onPress: () => requestRenameFolder(f.id) },
                    { text: 'Delete', style: 'destructive', onPress: () => requestDeleteFolder(f.id, f.name) },
                    { text: 'Cancel', style: 'cancel' },
                  ])}
                />
              </View>
            ))
          )}
        </View>
      </View>

      {/* Recipes list */}
      {localRecipes.length === 0 ? (
        <Card style={styles.emptyState}>
          <BookOpen size={48} color={Colors.lightText} />
          <LoadingSpinner text="No recipes yet. Import your first recipe to get started!" />
          <Button
            title="Import Recipe"
            onPress={() => setShowImportModal(true)}
            style={styles.importButton}
          />
        </Card>
      ) : (
        <View style={styles.recipesList}>
          {(activeFolderId
            ? localRecipes.filter(r => folders.find(f => f.id === activeFolderId)?.recipeIds.includes(r.id))
            : localRecipes
          ).map((recipe) => {
            const inActiveFolder = activeFolderId
              ? !!folders.find(f => f.id === activeFolderId)?.recipeIds.includes(recipe.id)
              : false;
            return (
              <EnhancedRecipeCard
                key={recipe.id}
                recipe={recipe}
                onPress={() => handleRecipePress(recipe)}
                onLongPress={() => handleLongPressRecipe(recipe)}
                onFavorite={() => toggleFavorite(recipe.id)}
                isFavorite={favoriteIds.has(recipe.id)}
                accessoryLabel={activeFolderId ? (inActiveFolder ? 'Remove' : 'Add') : undefined}
                onAccessoryPress={activeFolderId ? () => toggleRecipeInFolder(activeFolderId, recipe.id) : undefined}
                onPlan={() => { setSelectedPlanRecipeId(recipe.id); setShowMealPlanModal(true); }}
              />
            );
          })}
        </View>
      )}
    </View>
  );

  // Render discovery tab
  const renderDiscoveryTab = () => (
    <EnhancedRecipeDiscovery
      onRecipePress={handleExternalRecipePress}
      onSaveRecipe={handleSaveExternalRecipe}
      onSearch={handleSearch}
    />
  );

  // Stats removed to reclaim space

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: '', headerShown: false }} />

      {/* Enhanced Hero Header */}
      <ExpoLinearGradient
        colors={[Colors.background, Colors.background]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <View style={styles.statusBarSpacer} />
        
        {/* Header (icon + title on left, + on right for consistency) */}
        <View style={styles.heroHeader}>
          <View style={styles.heroTitleRow}>
            <ChefHat size={28} color={Colors.white} />
            <Text style={styles.heroTitle}>Recipes</Text>
          </View>
          <TouchableOpacity style={styles.importButton} onPress={() => setShowImportModal(true)}>
            <Plus size={24} color={Colors.white} />
          </TouchableOpacity>
        </View>

        {/* Stats row removed */}
      </ExpoLinearGradient>

      {/* Enhanced Tab Navigation */}
      <View style={styles.tabNavigation}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'discovery' && styles.activeTab]}
          onPress={() => setActiveTab('discovery')}
        >
          <Search size={20} color={activeTab === 'discovery' ? Colors.primary : Colors.lightText} />
          <Text style={[styles.tabText, activeTab === 'discovery' && styles.activeTabText]}>
            Discovery
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'chat' && styles.activeTab]}
          onPress={() => setActiveTab('chat')}
        >
          <Brain size={20} color={activeTab === 'chat' ? Colors.primary : Colors.lightText} />
          <Text style={[styles.tabText, activeTab === 'chat' && styles.activeTabText]}>
            AI Chat
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'local' && styles.activeTab]}
          onPress={() => setActiveTab('local')}
        >
          <BookOpen size={20} color={activeTab === 'local' ? Colors.primary : Colors.lightText} />
          <Text style={[styles.tabText, activeTab === 'local' && styles.activeTabText]}>
            My Recipes
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      {activeTab === 'discovery' ? (
        // EnhancedRecipeDiscovery manages its own ScrollView and refresh
        renderDiscoveryTab()
      ) : activeTab === 'chat' ? (
        <RecipeChatInterface />
      ) : (
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          {renderLocalRecipes()}
        </ScrollView>
      )}

      {/* Import Recipe Modal */}
      {/* MealPlanModal for quick-plan from recipe cards */}
      <MealPlanModal
        visible={showMealPlanModal}
        selectedDate={new Date().toISOString().split('T')[0]}
        initialRecipeId={selectedPlanRecipeId ?? undefined}
  initialFolderId={activeFolderId ?? undefined}
        onClose={() => { setShowMealPlanModal(false); setSelectedPlanRecipeId(null); }}
        onSave={async (planned) => {
          setShowMealPlanModal(false);
          setSelectedPlanRecipeId(null);
          Alert.alert('Planned', 'Recipe added to your meal plan.');
        }}
      />
      <ImportRecipeModal
        visible={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSave={(meal) => {
          addMeal(meal);
          setShowImportModal(false);
          Alert.alert('Recipe Imported', `${meal.name} has been successfully imported!`);
        }}
      />

      {/* New/Rename Folder Modal */}
      <NewFolderModal
        visible={showFolderModal}
        mode={folderModalMode}
        defaultName={folderModalMode === 'rename' && renameFolderId ? (folders.find(f => f.id === renameFolderId)?.name || '') : ''}
        onClose={() => setShowFolderModal(false)}
        onSubmit={handleSubmitFolder}
      />

      {/* Add To Folder Sheet */}
      <AddToFolderSheet
        visible={addToFolderVisible}
        recipeId={selectedForFolderRecipeId}
        onClose={() => setAddToFolderVisible(false)}
        onCreateNew={() => {
          setAddToFolderVisible(false);
          openCreateFolder();
        }}
      />

      {/* Local Recipe Detail Modal */}
      {selectedMeal && (
        <MealDetailModal
          visible={showMealDetail}
          meal={selectedMeal}
          onClose={() => {
            setShowMealDetail(false);
            setSelectedMeal(null);
          }}
        />
      )}

      {/* Enhanced External Recipe Detail Modal */}
      {selectedExternalRecipe && (
        <EnhancedRecipeDetailModal
          recipe={selectedExternalRecipe!}
          visible={showEnhancedRecipeDetail}
          onClose={() => {
            setShowEnhancedRecipeDetail(false);
            setSelectedExternalRecipe(null);
          }}
        />
      )}
    </View>
  );
}

// Stats component removed

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  hero: {
    paddingBottom: 12,
    paddingHorizontal: 20,
    minHeight: 180,
  },
  statusBarSpacer: {
    height: Platform.OS === 'ios' ? 44 : 24,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 10,
  },
  heroTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroTitle: {
    color: Colors.white,
    fontSize: 24,
    fontWeight: '700',
    marginLeft: 12,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  importButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  // stats styles removed
  // Folders UI
  foldersHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  newFolderBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.primary + '15',
  },
  newFolderText: {
    color: Colors.primary,
    fontWeight: '600',
  },
  allFolderPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: Spacing.sm,
  },
  allFolderPillActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  allFolderText: {
    color: Colors.text,
    fontWeight: '600',
  },
  allFolderTextActive: {
    color: Colors.white,
  },
  tabNavigation: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: Colors.card,
    marginHorizontal: 16,
    marginTop: -8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 12,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 10,
  },
  activeTab: {
    backgroundColor: Colors.primary + '15',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.lightText,
  },
  activeTabText: {
    color: Colors.primary,
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  tabContent: {
    padding: Spacing.lg,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xl * 2,
    gap: Spacing.lg,
  },
  recipesList: {
    gap: Spacing.md,
    alignItems: 'center',
  },
  foldersHeaderRowLarge: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: Spacing.lg, marginBottom: Spacing.sm },
  foldersGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: Spacing.lg },
  folderGridItem: { width: '48%', margin: '1%' },
});
