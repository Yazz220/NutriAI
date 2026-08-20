/* eslint-disable react-hooks/immutability -- Reanimated shared values are intentionally mutated through their .value API. */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, Platform, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, ChevronRight, LayoutTemplate, Maximize2, Minimize2, Plus, Share2 } from 'lucide-react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  interpolate,
  Keyframe,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Cookbook3DScene } from '@/components/cookbook/Cookbook3DScene';
import { NoshAssistantChatButton } from '@/components/cookbook/NoshAssistantChat';
import { PageCanvas } from '@/components/cookbook/PageCanvas';
import { PageStyleSheet } from '@/components/cookbook/PageStyleSheet';
import { StaleDataNotice } from '@/components/ui/StaleDataNotice';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { Radii, Spacing } from '@/constants/spacing';
import { Fonts } from '@/utils/fonts';
import {
  buildCookbookLeaves,
  buildCookbookSpreads,
  getSpreadIndexForPage,
  shouldAutoHideReaderChrome,
  shouldUseTouchPaging,
  type CookbookLeaf,
} from '@/utils/cookbook/reader';
import type { Cookbook, CookbookPage, RecipeTemplateId } from '@/types/cookbook';

interface BookReaderProps {
  cookbook: Cookbook | null;
  pages: CookbookPage[];
  initialPageId?: string;
  onSelectPage: (id: string) => void;
  onShare: (page: CookbookPage) => void;
  onUpdatePageTemplate?: (templateId: RecipeTemplateId) => Promise<void> | void;
  onPageUpdate?: (page: CookbookPage) => void;
  isStale?: boolean;
  onRefresh?: () => void;
}

// Unified open/close durations and easings shared with Cookbook3DScene so
// the cover swing and reader chrome animate on the same clock. The cover
// swing is the primary motion; chrome interpolation offsets (appearing near
// the end of the open, fading early on close) are handled in chromeStyle.
const OPEN_DURATION = 980;
const CLOSE_DURATION = 620;
const OPEN_EASING = Easing.bezier(0.22, 0.72, 0.24, 1);
const CLOSE_EASING = Easing.bezier(0.5, 0, 0.75, 0.2);

// The focused page lifts toward the reader rather than appearing via a
// system modal cut — a light scale/rise with a soft overshoot.
const focusedPageEnter = new Keyframe({
  0: { opacity: 0, transform: [{ scale: 0.88 }, { translateY: 28 }] },
  70: { opacity: 1, transform: [{ scale: 1.015 }, { translateY: -2 }] },
  100: { opacity: 1, transform: [{ scale: 1 }, { translateY: 0 }] },
}).duration(340);

const focusedPageExit = new Keyframe({
  0: { opacity: 1, transform: [{ scale: 1 }, { translateY: 0 }] },
  100: { opacity: 0, transform: [{ scale: 0.94 }, { translateY: 14 }] },
}).duration(150);

export function BookReader({
  cookbook,
  pages,
  initialPageId,
  onSelectPage,
  onShare,
  onUpdatePageTemplate,
  onPageUpdate,
  isStale = false,
  onRefresh,
}: BookReaderProps) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const pageIds = useMemo(() => pages.map((page) => page.id), [pages]);
  const spreads = useMemo(() => buildCookbookSpreads(pageIds), [pageIds]);
  const leaves = useMemo(() => buildCookbookLeaves(pageIds), [pageIds]);
  const requestedSpread = getSpreadIndexForPage(spreads, initialPageId) ?? 0;
  const [spreadIndex, setSpreadIndex] = useState(requestedSpread);
  const [isOpen, setIsOpen] = useState(Boolean(initialPageId));
  const [readingView, setReadingView] = useState<'spread' | 'page'>('spread');
  const [readingPageId, setReadingPageId] = useState(initialPageId);
  const initialLeafIndex = useMemo(() => {
    if (!initialPageId) return 2; // First recipe (after bookplate + ToC)
    const index = leaves.findIndex((leaf) => leaf.id === initialPageId);
    return index >= 0 ? index : 2;
  }, [initialPageId, leaves]);
  const [leafIndex, setLeafIndex] = useState(initialLeafIndex);
  const [pageStyleSheetOpen, setPageStyleSheetOpen] = useState(false);
  const [focusedPage, setFocusedPage] = useState<CookbookPage | null>(null);
  const [isBackClosed, setIsBackClosed] = useState(false);
  const handledInitialPageId = useRef<string | null>(null);
  const opening = useSharedValue(initialPageId ? 1 : 0);
  const chromeIdle = useSharedValue(1);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoHideChrome = shouldAutoHideReaderChrome(Platform.OS);
  const isNative = Platform.OS !== 'web';
  const usesTouchPaging = shouldUseTouchPaging(Platform.OS, width);

  const pokeChrome = useCallback(() => {
    // Set directly (no withTiming) so this works from any JS context,
    // including document-level event listeners on web. The fade-out uses
    // withTiming from a setTimeout, which works reliably.
    chromeIdle.value = 1;
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (!autoHideChrome) return;
    idleTimerRef.current = setTimeout(() => {
      chromeIdle.value = withTiming(0, { duration: 700 });
    }, 3500);
  }, [autoHideChrome, chromeIdle]);

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
  const preferredSpreadPage = getPreferredRecipe(activeSpread?.left, activeSpread?.right, pages);
  const readingPage = pages.find((page) => page.id === readingPageId) ?? preferredSpreadPage;
  const selectedPage = usesTouchPaging && readingView === 'page' ? readingPage : preferredSpreadPage;
  const readingPageIndex = readingPage ? pages.findIndex((page) => page.id === readingPage.id) : -1;
  // In one-page mode the counter tracks position in the full leaf list
  // (bookplate, ToC, recipes, blank). In spread mode it tracks recipe pages.
  const counterCurrent =
    usesTouchPaging && readingView === 'page'
      ? leafIndex + 1
      : readingPage && readingPageIndex >= 0
        ? readingPageIndex + 1
        : spreadIndex + 1;
  const counterTotal =
    usesTouchPaging && readingView === 'page' ? leaves.length : pages.length > 0 ? pages.length : spreads.length;

  useEffect(() => {
    if (spreadIndex < spreads.length) return;
    setSpreadIndex(Math.max(0, spreads.length - 1));
  }, [spreadIndex, spreads.length]);

  // Android hardware back closes the focused page before navigating.
  useEffect(() => {
    if (!focusedPage) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      setFocusedPage(null);
      return true;
    });
    return () => subscription.remove();
  }, [focusedPage]);

  useEffect(() => {
    if (!initialPageId || handledInitialPageId.current === initialPageId) return;
    const targetSpread = getSpreadIndexForPage(spreads, initialPageId);
    if (targetSpread === null) return;

    handledInitialPageId.current = initialPageId;
    setSpreadIndex(targetSpread);
    setIsOpen(true);
    setReadingPageId(initialPageId);
    const targetLeafIndex = leaves.findIndex((leaf) => leaf.id === initialPageId);
    if (targetLeafIndex >= 0) setLeafIndex(targetLeafIndex);
    opening.set(1);
    onSelectPage(initialPageId);
  }, [initialPageId, leaves, onSelectPage, opening, spreads]);

  // Auto-open on arrival from the shelf (no deep-link pageId). The route
  // uses animation: 'none' so the reader appears instantly with the closed
  // cover; the cover swing IS the entrance transition. A brief settle delay
  // lets the closed cover paint for one frame before the swing starts, so
  // the user sees "book placed in hands → open" rather than a mid-swing pop.
  // Deep-linked opens (with initialPageId) skip this — they start open.
  const autoOpened = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (autoOpened.current || initialPageId || !cookbook) return;
      autoOpened.current = true;
      const timeout = setTimeout(() => openBook(), 100);
      return () => clearTimeout(timeout);
      // eslint-disable-next-line react-hooks/exhaustive-deps -- openBook is a hoisted function declaration; we only want this to fire once on focus.
    }, [cookbook, initialPageId]),
  );

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

  function openBook() {
    setIsOpen(true);
    if (usesTouchPaging && pages.length > 0) {
      const targetPage = readingPage ?? pages[0];
      setReadingPageId(targetPage.id);
      onSelectPage(targetPage.id);
      const targetLeafIndex = leaves.findIndex((leaf) => leaf.id === targetPage.id);
      if (targetLeafIndex >= 0) setLeafIndex(targetLeafIndex);
    }
    opening.set(
      withTiming(1, {
        duration: OPEN_DURATION,
        easing: OPEN_EASING,
      }),
    );
    pokeChrome();
  }

  function closeBook() {
    setFocusedPage(null);
    setIsOpen(false);
    setReadingView('spread');
    opening.set(
      withTiming(0, {
        duration: CLOSE_DURATION,
        easing: CLOSE_EASING,
      }),
    );
  }

  function closeBackBook() {
    setIsBackClosed(true);
    pokeChrome();
  }

  function openBackBook() {
    setIsBackClosed(false);
    pokeChrome();
  }

  function goToSpread(index: number) {
    const nextIndex = Math.max(0, Math.min(spreads.length - 1, index));
    if (nextIndex === spreadIndex) return;
    setSpreadIndex(nextIndex);
    pokeChrome();

    const next = spreads[nextIndex];
    const page = getPreferredRecipe(next.left, next.right, pages);
    if (page) {
      setReadingPageId(page.id);
      onSelectPage(page.id);
    }
  }

  function goToLeaf(offset: -1 | 1) {
    const nextIndex = Math.max(0, Math.min(leaves.length - 1, leafIndex + offset));
    if (nextIndex === leafIndex) return;
    setLeafIndex(nextIndex);
    const leaf = leaves[nextIndex];
    if (leaf.type === 'recipe') {
      setReadingPageId(leaf.id);
      onSelectPage(leaf.id);
      const targetSpread = getSpreadIndexForPage(spreads, leaf.id);
      if (targetSpread !== null) setSpreadIndex(targetSpread);
    }
    pokeChrome();
  }

  function openAddPage() {
    if (cookbookId) router.push(`/(book)/${cookbookId}/add`);
    pokeChrome();
  }

  function toggleReadingView() {
    setReadingView((prev) => {
      if (prev === 'spread') {
        // Switching to page mode: sync leafIndex to the current recipe page,
        // or default to the first recipe if none is selected.
        if (readingPageId) {
          const targetLeafIndex = leaves.findIndex((leaf) => leaf.id === readingPageId);
          if (targetLeafIndex >= 0) setLeafIndex(targetLeafIndex);
        } else if (preferredSpreadPage) {
          setReadingPageId(preferredSpreadPage.id);
          const targetLeafIndex = leaves.findIndex((leaf) => leaf.id === preferredSpreadPage.id);
          if (targetLeafIndex >= 0) setLeafIndex(targetLeafIndex);
        }
      }
      return prev === 'spread' ? 'page' : 'spread';
    });
    pokeChrome();
  }

  function jumpToRecipe(page: CookbookPage) {
    const targetSpread = getSpreadIndexForPage(spreads, page.id);
    if (targetSpread === null) return;
    setSpreadIndex(targetSpread);
    setReadingPageId(page.id);
    onSelectPage(page.id);
    const targetLeafIndex = leaves.findIndex((leaf) => leaf.id === page.id);
    if (targetLeafIndex >= 0) setLeafIndex(targetLeafIndex);
    pokeChrome();
    if (usesTouchPaging) setReadingView('page');
  }

  function enterReadingView(page?: CookbookPage) {
    const targetPage = page ?? preferredSpreadPage;
    if (targetPage) setReadingPageId(targetPage.id);
    setReadingView('page');
    pokeChrome();
  }

  return (
    <LinearGradient colors={Colors.book.readerGradient} style={styles.container}>
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
          opening={opening}
          readingView={readingView}
          readingPageId={readingPageId}
          leaves={leaves}
          leafIndex={leafIndex}
          onOpen={openBook}
          onClose={closeBook}
          isBackClosed={isBackClosed}
          onCloseBack={closeBackBook}
          onOpenBack={openBackBook}
          onNext={() =>
            usesTouchPaging && readingView === 'page'
              ? goToLeaf(1)
              : goToSpread(spreadIndex + 1)
          }
          onPrevious={() =>
            usesTouchPaging && readingView === 'page'
              ? goToLeaf(-1)
              : goToSpread(spreadIndex - 1)
          }
          onStageTap={pokeChrome}
          onEnterReadingView={enterReadingView}
          onOpenRecipe={setFocusedPage}
          onJumpToPage={jumpToRecipe}
        />

      </View>

      <Animated.View
        pointerEvents={isOpen ? 'auto' : 'none'}
        style={[styles.readerControls, { paddingBottom: insets.bottom + 10 }, chromeStyle]}
      >
        {(() => {
          const isPageMode = usesTouchPaging && readingView === 'page';
          const atStart = isPageMode ? leafIndex === 0 : spreadIndex === 0;
          const atEnd = isPageMode
            ? leafIndex === leaves.length - 1
            : spreadIndex === spreads.length - 1;
          const onPrev = isPageMode ? () => goToLeaf(-1) : () => goToSpread(spreadIndex - 1);
          const onNext = isPageMode ? () => goToLeaf(1) : () => goToSpread(spreadIndex + 1);
          const prevLabel = isPageMode ? 'Previous page' : 'Previous spread';
          const nextLabel = isPageMode ? 'Next page' : 'Next spread';
          return (
            <>
              <Pressable
                style={[styles.pageButton, isNative && styles.nativeControl, atStart && styles.pageButtonDisabled]}
                disabled={atStart}
                onPress={onPrev}
                accessibilityLabel={prevLabel}
              >
                <ChevronLeft size={18} color={Colors.text} />
              </Pressable>

              {usesTouchPaging ? (
                <View style={[styles.counter, styles.nativeCounter]}>
                  <Text style={styles.counterNumber}>
                    {String(counterCurrent).padStart(2, '0')} / {String(counterTotal).padStart(2, '0')}
                  </Text>
                </View>
              ) : (
                <Pressable style={styles.counter} onPress={closeBook} accessibilityLabel="Close cookbook">
                  <Text style={styles.counterNumber}>
                    {String(counterCurrent).padStart(2, '0')} / {String(counterTotal).padStart(2, '0')}
                  </Text>
                </Pressable>
              )}

              <Pressable
                style={[styles.pageButton, isNative && styles.nativeControl, atEnd && styles.pageButtonDisabled]}
                disabled={atEnd}
                onPress={onNext}
                accessibilityLabel={nextLabel}
              >
                <ChevronRight size={18} color={Colors.text} />
              </Pressable>
            </>
          );
        })()}

        <Pressable
          style={[styles.viewToggleButton, isNative && styles.nativeControl]}
          onPress={toggleReadingView}
          accessibilityRole="button"
          accessibilityLabel={readingView === 'spread' ? 'Read this page' : 'Browse spreads'}
        >
          {readingView === 'spread' ? (
            <Maximize2 size={16} color={Colors.text} />
          ) : (
            <Minimize2 size={16} color={Colors.text} />
          )}
          <Text style={styles.viewToggleLabel}>{readingView === 'spread' ? 'Read' : 'Browse'}</Text>
        </Pressable>
      </Animated.View>

      {isOpen && (selectedPage || cookbookId) ? (
        <Animated.View
          style={[
            styles.readerActionDock,
            { top: insets.top + 58 },
            floatingIdleStyle,
          ]}
          pointerEvents="auto"
        >
          {selectedPage ? (
            <NoshAssistantChatButton
              page={selectedPage}
              pageNumber={selectedPage.pageNumber}
              cookbookPages={pages}
              cookbookTitle={cookbookTitle}
              onPageUpdate={onPageUpdate}
            />
          ) : null}
          {cookbookId && onUpdatePageTemplate ? (
            <Pressable
              style={({ pressed }) => [styles.floatingIconButton, pressed && styles.actionPressed]}
              onPress={() => setPageStyleSheetOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="Change page style"
            >
              <LayoutTemplate size={18} color={Colors.text} />
            </Pressable>
          ) : null}
          {cookbookId ? (
            <Pressable
              style={({ pressed }) => [styles.floatingAddButton, pressed && styles.actionPressed]}
              onPress={openAddPage}
              accessibilityRole="button"
              accessibilityLabel={`Add a page to ${cookbookTitle}`}
            >
              <Plus size={20} color={Colors.onPrimary} />
            </Pressable>
          ) : null}
        </Animated.View>
      ) : null}

      {focusedPage ? (
        <Animated.View
          entering={FadeIn.duration(170)}
          exiting={FadeOut.duration(140)}
          style={styles.focusedOverlay}
        >
          <LinearGradient colors={Colors.book.readerGradient} style={styles.focusedReader}>
            <View style={[styles.focusedTopBar, { paddingTop: insets.top + Spacing.sm }]}>
              <Pressable
                style={styles.focusedAction}
                onPress={() => setFocusedPage(null)}
                accessibilityRole="button"
                accessibilityLabel="Return to open cookbook"
              >
                <ChevronLeft size={18} color={Colors.text} />
                <Text style={styles.focusedActionText}>Cookbook</Text>
              </Pressable>
              <Text style={styles.focusedTitle} numberOfLines={1}>
                {focusedPage.title}
              </Text>
              <Pressable
                style={styles.focusedIcon}
                onPress={() => onShare(focusedPage)}
                accessibilityLabel={`Share ${focusedPage.title}`}
              >
                <Share2 size={18} color={Colors.text} />
              </Pressable>
            </View>
            <View style={[styles.focusedPage, { paddingBottom: insets.bottom + 72 }]}>
              <Animated.View entering={focusedPageEnter} exiting={focusedPageExit}>
                <PageCanvas page={focusedPage} />
              </Animated.View>
            </View>
            <Pressable
              style={[styles.focusedReturnButton, { bottom: insets.bottom + 12 }]}
              onPress={() => setFocusedPage(null)}
              accessibilityRole="button"
              accessibilityLabel="Back to open cookbook"
            >
              <ChevronLeft size={17} color={Colors.onPrimary} />
              <Text style={styles.focusedReturnText}>Back to cookbook</Text>
            </Pressable>
          </LinearGradient>
        </Animated.View>
      ) : null}

      {onUpdatePageTemplate && cookbook ? (
        <PageStyleSheet
          visible={pageStyleSheetOpen}
          selectedId={cookbook.pageTemplateId}
          onSelect={(id) => {
            void onUpdatePageTemplate(id);
          }}
          onClose={() => setPageStyleSheetOpen(false)}
          bookDefaultMode
        />
      ) : null}
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
  nativeControl: {
    backgroundColor: 'rgba(250,248,243,0.96)',
    borderColor: 'rgba(91,82,68,0.28)',
    boxShadow: '0 5px 14px rgba(35,33,28,0.16)',
  },
  viewToggleButton: {
    minWidth: 76,
    height: 36,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderWidth: 1,
    borderColor: Colors.ash,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 11,
    marginLeft: 2,
  },
  viewToggleLabel: {
    color: Colors.text,
    fontFamily: Fonts.ui.medium,
    fontSize: 11,
  },
  counter: {
    minWidth: 72,
    alignItems: 'center',
  },
  nativeCounter: {
    height: 36,
    justifyContent: 'center',
    paddingHorizontal: 10,
    borderRadius: Radii.full,
    backgroundColor: 'rgba(250,248,243,0.96)',
    borderWidth: 1,
    borderColor: 'rgba(91,82,68,0.22)',
  },
  counterNumber: {
    color: Colors.text,
    fontFamily: Fonts.ui.medium,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  floatingAddButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    boxShadow: Colors.book.liftedShadow,
  },
  floatingIconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.alabaster,
    borderWidth: 1,
    borderColor: Colors.ash,
    boxShadow: Colors.book.liftedShadow,
  },
  readerActionDock: {
    position: 'absolute',
    right: Spacing.lg,
    zIndex: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  actionPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.96 }],
  },
  focusedOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 30,
  },
  focusedReader: {
    flex: 1,
  },
  focusedTopBar: {
    minHeight: 78,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    zIndex: 3,
    backgroundColor: 'rgba(248,246,240,0.94)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(129,118,99,0.18)',
  },
  focusedAction: {
    minWidth: 108,
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 10,
    borderRadius: Radii.full,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.ash,
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
  focusedReturnButton: {
    position: 'absolute',
    alignSelf: 'center',
    height: 46,
    paddingHorizontal: 18,
    borderRadius: Radii.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: Colors.primary,
    boxShadow: Colors.book.liftedShadow,
    zIndex: 4,
  },
  focusedReturnText: {
    color: Colors.onPrimary,
    fontFamily: Fonts.ui.medium,
    fontSize: 13,
  },
});
