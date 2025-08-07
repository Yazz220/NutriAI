import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Bookmark } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { Recipe } from '@/types';

interface RecipeCardProps {
  recipe: Recipe;
  missingIngredientsCount?: number;
  isReadyToCook?: boolean;
  isSaved?: boolean;
  onPress: () => void;
  onSave: (recipe: Recipe) => void;
}

export function RecipeCard({ recipe, missingIngredientsCount, isReadyToCook, isSaved, onPress, onSave }: RecipeCardProps) {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <Image source={{ uri: recipe.image }} style={styles.image} />
      <View style={styles.infoContainer}>
        <View style={styles.headerContainer}>
          <Text style={styles.title} numberOfLines={2}>{recipe.name}</Text>
          <TouchableOpacity onPress={() => onSave(recipe)} style={styles.saveButton}>
            <Bookmark size={22} color={isSaved ? Colors.primary : Colors.secondary} fill={isSaved ? Colors.primary : 'transparent'} />
          </TouchableOpacity>
        </View>
        <View style={styles.tagsContainer}>
          {recipe.tags.slice(0, 2).map(tag => (
            <View key={tag} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
      </View>
      {isReadyToCook && (
        <View style={[styles.statusBadge, styles.readyBadge]}>
          <Text style={styles.statusBadgeText}>✅ Ready to Cook</Text>
        </View>
      )}
      {missingIngredientsCount && missingIngredientsCount > 0 && (
        <View style={[styles.statusBadge, styles.missingBadge]}>
          <Text style={styles.statusBadgeText}>Missing {missingIngredientsCount} item(s)</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 16,
  },
  image: {
    width: '100%',
    height: 150,
  },
  infoContainer: {
    padding: 12,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tag: {
    backgroundColor: Colors.lightGray,
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginRight: 6,
    marginBottom: 6,
  },
  tagText: {
    fontSize: 11,
    color: Colors.secondary,
    fontWeight: '500',
  },
  statusBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  readyBadge: {
    backgroundColor: 'rgba(46, 204, 113, 0.9)',
  },
  missingBadge: {
    backgroundColor: 'rgba(231, 76, 60, 0.9)',
  },
  statusBadgeText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
  saveButton: {
    padding: 4,
  },
});
