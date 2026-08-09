import React from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { Check, Star } from 'lucide-react-native';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { listRecipeTemplates } from '@/constants/recipeTemplates';
import { Radii, Spacing } from '@/constants/spacing';
import { Fonts } from '@/utils/fonts';
import type { RecipeTemplateId } from '@/types/cookbook';

interface RecipeTemplateLibraryProps {
  selectedTemplateId: RecipeTemplateId;
  favoriteTemplateIds: RecipeTemplateId[];
  bottomInset?: number;
  onSelectTemplate: (templateId: RecipeTemplateId) => void;
  onToggleFavoriteTemplate: (templateId: RecipeTemplateId) => void;
}

export function RecipeTemplateLibrary({
  selectedTemplateId,
  favoriteTemplateIds,
  bottomInset = 0,
  onSelectTemplate,
  onToggleFavoriteTemplate,
}: RecipeTemplateLibraryProps) {
  const { width } = useWindowDimensions();
  const allTemplates = listRecipeTemplates();
  const favoriteTemplates = allTemplates.filter((template) => favoriteTemplateIds.includes(template.id));
  const horizontalPadding = Spacing.lg * 2;
  const gap = Spacing.md;
  const columns = width >= 900 ? 4 : width >= 640 ? 3 : 2;
  const cardWidth = Math.floor((width - horizontalPadding - gap * (columns - 1)) / columns);
  const sections = [
    ...(favoriteTemplates.length
      ? [{ title: 'Favorites', templates: favoriteTemplates }]
      : []),
    { title: 'All templates', templates: allTemplates },
  ];

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.content, { paddingBottom: Spacing.xxxl + bottomInset }]}
      showsVerticalScrollIndicator={false}
    >
      {sections.map((section) => (
        <View key={section.title} style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionCount}>{section.templates.length}</Text>
          </View>

          <View style={styles.grid}>
            {section.templates.map((template) => {
              const selected = selectedTemplateId === template.id;
              const favorite = favoriteTemplateIds.includes(template.id);
              return (
                <View
                  key={`${section.title}-${template.id}`}
                  style={[styles.card, { width: cardWidth }, selected && styles.cardSelected]}
                >
                  <View style={styles.previewFrame}>
                    <Image source={template.previewAsset} style={styles.preview} resizeMode="cover" />
                    <Pressable
                      style={styles.previewSelect}
                      onPress={() => onSelectTemplate(template.id)}
                      accessibilityRole="button"
                      accessibilityLabel={`Use ${template.name} page template`}
                      accessibilityState={{ selected }}
                    />
                    {selected ? (
                      <View style={styles.checkBadge} pointerEvents="none">
                        <Check size={14} color={Colors.onPrimary} strokeWidth={2} />
                      </View>
                    ) : null}
                    <Pressable
                      style={[styles.favoriteButton, favorite && styles.favoriteButtonActive]}
                      onPress={() => onToggleFavoriteTemplate(template.id)}
                      accessibilityRole="button"
                      accessibilityLabel={favorite ? `Unfavorite ${template.name}` : `Favorite ${template.name}`}
                    >
                      <Star
                        size={15}
                        color={favorite ? Colors.onPrimary : Colors.text}
                        fill={favorite ? Colors.onPrimary : 'transparent'}
                        strokeWidth={1.8}
                      />
                    </Pressable>
                  </View>
                  <Pressable
                    style={styles.cardCopy}
                    onPress={() => onSelectTemplate(template.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`Use ${template.name} page template`}
                    accessibilityState={{ selected }}
                  >
                    <Text style={styles.cardTitle} numberOfLines={1}>
                      {template.name}
                    </Text>
                    <Text style={styles.cardSubtitle} numberOfLines={2}>
                      {template.tagline}
                    </Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.xl,
  },
  section: {
    gap: Spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: Colors.text,
    fontSize: 18,
    lineHeight: 24,
    fontFamily: Fonts.display.semibold,
    letterSpacing: 0,
  },
  sectionCount: {
    minWidth: 26,
    height: 26,
    borderRadius: 13,
    textAlign: 'center',
    textAlignVertical: 'center',
    color: Colors.text,
    backgroundColor: Colors.parchment,
    overflow: 'hidden',
    fontSize: 12,
    lineHeight: 26,
    fontFamily: Fonts.ui.medium,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  card: {
    minWidth: 144,
    maxWidth: 320,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.ash,
    backgroundColor: Colors.white,
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  cardSelected: {
    borderColor: Colors.charcoal,
    backgroundColor: Colors.alabaster,
  },
  previewFrame: {
    position: 'relative',
    aspectRatio: 0.67,
    borderRadius: Radii.sm,
    borderWidth: 1,
    borderColor: Colors.book.edge,
    overflow: 'hidden',
    backgroundColor: Colors.book.page,
  },
  preview: {
    width: '100%',
    height: '100%',
  },
  previewSelect: {
    ...StyleSheet.absoluteFillObject,
  },
  checkBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderWidth: 2,
    borderColor: Colors.white,
  },
  favoriteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.alpha.white[50],
    borderWidth: 1,
    borderColor: Colors.alpha.primary[10],
    zIndex: 2,
  },
  favoriteButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  cardCopy: {
    gap: 3,
  },
  cardTitle: {
    color: Colors.text,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: Fonts.display.semibold,
    letterSpacing: 0,
  },
  cardSubtitle: {
    color: Colors.textMuted,
    fontSize: 11,
    lineHeight: 15,
  },
});
