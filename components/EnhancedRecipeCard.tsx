// Enhanced Recipe Card Component
// Displays recipe information in a beautiful, visually appealing card format
// Inspired by the design shown in the user's screenshots

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { Clock, Users, Flame, BookOpen, Heart } from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { Colors } from '@/constants/colors';
import { Spacing, Typography } from '@/constants/spacing';
import { Meal } from '@/types';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.85;

interface EnhancedRecipeCardProps {
  recipe: Meal;
  onPress: () => void;
  onFavorite?: () => void;
  isFavorite?: boolean;
  onLongPress?: () => void;
}

export const EnhancedRecipeCard: React.FC<EnhancedRecipeCardProps> = ({
  recipe,
  onPress,
  onFavorite,
  isFavorite = false,
  onLongPress,
}) => {
  const nutrition = recipe.nutritionPerServing;
  const calories = nutrition?.calories || 0;
  const protein = nutrition?.protein || 0;
  const carbs = nutrition?.carbs || 0;
  const fats = nutrition?.fats || 0;

  return (
    <TouchableOpacity onPress={onPress} onLongPress={onLongPress} style={styles.container}>
      <Card style={styles.card}>
        {/* Recipe Image */}
        <View style={styles.imageContainer}>
          {recipe.image ? (
            <Image source={{ uri: recipe.image }} style={styles.image} />
          ) : (
            <View style={styles.placeholderImage}>
              <BookOpen size={40} color={Colors.lightText} />
            </View>
          )}
          
          {/* Favorite Button */}
          {onFavorite && (
            <TouchableOpacity 
              style={styles.favoriteButton}
              onPress={onFavorite}
            >
              <Heart 
                size={20} 
                color={isFavorite ? Colors.red[500] : Colors.white}
                fill={isFavorite ? Colors.red[500] : 'transparent'}
              />
            </TouchableOpacity>
          )}

          {/* Calorie Badge */}
          <View style={styles.calorieBadge}>
            <Flame size={16} color={Colors.white} />
            <Text style={styles.calorieText}>{calories}</Text>
            <Text style={styles.calorieUnit}>cal</Text>
          </View>
        </View>

        {/* Recipe Content */}
        <View style={styles.content}>
          {/* Recipe Title */}
          <Text style={styles.title} numberOfLines={2}>
            {recipe.name}
          </Text>

          {/* Recipe Meta Info */}
          <View style={styles.metaInfo}>
            {recipe.prepTime && (
              <View style={styles.metaItem}>
                <Clock size={14} color={Colors.lightText} />
                <Text style={styles.metaText}>{recipe.prepTime} min</Text>
              </View>
            )}
            {recipe.servings && (
              <View style={styles.metaItem}>
                <Users size={14} color={Colors.lightText} />
                <Text style={styles.metaText}>{recipe.servings} servings</Text>
              </View>
            )}
          </View>

          {/* Nutrition Breakdown */}
          <View style={styles.nutritionContainer}>
            <View style={styles.nutritionItem}>
              <Text style={styles.nutritionLabel}>Protein</Text>
              <Text style={styles.nutritionValue}>{protein}g</Text>
            </View>
            <View style={styles.nutritionDivider} />
            <View style={styles.nutritionItem}>
              <Text style={styles.nutritionLabel}>Carbs</Text>
              <Text style={styles.nutritionValue}>{carbs}g</Text>
            </View>
            <View style={styles.nutritionDivider} />
            <View style={styles.nutritionItem}>
              <Text style={styles.nutritionLabel}>Fat</Text>
              <Text style={styles.nutritionValue}>{fats}g</Text>
            </View>
          </View>

          {/* Recipe Description */}
          {recipe.description && (
            <Text style={styles.description} numberOfLines={2}>
              {recipe.description}
            </Text>
          )}
        </View>
      </Card>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: Colors.card,
    borderRadius: 16,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  imageContainer: {
    position: 'relative',
    height: 200,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  favoriteButton: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.black + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  calorieBadge: {
    position: 'absolute',
    bottom: Spacing.sm,
    right: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.orange[500],
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: 20,
  },
  calorieText: {
    ...Typography.h3,
    color: Colors.white,
    marginLeft: 4,
    fontWeight: 'bold',
  },
  calorieUnit: {
    ...Typography.body,
    color: Colors.white,
    marginLeft: 2,
    opacity: 0.9,
  },
  content: {
    padding: Spacing.md,
  },
  title: {
    ...Typography.h2,
    color: Colors.text,
    marginBottom: Spacing.sm,
    fontWeight: '600',
  },
  metaInfo: {
    flexDirection: 'row',
    marginBottom: Spacing.md,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  metaText: {
    ...Typography.body,
    color: Colors.lightText,
    marginLeft: 4,
  },
  nutritionContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.secondary,
    borderRadius: 12,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
  },
  nutritionItem: {
    flex: 1,
    alignItems: 'center',
  },
  nutritionLabel: {
    ...Typography.caption,
    color: Colors.lightText,
    marginBottom: 2,
  },
  nutritionValue: {
    ...Typography.h4,
    color: Colors.text,
    fontWeight: '600',
  },
  nutritionDivider: {
    width: 1,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.xs,
  },
  description: {
    ...Typography.body,
    color: Colors.lightText,
    lineHeight: 20,
  },
});
