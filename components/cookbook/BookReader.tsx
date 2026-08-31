/* eslint-disable react-hooks/immutability -- Reanimated shared values are intentionally mutated through their .value API. */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, BackHandler, Platform, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BookOpen, ChevronLeft, ChevronRight, Ellipsis, NotebookPen, X } from 'lucide-react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  interpolate,
  Keyframe,
  useAnimatedStyle,
  useReducedMotion,
  useAnimatedRef,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Cookbook3DScene } from '@/components/cookbook/Cookbook3DScene';
import { CookbookPageGrid } from '@/components/cookbook/CookbookPageGrid';
import type { CookbookTurnRequest } from '@/components/cookbook/Cookbook3DScene.types';
import { CookbookSettingsSheet, RecipeActionsSheet } from '@/components/cookbook/ReaderActionSheets';
import { RecipeRevisionSheet, type RecipeRevisionMode } from '@/components/cookbook/RecipeRevisionSheet';
import { NoshAssistantChatButton } from '@/components/cookbook/NoshAssistantChat';
import { NoshSymbol } from '@/components/brand/NoshBrandAssets';
import { useNoshConversation } from '@/contexts/NoshConversationContext';
import { useAuth } from '@/hooks/useAuth';
import { PageCanvas } from '@/components/cookbook/PageCanvas';
import { StaleDataNotice } from '@/components/ui/StaleDataNotice';
import { ContextActionMenu } from '@/components/ui/ContextActionMenu';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { Radii, Spacing, Typography } from '@/constants/spacing';
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
import type { RecipeCapture } from '@/utils/cookbook/captureLifecycle';
import { trackEvent } from '@/utils/analytics';
import {
  buildCookbookContextActions,
  buildRecipeContextActions,
  type ContextActionId,
} from '@/utils/cookbook/contextActions';
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
  pageSlots?: CookbookPage[];
  captures?: RecipeCapture[];
  initialPageId?: string;
  onSelectPage: (id: string) => void;
  onShare: (page: CookbookPage) => void;
  onExportPage?: (page: CookbookPage) => Promise<void> | void;
  onVisitSource?: (page: CookbookPage) => Promise<void> | void;
  availableCookbooks?: Cookbook[];
  onMoveRecipe?: (page: CookbookPage, destination: Cookbook) => Promise<void> | void;
  onRemoveRecipe?: (page: CookbookPage) => Promise<void> | void;
  onReorderPage?: (input: { pageId: string; beforePageId: string | null }) => Promise<unknown> | void;
  reorderError?: boolean;
  onGeneratePageCandidate?: (
    page: CookbookPage,
    recipeGraph: RecipeGraph,
    instruction: string | undefined,
    idempotencyKey: string,
  ) => Promise<GeneratedRecipePage>;
  onUsePageCandidate?: (page: CookbookPage, candidate: GeneratedRecipePage, recipeGraph?: RecipeGraph) => Promise<void>;
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
  pageSlots = pages,
  captures,
  initialPageId,
  onSelectPage,
  onShare,
  onExportPage,
  onVisitSource,
  availableCookbooks = [],
  onMoveRecipe,
  onRemoveRecipe,
  onReorderPage,
  reorderError = false,
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
  const [isOverview, setIsOverview] = useState(false);
  const overviewReturnView = useRef<'spread' | 'page'>('spread');
  const overviewScrollRef = useAnimatedRef<Animated.ScrollView>();
  const initialLeafIndex = useMemo(
    () => getLeafIndexForPage(recipeLeaves, initialPageId ?? pages[0]?.id),
    [initialPageId, pages, recipeLeaves],
  );
  const [leafIndex, setLeafIndex] = useState(initialLeafIndex);
  const [focusedPage, setFocusedPage] = useState<CookbookPage | null>(null);
  const [activeSheet, setActiveSheet] = useState<'recipe' | 'cookbook' | null>(null);
  const [recipeSheetInitialView, setRecipeSheetInitialView] = useState<'actions' | 'move'>('actions');
  const [overviewActionPage, setOverviewActionPage] = useState<CookbookPage | null>(null);
  const [revisionMode, setRevisionMode] = useState<RecipeRevisionMode | null>(null);
  const [firstRunState, setFirstRunState] = useState<FirstRunOnboardingState>(defaultFirstRunOnboardingState);
  const [firstRunReady, setFirstRunReady] = useState(false);
  const [firstPageCueDismissedThisSession, setFirstPageCueDismissedThisSession] = useState(false);
  const renderedFocusedPage =
    focusedPage && recipePreview?.pageId === focusedPage.id
      ? { ...focusedPage, recipeGraph: recipePreview.graph }
      : focusedPage;
  const focusedPageIndex = focusedPage ? pages.findIndex((page) => page.id === focusedPage.id) : -1;
  const [isBackClosed, setIsBackClosed] = useState(false);
  const [nativeTurnRequest, setNativeTurnRequest] = useState<CookbookTurnRequest>();
  const nativeTurnRequestId = useRef(0);
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
    if (isOverview || !autoHideChrome || !usesTouchPaging || readingView !== 'page') return;
    idleTimerRef.current = setTimeout(() => {
      setChromeVisible(false);
      chromeIdle.value = reduceMotion ? 0 : withTiming(0, { duration: 700 });
    }, 3500);
  }, [autoHideChrome, chromeIdle, isOverview, readingView, reduceMotion, usesTouchPaging]);

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

  const topSideWidth = 44;
  const cookbookId = cookbook?.id;
  const cookbookTitle = cookbook?.title ?? 'My Cookbook';
  const activeSpread = spreads[spreadIndex] ?? spreads[0];
  const preferredSpreadPage = getPreferredRecipe(activeSpread?.left, activeSpread?.right, pages);
  const readingPage = pages.find((page) => page.id === readingPageId) ?? preferredSpreadPage;
  const isCompactReading = !isOverview && usesTouchPaging && readingView === 'page';
  const selectedPage = isCompactReading ? readingPage : preferredSpreadPage;
  const actionPage = overviewActionPage ?? focusedPage ?? selectedPage;
  const readingPageIndex = readingPage ? pages.findIndex((page) => page.id === readingPage.id) : -1;
  const counterCurrent = isCompactReading && readingPageIndex >= 0 ? readingPageIndex + 1 : spreadIndex + 1;
  const counterTotal = isCompactReading ? pages.length : spreads.length;
  const recipeContextActionsFor = useCallback(
    (page: CookbookPage) => {
      const hasPageImage = getCookbookPageImageSource(page) !== null;
      const canRevise = Boolean(!readOnly && page.recipeGraph && onGeneratePageCandidate && onUsePageCandidate);
      const hasMoveDestination = availableCookbooks.some((destination) => destination.id !== cookbookId);

      return buildRecipeContextActions({
        canEdit: canRevise,
        canRedesign: canRevise,
        canVisitSource: Boolean(onVisitSource && getRecipeSourceUrl(page)),
        canSaveImage: Boolean(onExportPage && hasPageImage),
        canShare: hasPageImage,
        canMove: Boolean(!readOnly && onMoveRecipe && hasMoveDestination),
        canRemove: Boolean(!readOnly && onRemoveRecipe),
      });
    },
    [
      availableCookbooks,
      cookbookId,
      onExportPage,
      onGeneratePageCandidate,
      onMoveRecipe,
      onRemoveRecipe,
      onUsePageCandidate,
      onVisitSource,
      readOnly,
    ],
  );
  const selectedRecipeActions = selectedPage ? recipeContextActionsFor(selectedPage) : [];
  const cookbookContextActions = useMemo(
    () =>
      buildCookbookContextActions({
        canAddRecipe: Boolean(!readOnly && cookbookId),
        canRename: Boolean(!readOnly && cookbook && onRenameCookbook),
        canExport: Boolean(!readOnly && onExportCookbook),
        canDelete: Boolean(!readOnly && cookbook && onDeleteCookbook),
      }),
    [cookbook, cookbookId, onDeleteCookbook, onExportCookbook, onRenameCookbook, readOnly],
  );
  const canOpenRecipeActions = Boolean(isCompactReading && selectedRecipeActions.length > 0);
  const canOpenCookbookSettings = Boolean(!isCompactReading && cookbookContextActions.length > 0);
  const firstPageCue =
    firstRunReady &&
    firstRunState.status === 'completed' &&
    firstRunState.firstCookbookId === cookbookId &&
    !firstRunState.readerCueSeen
      ? (pages.find((page) => page.id === firstRunState.firstPageId) ?? null)
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
        if (firstAvailablePageId && state.status === 'started' && state.firstCookbookId === cookbookId) {
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

  useEffect(() => {
    if (!overviewActionPage) return;
    const current = pages.find((page) => page.id === overviewActionPage.id);
    if (!current) {
      setOverviewActionPage(null);
      setActiveSheet(null);
      return;
    }
    if (current !== overviewActionPage) setOverviewActionPage(current);
  }, [overviewActionPage, pages]);

  // Reordering changes a page's physical leaf and spread, not the page the
  // reader is following. Keep that page anchored while the canonical order
  // changes underneath the overview.
  useEffect(() => {
    if (!readingPageId || !pages.some((page) => page.id === readingPageId)) return;
    const nextLeafIndex = getLeafIndexForPage(recipeLeaves, readingPageId);
    if (nextLeafIndex >= 0 && nextLeafIndex !== leafIndex) setLeafIndex(nextLeafIndex);
    const nextSpreadIndex = getSpreadIndexForPage(spreads, readingPageId);
    if (nextSpreadIndex !== null && nextSpreadIndex !== spreadIndex) setSpreadIndex(nextSpreadIndex);
  }, [leafIndex, pages, readingPageId, recipeLeaves, spreadIndex, spreads]);

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
    if (!isOverview) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      setOverviewActionPage(null);
      setIsOverview(false);
      pokeChrome();
      return true;
    });
    return () => subscription.remove();
  }, [isOverview, pokeChrome]);

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
    setOverviewActionPage(null);
    setIsOverview(false);
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

  const goToSpread = useCallback(
    (index: number) => {
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
    },
    [onSelectPage, pages, pokeChrome, spreadIndex, spreads],
  );

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

  function requestReaderTurn(direction: -1 | 1) {
    if (!isNative) {
      if (isCompactReading) goToLeaf(direction);
      else goToSpread(spreadIndex + direction);
      return;
    }

    nativeTurnRequestId.current += 1;
    setNativeTurnRequest({ id: nativeTurnRequestId.current, direction });
    pokeChrome();
  }

  const goToFocusedPage = useCallback(
    (offset: -1 | 1) => {
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
    },
    [focusedPageIndex, onSelectPage, pages, pokeChrome, recipeLeaves, spreads],
  );

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

  function openOverview() {
    overviewReturnView.current = readingView;
    setFocusedPage(null);
    setOverviewActionPage(null);
    setIsOverview(true);
    pokeChrome();
  }

  function closeOverview() {
    setOverviewActionPage(null);
    setIsOverview(false);
    setReadingView(overviewReturnView.current);
    pokeChrome();
  }

  function openPageFromOverview(page: CookbookPage) {
    setReadingPageId(page.id);
    setLeafIndex(getLeafIndexForPage(recipeLeaves, page.id));
    const targetSpread = getSpreadIndexForPage(spreads, page.id);
    if (targetSpread !== null) setSpreadIndex(targetSpread);
    onSelectPage(page.id);
    setOverviewActionPage(null);
    setIsOverview(false);
    if (usesTouchPaging) {
      setReadingView('page');
    } else {
      setReadingView('spread');
      setFocusedPage(page);
    }
    pokeChrome();
  }

  function openOverviewPageActions(page: CookbookPage) {
    setReadingPageId(page.id);
    onSelectPage(page.id);
    setOverviewActionPage(page);
    setRecipeSheetInitialView('actions');
    setActiveSheet('recipe');
    pokeChrome();
  }

  function runRecipeContextAction(page: CookbookPage, actionId: ContextActionId) {
    setReadingPageId(page.id);
    onSelectPage(page.id);

    if (actionId === 'edit_recipe' || actionId === 'redesign_recipe') {
      setOverviewActionPage(page);
      setRevisionMode(actionId === 'edit_recipe' ? 'edit' : 'design');
      return;
    }
    if (actionId === 'visit_source') {
      void onVisitSource?.(page);
      return;
    }
    if (actionId === 'save_page_image') {
      void onExportPage?.(page);
      return;
    }
    if (actionId === 'share_recipe') {
      onShare(page);
      return;
    }
    if (actionId === 'move_recipe') {
      setOverviewActionPage(page);
      setRecipeSheetInitialView('move');
      setActiveSheet('recipe');
      return;
    }
    if (actionId === 'remove_recipe') {
      void onRemoveRecipe?.(page);
    }
  }

  function runCookbookContextAction(actionId: ContextActionId) {
    if (actionId === 'add_recipe') {
      openAddPage();
      return;
    }
    if (actionId === 'rename_cookbook') {
      setActiveSheet('cookbook');
      return;
    }
    if (actionId === 'export_cookbook') {
      void Promise.resolve(onExportCookbook?.()).catch((error) => {
        const message = error instanceof Error ? error.message : 'The cookbook could not be exported.';
        Alert.alert('Export unavailable', message);
      });
      return;
    }
    if (actionId === 'delete_cookbook') {
      void onDeleteCookbook?.();
    }
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

      if (event.key === 'Escape' && isOverview) {
        event.preventDefault();
        setOverviewActionPage(null);
        setIsOverview(false);
        setReadingView(overviewReturnView.current);
        pokeChrome();
        return;
      }

      if (event.key === 'Escape' && focusedPage) {
        event.preventDefault();
        setFocusedPage(null);
        pokeChrome();
        return;
      }

      if (isOverview) return;
      const offset = event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : null;
      if (!offset) return;
      event.preventDefault();
      if (focusedPage) goToFocusedPage(offset);
      else goToSpread(spreadIndex + offset);
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [
    activeSheet,
    focusedPage,
    goToFocusedPage,
    goToSpread,
    isOpen,
    isOverview,
    pokeChrome,
    revisionMode,
    spreadIndex,
  ]);

  return (
    <LinearGradient colors={Colors.book.readerGradient} style={styles.container}>
      <Animated.View
        pointerEvents={chromeVisible ? 'auto' : 'none'}
        accessibilityElementsHidden={!chromeVisible}
        importantForAccessibility={chromeVisible ? 'auto' : 'no-hide-descendants'}
        style={[styles.topBar, { paddingTop: insets.top + Spacing.xs }, topBarStyle]}
      >
        <Pressable
          style={({ pressed }) => [styles.backButton, { width: topSideWidth }, pressed && styles.actionPressed]}
          onPress={() =>
            isOverview ? closeOverview() : isCompactReading ? exitReadingView() : router.dismissTo('/(book)')
          }
          accessibilityRole="button"
          accessibilityLabel={
            isOverview ? 'Back to cookbook' : isCompactReading ? 'Back to open cookbook' : 'Back to my collection'
          }
        >
          <ChevronLeft size={19} color={Colors.primary} />
        </Pressable>
        <View style={styles.titleBlock}>
          <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit>
            {isOverview ? 'Page overview' : isCompactReading && readingPage ? readingPage.title : cookbookTitle}
          </Text>
        </View>
        {isOpen && (canOpenRecipeActions || canOpenCookbookSettings) ? (
          <ContextActionMenu
            actions={isCompactReading ? selectedRecipeActions : cookbookContextActions}
            onSelect={(actionId) => {
              pokeChrome();
              if (isCompactReading && selectedPage) runRecipeContextAction(selectedPage, actionId);
              else runCookbookContextAction(actionId);
            }}
            fallbackOnPress={() => {
              pokeChrome();
              if (isCompactReading && selectedPage) {
                setOverviewActionPage(selectedPage);
                setRecipeSheetInitialView('actions');
                setActiveSheet('recipe');
              } else {
                setActiveSheet('cookbook');
              }
            }}
            accessibilityLabel={
              isCompactReading && selectedPage
                ? `Recipe actions for ${selectedPage.title}`
                : `Cookbook actions for ${cookbookTitle}`
            }
            title={isCompactReading ? selectedPage?.title : cookbookTitle}
            testID={isCompactReading ? 'recipe-context-menu' : 'cookbook-context-menu'}
          >
            <View
              style={styles.iconButton}
            >
              <Ellipsis size={20} color={Colors.primary} />
            </View>
          </ContextActionMenu>
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
        {isOverview ? (
          <Animated.ScrollView
            ref={overviewScrollRef}
            style={styles.overviewScroll}
            contentContainerStyle={[
              styles.overviewContent,
              { paddingTop: insets.top + 84, paddingBottom: insets.bottom + Spacing.xxl },
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.overviewHeader}>
              <Text style={styles.overviewEyebrow} maxFontSizeMultiplier={1.2}>
                YOUR COOKBOOK
              </Text>
              <Text style={styles.overviewTitle} maxFontSizeMultiplier={1.25}>
                {cookbookTitle}
              </Text>
              <Text style={styles.overviewCopy} maxFontSizeMultiplier={1.35}>
                Tap a page to read it. Long-press and drag to change the book order.
              </Text>
              {reorderError ? (
                <Text style={styles.overviewError} accessibilityRole="alert">
                  The new page order could not be saved. Your previous order was restored.
                </Text>
              ) : null}
            </View>
            <CookbookPageGrid
              cookbookId={cookbookId ?? ''}
              pageSlots={pageSlots}
              captures={captures}
              onOpenPage={openPageFromOverview}
              onPageActions={openOverviewPageActions}
              contextActionsFor={recipeContextActionsFor}
              onContextAction={runRecipeContextAction}
              onMovePage={readOnly ? undefined : onReorderPage}
              scrollableRef={overviewScrollRef}
              emptyTitle="No recipe pages yet."
              emptyDetail="New recipe pages will appear here in their book order."
            />
          </Animated.ScrollView>
        ) : (
          <>
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
              turnRequest={nativeTurnRequest}
              onOpen={openBook}
              onClose={closeBook}
              isBackClosed={isBackClosed}
              onCloseBack={closeBackBook}
              onOpenBack={openBackBook}
              onNext={() => (usesTouchPaging && readingView === 'page' ? goToLeaf(1) : goToSpread(spreadIndex + 1))}
              onPrevious={() =>
                usesTouchPaging && readingView === 'page' ? goToLeaf(-1) : goToSpread(spreadIndex - 1)
              }
              onStageTap={pokeChrome}
              onEnterReadingView={enterReadingView}
              onOpenRecipe={handleOpenRecipe}
            />
            {!readOnly && isOpen && pages.length === 0 ? (
              <View style={[styles.emptyBookPrompt, { bottom: insets.bottom + 82 }]} accessibilityLiveRegion="polite">
                <Text style={styles.emptyBookTitle} maxFontSizeMultiplier={1.35}>
                  Turn a recipe you love into its first page.
                </Text>
                <Pressable
                  style={({ pressed }) => [
                    styles.emptyBookButton,
                    styles.emptyBookComposeButton,
                    pressed && styles.actionPressed,
                  ]}
                  onPress={openAddPage}
                  accessibilityRole="button"
                  accessibilityLabel={`Add the first recipe to ${cookbookTitle}`}
                >
                  <NotebookPen size={18} color={Colors.text} strokeWidth={1.8} />
                  <Text
                    style={[styles.emptyBookButtonText, styles.emptyBookComposeButtonText]}
                    maxFontSizeMultiplier={1.35}
                  >
                    Add my first recipe
                  </Text>
                </Pressable>
              </View>
            ) : null}
            {!readOnly && isOpen && firstPageCue ? (
              <View style={[styles.firstPageMoment, { bottom: insets.bottom + 82 }]} accessibilityLiveRegion="polite">
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
                  <Text style={styles.emptyBookButtonText} maxFontSizeMultiplier={1.35}>
                    Read my recipe
                  </Text>
                </Pressable>
                <Pressable
                  style={styles.firstPageDismiss}
                  onPress={dismissFirstPageCue}
                  accessibilityRole="button"
                  accessibilityLabel="Dismiss first page introduction"
                >
                  <Text style={styles.firstPageDismissText} maxFontSizeMultiplier={1.35}>
                    Keep browsing
                  </Text>
                </Pressable>
              </View>
            ) : null}
          </>
        )}
      </View>

      {!isOverview ? (
        <Animated.View
          pointerEvents={isOpen && chromeVisible ? 'auto' : 'none'}
          accessibilityElementsHidden={!isOpen || !chromeVisible}
          importantForAccessibility={isOpen && chromeVisible ? 'auto' : 'no-hide-descendants'}
          style={[styles.readerControls, { paddingBottom: insets.bottom + 10 }, chromeStyle]}
        >
          {(() => {
            const atStart = isCompactReading ? leafIndex === 0 : spreadIndex === 0;
            const atEnd = isCompactReading ? leafIndex === recipeLeaves.length - 1 : spreadIndex === spreads.length - 1;
            const prevLabel = isCompactReading ? 'Previous recipe' : 'Previous spread';
            const nextLabel = isCompactReading ? 'Next recipe' : 'Next spread';
            return (
              <ReaderNavigationRail
                current={counterCurrent}
                total={counterTotal}
                previousLabel={prevLabel}
                nextLabel={nextLabel}
                previousDisabled={atStart}
                nextDisabled={atEnd}
                onPrevious={() => requestReaderTurn(-1)}
                onNext={() => requestReaderTurn(1)}
                onStatusPress={openOverview}
                statusLabel="Open page overview"
              />
            );
          })()}
        </Animated.View>
      ) : null}

      {!isOverview && pages.length > 0 && isOpen && (selectedPage || (!readOnly && cookbookId)) ? (
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
              <NotebookPen size={20} color={Colors.text} strokeWidth={1.8} />
            </Pressable>
          ) : null}
        </Animated.View>
      ) : null}

      {!isOverview && !readOnly && isOpen && showFirstNoshTip && selectedPage && isCompactReading ? (
        <Animated.View
          style={[styles.firstNoshTip, { top: insets.top + 112, width: Math.min(width - Spacing.xl * 2, 310) }]}
          accessibilityLiveRegion="polite"
        >
          <View style={styles.firstNoshTipHeader}>
            <View style={styles.firstNoshTipIcon}>
              <NoshSymbol size={24} tone="ivory" />
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

      {actionPage && recipeContextActionsFor(actionPage).length > 0 ? (
        <RecipeActionsSheet
          visible={activeSheet === 'recipe'}
          page={actionPage}
          cookbookId={cookbookId ?? ''}
          cookbooks={availableCookbooks}
          initialView={recipeSheetInitialView}
          onClose={() => {
            setActiveSheet(null);
            setOverviewActionPage(null);
            setRecipeSheetInitialView('actions');
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
            setOverviewActionPage(null);
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
                  style={({ pressed }) => [styles.focusedAction, pressed && styles.actionPressed]}
                  onPress={() => setFocusedPage(null)}
                  accessibilityRole="button"
                  accessibilityLabel="Return to open cookbook"
                >
                  <ChevronLeft size={18} color={Colors.primary} />
                </Pressable>
              </View>
              <Text style={styles.focusedTitle} numberOfLines={1} maxFontSizeMultiplier={1.35}>
                {focusedPage.title}
              </Text>
              <View
                style={[
                  styles.focusedHeaderSide,
                  styles.focusedHeaderRight,
                  width < 720 && styles.focusedHeaderSideCompact,
                ]}
              >
                {cookbook ? (
                  <NoshAssistantChatButton
                    page={focusedPage}
                    cookbook={cookbook}
                    cookbookPages={pages}
                    compact={width < 720}
                    onOpen={showFirstNoshTip ? dismissFirstNoshTip : undefined}
                  />
                ) : null}
                <ContextActionMenu
                  actions={recipeContextActionsFor(focusedPage)}
                  onSelect={(actionId) => runRecipeContextAction(focusedPage, actionId)}
                  fallbackOnPress={() => {
                    setOverviewActionPage(focusedPage);
                    setRecipeSheetInitialView('actions');
                    setActiveSheet('recipe');
                  }}
                  accessibilityLabel={`Recipe actions for ${focusedPage.title}`}
                  title={focusedPage.title}
                  testID="focused-recipe-context-menu"
                >
                  <View
                    style={styles.focusedIcon}
                  >
                    <Ellipsis size={18} color={Colors.primary} />
                  </View>
                </ContextActionMenu>
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
              <ReaderNavigationRail
                current={focusedPageIndex + 1}
                total={pages.length}
                previousLabel="Previous recipe"
                nextLabel="Next recipe"
                previousDisabled={focusedPageIndex <= 0}
                nextDisabled={focusedPageIndex >= pages.length - 1}
                onPrevious={() => goToFocusedPage(-1)}
                onNext={() => goToFocusedPage(1)}
              />
            </View>
          </LinearGradient>
        </Animated.View>
      ) : null}
    </LinearGradient>
  );
}

function ReaderNavigationRail({
  current,
  total,
  previousLabel,
  nextLabel,
  previousDisabled,
  nextDisabled,
  onPrevious,
  onNext,
  onStatusPress,
  statusLabel,
}: {
  current: number;
  total: number;
  previousLabel: string;
  nextLabel: string;
  previousDisabled: boolean;
  nextDisabled: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onStatusPress?: () => void;
  statusLabel?: string;
}) {
  const count = (
    <Text style={styles.navigationCount} maxFontSizeMultiplier={1.3}>
      {current} / {total}
    </Text>
  );

  return (
    <View style={styles.navigationRail}>
      <Pressable
        style={({ pressed }) => [
          styles.navigationButton,
          previousDisabled && styles.pageButtonDisabled,
          pressed && !previousDisabled && styles.actionPressed,
        ]}
        disabled={previousDisabled}
        onPress={onPrevious}
        accessibilityRole="button"
        accessibilityLabel={previousLabel}
        accessibilityState={{ disabled: previousDisabled }}
      >
        <ChevronLeft size={20} color={Colors.primary} strokeWidth={1.8} />
      </Pressable>

      {onStatusPress ? (
        <Pressable
          style={({ pressed }) => [styles.navigationStatus, pressed && styles.actionPressed]}
          onPress={onStatusPress}
          accessibilityRole="button"
          accessibilityLabel={statusLabel}
          accessibilityLiveRegion="polite"
        >
          {count}
        </Pressable>
      ) : (
        <View style={styles.navigationStatus} accessibilityLiveRegion="polite">
          {count}
        </View>
      )}

      <Pressable
        style={({ pressed }) => [
          styles.navigationButton,
          nextDisabled && styles.pageButtonDisabled,
          pressed && !nextDisabled && styles.actionPressed,
        ]}
        disabled={nextDisabled}
        onPress={onNext}
        accessibilityRole="button"
        accessibilityLabel={nextLabel}
        accessibilityState={{ disabled: nextDisabled }}
      >
        <ChevronRight size={20} color={Colors.primary} strokeWidth={1.8} />
      </Pressable>
    </View>
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
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radii.full,
  },
  titleBlock: {
    flex: 1,
    alignItems: 'center',
    minWidth: 0,
  },
  title: {
    color: Colors.text,
    fontFamily: Fonts.display.semibold,
    fontSize: Typography.sizes.lg,
    lineHeight: Typography.metrics.lineHeight20,
    textAlign: 'center',
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  staleNotice: {
    paddingHorizontal: Spacing.xl,
  },
  stage: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  overviewScroll: {
    flex: 1,
  },
  overviewContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
  },
  overviewHeader: {
    alignItems: 'center',
    gap: Spacing.values[4],
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  overviewEyebrow: {
    color: Colors.textTertiary,
    fontFamily: Fonts.ui.semibold,
    fontSize: Typography.sizes.xxxs,
    lineHeight: Typography.metrics.lineHeight11,
    letterSpacing: Typography.metrics.letterSpacing11,
  },
  overviewTitle: {
    color: Colors.text,
    fontFamily: Fonts.display.bold,
    fontSize: Typography.sizes.xl,
    lineHeight: Typography.metrics.lineHeight27,
    textAlign: 'center',
  },
  overviewCopy: {
    maxWidth: 420,
    color: Colors.textSecondary,
    fontFamily: Fonts.ui.regular,
    fontSize: Typography.sizes.sm,
    lineHeight: Typography.metrics.lineHeight18,
    textAlign: 'center',
  },
  overviewError: {
    maxWidth: 420,
    color: Colors.error,
    fontFamily: Fonts.ui.medium,
    fontSize: Typography.sizes.sm,
    lineHeight: Typography.metrics.lineHeight18,
    textAlign: 'center',
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
  emptyBookComposeButton: {
    backgroundColor: Colors.coral,
  },
  emptyBookButtonText: {
    color: Colors.onPrimary,
    fontFamily: Fonts.ui.semibold,
    fontSize: Typography.sizes.md,
    lineHeight: Typography.metrics.lineHeight20,
  },
  emptyBookComposeButtonText: {
    color: Colors.text,
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
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  navigationRail: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.values[14],
  },
  navigationButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radii.full,
  },
  pageButtonDisabled: {
    opacity: 0.26,
  },
  navigationStatus: {
    minWidth: 64,
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navigationCount: {
    color: Colors.text,
    fontFamily: Fonts.ui.medium,
    fontSize: Typography.sizes.md,
    lineHeight: Typography.metrics.lineHeight18,
    fontVariant: ['tabular-nums'],
  },
  floatingAddButton: {
    width: 44,
    height: 44,
    borderRadius: Radii.numeric[22],
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.coral,
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
    width: 44,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radii.full,
  },
  focusedTitle: {
    flex: 1,
    color: Colors.text,
    fontFamily: Fonts.display.semibold,
    fontSize: Typography.sizes.lg,
    lineHeight: Typography.metrics.lineHeight20,
    textAlign: 'center',
  },
  focusedIcon: {
    width: 44,
    height: 44,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
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
