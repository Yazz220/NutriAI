import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Folder, MoreHorizontal } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';

interface RecipeFolderCardProps {
  name: string;
  recipeCount: number;
  color: string;
  onPress: () => void;
  onMore?: () => void;
}

const RecipeFolderCard: React.FC<RecipeFolderCardProps> = ({ name, recipeCount, color, onPress, onMore }) => {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <View style={styles.header}>
        <Folder color={color} size={24} />
        {onMore && (
          <TouchableOpacity onPress={onMore} style={styles.moreButton}>
            <MoreHorizontal size={18} color={Colors.lightText} />
          </TouchableOpacity>
        )}
      </View>
      <Text style={styles.name} numberOfLines={2}>{name}</Text>
      <View style={styles.footer}>
        <Text style={styles.recipeCount}>{recipeCount} recipes</Text>
        <View style={[styles.countBadge, { backgroundColor: color + '30' }]}>
          <Text style={[styles.countBadgeText, { color }]}>{recipeCount}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: Spacing.md,
    margin: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'space-between',
    minHeight: 120,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  moreButton: {
    padding: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginTop: Spacing.sm,
    flexGrow: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  recipeCount: {
    fontSize: 12,
    color: Colors.lightText,
  },
  countBadge: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
});

export default RecipeFolderCard;
