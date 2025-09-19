import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Clock, Users, Edit, Trash2 } from 'lucide-react-native';

import { Colors } from '@/constants/colors';
import { Typography as Type } from '@/constants/typography';
import { Meal } from '@/types';

interface MealCardProps {
  meal: Meal;
  available: boolean;
  missingIngredientsCount?: number;
  onPress?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export const MealCard: React.FC<MealCardProps> = ({ 
  meal, 
  available, 
  missingIngredientsCount = 0,
  onPress,
  onEdit,
  onDelete
}) => {
  const totalTime = meal.prepTime + meal.cookTime;
  const defaultImage = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c';

  /**
   * Renders the meal image with fallback
   */
  const renderMealImage = () => (
    <Image 
      source={{ uri: meal.image || defaultImage }} 
      style={styles.image} 
      resizeMode="cover"
    />
  );

  /**
   * Renders meal metadata (time and servings)
   */
  const renderMetadata = () => (
    <View style={styles.metaContainer}>
      <View style={styles.metaItem}>
        <Clock size={14} color={Colors.lightText} />
        <Text style={styles.metaText}>{totalTime} min</Text>
      </View>
      
      <View style={styles.metaItem}>
        <Users size={14} color={Colors.lightText} />
        <Text style={styles.metaText}>{meal.servings} servings</Text>
      </View>
    </View>
  );

  /**
   * Renders missing ingredients warning if applicable
   */
  const renderMissingIngredients = () => {
    if (available || missingIngredientsCount === 0) return null;

    const ingredientText = missingIngredientsCount === 1 ? 'ingredient' : 'ingredients';
    
    return (
      <View style={styles.missingContainer}>
        <Text style={styles.missingText}>
          Missing {missingIngredientsCount} {ingredientText}
        </Text>
      </View>
    );
  };

  /**
   * Renders availability badge when meal is ready to cook
   */
  const renderAvailabilityBadge = () => {
    if (!available) return null;

    return (
      <View style={styles.availableBadge}>
        <Text style={styles.availableText}>Ready to Cook</Text>
      </View>
    );
  };

  /**
   * Renders action buttons (edit/delete) if handlers are provided
   */
  const renderActionButtons = () => {
    if (!onEdit && !onDelete) return null;

    return (
      <View style={styles.actionButtons}>
        {onEdit && (
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={onEdit}
            accessibilityLabel="Edit meal"
          >
            <Edit size={16} color={Colors.primary} />
          </TouchableOpacity>
        )}
        {onDelete && (
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={onDelete}
            accessibilityLabel="Delete meal"
          >
            <Trash2 size={16} color={Colors.danger} />
          </TouchableOpacity>
        )}
      </View>
    );
  };
  
  return (
    <TouchableOpacity 
      style={[styles.container, !available && styles.unavailableContainer]}
      onPress={onPress}
      testID={`meal-card-${meal.id}`}
      accessibilityLabel={`${meal.name} meal card`}
    >
      {renderMealImage()}
      
      <View style={styles.contentContainer}>
        <Text style={styles.name} numberOfLines={1}>{meal.name}</Text>
        <Text style={styles.description} numberOfLines={2}>{meal.description}</Text>
        {renderMetadata()}
        {renderMissingIngredients()}
      </View>
      
      {renderAvailabilityBadge()}
      {renderActionButtons()}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  unavailableContainer: {
    opacity: 0.8,
  },
  image: {
    width: '100%',
    height: 160,
  },
  contentContainer: {
    padding: 12,
  },
  name: {
    ...Type.h3,
    color: Colors.text,
    marginBottom: 4,
  },
  description: {
    ...Type.body,
    color: Colors.lightText,
    marginBottom: 8,
  },
  metaContainer: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  metaText: {
    ...Type.caption,
    color: Colors.lightText,
    marginLeft: 4,
  },
  missingContainer: {
    backgroundColor: Colors.secondary,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  missingText: {
    fontSize: 12,
    color: Colors.text,
  },
  availableBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: Colors.primary,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  availableText: {
    fontSize: 12,
    color: Colors.white,
    fontWeight: '500',
  },
  actionButtons: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
});