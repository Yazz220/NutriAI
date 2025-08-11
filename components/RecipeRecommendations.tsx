import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Sparkles, Clock, Users, Plus, AlertCircle } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { RecipeWithAvailability } from '@/types';
import { sortRecipesByAvailability, getRecipesUsingExpiringIngredients } from '@/utils/recipeAvailability';

interface RecipeRecommendationsProps {
  recipesWithAvailability: RecipeWithAvailability[];
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
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginLeft: 8,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.lightText,
    marginBottom: 12,
  },
  recommendationCard: {
    width: 280,
    marginRight: 12,
    backgroundColor: Colors.background,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  recipeImage: {
    width: '100%',
    height: 120,
    backgroundColor: Colors.lightGray,
  },
  cardContent: {
    padding: 12,
  },
  recipeName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  recipeDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
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
    marginBottom: 8,
  },
  availabilityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: Colors.lightGray,
  },
  availabilityText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.text,
  },
  availabilityHigh: {
    backgroundColor: Colors.fresh,
  },
  availabilityHighText: {
    color: Colors.white,
  },
  availabilityMedium: {
    backgroundColor: Colors.aging,
  },
  availabilityLow: {
    backgroundColor: Colors.expiring,
  },
  availabilityLowText: {
    color: Colors.white,
  },
  expiringBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.expiring,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  expiringText: {
    fontSize: 10,
    color: Colors.white,
    marginLeft: 2,
    fontWeight: '500',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  addButtonText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.lightText,
    textAlign: 'center',
  },
  refreshButton: {
    alignSelf: 'flex-end',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  refreshText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '500',
  },
});

export const RecipeRecommendations: React.FC<RecipeRecommendationsProps> = ({
  recipesWithAvailability,
  onAddToMealPlan,
  onRecipePress,
}) => {
  // Get recipes that use expiring ingredients first, then sort by availability
  const expiringRecipes = getRecipesUsingExpiringIngredients(recipesWithAvailability);
  const sortedRecipes = sortRecipesByAvailability(recipesWithAvailability, 'availability');
  
  // Combine expiring recipes with high-availability recipes, removing duplicates
  const recommendations = [
    ...expiringRecipes.slice(0, 2), // Top 2 recipes using expiring ingredients
    ...sortedRecipes
      .filter(recipe => !expiringRecipes.some(er => er.id === recipe.id))
      .slice(0, 3) // Top 3 other high-availability recipes
  ].slice(0, 5); // Limit to 5 total recommendations

  const getAvailabilityBadgeStyle = (percentage: number) => {
    if (percentage >= 80) {
      return [styles.availabilityBadge, styles.availabilityHigh];
    } else if (percentage >= 50) {
      return [styles.availabilityBadge, styles.availabilityMedium];
    } else {
      return [styles.availabilityBadge, styles.availabilityLow];
    }
  };

  const getAvailabilityTextStyle = (percentage: number) => {
    if (percentage >= 80) {
      return [styles.availabilityText, styles.availabilityHighText];
    } else if (percentage < 50) {
      return [styles.availabilityText, styles.availabilityLowText];
    } else {
      return styles.availabilityText;
    }
  };

  const formatPrepTime = (prepTime: number | string): string => {
    if (typeof prepTime === 'number') {
      return `${prepTime} min`;
    }
    return prepTime;
  };

  const renderRecommendationCard = (recipe: RecipeWithAvailability) => {
    const hasExpiringIngredients = recipe.availability.expiringIngredients.length > 0;
    
    return (
      <TouchableOpacity 
        key={recipe.id} 
        style={styles.recommendationCard}
        onPress={() => onRecipePress(recipe)}
      >
        {recipe.image && (
          <Image
            source={{ uri: recipe.image }}
            style={styles.recipeImage}
            resizeMode="cover"
          />
        )}
        
        <View style={styles.cardContent}>
          <Text style={styles.recipeName} numberOfLines={1}>
            {recipe.name}
          </Text>
          
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
            <View style={getAvailabilityBadgeStyle(recipe.availability.availabilityPercentage)}>
              <Text style={getAvailabilityTextStyle(recipe.availability.availabilityPercentage)}>
                {recipe.availability.availabilityPercentage}% available
              </Text>
            </View>
            
            {hasExpiringIngredients && (
              <View style={styles.expiringBadge}>
                <AlertCircle size={10} color={Colors.white} />
                <Text style={styles.expiringText}>Expiring</Text>
              </View>
            )}
          </View>
          
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => onAddToMealPlan(recipe.id)}
          >
            <Plus size={16} color={Colors.white} />
            <Text style={styles.addButtonText}>Add to Plan</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  if (recommendations.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Sparkles size={20} color={Colors.primary} />
          <Text style={styles.title}>Recommended for You</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            No recommendations available. Add more ingredients to your inventory to get personalized suggestions!
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Sparkles size={20} color={Colors.primary} />
        <Text style={styles.title}>Recommended for You</Text>
      </View>
      
      <Text style={styles.subtitle}>
        Based on your current inventory and expiring ingredients
      </Text>
      
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingRight: 16 }}
      >
        {recommendations.map(renderRecommendationCard)}
      </ScrollView>
    </View>
  );
};