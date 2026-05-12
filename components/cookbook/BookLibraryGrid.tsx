import React from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Check, Eye } from 'lucide-react-native';
import { BookCover } from '@/components/cookbook/BookCover';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { Radii, Spacing } from '@/constants/spacing';
import { Fonts } from '@/utils/fonts';
import { listCookbookStyles } from '@/constants/cookbookStyles';
import type { CookbookStyleId } from '@/types/cookbook';

interface BookLibraryGridProps {
  selectedStyle: CookbookStyleId | null;
  onSelectStyle: (styleId: CookbookStyleId) => void;
}

export function BookLibraryGrid({ selectedStyle, onSelectStyle }: BookLibraryGridProps) {
  const { width } = useWindowDimensions();
  const styles_arr = listCookbookStyles();
  const horizontalPadding = Spacing.lg * 2;
  const gap = Spacing.md;
  const colWidth = Math.floor((width - horizontalPadding - gap) / 2);
  const coverWidth = Math.min(colWidth - Spacing.sm * 2, 150);

  return (
    <View style={styles.grid}>
      {styles_arr.map((preset) => {
        const isSelected = selectedStyle === preset.id;
        return (
          <Pressable
            key={preset.id}
            style={[
              styles.card,
              { width: colWidth },
              isSelected && styles.cardSelected,
            ]}
            onPress={() => onSelectStyle(preset.id)}
            accessibilityRole="button"
            accessibilityLabel={`Pick ${preset.name} style`}
            accessibilityState={{ selected: isSelected }}
          >
            <View style={styles.coverWrap}>
              <BookCover
                title={preset.name}
                coverStyle={preset.id}
                width={coverWidth}
                showPageCount={false}
              />
              {isSelected ? (
                <View style={styles.checkBadge}>
                  <Check size={16} color={Colors.onPrimary} />
                </View>
              ) : null}
            </View>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {preset.name}
            </Text>
            <View style={styles.cardActions}>
              <View style={styles.preview}>
                <Eye size={15} color={Colors.text} strokeWidth={1.8} />
                <Text style={styles.previewText}>Preview</Text>
              </View>
              <View style={styles.useButton}>
                <Text style={styles.useButtonText}>Use This Book</Text>
              </View>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  card: {
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.ash,
    backgroundColor: Colors.white,
    padding: Spacing.sm,
    gap: Spacing.sm,
    alignItems: 'center',
    boxShadow: Colors.book.cardShadow,
  },
  cardSelected: {
    borderColor: Colors.butterscotch,
    backgroundColor: Colors.white,
  },
  coverWrap: {
    position: 'relative',
    paddingVertical: Spacing.xs,
  },
  checkBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.butterscotch,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.white,
  },
  cardTitle: {
    fontFamily: Fonts.display.semibold,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.text,
  },
  cardActions: {
    alignSelf: 'stretch',
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    justifyContent: 'space-between',
  },
  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  previewText: {
    color: Colors.slate,
    fontSize: 10,
    lineHeight: 15,
  },
  useButton: {
    minHeight: 28,
    borderRadius: Radii.full,
    borderWidth: 1,
    borderColor: Colors.butterscotch,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  useButtonText: {
    color: Colors.text,
    fontSize: 10,
    lineHeight: 16,
    fontFamily: Fonts.ui.medium,
  },
});
