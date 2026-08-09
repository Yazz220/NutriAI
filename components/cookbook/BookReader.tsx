import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BookOpen, ChevronLeft, ChevronRight, Plus, Share2, X } from 'lucide-react-native';
import Animated, { Easing, interpolate, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { AddPageSheet } from '@/components/cookbook/AddPageSheet';
import { Cookbook3DScene } from '@/components/cookbook/Cookbook3DScene';
import { NoshAssistantButton } from '@/components/cookbook/NoshAssistantButton';
import { PageCanvas } from '@/components/cookbook/PageCanvas';
import { StaleDataNotice } from '@/components/ui/StaleDataNotice';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { Radii, Spacing } from '@/constants/spacing';
import { Fonts } from '@/utils/fonts';
import { buildCookbookSpreads, getSpreadIndexForPage, type CookbookLeaf } from '@/utils/cookbook/reader';
import type { Cookbook, CookbookPage, RecipeSourceType } from '@/types/cookbook';

interface BookReaderProps {
  cookbook: Cookbook | null;
  pages: CookbookPage[];
  initialPageId?: string;
  onSelectPage: (id: string) => void;
  onShare: (page: CookbookPage) => void;
  isStale?: boolean;
  onRefresh?: () => void;
}

const OPEN_DURATION = 1150;

export function BookReader({
  cookbook,
  pages,
  initialPageId,
  onSelectPage,
  onShare,
  isStale = false,
  onRefresh,
}: BookReaderProps) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const pageIds = useMemo(() => pages.map((page) => page.id), [pages]);
  const spreads = useMemo(() => buildCookbookSpreads(pageIds), [pageIds]);
  const requestedSpread = getSpreadIndexForPage(spreads, initialPageId) ?? 0;
  const [spreadIndex, setSpreadIndex] = useState(requestedSpread);
  const [isOpen, setIsOpen] = useState(Boolean(initialPageId));
  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const [focusedPage, setFocusedPage] = useState<CookbookPage | null>(null);
  const handledInitialPageId = useRef<string | null>(null);
  const opening = useSharedValue(initialPageId ? 1 : 0);

  const topSideWidth = width < 480 ? 54 : 76;
  const cookbookId = cookbook?.id;
  const cookbookTitle = cookbook?.title ?? 'My Cookbook';
  const activeSpread = spreads[spreadIndex] ?? spreads[0];
  const selectedPage = getPreferredRecipe(activeSpread?.left, activeSpread?.right, pages);

  useEffect(() => {
    if (spreadIndex < spreads.length) return;
    setSpreadIndex(Math.max(0, spreads.length - 1));
  }, [spreadIndex, spreads.length]);

  useEffect(() => {
    if (!initialPageId || handledInitialPageId.current === initialPageId) return;
    const targetSpread = getSpreadIndexForPage(spreads, initialPageId);
    if (targetSpread === null) return;

    handledInitialPageId.current = initialPageId;
    setSpreadIndex(targetSpread);
    setIsOpen(true);
    opening.set(1);
    onSelectPage(initialPageId);
  }, [initialPageId, onSelectPage, opening, spreads]);

  const chromeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(opening.value, [0, 0.78, 1], [0, 0, 1]),
    transform: [{ translateY: interpolate(opening.value, [0.78, 1], [8, 0]) }],
  }));

  const closedCopyStyle = useAnimatedStyle(() => ({
    opacity: interpolate(opening.value, [0, 0.2], [1, 0]),
    transform: [{ translateY: interpolate(opening.value, [0, 0.2], [0, 8]) }],
  }));

  function openBook() {
    setIsOpen(true);
    opening.set(
      withTiming(1, {
        duration: OPEN_DURATION,
        easing: Easing.bezier(0.2, 0.76, 0.22, 1),
      }),
    );
  }

  function closeBook() {
    setFocusedPage(null);
    setIsOpen(false);
    opening.set(
      withTiming(0, {
        duration: 760,
        easing: Easing.bezier(0.55, 0, 0.72, 0.18),
      }),
    );
  }

  function goToSpread(index: number) {
    const nextIndex = Math.max(0, Math.min(spreads.length - 1, index));
    if (nextIndex === spreadIndex) return;
    setSpreadIndex(nextIndex);

    const next = spreads[nextIndex];
    const page = getPreferredRecipe(next.left, next.right, pages);
    if (page) onSelectPage(page.id);
  }

  function openAddPageSheet() {
    if (cookbookId) setAddSheetOpen(true);
  }

  function openAddPageSource(sourceType: RecipeSourceType) {
    if (!cookbookId) return;
    setAddSheetOpen(false);
    router.push(`/(book)/${cookbookId}/add?source=${sourceType}`);
  }

  return (
    <LinearGradient colors={Colors.book.readerGradient} style={styles.container}>
      <View style={styles.ambientWash} />
      <View style={[styles.topBar, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable
          style={[styles.backButton, { minWidth: topSideWidth }]}
          onPress={() => router.replace('/(book)')}
          accessibilityLabel="Back to my collection"
        >
          <ChevronLeft size={22} color={Colors.text} />
          {width >= 480 ? <Text style={styles.backText}>Library</Text> : null}
        </Pressable>
        <View style={styles.titleBlock}>
          <Text style={styles.eyebrow}>{isOpen ? 'NOW READING' : 'FROM YOUR LIBRARY'}</Text>
          <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit>
            {cookbookTitle}
          </Text>
        </View>
        {isOpen && selectedPage ? (
          <Pressable
            style={styles.iconButton}
            onPress={() => onShare(selectedPage)}
            accessibilityRole="button"
            accessibilityLabel={`Share ${selectedPage.title}`}
          >
            <Share2 size={18} color={Colors.text} />
          </Pressable>
        ) : (
          <View style={{ width: topSideWidth }} />
        )}
      </View>

      {isStale && onRefresh ? (
        <View style={styles.staleNotice}>
          <StaleDataNotice subject="cookbook" onRefresh={onRefresh} />
        </View>
      ) : null}

      <View style={styles.stage}>
        <Cookbook3DScene
          cookbook={cookbook}
          pages={pages}
          spreads={spreads}
          spreadIndex={spreadIndex}
          isOpen={isOpen}
          onOpen={openBook}
          onNext={() => goToSpread(spreadIndex + 1)}
          onPrevious={() => goToSpread(spreadIndex - 1)}
          onOpenRecipe={setFocusedPage}
        />

        <Animated.View pointerEvents={isOpen ? 'none' : 'auto'} style={[styles.closedCopy, closedCopyStyle]}>
          <Text style={styles.closedHint}>Tap the cover to open</Text>
          <Pressable style={styles.openButton} onPress={openBook} accessibilityRole="button">
            <BookOpen size={18} color={Colors.onPrimary} />
            <Text style={styles.openButtonText}>{pages.length ? 'Open cookbook' : 'Open empty cookbook'}</Text>
          </Pressable>
        </Animated.View>
      </View>

      <Animated.View
        pointerEvents={isOpen ? 'auto' : 'none'}
        style={[styles.readerControls, { paddingBottom: insets.bottom + 14 }, chromeStyle]}
      >
        <Pressable
          style={[styles.pageButton, spreadIndex === 0 && styles.pageButtonDisabled]}
          disabled={spreadIndex === 0}
          onPress={() => goToSpread(spreadIndex - 1)}
          accessibilityLabel="Previous spread"
        >
          <ChevronLeft size={20} color={Colors.text} />
        </Pressable>

        <Pressable style={styles.counter} onPress={closeBook} accessibilityLabel="Close cookbook">
          <Text style={styles.counterNumber}>
            {String(spreadIndex + 1).padStart(2, '0')} / {String(spreads.length).padStart(2, '0')}
          </Text>
          <Text style={styles.counterLabel}>CLOSE BOOK</Text>
        </Pressable>

        <Pressable
          style={[styles.pageButton, spreadIndex === spreads.length - 1 && styles.pageButtonDisabled]}
          disabled={spreadIndex === spreads.length - 1}
          onPress={() => goToSpread(spreadIndex + 1)}
          accessibilityLabel="Next spread"
        >
          <ChevronRight size={20} color={Colors.text} />
        </Pressable>
      </Animated.View>

      {isOpen && cookbookId ? (
        <Pressable
          style={styles.floatingAddButton}
          onPress={openAddPageSheet}
          accessibilityRole="button"
          accessibilityLabel={`Add a page to ${cookbookTitle}`}
        >
          <Plus size={22} color={Colors.onPrimary} />
        </Pressable>
      ) : null}

      {isOpen && selectedPage ? (
        <NoshAssistantButton
          page={selectedPage}
          pageNumber={selectedPage.pageNumber}
          cookbookPages={pages}
          cookbookTitle={cookbookTitle}
        />
      ) : null}

      <Modal
        visible={Boolean(focusedPage)}
        animationType="fade"
        transparent={false}
        onRequestClose={() => setFocusedPage(null)}
      >
        <LinearGradient colors={Colors.book.readerGradient} style={styles.focusedReader}>
          <View style={[styles.focusedTopBar, { paddingTop: insets.top + Spacing.sm }]}>
            <Pressable
              style={styles.focusedAction}
              onPress={() => setFocusedPage(null)}
              accessibilityLabel="Return to open cookbook"
            >
              <X size={20} color={Colors.text} />
              <Text style={styles.focusedActionText}>Book</Text>
            </Pressable>
            <Text style={styles.focusedTitle} numberOfLines={1}>
              {focusedPage?.title}
            </Text>
            {focusedPage ? (
              <Pressable
                style={styles.focusedIcon}
                onPress={() => onShare(focusedPage)}
                accessibilityLabel={`Share ${focusedPage.title}`}
              >
                <Share2 size={18} color={Colors.text} />
              </Pressable>
            ) : null}
          </View>
          <View style={[styles.focusedPage, { paddingBottom: insets.bottom + Spacing.lg }]}>
            {focusedPage ? <PageCanvas page={focusedPage} /> : null}
          </View>
        </LinearGradient>
      </Modal>

      <AddPageSheet
        visible={addSheetOpen}
        cookbookTitle={cookbookTitle}
        onClose={() => setAddSheetOpen(false)}
        onSelectSource={openAddPageSource}
      />
    </LinearGradient>
  );
}

function getPreferredRecipe(
  left: CookbookLeaf | undefined,
  right: CookbookLeaf | undefined,
  pages: CookbookPage[],
): CookbookPage | null {
  const recipeLeaf = right?.type === 'recipe' ? right : left?.type === 'recipe' ? left : null;
  return recipeLeaf ? (pages[recipeLeaf.pageIndex] ?? null) : null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  ambientWash: {
    position: 'absolute',
    left: '-15%',
    right: '-15%',
    top: '18%',
    height: '62%',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.42)',
    transform: [{ scaleY: 0.72 }],
  },
  topBar: {
    minHeight: 78,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    zIndex: 10,
  },
  backButton: {
    minWidth: 76,
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backText: {
    color: Colors.text,
    fontFamily: Fonts.ui.medium,
    fontSize: 13,
  },
  titleBlock: {
    flex: 1,
    alignItems: 'center',
    gap: 1,
  },
  eyebrow: {
    color: Colors.textMuted,
    fontFamily: Fonts.ui.medium,
    fontSize: 8,
    letterSpacing: 1.4,
  },
  title: {
    color: Colors.text,
    fontFamily: Fonts.display.bold,
    fontSize: 21,
    lineHeight: 25,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderWidth: 1,
    borderColor: Colors.ash,
  },
  staleNotice: {
    paddingHorizontal: Spacing.xl,
  },
  stage: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  closedCopy: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 10,
    alignItems: 'center',
    gap: 10,
  },
  closedHint: {
    color: Colors.textMuted,
    fontFamily: Fonts.ui.medium,
    fontSize: 11,
    letterSpacing: 0.4,
  },
  openButton: {
    minHeight: 46,
    paddingHorizontal: 22,
    borderRadius: Radii.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    backgroundColor: Colors.primary,
    boxShadow: Colors.book.cardShadow,
  },
  openButtonText: {
    color: Colors.onPrimary,
    fontFamily: Fonts.ui.medium,
    fontSize: 14,
  },
  readerControls: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    minHeight: 78,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
    zIndex: 10,
  },
  pageButton: {
    width: 44,
    height: 44,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.74)',
    borderWidth: 1,
    borderColor: Colors.ash,
  },
  pageButtonDisabled: {
    opacity: 0.28,
  },
  counter: {
    minWidth: 82,
    alignItems: 'center',
    gap: 2,
  },
  counterNumber: {
    color: Colors.text,
    fontFamily: Fonts.ui.medium,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  counterLabel: {
    color: Colors.textMuted,
    fontFamily: Fonts.ui.medium,
    fontSize: 7,
    letterSpacing: 1.2,
  },
  floatingAddButton: {
    position: 'absolute',
    right: 20,
    bottom: 28,
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    boxShadow: Colors.book.liftedShadow,
    zIndex: 11,
  },
  focusedReader: {
    flex: 1,
  },
  focusedTopBar: {
    minHeight: 78,
    paddingHorizontal: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  focusedAction: {
    minWidth: 72,
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  focusedActionText: {
    color: Colors.text,
    fontFamily: Fonts.ui.medium,
    fontSize: 13,
  },
  focusedTitle: {
    flex: 1,
    color: Colors.text,
    fontFamily: Fonts.display.semibold,
    fontSize: 18,
    textAlign: 'center',
  },
  focusedIcon: {
    width: 42,
    height: 42,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.ash,
    backgroundColor: Colors.white,
  },
  focusedPage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
});
