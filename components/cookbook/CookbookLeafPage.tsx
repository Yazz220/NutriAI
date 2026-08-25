import React, { useCallback, useEffect, useRef } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { BookOpen, Leaf } from 'lucide-react-native';
import { captureRef, releaseCapture } from 'react-native-view-shot';
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
  onOpenRecipe: (page: CookbookPage) => void;
  onPageTextureReady?: (pageId: string, uri: string) => void;
}

export function CookbookLeafPage({
  leaf,
  cookbook,
  pages,
  onOpenRecipe,
  onPageTextureReady,
}: CookbookLeafPageProps) {
  if (leaf.type === 'bookplate') {
    return <Bookplate cookbook={cookbook} pageCount={pages.length} />;
  }

  if (leaf.type === 'recipe') {
    const page = pages[leaf.pageIndex];
    if (!page) return <BlankLeaf />;

    return <RecipeLeaf page={page} onOpenRecipe={onOpenRecipe} onPageTextureReady={onPageTextureReady} />;
  }

  return <BlankLeaf />;
}

function RecipeLeaf({
  page,
  onOpenRecipe,
  onPageTextureReady,
}: {
  page: CookbookPage;
  onOpenRecipe: (page: CookbookPage) => void;
  onPageTextureReady?: (pageId: string, uri: string) => void;
}) {
  const captureTargetRef = useRef<View>(null);
  const captureRunRef = useRef(0);

  useEffect(() => () => {
    captureRunRef.current += 1;
  }, []);

  const capturePageTexture = useCallback(() => {
    if (
      Platform.OS === 'web'
      || !page.recipeGraph
      || page.pageImage?.imageUrl
      || !onPageTextureReady
      || !captureTargetRef.current
    ) {
      return;
    }

    const runId = captureRunRef.current + 1;
    captureRunRef.current = runId;
    requestAnimationFrame(() => {
      const target = captureTargetRef.current;
      if (!target) return;

      captureRef(target, { format: 'png', quality: 1, result: 'tmpfile' })
        .then((uri) => {
          if (captureRunRef.current !== runId) {
            releaseCapture(uri);
            return;
          }
          onPageTextureReady(page.id, uri);
        })
        .catch((error) => {
          console.warn('[CookbookLeafPage] Could not capture page texture', error);
        });
    });
  }, [onPageTextureReady, page.id, page.pageImage?.imageUrl, page.recipeGraph]);

  return (
    <Pressable
      style={styles.recipe}
      onPress={() => onOpenRecipe(page)}
      accessibilityRole="button"
      accessibilityLabel={`Open ${page.title} in reading view`}
    >
      <View ref={captureTargetRef} collapsable={false} style={styles.recipe}>
        <PageCanvas page={page} bookMode onRenderReady={capturePageTexture} />
        <View pointerEvents="none" style={styles.recipePageNumberWrap}>
          <Text style={styles.recipePageNumber}>{page.pageNumber}</Text>
        </View>
      </View>
    </Pressable>
  );
}

function Bookplate({ cookbook, pageCount }: { cookbook: Cookbook | null; pageCount: number }) {
  const preset = getCookbookStyle(cookbook?.coverStyle);

  return (
    <View style={styles.bookplate}>
      <View style={[styles.bookplateFrame, { borderColor: preset.palette.accent }]}>
        <Leaf size={20} color={preset.palette.accent} strokeWidth={1.2} />
        <Text style={styles.kicker} allowFontScaling={false}>A PERSONAL COOKBOOK</Text>
        <Text
          style={[styles.bookplateTitle, { color: preset.palette.ink }]}
          numberOfLines={3}
          allowFontScaling={false}
        >
          {cookbook?.title ?? 'My Cookbook'}
        </Text>
        <View style={[styles.rule, { backgroundColor: preset.palette.accent }]} />
        <Text style={styles.bookplateMeta} allowFontScaling={false}>
          {pageCount === 1 ? 'ONE RECIPE' : `${pageCount} RECIPES`}
        </Text>
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
