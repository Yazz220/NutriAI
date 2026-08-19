import React from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { Sheet } from '@/components/ui/Sheet';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { listRecipeTemplates } from '@/constants/recipeTemplates';
import { Radii, Spacing } from '@/constants/spacing';
import { Fonts } from '@/utils/fonts';
import type { RecipeTemplateId } from '@/types/cookbook';

interface PageStyleSheetProps {
  visible: boolean;
  selectedId: RecipeTemplateId;
  onSelect: (id: RecipeTemplateId) => void;
  onClose: () => void;
  /** When true, selection persists as the book's default for future pages. */
  bookDefaultMode?: boolean;
}

/**
 * Bottom sheet for choosing a page style (recipe page layout). Used in two
 * contexts:
 * - Inside the reader: changes the book's default page style (bookDefaultMode)
 * - On the review screen: overrides the page style for one recipe
 */
export function PageStyleSheet({
  visible,
  selectedId,
  onSelect,
  onClose,
  bookDefaultMode = false,
}: PageStyleSheetProps) {
  const templates = listRecipeTemplates();

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      contentStyle={styles.sheet}
      handleStyle={styles.handle}
      closeButtonStyle={styles.closeButton}
      closeAccessibilityLabel="Close page style sheet"
      header={
        <View style={styles.headerText}>
          <Text style={styles.eyebrow}>Page style</Text>
          <Text style={styles.title} numberOfLines={2}>
            {bookDefaultMode
              ? 'Choose how recipes look in this book'
              : 'Choose a page style for this recipe'}
          </Text>
        </View>
      }
    >
      <Text style={styles.hint}>
        {bookDefaultMode
          ? 'New recipes will use this style. Existing pages keep their original style.'
          : 'This overrides the book\u2019s default for this recipe only.'}
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {templates.map((template) => {
          const selected = selectedId === template.id;
          return (
            <Pressable
              key={template.id}
              style={styles.card}
              onPress={() => {
                onSelect(template.id);
                onClose();
              }}
              accessibilityRole="button"
              accessibilityLabel={`Use ${template.name} page style`}
              accessibilityState={{ selected }}
            >
              <View style={[styles.previewFrame, selected && styles.previewFrameSelected]}>
                <Image source={template.previewAsset} style={styles.preview} resizeMode="cover" />
                {selected ? (
                  <View style={styles.checkBadge} pointerEvents="none">
                    <Check size={14} color={Colors.onPrimary} strokeWidth={2.5} />
                  </View>
                ) : null}
              </View>
              <Text style={styles.cardTitle} numberOfLines={1}>
                {template.name}
              </Text>
              <Text style={styles.cardSubtitle} numberOfLines={2}>
                {template.tagline}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: Colors.alabaster,
    borderWidth: 1,
    borderColor: Colors.ash,
    paddingBottom: Spacing.xl,
  },
  handle: {
    backgroundColor: Colors.duskGrey,
  },
  headerText: {
    flex: 1,
  },
  eyebrow: {
    color: Colors.textMuted,
    fontSize: 11,
    fontFamily: Fonts.ui.medium,
  },
  title: {
    color: Colors.text,
    fontFamily: Fonts.display.bold,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: 0,
  },
  hint: {
    color: Colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
    fontFamily: Fonts.ui.regular,
    paddingHorizontal: Spacing.sm,
    marginBottom: Spacing.md,
  },
  scroll: {
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  card: {
    width: 120,
    gap: 6,
  },
  previewFrame: {
    position: 'relative',
    width: 120,
    height: 168,
    borderRadius: Radii.md,
    borderWidth: 2,
    borderColor: Colors.ash,
    overflow: 'hidden',
    backgroundColor: Colors.book.page,
  },
  previewFrameSelected: {
    borderColor: Colors.charcoal,
  },
  preview: {
    width: '100%',
    height: '100%',
  },
  checkBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderWidth: 2,
    borderColor: Colors.white,
  },
  cardTitle: {
    color: Colors.text,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: Fonts.display.semibold,
  },
  cardSubtitle: {
    color: Colors.textMuted,
    fontSize: 11,
    lineHeight: 15,
  },
  closeButton: {
    backgroundColor: Colors.white,
  },
});
