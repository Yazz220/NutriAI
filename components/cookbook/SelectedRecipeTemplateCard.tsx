import React from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { ChevronRight, Star } from 'lucide-react-native';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { getRecipeTemplate } from '@/constants/recipeTemplates';
import { Radii, Spacing } from '@/constants/spacing';
import { Fonts } from '@/utils/fonts';
import type { RecipeTemplateId } from '@/types/cookbook';

interface SelectedRecipeTemplateCardProps {
  selectedTemplateId: RecipeTemplateId;
  favoriteTemplateIds: RecipeTemplateId[];
  onOpenTemplateLibrary: () => void;
  label?: string;
}

export function SelectedRecipeTemplateCard({
  selectedTemplateId,
  favoriteTemplateIds,
  onOpenTemplateLibrary,
  label = 'Template',
}: SelectedRecipeTemplateCardProps) {
  const template = getRecipeTemplate(selectedTemplateId);
  const isFavorite = favoriteTemplateIds.includes(template.id);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>{label}</Text>
        {favoriteTemplateIds.length > 0 ? (
          <Text style={styles.favorites}>{favoriteTemplateIds.length} saved</Text>
        ) : null}
      </View>
      <Pressable
        style={styles.card}
        onPress={onOpenTemplateLibrary}
        accessibilityRole="button"
        accessibilityLabel="Choose page template"
      >
        <Image source={template.previewAsset} style={styles.preview} resizeMode="cover" />
        <View style={styles.copy}>
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={1}>
              {template.name}
            </Text>
            {isFavorite ? (
              <View style={styles.favoriteBadge}>
                <Star size={12} color={Colors.onPrimary} fill={Colors.onPrimary} strokeWidth={1.8} />
              </View>
            ) : null}
          </View>
          <Text style={styles.subtitle} numberOfLines={2}>
            {template.tagline}
          </Text>
        </View>
        <View style={styles.action}>
          <Text style={styles.actionText}>Browse</Text>
          <ChevronRight size={17} color={Colors.text} strokeWidth={1.8} />
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  eyebrow: {
    color: Colors.textMuted,
    fontSize: 11,
    lineHeight: 16,
    fontFamily: Fonts.ui.medium,
    letterSpacing: 0,
  },
  favorites: {
    color: Colors.deepOcean,
    fontSize: 11,
    lineHeight: 16,
    fontFamily: Fonts.ui.medium,
  },
  card: {
    minHeight: 86,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.ash,
    backgroundColor: Colors.white,
    padding: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  preview: {
    width: 50,
    height: 66,
    borderRadius: Radii.md,
    backgroundColor: Colors.book.page,
    borderWidth: 1,
    borderColor: Colors.book.edge,
  },
  copy: {
    flex: 1,
    gap: 3,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  title: {
    flexShrink: 1,
    color: Colors.text,
    fontSize: 16,
    lineHeight: 22,
    fontFamily: Fonts.display.semibold,
    letterSpacing: 0,
  },
  favoriteBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
  },
  subtitle: {
    color: Colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  actionText: {
    color: Colors.text,
    fontSize: 12,
    lineHeight: 17,
    fontFamily: Fonts.ui.medium,
  },
});
