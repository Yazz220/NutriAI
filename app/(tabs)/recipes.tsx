import React, { useState } from 'react';
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
import { Plus, BookOpen, Sparkles, TrendingUp, ChefHat, Heart, Search } from 'lucide-react-native';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useMeals } from '@/hooks/useMealsStore';
import { useRecipeStore } from '@/hooks/useRecipeStore';
import { EnhancedRecipeCard } from '@/components/EnhancedRecipeCard';
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

  // Use meals from the meals store for local recipes
  const { meals: localRecipes, addMeal, removeMeal, updateMeal } = useMeals();

  const {
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
      // Nutrition array varies by provider; skip unless available via nutrients mapping
      nutritionPerServing: undefined,
    };

    addMeal(newMeal);
    Alert.alert('Recipe Saved', `${recipe.title} has been added to your recipes.`);
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
        { text: 'Delete', style: 'destructive', onPress: () => removeMeal(recipe.id) }
      ]
    );
  };

  // Handle edit recipe
  const handleEditRecipe = (recipe: Meal) => {
    // TODO: Implement edit functionality
    Alert.alert('Edit Recipe', 'Edit functionality coming soon!');
  };

  // Render local recipes with enhanced cards
  const renderLocalRecipes = () => (
    <View style={styles.tabContent}>
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
          {localRecipes.map((recipe) => (
            <EnhancedRecipeCard
              key={recipe.id}
              recipe={recipe}
              onPress={() => handleRecipePress(recipe)}
              onFavorite={() => {
                // TODO: Implement favorite functionality
                console.log('Favorite recipe:', recipe.name);
              }}
              isFavorite={false} // TODO: Get from user preferences
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

  // Calculate stats
  const totalRecipes = localRecipes.length;
  const favoriteRecipes = 0; // TODO: Implement favorites
  const recentRecipes = localRecipes.slice(0, 3).length;

  return (
    <View style={styles.container}>
      {/* Recipe Provider Initializer */}
      <RecipeProviderInitializer />

      {/* Enhanced Hero Header */}
      <ExpoLinearGradient
        colors={['#ff9a9e', '#fecfef', '#fecfef']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <View style={styles.statusBarSpacer} />
        
        {/* Header */}
        <View style={styles.heroHeader}>
          <View style={styles.heroTitleRow}>
            <ChefHat size={28} color={Colors.white} />
            <Text style={styles.heroTitle}>Recipes</Text>
          </View>
          <TouchableOpacity style={styles.importButton} onPress={() => setShowImportModal(true)}>
            <Plus size={24} color={Colors.white} />
          </TouchableOpacity>
        </View>

        {/* Quick Stats */}
        <View style={styles.recipeStats}>
          <StatCard 
            icon={<BookOpen size={20} color="#ff9a9e" />} 
            label="My Recipes" 
            value={totalRecipes.toString()} 
          />
          <StatCard 
            icon={<Heart size={20} color="#FF6B6B" />} 
            label="Favorites" 
            value={favoriteRecipes.toString()} 
          />
          <StatCard 
            icon={<TrendingUp size={20} color="#4ECDC4" />} 
            label="Recent" 
            value={recentRecipes.toString()} 
          />
        </View>
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
        onSave={(meal) => {
          addMeal(meal);
          setShowImportModal(false);
          Alert.alert('Recipe Imported', `${meal.name} has been successfully imported!`);
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

// Enhanced Component Definitions
const StatCard = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <View style={styles.statCard}>
    <View style={styles.statIcon}>{icon}</View>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  hero: {
    paddingBottom: 20,
    paddingHorizontal: 20,
    minHeight: 260,
  },
  statusBarSpacer: {
    height: Platform.OS === 'ios' ? 44 : 24,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
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
  recipeStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingHorizontal: 5,
  },
  statCard: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statIcon: {
    marginBottom: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.lightText,
    fontWeight: '500',
    textAlign: 'center',
  },
  tabNavigation: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Colors.white,
    marginHorizontal: 20,
    marginTop: -10,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
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
});
