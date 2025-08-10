// Recipe Search Component
// Provides advanced search functionality for external recipes

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { Search, Filter, X, Clock, Users, Star, Heart } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { Spacing, Typography } from '@/constants/spacing';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { RecipeSearchParams, ExternalRecipe } from '@/utils/recipeProvider';

interface RecipeSearchProps {
  onSearch: (params: RecipeSearchParams) => Promise<void>;
  onRecipePress: (recipe: ExternalRecipe) => void;
  onSaveRecipe: (recipe: ExternalRecipe) => void;
  searchResults: ExternalRecipe[];
  isSearching: boolean;
  error: string | null;
}

export const RecipeSearch: React.FC<RecipeSearchProps> = ({
  onSearch,
  onRecipePress,
  onSaveRecipe,
  searchResults,
  isSearching,
  error,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<RecipeSearchParams>({
    query: '',
    cuisine: '',
    diet: '',
    intolerances: [],
    maxReadyTime: undefined,
    minProtein: undefined,
    maxCalories: undefined,
    type: '',
  });

  // Cuisine options
  const cuisineOptions = [
    'African', 'American', 'British', 'Cajun', 'Caribbean', 'Chinese', 'Eastern European',
    'European', 'French', 'German', 'Greek', 'Indian', 'Irish', 'Italian', 'Japanese',
    'Jewish', 'Korean', 'Latin American', 'Mediterranean', 'Mexican', 'Middle Eastern',
    'Nordic', 'Southern', 'Spanish', 'Thai', 'Vietnamese'
  ];

  // Diet options
  const dietOptions = [
    'Gluten Free', 'Ketogenic', 'Vegetarian', 'Lacto-Vegetarian', 'Ovo-Vegetarian',
    'Vegan', 'Pescetarian', 'Paleo', 'Primal', 'Low FODMAP', 'Whole30'
  ];

  // Intolerance options
  const intoleranceOptions = [
    'Dairy', 'Egg', 'Gluten', 'Peanut', 'Seafood', 'Sesame', 'Shellfish', 'Soy', 'Sulfite', 'Tree Nut', 'Wheat'
  ];

  // Meal type options
  const mealTypeOptions = [
    'main course', 'side dish', 'dessert', 'appetizer', 'salad', 'bread', 'breakfast',
    'soup', 'beverage', 'sauce', 'marinade', 'fingerfood', 'snack', 'drink'
  ];

  // Handle search
  const handleSearch = async () => {
    if (!searchQuery.trim() && !hasActiveFilters()) {
      Alert.alert('Search', 'Please enter a search term or select filters');
      return;
    }

    const searchParams: RecipeSearchParams = {
      ...filters,
      query: searchQuery.trim(),
    };

    await onSearch(searchParams);
  };

  // Check if there are active filters
  const hasActiveFilters = () => {
    return filters.cuisine || filters.diet || filters.intolerances?.length || 
           filters.maxReadyTime || filters.minProtein || filters.maxCalories || filters.type;
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      query: '',
      cuisine: '',
      diet: '',
      intolerances: [],
      maxReadyTime: undefined,
      minProtein: undefined,
      maxCalories: undefined,
      type: '',
    });
    setSearchQuery('');
  };

  // Toggle intolerance
  const toggleIntolerance = (intolerance: string) => {
    setFilters(prev => ({
      ...prev,
      intolerances: prev.intolerances?.includes(intolerance)
        ? prev.intolerances.filter(i => i !== intolerance)
        : [...(prev.intolerances || []), intolerance]
    }));
  };

  // Render recipe card
  const renderRecipeCard = (recipe: ExternalRecipe) => (
    <TouchableOpacity
      key={recipe.id}
      style={styles.recipeCard}
      onPress={() => onRecipePress(recipe)}
    >
      <Card style={styles.recipeCardContent}>
        <View style={styles.recipeImageContainer}>
          <Text style={styles.recipeImagePlaceholder}>
            {recipe.title.charAt(0).toUpperCase()}
          </Text>
        </View>
        
        <View style={styles.recipeInfo}>
          <Text style={styles.recipeTitle} numberOfLines={2}>
            {recipe.title}
          </Text>
          
          <View style={styles.recipeMeta}>
            <View style={styles.metaItem}>
              <Clock size={14} color={Colors.lightText} />
              <Text style={styles.metaText}>{recipe.readyInMinutes}m</Text>
            </View>
            
            <View style={styles.metaItem}>
              <Users size={14} color={Colors.lightText} />
              <Text style={styles.metaText}>{recipe.servings}</Text>
            </View>
            
            {recipe.aggregateLikes && (
              <View style={styles.metaItem}>
                <Heart size={14} color={Colors.lightText} />
                <Text style={styles.metaText}>{recipe.aggregateLikes}</Text>
              </View>
            )}
          </View>
          
          <View style={styles.recipeTags}>
            {recipe.cuisines?.slice(0, 2).map((cuisine, index) => (
              <View key={index} style={styles.tag}>
                <Text style={styles.tagText}>{cuisine}</Text>
              </View>
            ))}
            {recipe.vegetarian && (
              <View style={[styles.tag, styles.vegetarianTag]}>
                <Text style={styles.tagText}>Veg</Text>
              </View>
            )}
          </View>
        </View>
        
        <TouchableOpacity
          style={styles.saveButton}
          onPress={() => onSaveRecipe(recipe)}
        >
          <Heart size={16} color={Colors.primary} />
        </TouchableOpacity>
      </Card>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Search Header */}
      <Card style={styles.searchHeader}>
        <View style={styles.searchRow}>
          <View style={styles.searchInputContainer}>
            <Search size={20} color={Colors.lightText} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search recipes..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <X size={16} color={Colors.lightText} />
              </TouchableOpacity>
            )}
          </View>
          
          <TouchableOpacity
            style={[styles.filterButton, hasActiveFilters() && styles.filterButtonActive]}
            onPress={() => setShowFilters(!showFilters)}
          >
            <Filter size={20} color={hasActiveFilters() ? Colors.white : Colors.primary} />
          </TouchableOpacity>
        </View>
        
        <Button
          title="Search"
          onPress={handleSearch}
          disabled={isSearching || (!searchQuery.trim() && !hasActiveFilters())}
          style={styles.searchButton}
        />
      </Card>

      {/* Filters Panel */}
      {showFilters && (
        <Card style={styles.filtersPanel}>
          <View style={styles.filtersHeader}>
            <Text style={styles.filtersTitle}>Filters</Text>
            <TouchableOpacity onPress={clearFilters}>
              <Text style={styles.clearFiltersText}>Clear All</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Cuisine */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Cuisine</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.chipContainer}>
                  {cuisineOptions.map((cuisine) => (
                    <TouchableOpacity
                      key={cuisine}
                      style={[
                        styles.chip,
                        filters.cuisine === cuisine && styles.chipActive
                      ]}
                      onPress={() => setFilters(prev => ({ ...prev, cuisine: prev.cuisine === cuisine ? '' : cuisine }))}
                    >
                      <Text style={[
                        styles.chipText,
                        filters.cuisine === cuisine && styles.chipTextActive
                      ]}>
                        {cuisine}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* Diet */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Diet</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.chipContainer}>
                  {dietOptions.map((diet) => (
                    <TouchableOpacity
                      key={diet}
                      style={[
                        styles.chip,
                        filters.diet === diet && styles.chipActive
                      ]}
                      onPress={() => setFilters(prev => ({ ...prev, diet: prev.diet === diet ? '' : diet }))}
                    >
                      <Text style={[
                        styles.chipText,
                        filters.diet === diet && styles.chipTextActive
                      ]}>
                        {diet}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* Intolerances */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Intolerances</Text>
              <View style={styles.chipGrid}>
                {intoleranceOptions.map((intolerance) => (
                  <TouchableOpacity
                    key={intolerance}
                    style={[
                      styles.chip,
                      filters.intolerances?.includes(intolerance) && styles.chipActive
                    ]}
                    onPress={() => toggleIntolerance(intolerance)}
                  >
                    <Text style={[
                      styles.chipText,
                      filters.intolerances?.includes(intolerance) && styles.chipTextActive
                    ]}>
                      {intolerance}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Meal Type */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Meal Type</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.chipContainer}>
                  {mealTypeOptions.map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.chip,
                        filters.type === type && styles.chipActive
                      ]}
                      onPress={() => setFilters(prev => ({ ...prev, type: prev.type === type ? '' : type }))}
                    >
                      <Text style={[
                        styles.chipText,
                        filters.type === type && styles.chipTextActive
                      ]}>
                        {type}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* Numeric Filters */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Additional Filters</Text>
              
              <View style={styles.numericFilters}>
                <View style={styles.numericFilter}>
                  <Text style={styles.numericFilterLabel}>Max Time (min)</Text>
                  <TextInput
                    style={styles.numericInput}
                    placeholder="30"
                    keyboardType="numeric"
                    value={filters.maxReadyTime?.toString() || ''}
                    onChangeText={(text) => setFilters(prev => ({ 
                      ...prev, 
                      maxReadyTime: text ? parseInt(text) : undefined 
                    }))}
                  />
                </View>
                
                <View style={styles.numericFilter}>
                  <Text style={styles.numericFilterLabel}>Min Protein (g)</Text>
                  <TextInput
                    style={styles.numericInput}
                    placeholder="20"
                    keyboardType="numeric"
                    value={filters.minProtein?.toString() || ''}
                    onChangeText={(text) => setFilters(prev => ({ 
                      ...prev, 
                      minProtein: text ? parseInt(text) : undefined 
                    }))}
                  />
                </View>
                
                <View style={styles.numericFilter}>
                  <Text style={styles.numericFilterLabel}>Max Calories</Text>
                  <TextInput
                    style={styles.numericInput}
                    placeholder="500"
                    keyboardType="numeric"
                    value={filters.maxCalories?.toString() || ''}
                    onChangeText={(text) => setFilters(prev => ({ 
                      ...prev, 
                      maxCalories: text ? parseInt(text) : undefined 
                    }))}
                  />
                </View>
              </View>
            </View>
          </ScrollView>
        </Card>
      )}

      {/* Search Results */}
      {error && (
        <Card style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
        </Card>
      )}

      {isSearching && (
        <View style={styles.loadingContainer}>
          <LoadingSpinner text="Searching recipes..." />
        </View>
      )}

      {searchResults.length > 0 && (
        <View style={styles.resultsContainer}>
          <View style={styles.resultsHeader}>
            <Text style={styles.resultsTitle}>
              {searchResults.length} recipe{searchResults.length !== 1 ? 's' : ''} found
            </Text>
          </View>
          
          <View style={styles.recipeGrid}>
            {searchResults.map(renderRecipeCard)}
          </View>
        </View>
      )}

      {!isSearching && !error && searchResults.length === 0 && searchQuery && (
        <Card style={styles.noResultsCard}>
          <Text style={styles.noResultsText}>No recipes found for "{searchQuery}"</Text>
          <Text style={styles.noResultsSubtext}>Try adjusting your search terms or filters</Text>
        </Card>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchHeader: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 8,
    paddingHorizontal: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchIcon: {
    marginRight: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: Spacing.sm,
    fontSize: Typography.sizes.md,
    color: Colors.text,
  },
  filterButton: {
    padding: Spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
    backgroundColor: Colors.white,
  },
  filterButtonActive: {
    backgroundColor: Colors.primary,
  },
  searchButton: {
    width: '100%',
  },
  filtersPanel: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    maxHeight: 400,
  },
  filtersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  filtersTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: '600',
    color: Colors.text,
  },
  clearFiltersText: {
    color: Colors.primary,
    fontSize: Typography.sizes.sm,
  },
  filterSection: {
    marginBottom: Spacing.lg,
  },
  filterLabel: {
    fontSize: Typography.sizes.md,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  chipContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 16,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipText: {
    fontSize: Typography.sizes.sm,
    color: Colors.text,
  },
  chipTextActive: {
    color: Colors.white,
  },
  numericFilters: {
    gap: Spacing.sm,
  },
  numericFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  numericFilterLabel: {
    fontSize: Typography.sizes.sm,
    color: Colors.text,
    flex: 1,
  },
  numericInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    fontSize: Typography.sizes.sm,
    width: 80,
    textAlign: 'center',
  },
  errorCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    backgroundColor: Colors.expiring,
  },
  errorText: {
    color: Colors.white,
    textAlign: 'center',
    fontSize: Typography.sizes.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  resultsContainer: {
    flex: 1,
  },
  resultsHeader: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  resultsTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: '600',
    color: Colors.text,
  },
  recipeGrid: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  recipeCard: {
    marginBottom: Spacing.sm,
  },
  recipeCardContent: {
    flexDirection: 'row',
    padding: Spacing.md,
    gap: Spacing.md,
  },
  recipeImageContainer: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: Colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recipeImagePlaceholder: {
    fontSize: Typography.sizes.xl,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  recipeInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  recipeTitle: {
    fontSize: Typography.sizes.md,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  recipeMeta: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.xs,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: Typography.sizes.sm,
    color: Colors.lightText,
  },
  recipeTags: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  tag: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: Colors.tabBackground,
  },
  vegetarianTag: {
    backgroundColor: Colors.secondary + '20',
  },
  tagText: {
    fontSize: Typography.sizes.xs,
    color: Colors.text,
  },
  saveButton: {
    padding: Spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noResultsCard: {
    marginHorizontal: Spacing.lg,
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  noResultsText: {
    fontSize: Typography.sizes.lg,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  noResultsSubtext: {
    fontSize: Typography.sizes.md,
    color: Colors.lightText,
    textAlign: 'center',
  },
});
