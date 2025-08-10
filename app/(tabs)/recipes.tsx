import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { Plus, BookOpen, Sparkles, TrendingUp } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useRecipeStore } from '@/hooks/useRecipeStore';
import { RecipeCard } from '@/components/RecipeCard';
import { ImportRecipeModal } from '@/components/ImportRecipeModal';
import { EnhancedRecipeDiscovery } from '@/components/EnhancedRecipeDiscovery';
import { MealDetailModal } from '@/components/MealDetailModal';
import { EnhancedRecipeDetailModal } from '@/components/EnhancedRecipeDetailModal';
import { RecipeProviderInitializer } from '@/components/RecipeProviderInitializer';
import { ExternalRecipe } from '@/utils/recipeProvider';
import { Meal } from '@/types';

export default function RecipesScreen() {
  const [showImportModal, setShowImportModal] = useState(false);
  const [showEnhancedRecipeDetail, setShowEnhancedRecipeDetail] = useState(false);
  // Local recipe detail modal removed temporarily (mismatch with ExternalRecipe modal)
  const [selectedExternalRecipe, setSelectedExternalRecipe] = useState<ExternalRecipe | null>(null);
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null);
  const [showMealDetail, setShowMealDetail] = useState(false);
  const [activeTab, setActiveTab] = useState<'local' | 'discovery'>('discovery');
  const [refreshing, setRefreshing] = useState(false);

  const {
    localRecipes: recipes,
    addLocalRecipe: addRecipe,
    removeLocalRecipe: deleteRecipe,
    saveExternalRecipe: addSavedRecipe,
    searchRecipes,
    getTrendingRecipes,
    getRandomRecipes,
    recipeProvider,
  } = useRecipeStore();

  // Meal planner integration will be reintroduced when local modal returns

  // Note: fetching is handled inside EnhancedRecipeDiscovery after provider initializes

  // Handle refresh
  const handleRefresh = async () => {
    if (!recipeProvider) {
      // Avoid triggering store actions before provider is ready
      setRefreshing(false);
      return;
    }
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

  // Handle external recipe press
  const handleExternalRecipePress = (recipe: ExternalRecipe) => {
    setSelectedExternalRecipe(recipe);
    setShowEnhancedRecipeDetail(true);
  };

  // Handle save external recipe
  const handleSaveExternalRecipe = (recipe: ExternalRecipe) => {
    addSavedRecipe(recipe);
    Alert.alert('Recipe Saved', `${recipe.title} has been added to your saved recipes.`);
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
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteRecipe(recipe.id);
          },
        },
      ]
    );
  };

  // Handle edit recipe
  const handleEditRecipe = (recipe: Meal) => {
    // For now, just close the modal
    // In the future, this could open an edit form
    Alert.alert('Edit Recipe', 'Recipe editing will be available in a future update.');
  };

  // Render local recipes tab
  const renderLocalRecipes = () => (
    <View style={styles.tabContent}>
      {recipes.length === 0 ? (
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
          {recipes.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              onPress={() => handleRecipePress(recipe)}
              onEdit={() => handleEditRecipe(recipe)}
              onDelete={() => handleDeleteRecipe(recipe)}
            />
          ))}
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

  return (
    <View style={styles.container}>
      {/* Recipe Provider Initializer */}
      <RecipeProviderInitializer />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Sparkles size={24} color={Colors.primary} />
          <Text style={styles.headerTitle}>Recipes</Text>
        </View>
        
        <View style={styles.headerActions}>
          <Button
            title="Import"
            onPress={() => setShowImportModal(true)}
            style={styles.importButton}
            icon={<Plus size={16} color={Colors.white} />}
          />
        </View>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabNavigation}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'discovery' && styles.activeTab]}
          onPress={() => setActiveTab('discovery')}
        >
          <TrendingUp size={20} color={activeTab === 'discovery' ? Colors.primary : Colors.lightText} />
          <Text style={[styles.tabText, activeTab === 'discovery' && styles.activeTabText]}>
            Discovery
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
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {activeTab === 'discovery' ? renderDiscoveryTab() : renderLocalRecipes()}
      </ScrollView>

      {/* Import Recipe Modal */}
      <ImportRecipeModal
        visible={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSave={(recipe) => {
          addRecipe(recipe);
          setShowImportModal(false);
          Alert.alert('Recipe Imported', `${recipe.name} has been successfully imported!`);
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: Colors.text,
  },
  headerActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  importButton: {
    paddingHorizontal: Spacing.md,
  },
  tabNavigation: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: Colors.primary + '10',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.lightText,
  },
  activeTabText: {
    color: Colors.primary,
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
  },
});
