import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { BookOpen, Leaf } from 'lucide-react-native';
import { BookTableOfContentsPage } from '@/components/cookbook/BookTableOfContentsPage';
import { PageCanvas } from '@/components/cookbook/PageCanvas';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { getCookbookStyle } from '@/constants/cookbookStyles';
import { Fonts } from '@/utils/fonts';
import type { Cookbook, CookbookPage } from '@/types/cookbook';
import type { CookbookLeaf } from '@/utils/cookbook/reader';

interface CookbookLeafPageProps {
  leaf: CookbookLeaf;
  cookbook: Cookbook | null;
  pages: CookbookPage[];
  onSelectRecipe: (page: CookbookPage) => void;
  onOpenRecipe: (page: CookbookPage) => void;
}

export function CookbookLeafPage({ leaf, cookbook, pages, onSelectRecipe, onOpenRecipe }: CookbookLeafPageProps) {
  if (leaf.type === 'bookplate') {
    return <Bookplate cookbook={cookbook} pageCount={pages.length} />;
  }

  if (leaf.type === 'contents') {
    return <BookTableOfContentsPage cookbook={cookbook} pages={pages} bookMode onSelectPage={onSelectRecipe} />;
  }

  if (leaf.type === 'recipe') {
    const page = pages[leaf.pageIndex];
    if (!page) return <BlankLeaf />;

    return (
      <Pressable
        style={styles.recipe}
        onPress={() => onOpenRecipe(page)}
        accessibilityRole="button"
        accessibilityLabel={`Open ${page.title} in reading view`}
      >
        <PageCanvas page={page} bookMode />
        <View pointerEvents="none" style={styles.recipePageNumberWrap}>
          <Text style={styles.recipePageNumber}>{page.pageNumber}</Text>
        </View>
      </Pressable>
    );
  }

  return <BlankLeaf />;
}

function Bookplate({ cookbook, pageCount }: { cookbook: Cookbook | null; pageCount: number }) {
  const preset = getCookbookStyle(cookbook?.coverStyle);

  return (
    <View style={styles.bookplate}>
      <View style={[styles.bookplateFrame, { borderColor: preset.palette.accent }]}>
        <Leaf size={20} color={preset.palette.accent} strokeWidth={1.2} />
        <Text style={styles.kicker}>A PERSONAL COOKBOOK</Text>
        <Text style={[styles.bookplateTitle, { color: preset.palette.ink }]} numberOfLines={3}>
          {cookbook?.title ?? 'My Cookbook'}
        </Text>
        <View style={[styles.rule, { backgroundColor: preset.palette.accent }]} />
        <Text style={styles.bookplateMeta}>{pageCount === 1 ? 'ONE RECIPE' : `${pageCount} RECIPES`}</Text>
        <BookOpen size={18} color={Colors.book.caption} strokeWidth={1.2} />
      </View>
    </View>
  );
}

function BlankLeaf() {
  return (
    <View style={styles.blank}>
      <Leaf size={18} color={Colors.book.edgeStrong} strokeWidth={1} />
    </View>
  );
}

const styles = StyleSheet.create({
  recipe: {
    flex: 1,
  },
  recipePageNumberWrap: {
    position: 'absolute',
    right: 10,
    bottom: 7,
    minWidth: 20,
    alignItems: 'center',
  },
  recipePageNumber: {
    color: Colors.book.caption,
    fontFamily: Fonts.ui.medium,
    fontSize: 9,
    fontVariant: ['tabular-nums'],
  },
  bookplate: {
    flex: 1,
    padding: '8%',
    backgroundColor: Colors.book.pageAlt,
  },
  bookplateFrame: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    borderWidth: 1,
    opacity: 0.92,
    paddingHorizontal: 12,
  },
  kicker: {
    color: Colors.book.caption,
    fontFamily: Fonts.ui.medium,
    fontSize: 8,
    letterSpacing: 1.4,
    textAlign: 'center',
  },
  bookplateTitle: {
    fontFamily: Fonts.display.bold,
    fontSize: 20,
    lineHeight: 23,
    textAlign: 'center',
  },
  rule: {
    width: 38,
    height: 1,
    opacity: 0.65,
  },
  bookplateMeta: {
    color: Colors.book.caption,
    fontFamily: Fonts.ui.medium,
    fontSize: 8,
    letterSpacing: 1.1,
  },
  blank: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.book.pageAlt,
  },
});
