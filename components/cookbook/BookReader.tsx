import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, ChevronRight, Maximize2, Minimize2, Plus, Share2, X } from 'lucide-react-native';
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
  const [readingView, setReadingView] = useState<'tilted' | 'topdown'>('tilted');
  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const [focusedPage, setFocusedPage] = useState<CookbookPage | null>(null);
  const handledInitialPageId = useRef<string | null>(null);
  const opening = useSharedValue(initialPageId ? 1 : 0);
  const chromeIdle = useSharedValue(1);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pokeChrome = useCallback(() => {
    // Set directly (no withTiming) so this works from any JS context,
    // including document-level event listeners on web. The fade-out uses
    // withTiming from a setTimeout, which works reliably.
    chromeIdle.value = 1;
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      chromeIdle.value = withTiming(0, { duration: 700 });
    }, 3500);
  }, [chromeIdle]);

  useEffect(() => {
    if (!isOpen) {
      chromeIdle.value = 1;
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    } else {
      pokeChrome();
    }
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [chromeIdle, isOpen, pokeChrome]);

  // On web, listen for mousemove at the document level to wake the chrome.
  // React Native Web's onPointerMove prop is unreliable for this use case.
  useEffect(() => {
    if (typeof document === 'undefined' || !isOpen) return;
    const handleMove = () => pokeChrome();
    document.addEventListener('mousemove', handleMove, { passive: true });
    document.addEventListener('touchstart', handleMove, { passive: true });
    return () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('touchstart', handleMove);
    };
  }, [isOpen, pokeChrome]);

  const topSideWidth = width < 480 ? 44 : 60;
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
    opacity: interpolate(opening.value, [0, 0.82, 1], [0, 0, 1]) * chromeIdle.value,
    transform: [{ translateY: interpolate(opening.value, [0.82, 1], [6, 0]) + (1 - chromeIdle.value) * 10 }],
  }));

  const topBarStyle = useAnimatedStyle(() => ({
    opacity: chromeIdle.value,
    transform: [{ translateY: -(1 - chromeIdle.value) * 10 }],
  }));

  const floatingIdleStyle = useAnimatedStyle(() => ({
    opacity: chromeIdle.value,
    transform: [{ scale: 0.7 + 0.3 * chromeIdle.value }],
  }));

  const closedCopyStyle = useAnimatedStyle(() => ({
    opacity: interpolate(opening.value, [0, 0.15], [1, 0]),
    transform: [{ translateY: interpolate(opening.value, [0, 0.15], [0, 6]) }],
  }));

  function openBook() {
    setIsOpen(true);
    opening.set(
      withTiming(1, {
        duration: OPEN_DURATION,
        easing: Easing.bezier(0.2, 0.76, 0.22, 1),
      }),
    );
    pokeChrome();
  }

  function closeBook() {
    setFocusedPage(null);
    setIsOpen(false);
    setReadingView('tilted');
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
    pokeChrome();

    const next = spreads[nextIndex];
    const page = getPreferredRecipe(next.left, next.right, pages);
    if (page) onSelectPage(page.id);
  }

  function openAddPageSheet() {
    if (cookbookId) setAddSheetOpen(true);
    pokeChrome();
  }

  function toggleReadingView() {
    setReadingView((prev) => (prev === 'tilted' ? 'topdown' : 'tilted'));
    pokeChrome();
  }

  function openAddPageSource(sourceType: RecipeSourceType) {
    if (!cookbookId) return;
    setAddSheetOpen(false);
    router.push(`/(book)/${cookbookId}/add?source=${sourceType}`);
  }

  return (
    <LinearGradient colors={Colors.book.readerGradient} style={styles.container}>
      <View style={styles.ambientWash} />
      <Animated.View style={[styles.topBar, { paddingTop: insets.top + Spacing.xs }, topBarStyle]}>
        <Pressable
          style={[styles.backButton, { minWidth: topSideWidth }]}
          onPress={() => router.replace('/(book)')}
          accessibilityLabel="Back to my collection"
        >
          <ChevronLeft size={20} color={Colors.text} />
          {width >= 480 ? <Text style={styles.backText}>Library</Text> : null}
        </Pressable>
        <View style={styles.titleBlock}>
          <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit>
            {cookbookTitle}
          </Text>
        </View>
        {isOpen && selectedPage ? (
          <Pressable
            style={styles.iconButton}
            onPress={() => {
              pokeChrome();
              onShare(selectedPage);
            }}
            accessibilityRole="button"
            accessibilityLabel={`Share ${selectedPage.title}`}
          >
            <Share2 size={16} color={Colors.text} />
          </Pressable>
        ) : (
          <View style={{ width: topSideWidth }} />
        )}
      </Animated.View>

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
          readingView={readingView}
          onOpen={openBook}
          onNext={() => goToSpread(spreadIndex + 1)}
          onPrevious={() => goToSpread(spreadIndex - 1)}
          onOpenRecipe={setFocusedPage}
        />

        <Animated.View
          style={[styles.closedCopy, { pointerEvents: isOpen ? 'none' : 'auto' }, closedCopyStyle]}
        >
          <Text style={styles.closedHint}>Tap the cover to open</Text>
        </Animated.View>
      </View>

      <Animated.View
        style={[styles.readerControls, { paddingBottom: insets.bottom + 10, pointerEvents: isOpen ? 'auto' : 'none' }, chromeStyle]}
      >
        <Pressable
          style={[styles.pageButton, spreadIndex === 0 && styles.pageButtonDisabled]}
          disabled={spreadIndex === 0}
          onPress={() => goToSpread(spreadIndex - 1)}
          accessibilityLabel="Previous spread"
        >
          <ChevronLeft size={18} color={Colors.text} />
        </Pressable>

        <Pressable style={styles.counter} onPress={closeBook} accessibilityLabel="Close cookbook">
          <Text style={styles.counterNumber}>
            {String(spreadIndex + 1).padStart(2, '0')} / {String(spreads.length).padStart(2, '0')}
          </Text>
        </Pressable>

        <Pressable
          style={[styles.pageButton, spreadIndex === spreads.length - 1 && styles.pageButtonDisabled]}
          disabled={spreadIndex === spreads.length - 1}
          onPress={() => goToSpread(spreadIndex + 1)}
          accessibilityLabel="Next spread"
        >
          <ChevronRight size={18} color={Colors.text} />
        </Pressable>

        <Pressable
          style={styles.viewToggleButton}
          onPress={toggleReadingView}
          accessibilityRole="button"
          accessibilityLabel={readingView === 'tilted' ? 'Enter reading mode' : 'Back to 3D view'}
        >
          {readingView === 'tilted' ? (
            <Maximize2 size={16} color={Colors.text} />
          ) : (
            <Minimize2 size={16} color={Colors.text} />
          )}
        </Pressable>
      </Animated.View>

      {isOpen && cookbookId ? (
        <Animated.View style={[floatingIdleStyle]} pointerEvents="auto">
          <Pressable
            style={styles.floatingAddButton}
            onPress={openAddPageSheet}
            accessibilityRole="button"
            accessibilityLabel={`Add a page to ${cookbookTitle}`}
          >
            <Plus size={20} color={Colors.onPrimary} />
          </Pressable>
        </Animated.View>
      ) : null}

      {isOpen && selectedPage ? (
        <Animated.View style={[floatingIdleStyle]} pointerEvents="auto">
          <NoshAssistantButton
            page={selectedPage}
            pageNumber={selectedPage.pageNumber}
            cookbookPages={pages}
            cookbookTitle={cookbookTitle}
          />
        </Animated.View>
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
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    zIndex: 10,
  },
  backButton: {
    minWidth: 60,
    height: 38,
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
  },
  title: {
    color: Colors.text,
    fontFamily: Fonts.display.semibold,
    fontSize: 16,
    lineHeight: 20,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.6)',
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
    bottom: 28,
    alignItems: 'center',
  },
  closedHint: {
    color: Colors.textMuted,
    fontFamily: Fonts.ui.medium,
    fontSize: 11,
    letterSpacing: 0.4,
  },
  readerControls: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
    zIndex: 10,
  },
  pageButton: {
    width: 40,
    height: 40,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderWidth: 1,
    borderColor: Colors.ash,
  },
  pageButtonDisabled: {
    opacity: 0.28,
  },
  viewToggleButton: {
    width: 36,
    height: 36,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderWidth: 1,
    borderColor: Colors.ash,
    marginLeft: 6,
  },
  counter: {
    minWidth: 72,
    alignItems: 'center',
  },
  counterNumber: {
    color: Colors.text,
    fontFamily: Fonts.ui.medium,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  floatingAddButton: {
    position: 'absolute',
    right: 18,
    bottom: 24,
    width: 46,
    height: 46,
    borderRadius: 23,
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
