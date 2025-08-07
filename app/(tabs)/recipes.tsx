import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Stack } from 'expo-router';
import { Search, Plus } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { useInventory } from '@/hooks/useInventoryStore';
import { useMeals } from '@/hooks/useMealsStore';
import { useMealPlanner } from '@/hooks/useMealPlanner';
import { RecipeExplorer } from '@/components/RecipeExplorer';
import { RecipeRecommendations } from '@/components/RecipeRecommendations';
import { MealPlanModal } from '@/components/MealPlanModal';
import { MealDetailModal } from '@/components/MealDetailModal';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { RecipeFilterType, PlannedMeal, RecipeWithAvailability } from '@/types';
import { calculateMultipleRecipeAvailability } from '@/utils/recipeAvailability';

export default function RecipesScreen() {
  const { inventory } = useInventory();
  const { meals, isLoading } = useMeals();
  const { addPlannedMeal } = useMealPlanner();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<RecipeFilterType>('all');
  const [showMealPlanModal, setShowMealPlanModal] = useState(false);
  const [showRecipeDetail, setShowRecipeDetail] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<RecipeWithAvailability | null>(null);

  // Calculate recipe availability
  const recipesWithAvailability = useMemo(() => {
    return calculateMultipleRecipeAvailability(meals, inventory);
  }, [meals, inventory]);

  const handleAddToMealPlan = (recipeId: string) => {
    const recipe = recipesWithAvailability.find(r => r.id === recipeId);
    if (recipe) {
      setSelectedRecipe(recipe);
      setShowMealPlanModal(true);
    }
  };

  const handleSavePlannedMeal = (plannedMeal: Omit<PlannedMeal, 'id'>) => {
    addPlannedMeal(plannedMeal);
    setShowMealPlanModal(false);
    Alert.alert('Success', 'Recipe added to your meal plan!');
  };

  const handleCloseMealPlanModal = () => {
    setShowMealPlanModal(false);
  };

  const handleRecipePress = (recipe: RecipeWithAvailability) => {
    setSelectedRecipe(recipe);
    setShowRecipeDetail(true);
  };

  const handleCloseRecipeDetail = () => {
    setShowRecipeDetail(false);
    setSelectedRecipe(null);
  };

  if (isLoading) {
    return <LoadingSpinner text="Loading recipes..." />;
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Recipes',
          headerRight: () => (
            <TouchableOpacity style={styles.headerButton}>
              <Plus size={24} color={Colors.primary} />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Search and Filter Section */}
        <Card style={styles.searchCard}>
          <Input
            placeholder="Search recipes..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            leftIcon={<Search size={20} color={Colors.lightText} />}
            style={styles.searchInput}
          />

          <View style={styles.filterContainer}>
            <Button
              title="All Recipes"
              onPress={() => setFilterType('all')}
              variant={filterType === 'all' ? 'primary' : 'outline'}
              size="sm"
              style={styles.filterButton}
            />

            <Button
              title="Can Make Now"
              onPress={() => setFilterType('canMakeNow')}
              variant={filterType === 'canMakeNow' ? 'primary' : 'outline'}
              size="sm"
              style={styles.filterButton}
            />

            <Button
              title="Missing Few"
              onPress={() => setFilterType('missingFew')}
              variant={filterType === 'missingFew' ? 'primary' : 'outline'}
              size="sm"
              style={styles.filterButton}
            />
          </View>
        </Card>

        {/* Recipe Recommendations */}
        <RecipeRecommendations
          recipesWithAvailability={recipesWithAvailability}
          onAddToMealPlan={handleAddToMealPlan}
          onRecipePress={handleRecipePress}
        />

        {/* Recipe Explorer */}
        <RecipeExplorer
          recipesWithAvailability={recipesWithAvailability}
          searchQuery={searchQuery}
          filterType={filterType}
          onAddToMealPlan={handleAddToMealPlan}
          onRecipePress={handleRecipePress}
        />
      </ScrollView>

      {/* Recipe Detail Modal */}
      <MealDetailModal
        visible={showRecipeDetail}
        meal={selectedRecipe}
        availability={selectedRecipe?.availability}
        onClose={handleCloseRecipeDetail}
      />

      {/* Meal Plan Modal */}
      <MealPlanModal
        visible={showMealPlanModal}
        selectedDate={new Date().toISOString().split('T')[0]}
        onSave={handleSavePlannedMeal}
        onClose={handleCloseMealPlanModal}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerButton: {
    padding: Spacing.sm,
    marginRight: Spacing.sm,
  },
  content: {
    flex: 1,
  },
  searchCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  searchInput: {
    marginBottom: Spacing.md,
  },
  filterContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  filterButton: {
    flex: 0,
    minWidth: 100,
  },
});
