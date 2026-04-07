import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Colors } from '@/constants/colors';
import { Spacing, Typography, Radii, Shadows } from '@/constants/spacing';
import { Meal, MEAL_CATEGORY_LABELS } from '@/types';

interface RecipeCardInlineProps {
  meal: Meal;
  onPress?: () => void;
}

const RecipeCardInline = React.memo(({ meal, onPress }: RecipeCardInlineProps) => {
  const totalTime = (meal.prepTime ?? 0) + (meal.cookTime ?? 0);
  const categoryLabel = meal.category ? MEAL_CATEGORY_LABELS[meal.category] : null;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={styles.container}
    >
      {/* Image / Emoji placeholder */}
      <View style={styles.imageWrapper}>
        {meal.image ? (
          <Image source={{ uri: meal.image }} style={styles.image} />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.imagePlaceholderText}>🍽️</Text>
          </View>
        )}
      </View>

      {/* Info */}
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={2}>{meal.name}</Text>

        <View style={styles.meta}>
          {categoryLabel && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{categoryLabel}</Text>
            </View>
          )}
          {totalTime > 0 && (
            <Text style={styles.metaText}>⏱ {totalTime} min</Text>
          )}
          {meal.ingredients?.length > 0 && (
            <Text style={styles.metaText}>{meal.ingredients.length} ingredients</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
});

RecipeCardInline.displayName = 'RecipeCardInline';

export default RecipeCardInline;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: Spacing.sm,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  imageWrapper: {
    width: 72,
    height: 72,
    flexShrink: 0,
  },
  image: {
    width: 72,
    height: 72,
    resizeMode: 'cover',
  },
  imagePlaceholder: {
    width: 72,
    height: 72,
    backgroundColor: Colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePlaceholderText: {
    fontSize: 28,
  },
  info: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.xs,
  },
  name: {
    ...Typography.body,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  badge: {
    backgroundColor: Colors.tints.brandTintSoft,
    borderRadius: 6,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  badgeText: {
    ...Typography.overline,
    color: Colors.primary,
  },
  metaText: {
    ...Typography.caption,
    color: Colors.textTertiary,
  },
});
