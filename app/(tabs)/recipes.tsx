import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  TouchableOpacity,
  Image,
  FlatList,
  LayoutChangeEvent,
  TextInput,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BookOpen, ChefHat, Search, Brain, Plus, MoreVertical } from 'lucide-react-native';
// Removed gradient header in favor of ScreenHeader
import { Stack } from 'expo-router';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useMeals } from '@/hooks/useMealsStore';
import { useRecipeStore } from '@/hooks/useRecipeStore';
// Replace elevated cards with OutlinePanel stack rows
// Import UI removed: ImportMenu and ImportFlowModal
import { MealPlanModal } from '@/components/MealPlanModal';
import { InventoryAwareRecipeDiscovery } from '@/components/InventoryAwareRecipeDiscovery';
import { MealDetailModal } from '@/components/MealDetailModal';
import { EnhancedRecipeDetailModal } from '@/components/EnhancedRecipeDetailModal';
import { Modal as UIModal } from '@/components/ui/Modal';
import { ExternalRecipe } from '@/types/external';
import { Meal } from '@/types';
import { useRecipeFolders } from '@/hooks/useRecipeFoldersStore';
// { FolderCard } removed in favor of RecipeFolderCard grid
import { NewFolderModal } from '@/components/folders/NewFolderModal';
import CreateFolderSheet from '@/components/folders/CreateFolderSheet';
import RenameFolderSheet from '@/components/folders/RenameFolderSheet';
import { AddToFolderSheet } from '@/components/folders/AddToFolderSheet';
import RecipeFolderCard from '@/components/folders/RecipeFolderCard';
import { InventoryAwareRecipeChatInterface } from '@/components/InventoryAwareRecipeChatInterface';
import { RecipeCard } from '@/components/recipes/RecipeCard';
import { TopTabsTheme } from '@/components/ui/TopTabsTheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AddRecipesSheet } from '@/components/folders/AddRecipesSheet';

export default function RecipesScreen() {
  const insets = useSafeAreaInsets();
  // Import UI/state removed
  const [showEnhancedRecipeDetail, setShowEnhancedRecipeDetail] = useState(false);
  // Local recipe detail modal removed temporarily (mismatch with ExternalRecipe modal)
  const [selectedExternalRecipe, setSelectedExternalRecipe] = useState<ExternalRecipe | null>(null);
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null);
  const [showMealDetail, setShowMealDetail] = useState(false);
  const [activeTab, setActiveTab] = useState<'local' | 'discovery' | 'chat'>('discovery');
  // Import preview-before-save
  const [importPreviewMeal, setImportPreviewMeal] = useState<Omit<Meal, 'id'> | null>(null);
  const [isEditingPreview, setIsEditingPreview] = useState(false);
  const [isImprovingPreview, setIsImprovingPreview] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editIngredientsText, setEditIngredientsText] = useState(''); // one per line: qty unit name
  const [editStepsText, setEditStepsText] = useState(''); // one per line
  const tabs: { key: 'discovery' | 'chat' | 'local'; label: string }[] = [
    { key: 'discovery', label: 'Discover' },
    { key: 'chat', label: 'AI Chat' },
    { key: 'local', label: 'Recipes' },
  ];
  const activeIndex = tabs.findIndex(t => t.key === activeTab);
  const TAB_BAR_HEIGHT = 56; // bottom pill tab bar height
  const bottomPad = (insets?.bottom ?? 0) + TAB_BAR_HEIGHT + 24;
  const [refreshing, setRefreshing] = useState(false);
  // Folders UI state
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [showCreateFolderSheet, setShowCreateFolderSheet] = useState(false);
  const [showRenameFolderSheet, setShowRenameFolderSheet] = useState(false);
  const [folderModalMode, setFolderModalMode] = useState<'create' | 'rename'>('create');
  const [renameFolderId, setRenameFolderId] = useState<string | null>(null);
  const [addToFolderVisible, setAddToFolderVisible] = useState(false);
  const [selectedForFolderRecipeId, setSelectedForFolderRecipeId] = useState<string | null>(null);
  const [showMealPlanModal, setShowMealPlanModal] = useState(false);
  const [selectedPlanRecipeId, setSelectedPlanRecipeId] = useState<string | null>(null);
  // New folder flow state
  const [showAddRecipesModal, setShowAddRecipesModal] = useState(false);
  const [newFolderId, setNewFolderId] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [showCreateFolderEmptyState, setShowCreateFolderEmptyState] = useState(false);
  // Grid-only layout (list option removed)
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

  useEffect(() => {
    console.log('Folders in RecipesScreen:', folders);
  }, [folders]);

  const {
    searchRecipes,
    getTrendingRecipes,
    getRandomRecipes,
  } = useRecipeStore();

  // Import handlers removed

  // mapImportedToMeal removed with import feature

  // Import handlers removed

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

  const handleRecipeMenuPress = (recipe: Meal) => {
    Alert.alert(
      recipe.name,
      '',
      [
        {
          text: 'Add to collection',
          onPress: () => {
            setSelectedForFolderRecipeId(recipe.id);
            setAddToFolderVisible(true);
          },
        },
        {
          text: 'Edit',
          onPress: () => {
            // TODO: Implement edit functionality
            Alert.alert('Edit', 'Edit functionality not implemented yet.');
          },
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Delete Recipe',
              `Are you sure you want to delete "${recipe.name}"?`,
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: () => removeMeal(recipe.id),
                },
              ]
            );
          },
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ],
      { cancelable: true }
    );
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
      // Nutrition data will be populated by AI parsing when available
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

  // Folder actions
  const openCreateFolder = () => {
    setFolderModalMode('create');
    setRenameFolderId(null);
    setShowCreateFolderSheet(true);
    setShowCreateFolderEmptyState(false);
  };

  const handleCreateFolder = (name: string) => {
    const folderId = createFolder(name);
    setNewFolderId(folderId);
    setNewFolderName(name);
    setActiveFolderId(folderId);
    setShowCreateFolderSheet(false);
    setShowAddRecipesModal(true);
  };

  const handleAddRecipesToNewFolder = (recipeIds: string[]) => {
    if (newFolderId) {
      recipeIds.forEach(recipeId => {
        addRecipeToFolder(newFolderId, recipeId);
      });
    }
    setShowAddRecipesModal(false);
  };

  const requestRenameFolder = (id: string) => {
    setFolderModalMode('rename');
    setRenameFolderId(id);
    setShowRenameFolderSheet(true);
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
  
  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: '', headerShown: false }} />

      <ScreenHeader
        title="Recipes"
        icon={<ChefHat size={28} color={Colors.text} />}
      />

      <View style={styles.topTabsBar}>
        {tabs.map((t) => {
          const isActive = t.key === activeTab;
          return (
            <TouchableOpacity key={t.key} style={styles.topTabItem} onPress={() => setActiveTab(t.key)}>
              <Text style={{ color: isActive ? Colors.text : Colors.lightText, fontWeight: isActive ? '700' as const : '500' as const }}>{t.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {activeTab === 'discovery' ? (
        <InventoryAwareRecipeDiscovery onRecipePress={handleExternalRecipePress} onSaveRecipe={handleSaveExternalRecipe} />
      ) : activeTab === 'chat' ? (
        <InventoryAwareRecipeChatInterface 
          onRecipeSelect={(recipe, action) => {
            // Handle recipe selection from AI chat
            if (action === 'cook') {
              handleSaveExternalRecipe(recipe);
            }
          }}
          onViewInventory={() => {
            // Navigate to inventory tab if needed
            console.log('Navigate to inventory');
          }}
          onAddIngredient={() => {
            // Navigate to add ingredient flow
            console.log('Navigate to add ingredient');
          }}
        />
      ) : (
        <>
          <View style={styles.searchContainer}>
            <View style={styles.searchBar}>
              <Search size={18} color={Colors.lightText} />
              <TextInput
                placeholder="Search saved recipes"
                placeholderTextColor={Colors.lightText}
                style={styles.searchInput}
              />
            </View>
          </View>

          <View style={styles.folderHeader}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.folderScrollView}>
              <TouchableOpacity
                style={[styles.folderChip, !activeFolderId ? styles.folderChipActive : {}]}
                onPress={() => setActiveFolderId(null)}
              >
                <Text style={!activeFolderId ? styles.folderChipActiveText : styles.folderChipText}>All</Text>
              </TouchableOpacity>
              {folders.map((folder) => (
                <TouchableOpacity
                  key={folder.id}
                  style={[styles.folderChip, activeFolderId === folder.id ? styles.folderChipActive : {}]}
                  onPress={() => setActiveFolderId(folder.id)}
                  onLongPress={() => {
                    Alert.alert(
                      'Edit Folder',
                      '',
                      [
                        {
                          text: 'Rename',
                          onPress: () => requestRenameFolder(folder.id),
                        },
                        {
                          text: 'Delete',
                          style: 'destructive',
                          onPress: () => requestDeleteFolder(folder.id, folder.name),
                        },
                        {
                          text: 'Cancel',
                          style: 'cancel',
                        },
                      ],
                      { cancelable: true }
                    );
                  }}
                >
                  <Text style={activeFolderId === folder.id ? styles.folderChipActiveText : styles.folderChipText}>
                    {folder.name}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={styles.createFolderBtn} onPress={openCreateFolder}>
                <Plus size={16} color={Colors.primary} />
                <Text style={styles.createFolderBtnText}>Add collection</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>

          {activeFolderId && (
            <View style={styles.folderActions}>
              <Button
                title="Add Recipes to Folder"
                onPress={() => {
                  setNewFolderId(activeFolderId);
                  setNewFolderName(folders.find(f => f.id === activeFolderId)?.name || '');
                  setShowAddRecipesModal(true);
                }}
                variant="outline"
              />
            </View>
          )}

          <FlatList
            data={activeFolderId ? folders.find(f => f.id === activeFolderId)?.recipeIds.map(id => localRecipes.find(r => r.id === id)).filter(Boolean) as Meal[] : localRecipes}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <RecipeCard
                recipe={item}
                onPress={handleRecipePress}
                onMenuPress={handleRecipeMenuPress}
              />
            )}
            contentContainerStyle={styles.listContentContainer}
          />
        </>
      )}

  {/* Import feature removed */}

      <MealDetailModal
        visible={showMealDetail}
        meal={selectedMeal as any}
        onClose={() => setShowMealDetail(false)}
      />

      {selectedExternalRecipe && (
        <EnhancedRecipeDetailModal
          visible={showEnhancedRecipeDetail}
          onClose={() => setShowEnhancedRecipeDetail(false)}
          recipe={selectedExternalRecipe as any}
        />
      )}

      {/* Folder sheets */}
      <CreateFolderSheet
        visible={showCreateFolderSheet}
        onClose={() => { setShowCreateFolderSheet(false); }}
        existingNames={folders.map(f => f.name)}
        onCreate={handleCreateFolder}
      />
      <RenameFolderSheet
        visible={showRenameFolderSheet}
        defaultName={folders.find(f => f.id === renameFolderId)?.name || ''}
        existingNames={folders.map(f => f.name)}
        onClose={() => setShowRenameFolderSheet(false)}
        onRename={(name) => { if (renameFolderId) renameFolder(renameFolderId, name); setShowRenameFolderSheet(false); }}
      />
      <AddToFolderSheet
        visible={addToFolderVisible}
        recipeId={selectedForFolderRecipeId}
        onClose={() => setAddToFolderVisible(false)}
        onCreateNew={() => { setAddToFolderVisible(false); openCreateFolder(); }}
      />
      <AddRecipesSheet
        visible={showAddRecipesModal}
        folderId={newFolderId || ''}
        folderName={newFolderName}
        availableRecipes={localRecipes}
        existingRecipeIds={activeFolderId ? folders.find(f => f.id === activeFolderId)?.recipeIds || [] : []}
        onClose={() => setShowAddRecipesModal(false)}
        onAddRecipes={handleAddRecipesToNewFolder}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  topTabsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  topTabItem: { flex: 1, alignItems: 'center', paddingVertical: 10 },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.secondary,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    marginLeft: 8,
    color: Colors.text,
  },
  folderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  folderScrollView: {
    flexGrow: 1,
    alignItems: 'center',
    gap: 8,
  },
  folderChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  folderChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  folderChipText: {
    color: Colors.lightText,
    fontWeight: '600',
  },
  folderChipActiveText: {
    color: Colors.white,
    fontWeight: '700',
  },
  createFolderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    marginLeft: 8,
  },
  createFolderBtnText: {
    color: Colors.primary,
    fontWeight: '600',
    marginLeft: 4,
  },
  listContentContainer: {
    paddingHorizontal: 16,
  },
  folderActions: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  recipeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
  },
  recipeImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
  },
  recipeInfo: {
    flex: 1,
    marginLeft: 12,
  },
  menuButton: {
    padding: 8,
  },
  recipeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  recipeCookTime: {
    fontSize: 14,
    color: Colors.lightText,
    marginTop: 4,
  },
});
