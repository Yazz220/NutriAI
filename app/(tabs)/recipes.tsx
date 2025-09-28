import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Image,
  FlatList,
  TextInput,
  Animated,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Plus, DotsThreeVertical, Clock, Fire } from 'phosphor-react-native';
import RecipePageIcon from '@/assets/icons/Recipe page.svg';
import SearchIcon from '@/assets/icons/search.svg';
import { X } from 'lucide-react-native';

// Constants
import { Colors } from '@/constants/colors';
import { Typography as Type } from '@/constants/typography';

// Components
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { InventoryAwareRecipeDiscovery } from '@/components/InventoryAwareRecipeDiscovery';
import { MealDetailModal } from '@/components/MealDetailModal';
import { EnhancedRecipeDetailModal } from '@/components/EnhancedRecipeDetailModal';
import CreateFolderSheet from '@/components/folders/CreateFolderSheet';
import RenameFolderSheet from '@/components/folders/RenameFolderSheet';
import { AddToFolderSheet } from '@/components/folders/AddToFolderSheet';
import { AddRecipesSheet } from '@/components/folders/AddRecipesSheet';

// Hooks
import { useMeals } from '@/hooks/useMealsStore';
import { useRecipeStore } from '@/hooks/useRecipeStore';
import { useRecipeFolders } from '@/hooks/useRecipeFoldersStore';

// Types
import { ExternalRecipe } from '@/types/external';
import { Meal, RecipeFolder } from '@/types';

export default function RecipesScreen() {
  const insets = useSafeAreaInsets();
  // Import UI/state removed
  // Modal states
  const [showEnhancedRecipeDetail, setShowEnhancedRecipeDetail] = useState(false);
  const [selectedExternalRecipe, setSelectedExternalRecipe] = useState<ExternalRecipe | null>(null);
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null);
  const [showMealDetail, setShowMealDetail] = useState(false);
  
  // Tab state
  const [activeTab, setActiveTab] = useState<'local' | 'discovery'>('discovery');
  // Tab configuration and animation
  const tabs = [
    { key: 'discovery' as const, label: 'Discover' },
    { key: 'local' as const, label: 'Recipes' },
  ];
  const activeIndex = tabs.findIndex(t => t.key === activeTab);
  const [segWidth, setSegWidth] = useState(0);
  const indicatorX = useRef(new Animated.Value(0)).current;
  const [refreshing, setRefreshing] = useState(false);

  // Animate tab indicator
  useEffect(() => {
    if (segWidth > 0 && activeIndex >= 0) {
      const segmentWidth = segWidth / tabs.length;
      Animated.spring(indicatorX, {
        toValue: activeIndex * segmentWidth,
        useNativeDriver: true,
        friction: 10,
        tension: 90,
      }).start();
    }
  }, [activeIndex, segWidth, indicatorX]);
  // Folder management state
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [showCreateFolderSheet, setShowCreateFolderSheet] = useState(false);
  const [showRenameFolderSheet, setShowRenameFolderSheet] = useState(false);
  const [renameFolderId, setRenameFolderId] = useState<string | null>(null);
  const [addToFolderVisible, setAddToFolderVisible] = useState(false);
  const [selectedForFolderRecipeId, setSelectedForFolderRecipeId] = useState<string | null>(null);
  const [showAddRecipesModal, setShowAddRecipesModal] = useState(false);
  const [newFolderId, setNewFolderId] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  
  // Local search and favorites
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  // Load favorites from storage on mount
  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    try {
      const stored = await AsyncStorage.getItem('favoriteRecipes');
      if (stored) {
        const favoriteArray: string[] = JSON.parse(stored);
        setFavoriteIds(new Set(favoriteArray));
      }
    } catch (error) {
      console.warn('Failed to load favorites:', error);
    }
  };

  const persistFavorites = useCallback(async (favorites: Set<string>) => {
    try {
      await AsyncStorage.setItem('favoriteRecipes', JSON.stringify(Array.from(favorites)));
    } catch (error) {
      console.warn('Failed to save favorites:', error);
    }
  }, []);

  const toggleFavorite = useCallback((recipeId: string) => {
    setFavoriteIds(prev => {
      const updated = new Set(prev);
      if (updated.has(recipeId)) {
        updated.delete(recipeId);
      } else {
        updated.add(recipeId);
      }
      persistFavorites(updated);
      return updated;
    });
  }, [persistFavorites]);

  // Hooks
  const { meals: localRecipes, addMeal, removeMeal } = useMeals();
  const { 
    folders, 
    createFolder, 
    renameFolder, 
    deleteFolder, 
    toggleRecipeInFolder, 
    addRecipeToFolder 
  } = useRecipeFolders();
  const { getTrendingRecipes, getRandomRecipes } = useRecipeStore();

  // Filter local recipes (and folder view) by name or tags and exclude placeholders (no ingredients & no steps)
  const filteredLocalRecipes = React.useMemo(() => {
    const q = localSearchQuery.trim().toLowerCase();
    const isMeaningful = (m: Meal) =>
      !!m?.name?.trim() && ((m?.ingredients?.length || 0) > 0 || (m?.steps?.length || 0) > 0);

    const baseList: Meal[] = activeFolderId
      ? (folders.find((f: RecipeFolder) => f.id === activeFolderId)?.recipeIds || [])
          .map((id: string) => localRecipes.find((r: Meal) => r.id === id))
          .filter(Boolean) as Meal[]
      : localRecipes;

    const meaningfulList = baseList.filter(isMeaningful);

    if (!q) return meaningfulList;

    return meaningfulList.filter((item: Meal) => {
      const nameMatch = item.name?.toLowerCase().includes(q);
      const tags = item.tags || [];
      const tagMatch = tags.join(' ').toLowerCase().includes(q);
      return Boolean(nameMatch || tagMatch);
    });
  }, [localSearchQuery, localRecipes, activeFolderId, folders]);

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

  // Folder management functions
  const openCreateFolder = () => {
    setRenameFolderId(null);
    setShowCreateFolderSheet(true);
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
    setRenameFolderId(id);
    setShowRenameFolderSheet(true);
  };

  const requestDeleteFolder = (folderId: string, folderName: string) => {
    Alert.alert(
      'Delete Folder', 
      `Delete "${folderName}"? Recipes remain available in All Recipes.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive', 
          onPress: () => {
            if (activeFolderId === folderId) {
              setActiveFolderId(null);
            }
            deleteFolder(folderId);
          }
        },
      ]
    );
  };
  
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

      {/* Segmented control for Recipes tabs (single track + sliding indicator) */}
      <View
        style={styles.segmentedContainer}
        onLayout={(e) => setSegWidth(e.nativeEvent.layout.width)}
      >
        <View style={styles.segmentTrack}>
          {segWidth > 0 && (
            <Animated.View
              style={[
                styles.segmentIndicator,
                { width: segWidth / tabs.length, transform: [{ translateX: indicatorX }] },
              ]}
            />
          )}
        </View>
        <View style={styles.segmentsOverlay} pointerEvents="box-none">
          {tabs.map((t) => {
            const isActive = t.key === activeTab;
            return (
              <TouchableOpacity
                key={t.key}
                style={styles.segmentClick}
                onPress={() => setActiveTab(t.key)}
                accessibilityRole="button"
                accessibilityLabel={`Switch to ${t.label}`}
                activeOpacity={0.9}
              >
                <Text style={isActive ? styles.segmentTextActive : styles.segmentText}>{t.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {activeTab === 'discovery' ? (
        <InventoryAwareRecipeDiscovery onRecipePress={handleExternalRecipePress} onSaveRecipe={handleSaveExternalRecipe} />
      ) : (
        <>
          <View style={styles.searchContainer}>
            <View style={styles.searchBar}>
              <SearchIcon width={24} height={24} color={Colors.lightText} />
              <TextInput
                placeholder="Search saved recipes"
                placeholderTextColor={Colors.lightText}
                style={styles.searchInput}
                value={localSearchQuery}
                onChangeText={setLocalSearchQuery}
                returnKeyType="search"
                onSubmitEditing={() => { /* no-op for now */ }}
              />
              {localSearchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setLocalSearchQuery('')} style={{ padding: 6 }}>
                  <X size={14} color={Colors.lightText} />
                </TouchableOpacity>
              )}
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
              {folders.map((folder: RecipeFolder) => (
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

          {/* Moved Add-to-Folder action to a floating button for cleaner layout */}

          <FlatList
            data={filteredLocalRecipes}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.recipeCard} onPress={() => handleRecipePress(item)}>
                <Image source={{ uri: item.image }} style={styles.recipeImage} />
                <View style={styles.recipeInfo}>
                  <Text style={styles.recipeTitle}>{item.name}</Text>
                  <View style={styles.recipeMeta}>
                    <View style={styles.metaItem}>
                      <Clock size={14} color={Colors.lightText} />
                      <Text style={styles.metaText}>{item.cookTime}m</Text>
                    </View>
                    {item.nutritionPerServing?.calories && (
                      <View style={styles.metaItem}>
                        <Fire size={14} color={Colors.primary} />
                        <Text style={styles.caloriesText}>{Math.round(item.nutritionPerServing.calories)}</Text>
                      </View>
                    )}
                  </View>
                </View>
                <TouchableOpacity style={styles.menuButton} onPress={() => handleRecipeMenuPress(item)}>
                  <DotsThreeVertical size={20} color={Colors.lightText} />
                </TouchableOpacity>
              </TouchableOpacity>
            )}
            contentContainerStyle={[
              styles.listContentContainer,
              { paddingBottom: Math.max(150, (insets?.bottom ?? 0) + 118) },
            ]}
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
        existingNames={folders.map((f: RecipeFolder) => f.name)}
        onCreate={handleCreateFolder}
      />
      <RenameFolderSheet
        visible={showRenameFolderSheet}
        defaultName={folders.find((f: RecipeFolder) => f.id === renameFolderId)?.name || ''}
        existingNames={folders.map((f: RecipeFolder) => f.name)}
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
        existingRecipeIds={activeFolderId ? folders.find((f: RecipeFolder) => f.id === activeFolderId)?.recipeIds || [] : []}
        onClose={() => setShowAddRecipesModal(false)}
        onAddRecipes={handleAddRecipesToNewFolder}
      />

      {/* Floating action to add recipes to current folder */}
      {activeFolderId && (
        <TouchableOpacity
          style={[
            styles.fab,
            { bottom: Math.max(20, (insets?.bottom ?? 0) + 118 + 20) },
          ]}
          onPress={() => {
            setNewFolderId(activeFolderId);
            setNewFolderName(
              folders.find((f: RecipeFolder) => f.id === activeFolderId)?.name || ''
            );
            setShowAddRecipesModal(true);
          }}
          accessibilityRole="button"
          accessibilityLabel="Add recipes to folder"
          activeOpacity={0.9}
        >
          <Plus size={22} color={Colors.white} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  // Segmented control (single line + indicator)
  segmentedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 0,
    marginTop: 8,
    backgroundColor: 'transparent',
    position: 'relative',
  },
  segmentTrack: {
    flex: 1,
    height: 40,
    backgroundColor: 'transparent',
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  segmentIndicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: Colors.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  segmentsOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    flexDirection: 'row',
  },
  segmentClick: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentText: {
    ...Type.caption,
    color: Colors.lightText,
  },
  segmentTextActive: {
    ...Type.caption,
    color: Colors.text,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.tabBackground, // transparent-like, matches inventory
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    ...Type.body,
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
    ...Type.caption,
    color: Colors.lightText,
  },
  folderChipActiveText: {
    ...Type.caption,
    color: Colors.white,
  },
  createFolderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    marginLeft: 8,
  },
  createFolderBtnText: {
    ...Type.caption,
    color: Colors.primary,
    marginLeft: 4,
  },
  listContentContainer: {
    paddingHorizontal: 16,
  },
  
  recipeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 10,
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
    ...Type.h3,
    fontSize: 16,
    color: Colors.text,
  },
  recipeMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
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
  caloriesText: {
    ...Type.caption,
    color: Colors.primary,
    fontWeight: '600',
  },
  // Floating Add button (consistent with app FAB usage)
  fab: {
    position: 'absolute',
    right: 20,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 8,
  },
});
