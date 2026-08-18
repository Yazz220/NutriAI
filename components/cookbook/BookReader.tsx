/* eslint-disable react-hooks/immutability -- Reanimated shared values are intentionally mutated through their .value API. */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, Image, Platform, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BookOpen, ChevronLeft, ChevronRight, Maximize2, Minimize2, Plus, Share2 } from 'lucide-react-native';
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
import { AddPageSheet } from '@/components/cookbook/AddPageSheet';
import { Cookbook3DScene } from '@/components/cookbook/Cookbook3DScene';
import { NoshAssistantButton } from '@/components/cookbook/NoshAssistantButton';
import { PageCanvas } from '@/components/cookbook/PageCanvas';
import { StaleDataNotice } from '@/components/ui/StaleDataNotice';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { Radii, Spacing } from '@/constants/spacing';
import { Fonts } from '@/utils/fonts';
import {
  buildCookbookSpreads,
  getAdjacentRecipePageIndex,
  getSpreadIndexForPage,
  shouldAutoHideReaderChrome,
  shouldUseTouchPaging,
  type CookbookLeaf,
} from '@/utils/cookbook/reader';
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
  const [readingView, setReadingView] = useState<'tilted' | 'topdown'>(initialPageId ? 'topdown' : 'tilted');
  const [readingPageId, setReadingPageId] = useState(initialPageId);
  const [overviewOpen, setOverviewOpen] = useState(false);
  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const [focusedPage, setFocusedPage] = useState<CookbookPage | null>(null);
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
  const browseRailWidth = Math.min(width - 40, 760);
  const cookbookId = cookbook?.id;
  const cookbookTitle = cookbook?.title ?? 'My Cookbook';
  const activeSpread = spreads[spreadIndex] ?? spreads[0];
  const preferredSpreadPage = getPreferredRecipe(activeSpread?.left, activeSpread?.right, pages);
  const readingPage = pages.find((page) => page.id === readingPageId) ?? preferredSpreadPage;
  const selectedPage = usesTouchPaging && readingView === 'topdown' ? readingPage : preferredSpreadPage;
  const readingPageIndex = readingPage ? pages.findIndex((page) => page.id === readingPage.id) : -1;
  // The counter always means recipe pages, regardless of view mode.
  const counterCurrent = readingPage && readingPageIndex >= 0 ? readingPageIndex + 1 : spreadIndex + 1;
  const counterTotal = pages.length > 0 ? pages.length : spreads.length;

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
    setReadingView('topdown');
    setReadingPageId(initialPageId);
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

  function openBook() {
    setIsOpen(true);
    if (usesTouchPaging && pages.length > 0) {
      const targetPage = readingPage ?? pages[0];
      setReadingView('topdown');
      setReadingPageId(targetPage.id);
      onSelectPage(targetPage.id);
    }
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
    setOverviewOpen(false);
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
    if (page) {
      setReadingPageId(page.id);
      onSelectPage(page.id);
    }
  }

  function goToRecipeOffset(offset: -1 | 1) {
    const nextIndex = getAdjacentRecipePageIndex(pageIds, readingPage?.id, offset);
    if (nextIndex === null) return;
    const page = pages[nextIndex];
    const targetSpread = getSpreadIndexForPage(spreads, page.id);
    if (targetSpread !== null) setSpreadIndex(targetSpread);
    setReadingPageId(page.id);
    onSelectPage(page.id);
    pokeChrome();
  }

  function openAddPageSheet() {
    if (cookbookId) setAddSheetOpen(true);
    pokeChrome();
  }

  function toggleReadingView() {
    setReadingView((prev) => {
      if (prev === 'tilted' && !readingPageId && preferredSpreadPage) {
        setReadingPageId(preferredSpreadPage.id);
      }
      return prev === 'tilted' ? 'topdown' : 'tilted';
    });
    pokeChrome();
  }

  function jumpToRecipe(page: CookbookPage) {
    const targetSpread = getSpreadIndexForPage(spreads, page.id);
    if (targetSpread === null) return;
    setSpreadIndex(targetSpread);
    setReadingPageId(page.id);
    onSelectPage(page.id);
    pokeChrome();
    if (usesTouchPaging) setReadingView('topdown');
    setOverviewOpen(false);
  }

  function enterReadingView(page?: CookbookPage) {
    const targetPage = page ?? preferredSpreadPage;
    if (targetPage) setReadingPageId(targetPage.id);
    setReadingView('topdown');
    pokeChrome();
  }

  function openAddPageSource(sourceType: RecipeSourceType) {
    if (!cookbookId) return;
    setAddSheetOpen(false);
    router.push(`/(book)/${cookbookId}/add?source=${sourceType}`);
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
          readingView={readingView}
          readingPageId={readingPageId}
          onOpen={openBook}
          onNext={() =>
            usesTouchPaging && readingView === 'topdown'
              ? goToRecipeOffset(1)
              : goToSpread(spreadIndex + 1)
          }
          onPrevious={() =>
            usesTouchPaging && readingView === 'topdown'
              ? goToRecipeOffset(-1)
              : goToSpread(spreadIndex - 1)
          }
          onEnterReadingView={enterReadingView}
          onOpenRecipe={setFocusedPage}
          onJumpToPage={jumpToRecipe}
        />

      </View>

      {isOpen && pages.length > 0 && (readingView === 'tilted' || (usesTouchPaging && overviewOpen)) ? (
        <View
          style={[
            styles.browseRail,
            usesTouchPaging && styles.mobileBrowseRail,
            {
              bottom: insets.bottom + 68,
              left: (width - browseRailWidth) / 2,
              width: browseRailWidth,
            },
          ]}
        >
          <View style={styles.browseRailHeader}>
            <Text style={styles.browseEyebrow}>BROWSE RECIPES</Text>
            <Text style={styles.browseHint}>
              {usesTouchPaging ? 'Choose a page' : 'Tap a page to jump'}
            </Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.browseRailContent}
          >
            {pages.map((page) => {
              const pageSpread = getSpreadIndexForPage(spreads, page.id);
              const isActive = pageSpread === spreadIndex;
              const imageSource = page.imageAsset ?? (page.imageUrl ? { uri: page.imageUrl } : null);
              return (
                <Pressable
                  key={page.id}
                  style={[styles.recipeDestination, isActive && styles.recipeDestinationActive]}
                  onPress={() => jumpToRecipe(page)}
                  accessibilityRole="button"
                  accessibilityLabel={`Jump to ${page.title}, page ${page.pageNumber}`}
                >
                  {imageSource ? (
                    <Image source={imageSource} style={styles.destinationImage} resizeMode="cover" />
                  ) : (
                    <View style={styles.destinationPlaceholder} />
                  )}
                  <View style={styles.destinationCopy}>
                    <Text style={styles.destinationPage}>PAGE {String(page.pageNumber).padStart(2, '0')}</Text>
                    <Text style={styles.destinationTitle} numberOfLines={2}>
                      {page.title}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ) : null}

      {isOpen && usesTouchPaging && readingView === 'topdown' && !overviewOpen ? (
        <View style={[styles.swipeHint, { bottom: insets.bottom + 67 }]} pointerEvents="none">
          <Text style={styles.swipeHintText}>Swipe to turn recipe pages</Text>
        </View>
      ) : null}

      <Animated.View
        pointerEvents={isOpen ? 'auto' : 'none'}
        style={[styles.readerControls, { paddingBottom: insets.bottom + 10 }, chromeStyle]}
      >
        {!usesTouchPaging ? (
          <Pressable
            style={[styles.pageButton, spreadIndex === 0 && styles.pageButtonDisabled]}
            disabled={spreadIndex === 0}
            onPress={() => goToSpread(spreadIndex - 1)}
            accessibilityLabel="Previous spread"
          >
            <ChevronLeft size={18} color={Colors.text} />
          </Pressable>
        ) : null}

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

        {!usesTouchPaging ? (
          <Pressable
            style={[styles.pageButton, spreadIndex === spreads.length - 1 && styles.pageButtonDisabled]}
            disabled={spreadIndex === spreads.length - 1}
            onPress={() => goToSpread(spreadIndex + 1)}
            accessibilityLabel="Next spread"
          >
            <ChevronRight size={18} color={Colors.text} />
          </Pressable>
        ) : null}

        {usesTouchPaging ? (
          <Pressable
            style={[styles.viewToggleButton, styles.nativeControl]}
            onPress={() => {
              setOverviewOpen((open) => !open);
              pokeChrome();
            }}
            accessibilityRole="button"
            accessibilityLabel={overviewOpen ? 'Close page overview' : 'Open page overview'}
          >
            <BookOpen size={16} color={Colors.text} />
            <Text style={styles.viewToggleLabel}>{overviewOpen ? 'Done' : 'Pages'}</Text>
          </Pressable>
        ) : (
          <Pressable
            style={[styles.viewToggleButton, isNative && styles.nativeControl]}
            onPress={toggleReadingView}
            accessibilityRole="button"
            accessibilityLabel={readingView === 'tilted' ? 'Read this spread' : 'Browse pages'}
          >
            {readingView === 'tilted' ? (
              <Maximize2 size={16} color={Colors.text} />
            ) : (
              <Minimize2 size={16} color={Colors.text} />
            )}
            <Text style={styles.viewToggleLabel}>{readingView === 'tilted' ? 'Read' : 'Browse'}</Text>
          </Pressable>
        )}
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
            <NoshAssistantButton
              page={selectedPage}
              pageNumber={selectedPage.pageNumber}
              cookbookPages={pages}
              cookbookTitle={cookbookTitle}
            />
          ) : null}
          {cookbookId ? (
            <Pressable
              style={({ pressed }) => [styles.floatingAddButton, pressed && styles.actionPressed]}
              onPress={openAddPageSheet}
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
  browseRail: {
    position: 'absolute',
    zIndex: 9,
    paddingVertical: 10,
    borderRadius: 18,
    backgroundColor: 'rgba(248, 246, 240, 0.88)',
    borderWidth: 1,
    borderColor: 'rgba(129, 118, 99, 0.2)',
    boxShadow: '0 12px 32px rgba(35, 33, 28, 0.12)',
  },
  mobileBrowseRail: {
    backgroundColor: 'rgba(248, 246, 240, 0.97)',
    borderColor: 'rgba(91, 82, 68, 0.26)',
    boxShadow: '0 18px 48px rgba(35, 33, 28, 0.2)',
  },
  browseRailHeader: {
    paddingHorizontal: 14,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
  },
  browseEyebrow: {
    color: Colors.text,
    fontFamily: Fonts.ui.medium,
    fontSize: 9,
    letterSpacing: 1.25,
  },
  browseHint: {
    color: Colors.textMuted,
    fontFamily: Fonts.display.regular,
    fontSize: 11,
    fontStyle: 'italic',
  },
  browseRailContent: {
    paddingHorizontal: 10,
    gap: 8,
  },
  swipeHint: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 9,
    alignItems: 'center',
  },
  swipeHintText: {
    color: Colors.textMuted,
    fontFamily: Fonts.display.regular,
    fontSize: 11,
    fontStyle: 'italic',
    letterSpacing: 0.15,
  },
  recipeDestination: {
    width: 156,
    height: 64,
    padding: 5,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.66)',
    borderWidth: 1,
    borderColor: 'rgba(129, 118, 99, 0.16)',
  },
  recipeDestinationActive: {
    backgroundColor: 'rgba(245, 238, 219, 0.96)',
    borderColor: Colors.primary,
  },
  destinationImage: {
    width: 35,
    height: 52,
    borderRadius: 5,
    backgroundColor: Colors.parchment,
  },
  destinationPlaceholder: {
    width: 35,
    height: 52,
    borderRadius: 5,
    backgroundColor: Colors.parchment,
    borderWidth: 1,
    borderColor: Colors.ash,
  },
  destinationCopy: {
    flex: 1,
    gap: 3,
  },
  destinationPage: {
    color: Colors.textMuted,
    fontFamily: Fonts.ui.medium,
    fontSize: 8,
    letterSpacing: 0.8,
  },
  destinationTitle: {
    color: Colors.text,
    fontFamily: Fonts.display.semibold,
    fontSize: 12,
    lineHeight: 14,
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
