/* eslint-disable react-hooks/immutability -- Reanimated shared values are intentionally mutated through their .value API. */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, Platform, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BookOpen, ChefHat, ChevronLeft, ChevronRight, Ellipsis, Plus, X } from 'lucide-react-native';
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
import {
  CookbookSettingsSheet,
  RecipeActionsSheet,
} from '@/components/cookbook/ReaderActionSheets';
import {
  RecipeRevisionSheet,
  type RecipeRevisionMode,
} from '@/components/cookbook/RecipeRevisionSheet';
import { NoshAssistantChatButton } from '@/components/cookbook/NoshAssistantChat';
import { useNoshConversation } from '@/contexts/NoshConversationContext';
import { useAuth } from '@/hooks/useAuth';
import { PageCanvas } from '@/components/cookbook/PageCanvas';
import { StaleDataNotice } from '@/components/ui/StaleDataNotice';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { Radii, Spacing , Typography, Shadows} from '@/constants/spacing';
import { Fonts } from '@/utils/fonts';
import {
  buildRecipeLeaves,
  buildCookbookSpreads,
  getLeafIndexForPage,
  getSpreadIndexForPage,
  shouldAutoHideReaderChrome,
  shouldUseTouchPaging,
  type CookbookLeaf,
} from '@/utils/cookbook/reader';
import { getRecipeSourceUrl } from '@/utils/cookbook/readerActions';
import { getCookbookPageImageSource } from '@/utils/cookbook/pageImage';
import type { Cookbook, CookbookPage, GeneratedRecipePage } from '@/types/cookbook';
import type { RecipeGraph } from '@/types/recipeGraph';
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
  onExportPage?: (page: CookbookPage) => Promise<void> | void;
  onVisitSource?: (page: CookbookPage) => Promise<void> | void;
  availableCookbooks?: Cookbook[];
  onMoveRecipe?: (page: CookbookPage, destination: Cookbook) => Promise<void> | void;
  onRemoveRecipe?: (page: CookbookPage) => Promise<void> | void;
  onGeneratePageCandidate?: (
    page: CookbookPage,
    recipeGraph: RecipeGraph,
    instruction: string | undefined,
    idempotencyKey: string,
  ) => Promise<GeneratedRecipePage>;
  onUsePageCandidate?: (
    page: CookbookPage,
    candidate: GeneratedRecipePage,
    recipeGraph?: RecipeGraph,
  ) => Promise<void>;
  onRenameCookbook?: (title: string) => Promise<void> | void;
  onExportCookbook?: () => Promise<void> | void;
  onDeleteCookbook?: () => Promise<void> | void;
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

// Keep this frequent transition quick and spatially restrained.
const focusedPageEnter = new Keyframe({
  0: { opacity: 0, transform: [{ scale: 0.96 }, { translateY: 12 }] },
  100: { opacity: 1, transform: [{ scale: 1 }, { translateY: 0 }] },
}).duration(220);

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
  onExportPage,
  onVisitSource,
  availableCookbooks = [],
  onMoveRecipe,
  onRemoveRecipe,
  onGeneratePageCandidate,
  onUsePageCandidate,
  onRenameCookbook,
  onExportCookbook,
  onDeleteCookbook,
  isStale = false,
  onRefresh,
  readOnly = false,
}: BookReaderProps) {
  const { width } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const insets = useSafeAreaInsets();
  const autoHideChrome = shouldAutoHideReaderChrome(Platform.OS);
  const isNative = Platform.OS !== 'web';
  const usesTouchPaging = shouldUseTouchPaging(Platform.OS, width);
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
  const recipeLeaves = useMemo(() => buildRecipeLeaves(pageIds), [pageIds]);
  const requestedSpread = getSpreadIndexForPage(spreads, initialPageId) ?? 0;
  const [spreadIndex, setSpreadIndex] = useState(requestedSpread);
  const [isOpen, setIsOpen] = useState(Boolean(initialPageId));
  const [readingView, setReadingView] = useState<'spread' | 'page'>(
    initialPageId && usesTouchPaging ? 'page' : 'spread',
  );
  const [readingPageId, setReadingPageId] = useState(initialPageId);
  const initialLeafIndex = useMemo(
    () => getLeafIndexForPage(recipeLeaves, initialPageId ?? pages[0]?.id),
    [initialPageId, pages, recipeLeaves],
  );
  const [leafIndex, setLeafIndex] = useState(initialLeafIndex);
  const [focusedPage, setFocusedPage] = useState<CookbookPage | null>(null);
  const [activeSheet, setActiveSheet] = useState<'recipe' | 'cookbook' | null>(null);
  const [revisionMode, setRevisionMode] = useState<RecipeRevisionMode | null>(null);
  const [firstRunState, setFirstRunState] = useState<FirstRunOnboardingState>(
    defaultFirstRunOnboardingState,
  );
  const [firstRunReady, setFirstRunReady] = useState(false);
  const [firstPageCueDismissedThisSession, setFirstPageCueDismissedThisSession] = useState(false);
  const renderedFocusedPage =
    focusedPage && recipePreview?.pageId === focusedPage.id
      ? { ...focusedPage, recipeGraph: recipePreview.graph }
      : focusedPage;
  const focusedPageIndex = focusedPage ? pages.findIndex((page) => page.id === focusedPage.id) : -1;
  const [isBackClosed, setIsBackClosed] = useState(false);
  const handledInitialPageId = useRef<string | null>(null);
  const entryOpenTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const opening = useSharedValue(initialPageId ? 1 : 0);
  const chromeIdle = useSharedValue(1);
  const [chromeVisible, setChromeVisible] = useState(true);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pokeChrome = useCallback(() => {
    // Set directly (no withTiming) so this works from any JS context,
    // including document-level event listeners on web. The fade-out uses
    // withTiming from a setTimeout, which works reliably.
    setChromeVisible(true);
    chromeIdle.value = 1;
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (!autoHideChrome || !usesTouchPaging || readingView !== 'page') return;
    idleTimerRef.current = setTimeout(() => {
      setChromeVisible(false);
      chromeIdle.value = reduceMotion ? 0 : withTiming(0, { duration: 700 });
    }, 3500);
  }, [autoHideChrome, chromeIdle, readingView, reduceMotion, usesTouchPaging]);

  useEffect(() => {
    if (!isOpen) {
      setChromeVisible(true);
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
  const isCompactReading = usesTouchPaging && readingView === 'page';
  const selectedPage = isCompactReading ? readingPage : preferredSpreadPage;
  const actionPage = focusedPage ?? selectedPage;
  const readingPageIndex = readingPage ? pages.findIndex((page) => page.id === readingPage.id) : -1;
  const counterCurrent =
    isCompactReading && readingPageIndex >= 0 ? readingPageIndex + 1 : spreadIndex + 1;
  const counterTotal = isCompactReading ? pages.length : spreads.length;
  const canOpenRecipeActions = Boolean(
    isCompactReading &&
    selectedPage &&
    ((!readOnly && (onRemoveRecipe ||
      onMoveRecipe ||
      (onGeneratePageCandidate && onUsePageCandidate && selectedPage.recipeGraph))) ||
      (onExportPage &&
        onVisitSource &&
        (getCookbookPageImageSource(selectedPage) !== null || getRecipeSourceUrl(selectedPage)))),
  );
  const canOpenCookbookSettings = Boolean(
    !isCompactReading && !readOnly && cookbook && onRenameCookbook && onDeleteCookbook,
  );
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
    cookbook &&
    (!usesTouchPaging || isCompactReading),
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

  // When the active recipe leaves this cookbook, keep the reader at the
  // same position. The next recipe fills the slot; removing the final one
  // returns to the open, empty cookbook.
  useEffect(() => {
    if (!readingPageId || pages.some((page) => page.id === readingPageId)) return;

    const fallbackPage = pages[Math.min(leafIndex, pages.length - 1)];
    if (!fallbackPage) {
      setReadingPageId(undefined);
      setLeafIndex(0);
      setReadingView('spread');
      return;
    }

    setReadingPageId(fallbackPage.id);
    setLeafIndex(getLeafIndexForPage(recipeLeaves, fallbackPage.id));
    const fallbackSpread = getSpreadIndexForPage(spreads, fallbackPage.id);
    if (fallbackSpread !== null) setSpreadIndex(fallbackSpread);
    onSelectPage(fallbackPage.id);
  }, [leafIndex, onSelectPage, pages, readingPageId, recipeLeaves, spreads]);

  useEffect(() => {
    if (!focusedPage) return;
    const current = pages.find((page) => page.id === focusedPage.id);
    if (current && current !== focusedPage) setFocusedPage(current);
  }, [focusedPage, pages]);

  // A phone can cross the compact breakpoint when it rotates. Preserve the
  // active recipe in the non-compact focused reader instead of leaving the
  // scene in a page mode that only exists on compact screens.
  useEffect(() => {
    if (readingView !== 'page' || usesTouchPaging) return;
    if (readingPage) setFocusedPage(readingPage);
    setReadingView('spread');
  }, [readingPage, readingView, usesTouchPaging]);

  // Android hardware back closes the focused page before navigating.
  useEffect(() => {
    if (!focusedPage) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      setFocusedPage(null);
      return true;
    });
    return () => subscription.remove();
  }, [focusedPage]);

  // In compact reading mode, the system back gesture returns to the open
  // spread before it leaves the cookbook.
  useEffect(() => {
    if (!isCompactReading) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      const targetSpread = getSpreadIndexForPage(spreads, readingPage?.id);
      if (targetSpread !== null) setSpreadIndex(targetSpread);
      setReadingView('spread');
      pokeChrome();
      return true;
    });
    return () => subscription.remove();
  }, [isCompactReading, pokeChrome, readingPage?.id, spreads]);

  useEffect(() => {
    if (!initialPageId || handledInitialPageId.current === initialPageId) return;
    const targetSpread = getSpreadIndexForPage(spreads, initialPageId);
    if (targetSpread === null) return;

    handledInitialPageId.current = initialPageId;
    setSpreadIndex(targetSpread);
    setIsOpen(true);
    setReadingPageId(initialPageId);
    const targetLeafIndex = recipeLeaves.findIndex((leaf) => leaf.id === initialPageId);
    if (targetLeafIndex >= 0) setLeafIndex(targetLeafIndex);
    if (usesTouchPaging) setReadingView('page');
    opening.set(1);
    onSelectPage(initialPageId);
  }, [initialPageId, onSelectPage, opening, recipeLeaves, spreads, usesTouchPaging]);

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
      setLeafIndex(getLeafIndexForPage(recipeLeaves, targetPage.id));
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

  const goToSpread = useCallback((index: number) => {
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
  }, [onSelectPage, pages, pokeChrome, spreadIndex, spreads]);

  function goToLeaf(offset: -1 | 1) {
    if (recipeLeaves.length === 0) return;
    const nextIndex = Math.max(0, Math.min(recipeLeaves.length - 1, leafIndex + offset));
    if (nextIndex === leafIndex) return;
    setLeafIndex(nextIndex);
    const leaf = recipeLeaves[nextIndex];
    if (leaf.type === 'recipe') {
      setReadingPageId(leaf.id);
      onSelectPage(leaf.id);
      const targetSpread = getSpreadIndexForPage(spreads, leaf.id);
      if (targetSpread !== null) setSpreadIndex(targetSpread);
    }
    pokeChrome();
  }

  const goToFocusedPage = useCallback((offset: -1 | 1) => {
    if (focusedPageIndex < 0) return;
    const nextIndex = Math.max(0, Math.min(pages.length - 1, focusedPageIndex + offset));
    if (nextIndex === focusedPageIndex) return;
    const nextPage = pages[nextIndex];
    setFocusedPage(nextPage);
    setReadingPageId(nextPage.id);
    setLeafIndex(getLeafIndexForPage(recipeLeaves, nextPage.id));
    const targetSpread = getSpreadIndexForPage(spreads, nextPage.id);
    if (targetSpread !== null) setSpreadIndex(targetSpread);
    onSelectPage(nextPage.id);
    pokeChrome();
  }, [focusedPageIndex, onSelectPage, pages, pokeChrome, recipeLeaves, spreads]);

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

  function enterReadingView(page?: CookbookPage) {
    const targetPage = page ?? preferredSpreadPage;
    if (targetPage) {
      setReadingPageId(targetPage.id);
      onSelectPage(targetPage.id);
      const targetLeafIndex = recipeLeaves.findIndex((leaf) => leaf.id === targetPage.id);
      if (targetLeafIndex >= 0) setLeafIndex(targetLeafIndex);
      if (!usesTouchPaging) {
        setFocusedPage(targetPage);
        pokeChrome();
        return;
      }
    }
    setReadingView('page');
    pokeChrome();
  }

  function exitReadingView() {
    const targetSpread = getSpreadIndexForPage(spreads, readingPage?.id);
    if (targetSpread !== null) setSpreadIndex(targetSpread);
    setReadingView('spread');
    pokeChrome();
  }

  function handleOpenRecipe(page: CookbookPage) {
    if (!isCompactReading) {
      setFocusedPage(page);
      return;
    }

    if (chromeVisible) {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      setChromeVisible(false);
      chromeIdle.value = reduceMotion ? 0 : withTiming(0, { duration: 220 });
      return;
    }

    pokeChrome();
  }

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined' || !isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey || activeSheet || revisionMode) return;
      const target = event.target as { tagName?: string; isContentEditable?: boolean } | null;
      const tagName = target?.tagName?.toLowerCase();
      if (target?.isContentEditable || tagName === 'input' || tagName === 'textarea' || tagName === 'select') return;

      if (event.key === 'Escape' && focusedPage) {
        event.preventDefault();
        setFocusedPage(null);
        pokeChrome();
        return;
      }

      const offset = event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : null;
      if (!offset) return;
      event.preventDefault();
      if (focusedPage) goToFocusedPage(offset);
      else goToSpread(spreadIndex + offset);
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [activeSheet, focusedPage, goToFocusedPage, goToSpread, isOpen, pokeChrome, revisionMode, spreadIndex]);

  return (
    <LinearGradient colors={Colors.book.readerGradient} style={styles.container}>
      <Animated.View
        pointerEvents={chromeVisible ? 'auto' : 'none'}
        accessibilityElementsHidden={!chromeVisible}
        importantForAccessibility={chromeVisible ? 'auto' : 'no-hide-descendants'}
        style={[styles.topBar, { paddingTop: insets.top + Spacing.xs }, topBarStyle]}
      >
        <Pressable
          style={[styles.backButton, { minWidth: topSideWidth }]}
          onPress={() => (isCompactReading ? exitReadingView() : router.dismissTo('/(book)'))}
          accessibilityRole="button"
          accessibilityLabel={isCompactReading ? 'Back to open cookbook' : 'Back to my collection'}
        >
          <ChevronLeft size={20} color={Colors.text} />
          {width >= 480 || isCompactReading ? (
            <Text style={styles.backText}>{isCompactReading ? 'Book' : 'Library'}</Text>
          ) : null}
        </Pressable>
        <View style={styles.titleBlock}>
          <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit>
            {isCompactReading && readingPage ? readingPage.title : cookbookTitle}
          </Text>
          {readOnly ? <Text style={styles.sampleLabel} maxFontSizeMultiplier={1}>SAMPLE COOKBOOK</Text> : null}
        </View>
        {isOpen && (canOpenRecipeActions || canOpenCookbookSettings) ? (
          <Pressable
            style={styles.iconButton}
            onPress={() => {
              pokeChrome();
              setActiveSheet(isCompactReading ? 'recipe' : 'cookbook');
            }}
            accessibilityRole="button"
            accessibilityLabel={
              isCompactReading && selectedPage
                ? `Recipe actions for ${selectedPage.title}`
                : `Cookbook settings for ${cookbookTitle}`
            }
          >
            <Ellipsis size={20} color={Colors.text} />
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
          leaves={recipeLeaves}
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
          onOpenRecipe={handleOpenRecipe}
        />
        {!readOnly && isOpen && pages.length === 0 ? (
          <View
            style={[styles.emptyBookPrompt, { bottom: insets.bottom + 82 }]}
            accessibilityLiveRegion="polite"
          >
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
            <Text style={styles.firstPageTitle} numberOfLines={2} maxFontSizeMultiplier={1.35}>
              {firstPageCue.title}
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
        pointerEvents={isOpen && chromeVisible ? 'auto' : 'none'}
        accessibilityElementsHidden={!isOpen || !chromeVisible}
        importantForAccessibility={isOpen && chromeVisible ? 'auto' : 'no-hide-descendants'}
        style={[styles.readerControls, { paddingBottom: insets.bottom + 10 }, chromeStyle]}
      >
        {(() => {
          const atStart = isCompactReading ? leafIndex === 0 : spreadIndex === 0;
          const atEnd = isCompactReading ? leafIndex === recipeLeaves.length - 1 : spreadIndex === spreads.length - 1;
          const onPrev = isCompactReading ? () => goToLeaf(-1) : () => goToSpread(spreadIndex - 1);
          const onNext = isCompactReading ? () => goToLeaf(1) : () => goToSpread(spreadIndex + 1);
          const prevLabel = isCompactReading ? 'Previous recipe' : 'Previous spread';
          const nextLabel = isCompactReading ? 'Next recipe' : 'Next spread';
          return (
            <>
              <Pressable
                style={({ pressed }) => [
                  styles.pageButton,
                  isNative && styles.nativeControl,
                  atStart && styles.pageButtonDisabled,
                  pressed && !atStart && styles.actionPressed,
                ]}
                disabled={atStart}
                onPress={onPrev}
                accessibilityRole="button"
                accessibilityLabel={prevLabel}
                accessibilityState={{ disabled: atStart }}
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
                style={({ pressed }) => [
                  styles.pageButton,
                  isNative && styles.nativeControl,
                  atEnd && styles.pageButtonDisabled,
                  pressed && !atEnd && styles.actionPressed,
                ]}
                disabled={atEnd}
                onPress={onNext}
                accessibilityRole="button"
                accessibilityLabel={nextLabel}
                accessibilityState={{ disabled: atEnd }}
              >
                <ChevronRight size={18} color={Colors.text} />
              </Pressable>
            </>
          );
        })()}
      </Animated.View>

      {pages.length > 0 && isOpen && (selectedPage || (!readOnly && cookbookId)) ? (
        <Animated.View
          style={[styles.readerActionDock, { top: insets.top + 58 }, floatingIdleStyle]}
          pointerEvents={chromeVisible ? 'auto' : 'none'}
          accessibilityElementsHidden={!chromeVisible}
          importantForAccessibility={chromeVisible ? 'auto' : 'no-hide-descendants'}
        >
          {selectedPage && cookbook && isCompactReading ? (
            <NoshAssistantChatButton
              page={selectedPage}
              cookbook={cookbook}
              cookbookPages={pages}
              onOpen={showFirstNoshTip ? dismissFirstNoshTip : undefined}
            />
          ) : null}
          {!readOnly && cookbookId && (!usesTouchPaging || !isCompactReading) ? (
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

      {!readOnly && isOpen && showFirstNoshTip && selectedPage && isCompactReading ? (
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

      {actionPage && onExportPage && onVisitSource ? (
        <RecipeActionsSheet
          visible={activeSheet === 'recipe'}
          page={actionPage}
          cookbookId={cookbookId ?? ''}
          cookbooks={availableCookbooks}
          onClose={() => {
            setActiveSheet(null);
            pokeChrome();
          }}
          onVisitSource={onVisitSource}
          onExport={onExportPage}
          onShare={onShare}
          onEdit={onGeneratePageCandidate && onUsePageCandidate ? () => setRevisionMode('edit') : undefined}
          onRedesign={onGeneratePageCandidate && onUsePageCandidate ? () => setRevisionMode('design') : undefined}
          onMove={onMoveRecipe}
          onRemove={onRemoveRecipe}
          readOnly={readOnly}
        />
      ) : null}

      {actionPage && onGeneratePageCandidate && onUsePageCandidate ? (
        <RecipeRevisionSheet
          visible={revisionMode !== null}
          mode={revisionMode ?? 'edit'}
          page={actionPage}
          onClose={() => {
            setRevisionMode(null);
            pokeChrome();
          }}
          onGenerate={onGeneratePageCandidate}
          onUse={onUsePageCandidate}
        />
      ) : null}

      {cookbook && onRenameCookbook && onDeleteCookbook ? (
        <CookbookSettingsSheet
          visible={activeSheet === 'cookbook'}
          cookbook={cookbook}
          onClose={() => {
            setActiveSheet(null);
            pokeChrome();
          }}
          onSaveTitle={onRenameCookbook}
          onExport={onExportCookbook}
          onDelete={onDeleteCookbook}
        />
      ) : null}

      {focusedPage ? (
        <Animated.View
          entering={reduceMotion ? undefined : FadeIn.duration(170)}
          exiting={reduceMotion ? undefined : FadeOut.duration(140)}
          style={styles.focusedOverlay}
        >
          <LinearGradient colors={Colors.book.readerGradient} style={styles.focusedReader}>
            <View style={[styles.focusedTopBar, { paddingTop: insets.top + Spacing.sm }]}>
              <View style={[styles.focusedHeaderSide, width < 720 && styles.focusedHeaderSideCompact]}>
                <Pressable
                  style={[styles.focusedAction, width < 720 && styles.focusedActionCompact]}
                  onPress={() => setFocusedPage(null)}
                  accessibilityRole="button"
                  accessibilityLabel="Return to open cookbook"
                >
                  <ChevronLeft size={18} color={Colors.text} />
                  {width < 720 ? null : (
                    <Text style={styles.focusedActionText} maxFontSizeMultiplier={1.35}>Cookbook</Text>
                  )}
                </Pressable>
              </View>
              <Text style={styles.focusedTitle} numberOfLines={1} maxFontSizeMultiplier={1.35}>
                {focusedPage.title}
              </Text>
              <View style={[
                styles.focusedHeaderSide,
                styles.focusedHeaderRight,
                width < 720 && styles.focusedHeaderSideCompact,
              ]}>
                {cookbook ? (
                  <NoshAssistantChatButton
                    page={focusedPage}
                    cookbook={cookbook}
                    cookbookPages={pages}
                    compact={width < 720}
                    onOpen={showFirstNoshTip ? dismissFirstNoshTip : undefined}
                  />
                ) : null}
                <Pressable
                  style={styles.focusedIcon}
                  onPress={() => setActiveSheet('recipe')}
                  accessibilityRole="button"
                  accessibilityLabel={`Recipe actions for ${focusedPage.title}`}
                >
                  <Ellipsis size={18} color={Colors.text} />
                </Pressable>
              </View>
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
                style={styles.focusedPageTransition}
              >
                <PageCanvas page={renderedFocusedPage ?? focusedPage} />
              </Animated.View>
            </View>
            <View style={[styles.focusedNavigation, { bottom: insets.bottom + 12 }]}>
              <Pressable
                style={({ pressed }) => [
                  styles.pageButton,
                  styles.nativeControl,
                  focusedPageIndex <= 0 && styles.pageButtonDisabled,
                  pressed && focusedPageIndex > 0 && styles.actionPressed,
                ]}
                disabled={focusedPageIndex <= 0}
                onPress={() => goToFocusedPage(-1)}
                accessibilityRole="button"
                accessibilityLabel="Previous recipe"
                accessibilityState={{ disabled: focusedPageIndex <= 0 }}
              >
                <ChevronLeft size={18} color={Colors.text} />
              </Pressable>
              <View style={[styles.counter, styles.nativeCounter]} accessibilityLiveRegion="polite">
                <Text style={styles.counterNumber}>
                  {String(focusedPageIndex + 1).padStart(2, '0')} / {String(pages.length).padStart(2, '0')}
                </Text>
              </View>
              <Pressable
                style={({ pressed }) => [
                  styles.pageButton,
                  styles.nativeControl,
                  focusedPageIndex >= pages.length - 1 && styles.pageButtonDisabled,
                  pressed && focusedPageIndex < pages.length - 1 && styles.actionPressed,
                ]}
                disabled={focusedPageIndex >= pages.length - 1}
                onPress={() => goToFocusedPage(1)}
                accessibilityRole="button"
                accessibilityLabel="Next recipe"
                accessibilityState={{ disabled: focusedPageIndex >= pages.length - 1 }}
              >
                <ChevronRight size={18} color={Colors.text} />
              </Pressable>
            </View>
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
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.values[4],
  },
  backText: {
    color: Colors.text,
    fontFamily: Fonts.ui.medium,
    fontSize: Typography.sizes.md,
  },
  titleBlock: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.values[1],
  },
  title: {
    color: Colors.text,
    fontFamily: Fonts.display.semibold,
    fontSize: Typography.sizes.md,
    lineHeight: Typography.metrics.lineHeight20,
  },
  sampleLabel: {
    color: Colors.textTertiary,
    fontFamily: Fonts.ui.semibold,
    fontSize: Typography.sizes.xxxs,
    lineHeight: Typography.metrics.lineHeight11,
    letterSpacing: Typography.metrics.letterSpacing11,
    textAlign: 'center',
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.legacySurface.v82,
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
    backgroundColor: Colors.legacySurface.v66,
    boxShadow: Colors.book.cardShadow,
    zIndex: 8,
  },
  emptyBookEyebrow: {
    color: Colors.textTertiary,
    fontFamily: Fonts.ui.semibold,
    fontSize: Typography.sizes.md,
    lineHeight: Typography.metrics.lineHeight13,
    letterSpacing: Typography.metrics.letterSpacing12,
    textAlign: 'center',
  },
  emptyBookTitle: {
    color: Colors.text,
    fontFamily: Fonts.display.semibold,
    fontSize: Typography.sizes.md,
    lineHeight: Typography.metrics.lineHeight23,
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
    fontSize: Typography.sizes.md,
    lineHeight: Typography.metrics.lineHeight20,
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
    backgroundColor: Colors.legacySurface.v67,
    boxShadow: Colors.book.liftedShadow,
    zIndex: 9,
  },
  firstPageEyebrow: {
    color: Colors.textTertiary,
    fontFamily: Fonts.ui.semibold,
    fontSize: Typography.sizes.md,
    lineHeight: Typography.metrics.lineHeight13,
    letterSpacing: Typography.metrics.letterSpacing12,
    textAlign: 'center',
  },
  firstPageTitle: {
    color: Colors.text,
    fontFamily: Fonts.display.bold,
    fontSize: Typography.sizes.md,
    lineHeight: Typography.metrics.lineHeight27,
    textAlign: 'center',
  },
  firstPageCopy: {
    maxWidth: 310,
    color: Colors.textSecondary,
    fontFamily: Fonts.ui.regular,
    fontSize: Typography.sizes.md,
    lineHeight: Typography.metrics.lineHeight18,
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
    fontSize: Typography.sizes.md,
    lineHeight: Typography.metrics.lineHeight18,
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
    gap: Spacing.values[18],
    zIndex: 10,
  },
  pageButton: {
    width: 44,
    height: 44,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.legacySurface.v82,
    borderWidth: 1,
    borderColor: Colors.ash,
  },
  pageButtonDisabled: {
    opacity: 0.28,
  },
  nativeControl: {
    backgroundColor: Colors.legacySurface.v66,
    borderColor: Colors.legacySurface.v97,
    boxShadow: Shadows.custom.reader,
  },
  counter: {
    minWidth: 72,
    alignItems: 'center',
  },
  nativeCounter: {
    height: 36,
    justifyContent: 'center',
    paddingHorizontal: Spacing.values[10],
    borderRadius: Radii.full,
    backgroundColor: Colors.legacySurface.v66,
    borderWidth: 1,
    borderColor: Colors.legacySurface.v96,
  },
  counterNumber: {
    color: Colors.text,
    fontFamily: Fonts.ui.medium,
    fontSize: Typography.sizes.md,
    fontVariant: ['tabular-nums'],
  },
  floatingAddButton: {
    width: 44,
    height: 44,
    borderRadius: Radii.numeric[22],
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
    backgroundColor: Colors.legacySurface.v68,
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
    fontSize: Typography.sizes.md,
    lineHeight: Typography.metrics.lineHeight12,
    letterSpacing: Typography.metrics.letterSpacing10,
  },
  firstNoshTipTitle: {
    color: Colors.text,
    fontFamily: Fonts.display.semibold,
    fontSize: Typography.sizes.md,
    lineHeight: Typography.metrics.lineHeight20,
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
    fontSize: Typography.sizes.md,
    lineHeight: Typography.metrics.lineHeight18,
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
    fontSize: Typography.sizes.md,
    lineHeight: Typography.metrics.lineHeight17,
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
    backgroundColor: Colors.legacySurface.v65,
    borderBottomWidth: 1,
    borderBottomColor: Colors.legacySurface.v46,
  },
  focusedHeaderSide: {
    width: 178,
    flexDirection: 'row',
    alignItems: 'center',
  },
  focusedHeaderSideCompact: {
    width: 96,
  },
  focusedHeaderRight: {
    justifyContent: 'flex-end',
    gap: Spacing.sm,
  },
  focusedAction: {
    minWidth: 108,
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.values[6],
    paddingHorizontal: Spacing.values[10],
    borderRadius: Radii.full,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.ash,
  },
  focusedActionCompact: {
    minWidth: 44,
    width: 44,
    paddingHorizontal: 0,
  },
  focusedActionText: {
    color: Colors.text,
    fontFamily: Fonts.ui.medium,
    fontSize: Typography.sizes.md,
  },
  focusedTitle: {
    flex: 1,
    color: Colors.text,
    fontFamily: Fonts.display.semibold,
    fontSize: Typography.sizes.md,
    textAlign: 'center',
  },
  focusedIcon: {
    width: 44,
    height: 44,
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
  focusedPageTransition: {
    width: '100%',
    alignItems: 'center',
  },
  sessionPreviewBadge: {
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.values[5],
    borderRadius: Radii.full,
    backgroundColor: Colors.warning,
  },
  sessionPreviewText: {
    color: Colors.onWarning,
    fontFamily: Fonts.ui.semibold,
    fontSize: Typography.sizes.md,
  },
  focusedNavigation: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.values[12],
    zIndex: 4,
  },
});
