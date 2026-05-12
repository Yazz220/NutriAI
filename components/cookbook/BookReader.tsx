import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  ListRenderItemInfo,
  PanResponder,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Plus, Share2 } from 'lucide-react-native';
import { AddPageSheet } from '@/components/cookbook/AddPageSheet';
import { BookCoverReaderPage } from '@/components/cookbook/BookCoverReaderPage';
import { BookTableOfContentsPage } from '@/components/cookbook/BookTableOfContentsPage';
import { NoshAssistantButton } from '@/components/cookbook/NoshAssistantButton';
import { OpenBookSpread } from '@/components/cookbook/OpenBookSpread';
import { PageCanvas } from '@/components/cookbook/PageCanvas';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { Fonts } from '@/utils/fonts';
import type { Cookbook, CookbookPage, RecipeSourceType } from '@/types/cookbook';

type ReaderItem =
  | { id: 'cover'; type: 'cover' }
  | { id: 'toc'; type: 'toc' }
  | { id: string; type: 'recipe'; page: CookbookPage };

interface BookReaderProps {
  cookbook: Cookbook | null;
  pages: CookbookPage[];
  onSelectPage: (id: string) => void;
  onShare: (page: CookbookPage) => void;
}

const COVER_INDEX = 0;
const PAGE_TURN_DISTANCE = 44;

export function BookReader({
  cookbook,
  pages,
  onSelectPage,
  onShare,
}: BookReaderProps) {
  const listRef = useRef<FlatList<ReaderItem>>(null);
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [activeIndex, setActiveIndex] = useState(COVER_INDEX);
  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const horizontalPadding = width < 390 ? Spacing.sm : Spacing.md;

  const cookbookId = cookbook?.id;
  const cookbookTitle = cookbook?.title ?? 'My Cookbook';

  const readerItems = useMemo<ReaderItem[]>(() => {
    const items: ReaderItem[] = [{ id: 'cover', type: 'cover' }];
    if (pages.length > 0) {
      items.push({ id: 'toc', type: 'toc' });
      pages.forEach((page) => items.push({ id: page.id, type: 'recipe', page }));
    }
    return items;
  }, [pages]);

  const tocIndex = readerItems.findIndex((item) => item.type === 'toc');
  const firstRecipeIndex = readerItems.findIndex((item) => item.type === 'recipe');
  const activeItem = readerItems[activeIndex] ?? readerItems[0];
  const selectedPage = activeItem?.type === 'recipe' ? activeItem.page : null;

  useEffect(() => {
    if (activeIndex <= readerItems.length - 1) return;
    setActiveIndex(Math.max(0, readerItems.length - 1));
  }, [activeIndex, readerItems.length]);

  const scrollToReaderIndex = useCallback((index: number) => {
    const safeIndex = Math.max(0, Math.min(readerItems.length - 1, index));
    setActiveIndex(safeIndex);
    listRef.current?.scrollToIndex({ index: safeIndex, animated: true });

    const item = readerItems[safeIndex];
    if (item?.type === 'recipe') {
      onSelectPage(item.page.id);
    }
  }, [onSelectPage, readerItems]);

  function openAddPageSheet() {
    if (!cookbookId) return;
    setAddSheetOpen(true);
  }

  function openAddPageSource(sourceType: RecipeSourceType) {
    if (!cookbookId) return;
    setAddSheetOpen(false);
    router.push(`/(book)/${cookbookId}/add?source=${sourceType}`);
  }

  function handleMomentumEnd(offsetX: number, pageWidth: number) {
    const index = Math.max(0, Math.min(readerItems.length - 1, Math.round(offsetX / pageWidth)));
    setActiveIndex(index);

    const item = readerItems[index];
    if (item?.type === 'recipe') {
      onSelectPage(item.page.id);
    }
  }

  const pageTurnResponder = useMemo(
    () => PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        const horizontalMove = Math.abs(gestureState.dx);
        const verticalMove = Math.abs(gestureState.dy);
        return horizontalMove > 18 && horizontalMove > verticalMove * 1.2;
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx <= -PAGE_TURN_DISTANCE) {
          scrollToReaderIndex(activeIndex + 1);
        } else if (gestureState.dx >= PAGE_TURN_DISTANCE) {
          scrollToReaderIndex(activeIndex - 1);
        }
      },
      onPanResponderTerminationRequest: () => true,
    }),
    [activeIndex, scrollToReaderIndex],
  );

  return (
    <LinearGradient colors={Colors.book.readerGradient} style={styles.container}>
      <View style={styles.backgroundTexture}>
        <View style={[styles.topBar, { paddingTop: insets.top + Spacing.sm }]}>
          <Pressable
            style={styles.backButton}
            onPress={() => router.replace('/(book)')}
            accessibilityLabel="Back to my collection"
          >
            <ChevronLeft size={23} color={Colors.text} />
            <Text style={styles.backText}>Back</Text>
          </Pressable>
          <View style={styles.titleBlock}>
            <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit>
              {cookbookTitle}
            </Text>
          </View>
          {selectedPage ? (
            <Pressable
              style={styles.iconButton}
              onPress={() => onShare(selectedPage)}
              accessibilityRole="button"
              accessibilityLabel={`Share ${selectedPage.title}`}
            >
              <Share2 size={20} color={Colors.text} />
            </Pressable>
          ) : (
            <View style={styles.topBarSpacer} />
          )}
        </View>

        <View style={styles.bookStage} {...pageTurnResponder.panHandlers}>
          <FlatList
            ref={listRef}
            data={readerItems}
            horizontal
            pagingEnabled
            contentInsetAdjustmentBehavior="automatic"
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.id}
            getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
            onScrollToIndexFailed={({ index }) => {
              setTimeout(() => scrollToReaderIndex(index), 80);
            }}
            renderItem={({ item }: ListRenderItemInfo<ReaderItem>) => (
              <View style={[styles.pageSlot, { width, paddingHorizontal: horizontalPadding }]}>
                {item.type === 'cover' ? (
                  <BookCoverReaderPage
                    cookbook={cookbook}
                    pageCount={pages.length}
                    onStartReading={() =>
                      scrollToReaderIndex(tocIndex >= 0 ? tocIndex : firstRecipeIndex)
                    }
                    onAddPage={openAddPageSheet}
                  />
                ) : item.type === 'toc' ? (
                  <OpenBookSpread>
                    <BookTableOfContentsPage
                      cookbook={cookbook}
                      pages={pages}
                      bookMode
                      onSelectPage={(page) => {
                        const index = readerItems.findIndex(
                          (candidate) => candidate.type === 'recipe' && candidate.id === page.id,
                        );
                        if (index >= 0) scrollToReaderIndex(index);
                      }}
                    />
                  </OpenBookSpread>
                ) : (
                  <OpenBookSpread>
                    <PageCanvas page={item.page} bookMode />
                  </OpenBookSpread>
                )}
              </View>
            )}
            onMomentumScrollEnd={(event) => {
              const pageWidth = event.nativeEvent.layoutMeasurement.width;
              handleMomentumEnd(event.nativeEvent.contentOffset.x, pageWidth);
            }}
          />
        </View>

        {cookbookId ? (
          <Pressable
            style={styles.floatingAddButton}
            onPress={openAddPageSheet}
            accessibilityRole="button"
            accessibilityLabel={`Add a page to ${cookbookTitle}`}
          >
            <Plus size={23} color={Colors.onPrimary} />
          </Pressable>
        ) : null}

        {selectedPage ? (
          <NoshAssistantButton
            page={selectedPage}
            pageNumber={selectedPage.pageNumber}
            cookbookPages={pages}
            cookbookTitle={cookbookTitle}
          />
        ) : null}

        <AddPageSheet
          visible={addSheetOpen}
          cookbookTitle={cookbookTitle}
          onClose={() => setAddSheetOpen(false)}
          onSelectSource={openAddPageSource}
        />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundTexture: {
    flex: 1,
    backgroundColor: Colors.alpha.white[10],
  },
  topBar: {
    minHeight: 74,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.xl,
  },
  backButton: {
    minWidth: 82,
    height: 40,
    borderRadius: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 6,
  },
  backText: {
    color: Colors.text,
    fontSize: 14,
    fontFamily: Fonts.ui.medium,
  },
  titleBlock: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    color: Colors.text,
    fontFamily: Fonts.display.bold,
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: 0.6,
  },
  topBarSpacer: {
    width: 42,
    height: 42,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.ash,
  },
  bookStage: {
    flex: 1,
    justifyContent: 'center',
    marginTop: Spacing.sm,
  },
  pageSlot: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Spacing.sm,
    paddingBottom: 88,
  },
  floatingAddButton: {
    position: 'absolute',
    right: 22,
    bottom: 30,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderWidth: 1,
    borderColor: Colors.butterscotch,
    boxShadow: Colors.book.liftedShadow,
  },
});
