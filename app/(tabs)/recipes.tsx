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
import { Search, Plus, Sparkles } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { Spacing, Typography } from '@/constants/spacing';
import { useInventory } from '@/hooks/useInventoryStore';
import { useMeals } from '@/hooks/useMealsStore';
import { useMealPlanner } from '@/hooks/useMealPlanner';
import { RecipeExplorer } from '@/components/RecipeExplorer';
import { RecipeRecommendations } from '@/components/RecipeRecommendations';
import PlannerScreen from './planner';
import { MealPlanModal } from '@/components/MealPlanModal';
import { MealDetailModal } from '@/components/MealDetailModal';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { RecipeFilterType, PlannedMeal, RecipeWithAvailability } from '@/types';
import { calculateMultipleRecipeAvailability } from '@/utils/recipeAvailability';
import { useCoach } from '@/hooks/useCoach';
import { ImportRecipeModal } from '@/components/ImportRecipeModal';

export default function RecipesScreen() {
  const { inventory } = useInventory();
  const { meals, isLoading, addMeal } = useMeals();
  const { addPlannedMeal } = useMealPlanner();
  const { suggestions } = useCoach();
  const [showImport, setShowImport] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<RecipeFilterType>('all');
  const [activeTab, setActiveTab] = useState<'recipes' | 'planner'>('recipes');
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
            <TouchableOpacity style={styles.headerButton} onPress={() => setShowImport(true)}>
              <Plus size={24} color={Colors.primary} />
            </TouchableOpacity>
          ),
        }}
      />

      {/* Top toggle between Recipes and Planner */}
      <View style={styles.topTabs}>
        <TouchableOpacity style={[styles.topTab, activeTab === 'recipes' && styles.topTabActive]} onPress={() => setActiveTab('recipes')}>
          <Text style={[styles.topTabText, activeTab === 'recipes' && styles.topTabTextActive]}>Recipes</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.topTab, activeTab === 'planner' && styles.topTabActive]} onPress={() => setActiveTab('planner')}>
          <Text style={[styles.topTabText, activeTab === 'planner' && styles.topTabTextActive]}>Planner</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'recipes' ? (
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* AI Picks Header */}
        {suggestions.length > 0 && (
          <Card style={styles.aiCard}>
            <View style={styles.aiHeader}>
              <Sparkles size={18} color={Colors.primary} />
              <Text style={styles.aiTitle}>Best right now</Text>
            </View>
            {suggestions.filter(s => s.type === 'primary_meal').slice(0, 1).map(s => (
              <View key={s.id} style={styles.aiSuggestion}>
                <Text style={styles.aiRecipeName}>{s.recipe?.name}</Text>
                <Text style={styles.aiSub}>{s.subtitle}</Text>
                <View style={styles.aiMetaRow}>
                  {!!s.meta?.readyInMins && (
                    <Text style={styles.aiMetaChip}>{s.meta.readyInMins} mins</Text>
                  )}
                  {!!s.meta?.highlight && (
                    <Text style={[styles.aiMetaChip, styles.aiHighlight]}>{s.meta.highlight}</Text>
                  )}
                  {typeof s.meta?.missingCount === 'number' && s.meta.missingCount > 0 && (
                    <Text style={[styles.aiMetaChip, styles.aiMissing]}>Missing {s.meta.missingCount}</Text>
                  )}
                </View>
                <View style={styles.aiActions}>
                  <Button
                    title="Add to Planner"
                    size="sm"
                    onPress={() => {
                      if (s.recipe) {
                        addPlannedMeal({ recipeId: s.recipe.id, date: new Date().toISOString().split('T')[0], mealType: 'dinner', servings: 1, isCompleted: false });
                        Alert.alert('Added', 'Added to today\'s planner.');
                      }
                    }}
                  />
                </View>
              </View>
            ))}
            <View style={styles.aiChips}>
              {['Can make now', '<20 min', 'Use up spinach', 'High protein'].map((c) => (
                <View key={c} style={styles.aiChip}><Text style={styles.aiChipText}>{c}</Text></View>
              ))}
            </View>
          </Card>
        )}
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
      ) : (
        <View style={{ flex: 1 }}>
          <PlannerScreen />
        </View>
      )}

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

      {/* Import Recipe Modal */}
      <ImportRecipeModal
        visible={showImport}
        onClose={() => setShowImport(false)}
        onSave={(meal) => addMeal(meal)}
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
  topTabs: { flexDirection: 'row', marginHorizontal: Spacing.lg, marginTop: Spacing.lg, marginBottom: Spacing.md, backgroundColor: Colors.white, borderRadius: 10, borderWidth: 1, borderColor: Colors.border },
  topTab: { flex: 1, alignItems: 'center', paddingVertical: Spacing.md, borderRadius: 10 },
  topTabActive: { backgroundColor: Colors.primary + '20' },
  topTabText: { color: Colors.lightText, fontWeight: '600' },
  topTabTextActive: { color: Colors.primary },
  aiCard: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
  },
  aiHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm },
  aiTitle: { marginLeft: Spacing.sm, color: Colors.text, fontWeight: '600' },
  aiSuggestion: { marginTop: Spacing.xs },
  aiRecipeName: { fontSize: 16, fontWeight: '600', color: Colors.text },
  aiSub: { color: Colors.lightText, marginTop: 2 },
  aiMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.sm },
  aiMetaChip: { backgroundColor: Colors.tabBackground, color: Colors.text, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, fontSize: Typography.sizes.sm },
  aiHighlight: { backgroundColor: Colors.secondary, color: Colors.white },
  aiMissing: { backgroundColor: Colors.expiring, color: Colors.white },
  aiActions: { flexDirection: 'row', marginTop: Spacing.sm },
  aiChips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.md },
  aiChip: { backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 16 },
  aiChipText: { color: Colors.text, fontSize: Typography.sizes.sm },
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
