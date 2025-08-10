import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Meal } from '@/types';
import { Colors } from '@/constants/colors';
import { Clock, Users, Edit, Trash2 } from 'lucide-react-native';

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
  
  return (
    <TouchableOpacity 
      style={[styles.container, !available && styles.unavailableContainer]}
      onPress={onPress}
      testID={`meal-card-${meal.id}`}
    >
      <Image 
        source={{ uri: meal.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c' }} 
        style={styles.image} 
        resizeMode="cover"
      />
      
      <View style={styles.contentContainer}>
        <Text style={styles.name} numberOfLines={1}>{meal.name}</Text>
        <Text style={styles.description} numberOfLines={2}>{meal.description}</Text>
        
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
        
        {!available && missingIngredientsCount > 0 && (
          <View style={styles.missingContainer}>
            <Text style={styles.missingText}>
              Missing {missingIngredientsCount} ingredient{missingIngredientsCount > 1 ? 's' : ''}
            </Text>
          </View>
        )}
      </View>
      
      {available && (
        <View style={styles.availableBadge}>
          <Text style={styles.availableText}>Ready to Cook</Text>
        </View>
      )}
      
      {/* Action buttons */}
      <View style={styles.actionButtons}>
        {onEdit && (
          <TouchableOpacity style={styles.actionButton} onPress={onEdit}>
            <Edit size={16} color={Colors.primary} />
          </TouchableOpacity>
        )}
        {onDelete && (
          <TouchableOpacity style={styles.actionButton} onPress={onDelete}>
            <Trash2 size={16} color={Colors.danger} />
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
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
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
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
    fontSize: 12,
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