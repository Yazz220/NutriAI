import React from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { getRecipeTemplate } from '@/constants/recipeTemplates';
import { Radii, Spacing , Typography} from '@/constants/spacing';
import { Fonts } from '@/utils/fonts';
import type { RecipeTemplateId } from '@/types/cookbook';

interface SelectedRecipeTemplateCardProps {
  selectedTemplateId: RecipeTemplateId;
  isOverride?: boolean;
  onOpenTemplateLibrary: () => void;
  label?: string;
}

export function SelectedRecipeTemplateCard({
  selectedTemplateId,
  isOverride = false,
  onOpenTemplateLibrary,
  label = 'Page style',
}: SelectedRecipeTemplateCardProps) {
  const template = getRecipeTemplate(selectedTemplateId);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>{label}</Text>
        {isOverride ? (
          <Text style={styles.overrideBadge}>For this recipe</Text>
        ) : (
          <Text style={styles.bookDefault}>Book default</Text>
        )}
      </View>
      <Pressable
        style={styles.card}
        onPress={onOpenTemplateLibrary}
        accessibilityRole="button"
        accessibilityLabel="Choose page style"
      >
        <Image source={template.previewAsset} style={styles.preview} resizeMode="cover" />
        <View style={styles.copy}>
          <Text style={styles.title} numberOfLines={1}>
            {template.name}
          </Text>
          <Text style={styles.subtitle} numberOfLines={2}>
            {template.tagline}
          </Text>
        </View>
        <View style={styles.action}>
          <Text style={styles.actionText}>Change</Text>
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
    fontSize: Typography.sizes.md,
    lineHeight: Typography.metrics.lineHeight16,
    fontFamily: Fonts.ui.medium,
    letterSpacing: Typography.metrics.letterSpacing0,
  },
  bookDefault: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.md,
    lineHeight: Typography.metrics.lineHeight16,
    fontFamily: Fonts.ui.medium,
  },
  overrideBadge: {
    color: Colors.primary,
    fontSize: Typography.sizes.md,
    lineHeight: Typography.metrics.lineHeight16,
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
    gap: Spacing.values[3],
  },
  title: {
    flexShrink: 1,
    color: Colors.text,
    fontSize: Typography.sizes.md,
    lineHeight: Typography.metrics.lineHeight22,
    fontFamily: Fonts.display.semibold,
    letterSpacing: Typography.metrics.letterSpacing0,
  },
  subtitle: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.md,
    lineHeight: Typography.metrics.lineHeight17,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.values[2],
  },
  actionText: {
    color: Colors.text,
    fontSize: Typography.sizes.md,
    lineHeight: Typography.metrics.lineHeight17,
    fontFamily: Fonts.ui.medium,
  },
});
