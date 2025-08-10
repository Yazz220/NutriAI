// Recipe Card Component
// Displays local recipe information in a card format

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Clock, Users, Edit, Trash2 } from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { Colors } from '@/constants/colors';
import { Spacing, Typography } from '@/constants/spacing';
import { Meal } from '@/types';

interface RecipeCardProps {
  recipe: Meal;
  onPress: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export const RecipeCard: React.FC<RecipeCardProps> = ({
  recipe,
  onPress,
  onEdit,
  onDelete,
}) => {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <Card style={styles.card}>
        <View style={styles.content}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {recipe.name?.charAt(0)?.toUpperCase() || '?'}
            </Text>
          </View>
          <View style={styles.recipeInfo}>
            <Text style={styles.recipeName} numberOfLines={2}>
              {recipe.name}
            </Text>
            <View style={styles.recipeMeta}>
              {recipe.cookTime && (
                <View style={styles.metaItem}>
                  <Clock size={14} color={Colors.lightText} />
                  <Text style={styles.metaText}>{recipe.cookTime}m</Text>
                </View>
              )}
              {recipe.servings && (
                <View style={styles.metaItem}>
                  <Users size={14} color={Colors.lightText} />
                  <Text style={styles.metaText}>{recipe.servings}</Text>
                </View>
              )}
            </View>
            {recipe.description && (
              <Text style={styles.description} numberOfLines={2}>
                {recipe.description}
              </Text>
            )}
          </View>
          <View style={styles.actions}>
            <TouchableOpacity style={styles.iconButton} onPress={onEdit}>
              <Edit size={16} color={Colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton} onPress={onDelete}>
              <Trash2 size={16} color={Colors.expiring} />
            </TouchableOpacity>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.sm,
  },
  card: {
    padding: Spacing.md,
    borderRadius: 12,
  },
  content: {
    flexDirection: 'row',
    gap: Spacing.md,
    alignItems: 'center',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: Colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: Typography.sizes.lg,
    fontWeight: '700',
    color: Colors.primary,
  },
  recipeInfo: {
    flex: 1,
  },
  recipeName: {
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
  description: {
    fontSize: Typography.sizes.sm,
    color: Colors.lightText,
    lineHeight: 16,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  iconButton: {
    padding: Spacing.sm,
    borderRadius: 10,
    backgroundColor: Colors.tabBackground,
  },
});
