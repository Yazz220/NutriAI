// Enhanced Recipe Discovery Component
// Provides trending recipes, search, and discovery features

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { TrendingUp, Search, Sparkles, Clock, Users, Heart, Star } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { Spacing, Typography } from '@/constants/spacing';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useRecipeStore } from '@/hooks/useRecipeStore';
import { ExternalRecipe } from '@/utils/recipeProvider';
import { RecipeSearch } from './RecipeSearch';

interface EnhancedRecipeDiscoveryProps {
  onRecipePress: (recipe: ExternalRecipe) => void;
  onSaveRecipe: (recipe: ExternalRecipe) => void;
  onSearch: (params: any) => Promise<void>;
}

export const EnhancedRecipeDiscovery: React.FC<EnhancedRecipeDiscoveryProps> = ({
  onRecipePress,
  onSaveRecipe,
  onSearch,
}) => {
  const {
    trendingRecipes,
    externalRecipes,
    isLoading,
    getTrendingRecipes,
    getRandomRecipes,
    getRecipeRecommendations,
    searchResults,
    isSearching,
    error,
    recipeProvider,
  } = useRecipeStore();

  const [showSearch, setShowSearch] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Load after provider is initialized
  useEffect(() => {
    if (!recipeProvider) return;
    if (trendingRecipes.length === 0) {
      getTrendingRecipes();
    }
    if (externalRecipes.length === 0) {
      getRandomRecipes(['main course', 'healthy'], 12, true);
    }
  }, [recipeProvider, getTrendingRecipes, trendingRecipes.length, externalRecipes.length, getRandomRecipes]);

  // Handle refresh
  const handleRefresh = async () => {
    if (!recipeProvider) return;
    setRefreshing(true);
    try {
      await Promise.all([
        getTrendingRecipes(),
        getRandomRecipes(['main course', 'healthy'], 10),
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  // Handle recipe press
  const handleRecipePress = (recipe: ExternalRecipe) => {
    onRecipePress(recipe);
  };

  // Handle save recipe
  const handleSaveRecipe = (recipe: ExternalRecipe) => {
    onSaveRecipe(recipe);
  };

  // Render recipe card
  const renderRecipeCard = (recipe: ExternalRecipe, showSaveButton: boolean = true) => (
    <TouchableOpacity
      key={recipe.id}
      style={styles.recipeCard}
      onPress={() => handleRecipePress(recipe)}
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
            {recipe.veryHealthy && (
              <View style={[styles.tag, styles.healthyTag]}>
                <Text style={styles.tagText}>Healthy</Text>
              </View>
            )}
          </View>
        </View>
        
        {showSaveButton && (
          <TouchableOpacity
            style={styles.saveButton}
            onPress={() => handleSaveRecipe(recipe)}
          >
            <Heart size={16} color={Colors.primary} />
          </TouchableOpacity>
        )}
      </Card>
    </TouchableOpacity>
  );

  // Show search component if enabled
  if (showSearch) {
    return (
      <View style={styles.container}>
        <View style={styles.searchHeader}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setShowSearch(false)}
          >
            <Text style={styles.backButtonText}>← Back to Discovery</Text>
          </TouchableOpacity>
        </View>
        
        <RecipeSearch
          onSearch={onSearch}
          onRecipePress={handleRecipePress}
          onSaveRecipe={handleSaveRecipe}
          searchResults={searchResults}
          isSearching={isSearching}
          error={error}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Discovery Header */}
      <Card style={styles.discoveryHeader}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Sparkles size={24} color={Colors.primary} />
            <Text style={styles.headerTitle}>Recipe Discovery</Text>
          </View>
          
          <TouchableOpacity
            style={styles.searchButton}
            onPress={() => recipeProvider && setShowSearch(true)}
          >
            <Search size={20} color={Colors.primary} />
          </TouchableOpacity>
        </View>
        
        <Text style={styles.headerDescription}>
          Discover thousands of professional recipes with nutrition data and smart recommendations
        </Text>
      </Card>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Trending Recipes */}
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <TrendingUp size={20} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Trending Now</Text>
          </View>
          
          {isLoading && trendingRecipes.length === 0 ? (
            <LoadingSpinner text="Loading trending recipes..." />
          ) : trendingRecipes.length > 0 ? (
            <View style={styles.recipeGrid}>
              {trendingRecipes.slice(0, 6).map((recipe) => renderRecipeCard(recipe))}
            </View>
          ) : (
            <Text style={styles.emptyText}>No trending recipes available</Text>
          )}
        </Card>

        {/* Quick Actions */}
        <Card style={styles.actionsCard}>
          <Text style={styles.actionsTitle}>Quick Discovery</Text>
          
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => recipeProvider && getRandomRecipes(['main course'], 10)}
            >
              <Star size={20} color={Colors.primary} />
              <Text style={styles.actionButtonText}>Main Dishes</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => recipeProvider && getRandomRecipes(['vegetarian'], 10)}
            >
              <Star size={20} color={Colors.secondary} />
              <Text style={styles.actionButtonText}>Vegetarian</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => recipeProvider && getRandomRecipes(['quick'], 10)}
            >
              <Clock size={20} color={Colors.warning} />
              <Text style={styles.actionButtonText}>Quick Meals</Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* Recent Discoveries */}
        {externalRecipes.length > 0 && (
          <Card style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Sparkles size={20} color={Colors.secondary} />
              <Text style={styles.sectionTitle}>Recent Discoveries</Text>
            </View>
            
            <View style={styles.recipeGrid}>
              {externalRecipes.map(recipe => renderRecipeCard(recipe, false))}
            </View>

            <View style={{ marginTop: Spacing.sm }}>
              <Button
                title={isLoading ? 'Loading…' : 'Load more'}
                onPress={() => recipeProvider && getRandomRecipes(['main course', 'healthy'], 12, true)}
                disabled={isLoading || !recipeProvider}
              />
            </View>
          </Card>
        )}

        {/* Error Display */}
        {error && (
          <Card style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
            <Button
              title="Retry"
              onPress={handleRefresh}
              style={styles.retryButton}
            />
          </Card>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchHeader: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    paddingVertical: Spacing.sm,
  },
  backButtonText: {
    color: Colors.primary,
    fontSize: Typography.sizes.md,
    fontWeight: '500',
  },
  discoveryHeader: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: '600',
    color: Colors.text,
  },
  searchButton: {
    padding: Spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '08',
  },
  headerDescription: {
    fontSize: Typography.sizes.sm,
    color: Colors.lightText,
    lineHeight: 18,
  },
  content: {
    flex: 1,
  },
  sectionCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: Typography.sizes.md,
    fontWeight: '600',
    color: Colors.text,
  },
  recipeGrid: {
    gap: Spacing.sm,
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
    borderRadius: 12,
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
    borderRadius: 999,
    backgroundColor: Colors.tabBackground,
  },
  vegetarianTag: {
    backgroundColor: Colors.secondary + '20',
  },
  healthyTag: {
    backgroundColor: Colors.success + '20',
  },
  tagText: {
    fontSize: Typography.sizes.xs,
    color: Colors.text,
  },
  saveButton: {
    padding: Spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.tabBackground,
    borderRadius: 10,
  },
  actionsCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  actionsTitle: {
    fontSize: Typography.sizes.md,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  actionButtonText: {
    fontSize: Typography.sizes.sm,
    color: Colors.text,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  emptyText: {
    textAlign: 'center',
    color: Colors.lightText,
    fontSize: Typography.sizes.md,
    paddingVertical: Spacing.lg,
  },
  errorCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    backgroundColor: Colors.expiring + '10',
    borderColor: Colors.expiring,
  },
  errorText: {
    color: Colors.expiring,
    textAlign: 'center',
    fontSize: Typography.sizes.md,
    marginBottom: Spacing.md,
  },
  retryButton: {
    width: '100%',
    backgroundColor: Colors.expiring,
  },
});
