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
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BookOpen, ChefHat, Search, Brain, Plus } from 'lucide-react-native';
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
import { ImportMenu, ImportType } from '@/components/ImportMenu';
import { ImportFlowModal } from '@/components/ImportFlowModal';
import { MealPlanModal } from '@/components/MealPlanModal';
import { EnhancedRecipeDiscovery } from '@/components/EnhancedRecipeDiscovery';
// Removed TileSquare/Rule in favor of FlatList grid tiles
import { MealDetailModal } from '@/components/MealDetailModal';
import { EnhancedRecipeDetailModal } from '@/components/EnhancedRecipeDetailModal';
import { ExternalRecipe } from '@/types/external';
import { Meal } from '@/types';
import { useRecipeFolders } from '@/hooks/useRecipeFoldersStore';
// { FolderCard } removed in favor of RecipeFolderCard grid
import { NewFolderModal } from '@/components/folders/NewFolderModal';
import CreateFolderSheet from '@/components/folders/CreateFolderSheet';
import RenameFolderSheet from '@/components/folders/RenameFolderSheet';
import { AddToFolderSheet } from '@/components/folders/AddToFolderSheet';
import RecipeFolderCard from '@/components/folders/RecipeFolderCard';
import RecipeChatInterface from '@/components/RecipeChatInterface';
import { TopTabsTheme } from '@/components/ui/TopTabsTheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function RecipesScreen() {
  const insets = useSafeAreaInsets();
  const [showImportMenu, setShowImportMenu] = useState(false);
  const [showImportFlow, setShowImportFlow] = useState(false);
  const [selectedImportType, setSelectedImportType] = useState<ImportType | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [showEnhancedRecipeDetail, setShowEnhancedRecipeDetail] = useState(false);
  // Local recipe detail modal removed temporarily (mismatch with ExternalRecipe modal)
  const [selectedExternalRecipe, setSelectedExternalRecipe] = useState<ExternalRecipe | null>(null);
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null);
  const [showMealDetail, setShowMealDetail] = useState(false);
  const [activeTab, setActiveTab] = useState<'local' | 'discovery' | 'chat'>('discovery');
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
  // Grid-only layout (list option removed)
  const [gridWidth, setGridWidth] = useState(0);
  const GUTTER = 16;
  const COLUMN_GAP = 16;
  const ROW_GAP = 20;
  const onGridLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w && Math.floor(w) !== Math.floor(gridWidth)) setGridWidth(Math.floor(w));
  };

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

  // Import handlers from universalImport
  // We import inline to avoid top clutter when not used in other tabs
  const {
    importRecipeFromUrlHandler,
    importRecipeFromTextHandler,
    importRecipeFromImageHandler,
    importRecipeFromVideoUrlHandler,
  } = require('@/utils/universalImport') as typeof import('@/utils/universalImport');
  const ImagePicker = require('expo-image-picker');

  const mapImportedToMeal = (recipe: any): Omit<Meal, 'id'> => {
    return {
      name: recipe?.name || 'Imported Recipe',
      description: recipe?.description || 'Imported recipe',
      ingredients: Array.isArray(recipe?.ingredients)
        ? recipe.ingredients.map((ing: any) => ({
            name: String(ing?.name || 'Ingredient'),
            quantity: typeof ing?.quantity === 'number' || typeof ing?.quantity === 'string' ? ing.quantity : 1,
            unit: String(ing?.unit || 'unit'),
            optional: !!ing?.optional,
          }))
        : [],
      steps: Array.isArray(recipe?.steps) ? recipe.steps.map((s: any) => String(s)) : [],
      image: recipe?.image,
      tags: Array.isArray(recipe?.tags) ? recipe.tags : [],
      prepTime: typeof recipe?.prepTime === 'number' ? recipe.prepTime : undefined,
      cookTime: typeof recipe?.cookTime === 'number' ? recipe.cookTime : 0,
      servings: typeof recipe?.servings === 'number' ? recipe.servings : 1,
      sourceUrl: recipe?.sourceUrl,
      nutritionPerServing: undefined,
    };
  };

  const handleOpenImportMenu = () => setShowImportMenu(true);
  const handleSelectImportType = (type: ImportType) => {
    setSelectedImportType(type);
    setShowImportMenu(false);
    setShowImportFlow(true);
  };

  const handlePerformImport = async (type: ImportType, data: any) => {
    try {
      setIsImporting(true);
      if (type === 'link') {
        if (!data || typeof data !== 'string') {
          Alert.alert('Invalid Link', 'Please enter a valid recipe URL.');
          return;
        }
        const { recipe } = await importRecipeFromUrlHandler(data.trim());
        const meal = mapImportedToMeal({ ...recipe, sourceUrl: data.trim() });
        const id = addMeal(meal);
        Alert.alert('Recipe Imported', `${meal.name} has been added to your recipes.`);
      } else if (type === 'text') {
        if (!data || typeof data !== 'string') {
          Alert.alert('Invalid Text', 'Please paste recipe text to import.');
          return;
        }
        const { recipe } = await importRecipeFromTextHandler(data);
        const meal = mapImportedToMeal(recipe);
        addMeal(meal);
        Alert.alert('Recipe Imported', `${meal.name} has been added to your recipes.`);
      } else if (type === 'image') {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.9,
          base64: false,
        });
        if (result.canceled || !result.assets?.length) {
          return; // user canceled
        }
        const asset = result.assets[0];
        const file = { uri: asset.uri, mime: asset.mimeType || 'image/jpeg', name: asset.fileName || 'image.jpg' };
        const { recipe } = await importRecipeFromImageHandler(file);
        const meal = mapImportedToMeal(recipe);
        addMeal(meal);
        Alert.alert('Recipe Imported', `${meal.name} has been added to your recipes.`);
      } else if (type === 'video') {
        if (!data || typeof data !== 'string') {
          Alert.alert('Invalid Video URL', 'Please enter a valid video URL.');
          return;
        }
        const { recipe } = await importRecipeFromVideoUrlHandler(data.trim());
        const meal = mapImportedToMeal({ ...recipe, sourceUrl: data.trim() });
        addMeal(meal);
        Alert.alert('Recipe Imported', `${meal.name} has been added to your recipes.`);
      }
      setShowImportFlow(false);
      setSelectedImportType(null);
    } catch (e: any) {
      const msg = typeof e?.message === 'string' ? e.message : 'Something went wrong.';
      // Tailored error title per type
      const titles: Record<ImportType, string> = {
        link: 'Link Import Failed',
        text: 'Text Import Failed',
        image: 'Image Import Failed',
        video: 'Video Import Failed',
      };
      Alert.alert(titles[(selectedImportType || 'link') as ImportType], msg);
      console.error('[Import Error]', e);
    } finally {
      setIsImporting(false);
    }
  };

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
    setShowCreateFolderSheet(true);
  };

  const handleSubmitFolder = (name: string) => {
    if (folderModalMode === 'rename' && renameFolderId) {
      renameFolder(renameFolderId, name);
      setShowFolderModal(false);
    }
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

  // Render local recipes with enhanced cards and folders
  const renderLocalRecipes = () => (
    <View style={styles.tabContent}>


      {/* Folders grid */}
      <View style={{ marginBottom: Spacing.md }}>
        <View style={styles.foldersHeaderRowLarge}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Button
              title="New Folder"
              onPress={openCreateFolder}
              variant="outline"
              size="sm"
              icon={<Plus size={16} color={Colors.primary} />}
              style={{ marginRight: Spacing.sm }}
            />
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
            onPress={handleOpenImportMenu}
            style={styles.importButton}
            icon={<Plus size={16} color={Colors.white} />}
          />
        </Card>
      ) : (
        <View onLayout={onGridLayout}>
          <FlatList
            data={(activeFolderId
              ? localRecipes.filter(r => folders.find(f => f.id === activeFolderId)?.recipeIds.includes(r.id))
              : localRecipes)}
            keyExtractor={(item) => item.id}
            numColumns={2}
            contentContainerStyle={{ paddingHorizontal: GUTTER, paddingTop: 12, paddingBottom: 24 }}
            showsVerticalScrollIndicator={false}
            renderItem={({ item, index }) => {
              // compute item width from available container width
              const containerInner = Math.max(gridWidth - (GUTTER * 2), 0);
              const rawWidth = (containerInner - COLUMN_GAP) / 2;
              const itemWidth = Math.floor(rawWidth);
              if (!itemWidth) return null;
              const imageHeight = Math.floor(itemWidth * 0.75); // 4:3 aspect

              const macros = item.nutritionPerServing as any | undefined;
              const calories = typeof macros?.calories === 'number' ? Math.round(macros.calories) : undefined;

              const isLeft = index % 2 === 0;
              return (
                <View style={{ width: itemWidth, marginRight: isLeft ? COLUMN_GAP : 0, marginBottom: ROW_GAP }}>
                  <TouchableOpacity activeOpacity={0.85} onPress={() => handleRecipePress(item)} onLongPress={() => handleLongPressRecipe(item)}>
                    <View style={[styles.gridImageContainer, { width: itemWidth, height: imageHeight }] }>
                      {!!item.image && (
                        <Image source={{ uri: String(item.image) }} style={styles.gridImage} />
                      )}
                    </View>
                    <View style={styles.gridInfoBox}>
                      <Text style={styles.gridTitle} numberOfLines={2} ellipsizeMode="tail">{item.name}</Text>
                      {!!calories && (
                        <Text style={styles.gridMeta}>{calories} kcal</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                </View>
              );
            }}
          />
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

      {/* Unified Screen Header */}
      <ScreenHeader
        title="Recipes"
        icon={<ChefHat size={28} color={Colors.text} />}
        rightAction={
          <Button
            title="Import"
            onPress={handleOpenImportMenu}
            variant="outline"
            size="sm"
            icon={<Plus size={16} color={Colors.primary} />}
          />
        }
      />

      {/* Top Tabs */}
      <View style={styles.topTabsBar}>
        {tabs.map((t) => {
          const isActive = t.key === activeTab;
          return (
            <TouchableOpacity key={t.key} style={styles.topTabItem} onPress={() => setActiveTab(t.key)}>
              <Text style={[TopTabsTheme.label, { color: isActive ? Colors.text : Colors.lightText, fontWeight: isActive ? '700' as const : '500' as const }]}>{t.label}</Text>
            </TouchableOpacity>
          );
        })}
        <View
          style={[
            TopTabsTheme.indicator,
            styles.topTabIndicator,
            { left: `${(activeIndex * 100) / tabs.length}%`, width: `${100 / tabs.length}%` },
          ]}
        />
      </View>

      {/* Tab Content */}
      {activeTab === 'discovery' ? (
        // EnhancedRecipeDiscovery manages its own ScrollView and refresh
        renderDiscoveryTab()
      ) : activeTab === 'chat' ? (
        <RecipeChatInterface />
      ) : (
        <FlatList
          onLayout={onGridLayout}
          data={(activeFolderId
            ? localRecipes.filter(r => folders.find(f => f.id === activeFolderId)?.recipeIds.includes(r.id))
            : localRecipes)}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={{ paddingHorizontal: GUTTER, paddingTop: 12, paddingBottom: bottomPad }}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          ListHeaderComponent={
            <View style={{ marginBottom: Spacing.md }}>
              <View style={styles.foldersHeaderRowLarge}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Button
                    title="New Folder"
                    onPress={openCreateFolder}
                    variant="outline"
                    size="sm"
                    icon={<Plus size={16} color={Colors.primary} />}
                    style={{ marginRight: Spacing.sm }}
                  />
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
          }
          ListEmptyComponent={
            <Card style={styles.emptyState}>
              <BookOpen size={48} color={Colors.lightText} />
              <LoadingSpinner text="No recipes yet. Import your first recipe to get started!" />
              <Button
                title="Import Recipe"
                onPress={handleOpenImportMenu}
                style={styles.importButton}
                icon={<Plus size={16} color={Colors.white} />}
              />
            </Card>
          }
          renderItem={({ item, index }) => {
            // compute item width from available container width
            const containerInner = Math.max(gridWidth - (GUTTER * 2), 0);
            const rawWidth = (containerInner - COLUMN_GAP) / 2;
            const itemWidth = Math.floor(rawWidth);
            if (!itemWidth) return null;
            const imageHeight = Math.floor(itemWidth * 0.75); // 4:3 aspect

            const macros = item.nutritionPerServing as any | undefined;
            const calories = typeof macros?.calories === 'number' ? Math.round(macros.calories) : undefined;

            const isLeft = index % 2 === 0;
            return (
              <View style={{ width: itemWidth, marginRight: isLeft ? COLUMN_GAP : 0, marginBottom: ROW_GAP }}>
                <TouchableOpacity activeOpacity={0.85} onPress={() => handleRecipePress(item)} onLongPress={() => handleLongPressRecipe(item)}>
                  <View style={[styles.gridImageContainer, { width: itemWidth, height: imageHeight }] }>
                    {!!item.image && (
                      <Image source={{ uri: String(item.image) }} style={styles.gridImage} />
                    )}
                  </View>
                  <View style={styles.gridInfoBox}>
                    <Text style={styles.gridTitle} numberOfLines={2} ellipsizeMode="tail">{item.name}</Text>
                    {!!calories && (
                      <Text style={styles.gridMeta}>{calories} kcal</Text>
                    )}
                  </View>
                </TouchableOpacity>
              </View>
            );
          }}
        />
      )}

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
      {/* New modular Import Menu + Flow */}
      <ImportMenu
        visible={showImportMenu}
        onClose={() => setShowImportMenu(false)}
        onSelect={handleSelectImportType}
      />
      <ImportFlowModal
        visible={showImportFlow}
        importType={selectedImportType}
        onClose={() => { setShowImportFlow(false); setSelectedImportType(null); }}
        onImport={handlePerformImport}
        isLoading={isImporting}
      />

      {/* Create Folder Bottom Sheet */}
      <CreateFolderSheet
        visible={showCreateFolderSheet}
        onClose={() => setShowCreateFolderSheet(false)}
        existingNames={folders.map(f => f.name)}
        onCreate={(name) => {
          const id = createFolder(name);
          setActiveFolderId(id);
          setShowCreateFolderSheet(false);
        }}
      />

      {/* Rename Folder Bottom Sheet */}
      <RenameFolderSheet
        visible={showRenameFolderSheet}
        defaultName={folderModalMode === 'rename' && renameFolderId ? (folders.find(f => f.id === renameFolderId)?.name || '') : ''}
        onClose={() => setShowRenameFolderSheet(false)}
        onRename={(name) => {
          if (renameFolderId) {
            renameFolder(renameFolderId, name);
          }
          setShowRenameFolderSheet(false);
        }}
        existingNames={folders.map(f => f.name)}
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
  importButton: {
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
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
  topTabsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    position: 'relative',
  },
  topTabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  topTabIndicator: {
    position: 'absolute',
    bottom: 0,
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
  foldersHeaderRowLarge: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: Spacing.lg, marginBottom: Spacing.sm },
  foldersGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: Spacing.lg },
  folderGridItem: { width: '48%', margin: '1%' },
  // Grid items
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
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
  },
  gridMeta: {
    marginTop: 2,
    color: Colors.lightText,
    fontSize: 13,
    lineHeight: 18,
  },
});
