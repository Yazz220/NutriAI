import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Clock, Users, Plus, CheckCircle, AlertTriangle } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { RecipeWithAvailability, RecipeFilterType } from '@/types';
import { filterRecipesByAvailability, sortRecipesByAvailability } from '@/utils/recipeAvailability';

interface RecipeExplorerProps {
  recipesWithAvailability: RecipeWithAvailability[];
  searchQuery: string;
  filterType: RecipeFilterType;
  onAddToMealPlan: (recipeId: string) => void;
  onRecipePress: (recipe: RecipeWithAvailability) => void;
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.white,
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  resultCount: {
    fontSize: 14,
    color: Colors.lightText,
  },
  recipeCard: {
    flexDirection: 'row',
    backgroundColor: Colors.background,
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  recipeImage: {
    width: 80,
    height: 80,
    backgroundColor: Colors.lightGray,
  },
  recipeContent: {
    flex: 1,
    padding: 12,
  },
  recipeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  recipeName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
    marginRight: 8,
  },
  addButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  addButtonText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
  recipeDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  detailText: {
    fontSize: 12,
    color: Colors.lightText,
    marginLeft: 4,
  },
  availabilityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  availabilityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  availabilityIcon: {
    marginRight: 4,
  },
  availabilityText: {
    fontSize: 12,
    fontWeight: '500',
  },
  availabilityHigh: {
    color: Colors.fresh,
  },
  availabilityMedium: {
    color: Colors.aging,
  },
  availabilityLow: {
    color: Colors.expiring,
  },
  missingCount: {
    fontSize: 12,
    color: Colors.lightText,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  tag: {
    backgroundColor: Colors.lightGray,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginRight: 4,
    marginBottom: 2,
  },
  tagText: {
    fontSize: 10,
    color: Colors.text,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.lightText,
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.lightText,
    textAlign: 'center',
  },
});

export const RecipeExplorer: React.FC<RecipeExplorerProps> = ({
  recipesWithAvailability,
  searchQuery,
  filterType,
  onAddToMealPlan,
  onRecipePress,
}) => {
  const filteredAndSortedRecipes = useMemo(() => {
    // First filter by search query
    let filtered = recipesWithAvailability.filter(recipe =>
      recipe.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      recipe.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    // Then filter by availability type
    filtered = filterRecipesByAvailability(filtered, filterType);

    // Finally sort by availability
    return sortRecipesByAvailability(filtered, 'availability');
  }, [recipesWithAvailability, searchQuery, filterType]);

  const formatPrepTime = (prepTime: number | string): string => {
    if (typeof prepTime === 'number') {
      return `${prepTime} min`;
    }
    return prepTime;
  };

  const getAvailabilityIcon = (percentage: number) => {
    if (percentage === 100) {
      return <CheckCircle size={14} color={Colors.fresh} />;
    } else if (percentage >= 50) {
      return <AlertTriangle size={14} color={Colors.aging} />;
    } else {
      return <AlertTriangle size={14} color={Colors.expiring} />;
    }
  };

  const getAvailabilityTextStyle = (percentage: number) => {
    if (percentage === 100) {
      return styles.availabilityHigh;
    } else if (percentage >= 50) {
      return styles.availabilityMedium;
    } else {
      return styles.availabilityLow;
    }
  };

  const getAvailabilityText = (recipe: RecipeWithAvailability): string => {
    const { availabilityPercentage, missingIngredients } = recipe.availability;
    
    if (availabilityPercentage === 100) {
      return 'Can make now';
    } else {
      return `${missingIngredients.length} missing`;
    }
  };

  const renderRecipeCard = ({ item: recipe }: { item: RecipeWithAvailability }) => {
    return (
      <TouchableOpacity 
        style={styles.recipeCard}
        onPress={() => onRecipePress(recipe)}
      >
        {recipe.image && (
          <Image
            source={{ uri: recipe.image }}
            style={styles.recipeImage}
            resizeMode="cover"
          />
        )}
        
        <View style={styles.recipeContent}>
          <View style={styles.recipeHeader}>
            <Text style={styles.recipeName} numberOfLines={1}>
              {recipe.name}
            </Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => onAddToMealPlan(recipe.id)}
            >
              <Text style={styles.addButtonText}>Add</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.recipeDetails}>
            <View style={styles.detailItem}>
              <Clock size={12} color={Colors.lightText} />
              <Text style={styles.detailText}>
                {formatPrepTime(recipe.prepTime)}
              </Text>
            </View>
            <View style={styles.detailItem}>
              <Users size={12} color={Colors.lightText} />
              <Text style={styles.detailText}>{recipe.servings}</Text>
            </View>
          </View>
          
          <View style={styles.availabilityContainer}>
            <View style={styles.availabilityInfo}>
              <View style={styles.availabilityIcon}>
                {getAvailabilityIcon(recipe.availability.availabilityPercentage)}
              </View>
              <Text
                style={[
                  styles.availabilityText,
                  getAvailabilityTextStyle(recipe.availability.availabilityPercentage),
                ]}
              >
                {getAvailabilityText(recipe)}
              </Text>
            </View>
            
            <Text style={styles.missingCount}>
              {recipe.availability.availabilityPercentage}%
            </Text>
          </View>
          
          {recipe.tags.length > 0 && (
            <View style={styles.tags}>
              {recipe.tags.slice(0, 3).map((tag, index) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const getFilterTitle = (): string => {
    switch (filterType) {
      case 'canMakeNow':
        return 'Recipes You Can Make Now';
      case 'missingFew':
        return 'Recipes Missing Few Ingredients';
      default:
        return 'All Recipes';
    }
  };

  const renderEmptyState = () => {
    const isSearching = searchQuery.length > 0;
    const isFiltering = filterType !== 'all';
    
    let emptyText = 'No recipes available';
    let emptySubtext = 'Add some recipes to get started!';
    
    if (isSearching && isFiltering) {
      emptyText = 'No recipes found';
      emptySubtext = `Try adjusting your search or filter criteria.`;
    } else if (isSearching) {
      emptyText = 'No recipes found';
      emptySubtext = `No recipes match "${searchQuery}".`;
    } else if (isFiltering) {
      emptyText = 'No recipes match this filter';
      emptySubtext = 'Try selecting a different filter or add more ingredients to your inventory.';
    }
    
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>{emptyText}</Text>
        <Text style={styles.emptySubtext}>{emptySubtext}</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{getFilterTitle()}</Text>
        <Text style={styles.resultCount}>
          {filteredAndSortedRecipes.length} recipe{filteredAndSortedRecipes.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {filteredAndSortedRecipes.length === 0 ? (
        renderEmptyState()
      ) : (
        <View>
          {filteredAndSortedRecipes.map((recipe) => (
            <View key={recipe.id}>
              {renderRecipeCard({ item: recipe })}
            </View>
          ))}
        </View>
      )}
    </View>
  );
};