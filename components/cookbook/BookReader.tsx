/* eslint-disable react-hooks/immutability -- Reanimated shared values are intentionally mutated through their .value API. */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, Platform, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BookOpen, ChefHat, ChevronLeft, ChevronRight, Maximize2, Minimize2, Plus, Share2, X } from 'lucide-react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  interpolate,
  Keyframe,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Cookbook3DScene } from '@/components/cookbook/Cookbook3DScene';
import { NoshAssistantChatButton } from '@/components/cookbook/NoshAssistantChat';
import { useNoshConversation } from '@/contexts/NoshConversationContext';
import { useAuth } from '@/hooks/useAuth';
import { PageCanvas } from '@/components/cookbook/PageCanvas';
import { StaleDataNotice } from '@/components/ui/StaleDataNotice';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { Radii, Spacing } from '@/constants/spacing';
import { Fonts } from '@/utils/fonts';
import {
  buildCookbookLeaves,
  buildCookbookSpreads,
  getLeafIndexForPage,
  getSpreadIndexForPage,
  shouldAutoHideReaderChrome,
  shouldUseTouchPaging,
  type CookbookLeaf,
} from '@/utils/cookbook/reader';
import type { Cookbook, CookbookPage } from '@/types/cookbook';
import { trackEvent } from '@/utils/analytics';
import {
  defaultFirstRunOnboardingState,
  loadFirstRunOnboardingState,
  markFirstNoshTipSeen,
  markFirstPageReaderCueSeen,
  recordFirstReadyRecipeOpened,
  type FirstRunOnboardingState,
} from '@/utils/cookbook/firstRunOnboarding';

interface BookReaderProps {
  cookbook: Cookbook | null;
  pages: CookbookPage[];
  initialPageId?: string;
  onSelectPage: (id: string) => void;
  onShare: (page: CookbookPage) => void;
  isStale?: boolean;
  onRefresh?: () => void;
  readOnly?: boolean;
}

// Unified open/close durations and easings shared with Cookbook3DScene so
// the cover swing and reader chrome animate on the same clock. The cover
// swing is the primary motion; chrome interpolation offsets (appearing near
// the end of the open, fading early on close) are handled in chromeStyle.
const OPEN_DURATION = 980;
const CLOSE_DURATION = 620;
const ENTRY_OPEN_DELAY = 140;
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
  isStale = false,
  onRefresh,
  readOnly = false,
}: BookReaderProps) {
  const { width } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { open, recipePreview, setVisibleBookContext } = useNoshConversation();
  const renderedPages = useMemo(
    () =>
      recipePreview
        ? pages.map((page) => (page.id === recipePreview.pageId ? { ...page, recipeGraph: recipePreview.graph } : page))
        : pages,
    [pages, recipePreview],
  );
  const pageIds = useMemo(() => pages.map((page) => page.id), [pages]);
  const spreads = useMemo(() => buildCookbookSpreads(pageIds), [pageIds]);
  const leaves = useMemo(() => buildCookbookLeaves(pageIds), [pageIds]);
  const requestedSpread = getSpreadIndexForPage(spreads, initialPageId) ?? 0;
  const [spreadIndex, setSpreadIndex] = useState(requestedSpread);
  const [isOpen, setIsOpen] = useState(Boolean(initialPageId));
  const [readingView, setReadingView] = useState<'spread' | 'page'>('spread');
  const [readingPageId, setReadingPageId] = useState(initialPageId);
  const initialLeafIndex = useMemo(
    () => getLeafIndexForPage(leaves, initialPageId ?? pages[0]?.id),
    [initialPageId, leaves, pages],
  );
  const [leafIndex, setLeafIndex] = useState(initialLeafIndex);
  const [focusedPage, setFocusedPage] = useState<CookbookPage | null>(null);
  const [firstRunState, setFirstRunState] = useState<FirstRunOnboardingState>(
    defaultFirstRunOnboardingState,
  );
  const [firstRunReady, setFirstRunReady] = useState(false);
  const [firstPageCueDismissedThisSession, setFirstPageCueDismissedThisSession] = useState(false);
  const renderedFocusedPage =
    focusedPage && recipePreview?.pageId === focusedPage.id
      ? { ...focusedPage, recipeGraph: recipePreview.graph }
      : focusedPage;
  const [isBackClosed, setIsBackClosed] = useState(false);
  const handledInitialPageId = useRef<string | null>(null);
  const entryOpenTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
      chromeIdle.value = reduceMotion ? 0 : withTiming(0, { duration: 700 });
    }, 3500);
  }, [autoHideChrome, chromeIdle, reduceMotion]);

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
  // (bookplate, recipes, optional trailing blank). In spread mode it tracks recipe pages.
  const counterCurrent =
    usesTouchPaging && readingView === 'page'
      ? leafIndex + 1
      : readingPage && readingPageIndex >= 0
        ? readingPageIndex + 1
        : spreadIndex + 1;
  const counterTotal =
    usesTouchPaging && readingView === 'page' ? leaves.length : pages.length > 0 ? pages.length : spreads.length;
  const firstPageCue = firstRunReady
    && firstRunState.status === 'completed'
    && firstRunState.firstCookbookId === cookbookId
    && !firstRunState.readerCueSeen
    ? pages.find((page) => page.id === firstRunState.firstPageId) ?? null
    : null;
  const showFirstNoshTip = Boolean(
    firstRunReady &&
    firstRunState.status === 'completed' &&
    firstRunState.firstCookbookId === cookbookId &&
    firstRunState.readerCueSeen &&
    !firstRunState.noshTipSeen &&
    !firstPageCueDismissedThisSession &&
    selectedPage &&
    cookbook,
  );
  const firstAvailablePageId = pages[0]?.id;

  useEffect(() => {
    if (!user?.id || !cookbookId) {
      setFirstRunState(defaultFirstRunOnboardingState());
      setFirstRunReady(false);
      return;
    }
    let cancelled = false;
    setFirstRunReady(false);
    void loadFirstRunOnboardingState(user.id)
      .then(async (state) => {
        let nextState = state;
        if (
          firstAvailablePageId &&
          state.status === 'started' &&
          state.firstCookbookId === cookbookId
        ) {
          const activation = await recordFirstReadyRecipeOpened(user.id, cookbookId, firstAvailablePageId);
          nextState = activation.state;
          if (activation.didActivate) {
            trackEvent({
              type: 'first_ready_recipe_opened',
              data: { cookbookId, pageId: firstAvailablePageId, entryPoint: 'reader' },
            });
          }
        }
        if (cancelled) return;
        setFirstRunState(nextState);
        setFirstRunReady(true);
      })
      .catch(() => {
        if (cancelled) return;
        setFirstRunReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [cookbookId, firstAvailablePageId, user?.id]);

  useEffect(() => {
    setFirstPageCueDismissedThisSession(false);
  }, [cookbookId]);

  useEffect(() => {
    setVisibleBookContext({
      cookbook,
      pages,
      page: selectedPage ?? pages[0] ?? null,
    });
  }, [cookbook, pages, selectedPage, setVisibleBookContext]);

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

  useEffect(() => {
    if (initialPageId) return;

    if (reduceMotion) {
      setIsOpen(true);
      opening.set(1);
      return;
    }

    entryOpenTimerRef.current = setTimeout(() => {
      entryOpenTimerRef.current = null;
      setIsOpen(true);
      opening.set(
        withTiming(1, {
          duration: OPEN_DURATION,
          easing: OPEN_EASING,
        }),
      );
    }, ENTRY_OPEN_DELAY);

    return () => {
      if (entryOpenTimerRef.current) clearTimeout(entryOpenTimerRef.current);
      entryOpenTimerRef.current = null;
    };
  }, [initialPageId, opening, reduceMotion]);

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
    if (entryOpenTimerRef.current) {
      clearTimeout(entryOpenTimerRef.current);
      entryOpenTimerRef.current = null;
    }
    setIsOpen(true);
    if (usesTouchPaging && pages.length > 0) {
      const targetPage = readingPage ?? pages[0];
      setReadingPageId(targetPage.id);
      onSelectPage(targetPage.id);
      setLeafIndex(getLeafIndexForPage(leaves, targetPage.id));
    }
    opening.set(
      reduceMotion
        ? 1
        : withTiming(1, {
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
    setSpreadIndex(0);
    opening.set(
      reduceMotion
        ? 0
        : withTiming(0, {
            duration: CLOSE_DURATION,
            easing: CLOSE_EASING,
          }),
    );
  }

  function closeBackBook() {
    setReadingView('spread');
    setSpreadIndex(Math.max(0, spreads.length - 1));
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
    if (!cookbook) return;
    setVisibleBookContext({ cookbook, pages, page: selectedPage ?? pages[0] ?? null });
    open('cookbook-add', { kind: 'cookbook', cookbookId: cookbook.id, title: cookbook.title });
    pokeChrome();
  }

  function dismissFirstPageCue() {
    setFirstPageCueDismissedThisSession(true);
    setFirstRunState((current) => ({ ...current, readerCueSeen: true }));
    if (user?.id) {
      void markFirstPageReaderCueSeen(user.id).catch(() => undefined);
    }
  }

  function dismissFirstNoshTip() {
    setFirstRunState((current) => ({ ...current, noshTipSeen: true }));
    if (user?.id) {
      void markFirstNoshTipSeen(user.id).catch(() => undefined);
    }
  }

  function openNoshFromFirstTip() {
    if (!cookbook || !selectedPage) return;
    dismissFirstNoshTip();
    setVisibleBookContext({ cookbook, pages, page: selectedPage });
    open('recipe-ask', {
      kind: 'recipe',
      cookbookId: cookbook.id,
      pageId: selectedPage.id,
      title: selectedPage.title,
    });
    trackEvent({
      type: 'first_contextual_nosh_opened',
      data: { cookbookId: cookbook.id, pageId: selectedPage.id },
    });
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

  function enterReadingView(page?: CookbookPage) {
    const targetPage = page ?? preferredSpreadPage;
    if (targetPage) {
      setReadingPageId(targetPage.id);
      onSelectPage(targetPage.id);
      const targetLeafIndex = leaves.findIndex((leaf) => leaf.id === targetPage.id);
      if (targetLeafIndex >= 0) setLeafIndex(targetLeafIndex);
      // The web book uses a lightweight art texture for its 3D spread. Open
      // the live typeset PageCanvas when the user asks to read the page.
      if (Platform.OS === 'web') {
        setFocusedPage(targetPage);
        pokeChrome();
        return;
      }
    }
    setReadingView('page');
    pokeChrome();
  }

  return (
    <LinearGradient colors={Colors.book.readerGradient} style={styles.container}>
      <Animated.View style={[styles.topBar, { paddingTop: insets.top + Spacing.xs }, topBarStyle]}>
        <Pressable
          style={[styles.backButton, { minWidth: topSideWidth }]}
          onPress={() => router.dismissTo('/(book)')}
          accessibilityRole="button"
          accessibilityLabel="Back to my collection"
        >
          <ChevronLeft size={20} color={Colors.text} />
          {width >= 480 ? <Text style={styles.backText}>Library</Text> : null}
        </Pressable>
        <View style={styles.titleBlock}>
          <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit>
            {cookbookTitle}
          </Text>
          {readOnly ? <Text style={styles.sampleLabel}>SAMPLE COOKBOOK</Text> : null}
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
          pages={renderedPages}
          spreads={spreads}
          spreadIndex={spreadIndex}
          isOpen={isOpen}
          reduceMotion={reduceMotion}
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
          onNext={() => (usesTouchPaging && readingView === 'page' ? goToLeaf(1) : goToSpread(spreadIndex + 1))}
          onPrevious={() => (usesTouchPaging && readingView === 'page' ? goToLeaf(-1) : goToSpread(spreadIndex - 1))}
          onStageTap={pokeChrome}
          onEnterReadingView={enterReadingView}
          onOpenRecipe={setFocusedPage}
        />
        {!readOnly && isOpen && pages.length === 0 ? (
          <View
            style={[styles.emptyBookPrompt, { bottom: insets.bottom + 82 }]}
            accessibilityLiveRegion="polite"
          >
            <Text style={styles.emptyBookEyebrow} maxFontSizeMultiplier={1.35}>YOUR BOOK IS READY</Text>
            <Text style={styles.emptyBookTitle} maxFontSizeMultiplier={1.35}>
              Turn a recipe you love into its first page.
            </Text>
            <Pressable
              style={({ pressed }) => [styles.emptyBookButton, pressed && styles.actionPressed]}
              onPress={openAddPage}
              accessibilityRole="button"
              accessibilityLabel={`Add the first recipe to ${cookbookTitle}`}
            >
              <Plus size={18} color={Colors.onPrimary} />
              <Text style={styles.emptyBookButtonText} maxFontSizeMultiplier={1.35}>Add my first recipe</Text>
            </Pressable>
          </View>
        ) : null}
        {!readOnly && isOpen && firstPageCue ? (
          <View
            style={[styles.firstPageMoment, { bottom: insets.bottom + 82 }]}
            accessibilityLiveRegion="polite"
          >
            <Text style={styles.firstPageEyebrow} maxFontSizeMultiplier={1.35}>YOUR FIRST PAGE IS HOME</Text>
            <Text style={styles.firstPageTitle} numberOfLines={2} maxFontSizeMultiplier={1.35}>
              {firstPageCue.title}
            </Text>
            <Text style={styles.firstPageCopy} maxFontSizeMultiplier={1.35}>
              This is your designed recipe page. Open it to read, cook, and ask Nosh about the recipe.
            </Text>
            <Pressable
              style={({ pressed }) => [styles.emptyBookButton, pressed && styles.actionPressed]}
              onPress={() => {
                dismissFirstPageCue();
                enterReadingView(firstPageCue);
              }}
              accessibilityRole="button"
              accessibilityLabel={`Read my first recipe, ${firstPageCue.title}`}
            >
              <BookOpen size={18} color={Colors.onPrimary} />
              <Text style={styles.emptyBookButtonText} maxFontSizeMultiplier={1.35}>Read my recipe</Text>
            </Pressable>
            <Pressable
              style={styles.firstPageDismiss}
              onPress={dismissFirstPageCue}
              accessibilityRole="button"
              accessibilityLabel="Dismiss first page introduction"
            >
              <Text style={styles.firstPageDismissText} maxFontSizeMultiplier={1.35}>Keep browsing</Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      <Animated.View
        pointerEvents={isOpen ? 'auto' : 'none'}
        style={[styles.readerControls, { paddingBottom: insets.bottom + 10 }, chromeStyle]}
      >
        {(() => {
          const isPageMode = usesTouchPaging && readingView === 'page';
          const atStart = isPageMode ? leafIndex === 0 : spreadIndex === 0;
          const atEnd = isPageMode ? leafIndex === leaves.length - 1 : spreadIndex === spreads.length - 1;
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
          onPress={() => (readingView === 'spread' ? enterReadingView(selectedPage ?? undefined) : toggleReadingView())}
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

      {!readOnly && pages.length > 0 && isOpen && (selectedPage || cookbookId) ? (
        <Animated.View
          style={[styles.readerActionDock, { top: insets.top + 58 }, floatingIdleStyle]}
          pointerEvents="auto"
        >
          {selectedPage && cookbook ? (
            <NoshAssistantChatButton
              page={selectedPage}
              cookbook={cookbook}
              cookbookPages={pages}
              onOpen={showFirstNoshTip ? dismissFirstNoshTip : undefined}
            />
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

      {!readOnly && isOpen && showFirstNoshTip && selectedPage ? (
        <Animated.View
          style={[
            styles.firstNoshTip,
            { top: insets.top + 112, width: Math.min(width - Spacing.xl * 2, 310) },
          ]}
          accessibilityLiveRegion="polite"
        >
          <View style={styles.firstNoshTipHeader}>
            <View style={styles.firstNoshTipIcon}>
              <ChefHat size={17} color={Colors.onPrimary} />
            </View>
            <View style={styles.firstNoshTipHeadingCopy}>
              <Text style={styles.firstNoshTipEyebrow}>NOSH IS HERE, TOO</Text>
              <Text style={styles.firstNoshTipTitle}>Your chef knows this recipe.</Text>
            </View>
            <Pressable
              style={styles.firstNoshTipClose}
              onPress={dismissFirstNoshTip}
              accessibilityRole="button"
              accessibilityLabel="Dismiss Ask Nosh introduction"
            >
              <X size={16} color={Colors.textSecondary} />
            </Pressable>
          </View>
          <Text style={styles.firstNoshTipCopy}>
            Ask about substitutions, technique, timing, or anything on this page.
          </Text>
          <Pressable
            style={({ pressed }) => [styles.firstNoshTipButton, pressed && styles.actionPressed]}
            onPress={openNoshFromFirstTip}
            accessibilityRole="button"
            accessibilityLabel={`Ask Nosh about ${selectedPage.title} now`}
          >
            <Text style={styles.firstNoshTipButtonText}>Ask Nosh about this recipe</Text>
          </Pressable>
        </Animated.View>
      ) : null}

      {focusedPage ? (
        <Animated.View
          entering={reduceMotion ? undefined : FadeIn.duration(170)}
          exiting={reduceMotion ? undefined : FadeOut.duration(140)}
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
                <Text style={styles.focusedActionText} maxFontSizeMultiplier={1.35}>Cookbook</Text>
              </Pressable>
              <Text style={styles.focusedTitle} numberOfLines={1} maxFontSizeMultiplier={1.35}>
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
              {recipePreview?.pageId === focusedPage.id ? (
                <View style={styles.sessionPreviewBadge} accessibilityLabel="Temporary cooking session preview">
                  <Text style={styles.sessionPreviewText}>Session preview</Text>
                </View>
              ) : null}
              <Animated.View
                entering={reduceMotion ? undefined : focusedPageEnter}
                exiting={reduceMotion ? undefined : focusedPageExit}
              >
                <PageCanvas page={renderedFocusedPage ?? focusedPage} />
              </Animated.View>
            </View>
            <Pressable
              style={[styles.focusedReturnButton, { bottom: insets.bottom + 12 }]}
              onPress={() => setFocusedPage(null)}
              accessibilityRole="button"
              accessibilityLabel="Back to open cookbook"
            >
              <ChevronLeft size={17} color={Colors.onPrimary} />
              <Text style={styles.focusedReturnText} maxFontSizeMultiplier={1.35}>Back to cookbook</Text>
            </Pressable>
          </LinearGradient>
        </Animated.View>
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
  sampleLabel: {
    color: Colors.textTertiary,
    fontFamily: Fonts.ui.semibold,
    fontSize: 8,
    lineHeight: 11,
    letterSpacing: 1.1,
    textAlign: 'center',
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
  emptyBookPrompt: {
    position: 'absolute',
    left: Spacing.xl,
    right: Spacing.xl,
    maxWidth: 340,
    alignSelf: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.lg,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    backgroundColor: 'rgba(250,248,243,0.96)',
    boxShadow: Colors.book.cardShadow,
    zIndex: 8,
  },
  emptyBookEyebrow: {
    color: Colors.textTertiary,
    fontFamily: Fonts.ui.semibold,
    fontSize: 9,
    lineHeight: 13,
    letterSpacing: 1.2,
    textAlign: 'center',
  },
  emptyBookTitle: {
    color: Colors.text,
    fontFamily: Fonts.display.semibold,
    fontSize: 18,
    lineHeight: 23,
    textAlign: 'center',
  },
  emptyBookButton: {
    minHeight: 48,
    minWidth: 220,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radii.full,
    backgroundColor: Colors.primary,
  },
  emptyBookButtonText: {
    color: Colors.onPrimary,
    fontFamily: Fonts.ui.semibold,
    fontSize: 14,
    lineHeight: 20,
  },
  firstPageMoment: {
    position: 'absolute',
    left: Spacing.xl,
    right: Spacing.xl,
    maxWidth: 360,
    alignSelf: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.lg,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    backgroundColor: 'rgba(250,248,243,0.97)',
    boxShadow: Colors.book.liftedShadow,
    zIndex: 9,
  },
  firstPageEyebrow: {
    color: Colors.textTertiary,
    fontFamily: Fonts.ui.semibold,
    fontSize: 9,
    lineHeight: 13,
    letterSpacing: 1.2,
    textAlign: 'center',
  },
  firstPageTitle: {
    color: Colors.text,
    fontFamily: Fonts.display.bold,
    fontSize: 22,
    lineHeight: 27,
    textAlign: 'center',
  },
  firstPageCopy: {
    maxWidth: 310,
    color: Colors.textSecondary,
    fontFamily: Fonts.ui.regular,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  firstPageDismiss: {
    minHeight: 44,
    minWidth: 160,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radii.full,
  },
  firstPageDismissText: {
    color: Colors.textSecondary,
    fontFamily: Fonts.ui.medium,
    fontSize: 13,
    lineHeight: 18,
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
  readerActionDock: {
    position: 'absolute',
    right: Spacing.lg,
    zIndex: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  firstNoshTip: {
    position: 'absolute',
    right: Spacing.lg,
    zIndex: 14,
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    backgroundColor: 'rgba(250,248,243,0.98)',
    boxShadow: Colors.book.liftedShadow,
  },
  firstNoshTipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  firstNoshTipIcon: {
    width: 34,
    height: 34,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radii.full,
    backgroundColor: Colors.primary,
  },
  firstNoshTipHeadingCopy: { flex: 1 },
  firstNoshTipEyebrow: {
    color: Colors.textMuted,
    fontFamily: Fonts.ui.semibold,
    fontSize: 8,
    lineHeight: 12,
    letterSpacing: 1,
  },
  firstNoshTipTitle: {
    color: Colors.text,
    fontFamily: Fonts.display.semibold,
    fontSize: 15,
    lineHeight: 20,
  },
  firstNoshTipClose: {
    width: 44,
    height: 44,
    margin: -Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radii.full,
  },
  firstNoshTipCopy: {
    color: Colors.textSecondary,
    fontFamily: Fonts.ui.regular,
    fontSize: 12,
    lineHeight: 18,
  },
  firstNoshTipButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.full,
    borderWidth: 1,
    borderColor: Colors.charcoal,
    backgroundColor: Colors.white,
  },
  firstNoshTipButtonText: {
    color: Colors.text,
    fontFamily: Fonts.ui.medium,
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
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
  sessionPreviewBadge: {
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
    borderRadius: Radii.full,
    backgroundColor: Colors.warning,
  },
  sessionPreviewText: {
    color: Colors.onWarning,
    fontFamily: Fonts.ui.semibold,
    fontSize: 11,
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
