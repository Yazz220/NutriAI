import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Colors } from '@/constants/colors';
import { Typography as Type } from '@/constants/typography';
import { LinearGradient } from 'expo-linear-gradient';
import { MoreVertical, Clock, Flame } from 'lucide-react-native';
import { Meal } from '@/types';

interface RecipeCardProps {
  recipe: Meal;
  onPress: (recipe: Meal) => void;
  onMenuPress?: (recipe: Meal) => void;
}

export const RecipeCard: React.FC<RecipeCardProps> = ({ recipe, onPress, onMenuPress }) => {
  const totalMinutes = Math.max(0, (recipe.prepTime ?? 0) + (recipe.cookTime ?? 0));
  const calories = recipe.nutritionPerServing?.calories;
  return (
    <View style={styles.cardWrapper}>
      <TouchableOpacity activeOpacity={0.85} style={styles.card} onPress={() => onPress(recipe)}>
        <LinearGradient colors={[Colors.card, Colors.background]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gradientBackground}>
          <View style={styles.row}>
            <View style={styles.imageContainer}>
              {recipe.image ? (
                <Image source={{ uri: recipe.image }} style={styles.thumb} resizeMode="cover" />
              ) : (
                <View style={styles.thumbPlaceholder} />
              )}
            </View>
            <View style={[styles.leftContent, { marginLeft: 12 }] }>
              <Text style={styles.title} numberOfLines={2}>{recipe.name}</Text>
              <View style={styles.metaRow}>
                <Clock size={14} color={Colors.lightText} />
                <Text style={styles.metaText}>{totalMinutes}m</Text>
              </View>
              <View style={[styles.metaRow, { marginTop: 2 }] }>
                <Flame size={14} color={Colors.lightText} />
                <Text style={styles.metaText}>{typeof calories === 'number' ? `${Math.round(calories)} kcal` : '-- kcal'}</Text>
              </View>
            </View>
            {onMenuPress && (
              <TouchableOpacity style={styles.menuBtn} onPress={() => onMenuPress(recipe)} accessibilityLabel={`Open menu for ${recipe.name}`}>
                <MoreVertical size={18} color={Colors.lightText} />
              </TouchableOpacity>
            )}
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  cardWrapper: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 10,
    overflow: 'visible',
  },
  card: {
    borderRadius: 20,
  },
  gradientBackground: {
    borderRadius: 20,
    padding: 24,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  leftContent: { flex: 1 },
  title: {
    ...Type.h3,
    color: Colors.text,
    marginBottom: 4,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { ...Type.caption, color: Colors.lightText },
  imageContainer: {
    width: 65,
    height: 65,
    borderRadius: 12, // rounded square like IngredientIcon
    overflow: 'hidden',
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Inner image fills the rounded square
  thumb: { width: '100%', height: '100%' },
  thumbPlaceholder: { width: '100%', height: '100%', backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, borderRadius: 12 },
  menuBtn: { padding: 6, alignSelf: 'center', marginLeft: 8 },
});
