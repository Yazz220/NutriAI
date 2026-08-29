import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Minimize2 } from 'lucide-react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  Easing,
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useImage } from '@shopify/react-native-skia';
import { releaseCapture } from 'react-native-view-shot';
import { CookbookLeafPage } from '@/components/cookbook/CookbookLeafPage';
import { Text } from '@/components/ui/Text';
import {
  BOOK_GUTTER_WIDTH,
  BookBlockUnderlay,
  BookGutter,
  BookLeafShade,
  OpenBookSpread,
} from '@/components/cookbook/OpenBookSpread';
import { TurningLeafSkia } from '@/components/cookbook/TurningLeafSkia';
import { PhysicalBook } from '@/components/physical-book/PhysicalBook';
import { resolveCookbookBinding } from '@/constants/cookbookBindings';
import { Colors } from '@/constants/colors';
import { Radii, Spacing, Typography, Shadows } from '@/constants/spacing';
import type { Cookbook3DSceneProps } from '@/components/cookbook/Cookbook3DScene.types';
import type { CookbookPage } from '@/types/cookbook';
import { getCookbookPageTurnImageSource } from '@/utils/cookbook/pageImage';
import { createLeafTexture } from '@/utils/cookbook/leafTexture';
import { Fonts } from '@/utils/fonts';
import {
  resolveBookStageTranslation,
  resolveNativeBookGeometry,
  resolveNativeReadingPageGeometry,
  resolveTurnProgress,
  resolveTurnRelease,
  type PageTurnDirection,
} from '@/utils/cookbook/physicalBook';
import { TOUCH_PAGING_BREAKPOINT, type CookbookLeaf } from '@/utils/cookbook/reader';
import {
  clampReaderZoomScale,
  clampReaderZoomTranslation,
  nextDoubleTapZoomScale,
  READER_MIN_ZOOM,
  READER_ZOOMED_THRESHOLD,
} from '@/utils/cookbook/readerZoom';

// Skia Canvas renders the curling page leaf. Requires a dev client build
// with the matching native Skia binary (2.3.0+ on Expo SDK 54).
const SKIA_ENABLED = true;

const STACK_WIDTH = 4;
const STACK_MIN_RATIO = 0.06;
const STACK_MAX_RATIO = 0.42;
const STACK_STRIATIONS = 5;
const CORNER_LIFT_PROGRESS = 0.05;
const TURN_COMMIT_SPRING = {
  damping: 24,
  stiffness: 175,
  mass: 0.78,
  overshootClamping: true,
} as const;

/**
 * Vertical page stack on the outer edge of the book. The height represents
 * how many pages are on that side — the right stack thins as you read
 * forward, the left stack grows. Striation lines suggest individual page
 * edges.
 */
function PageStack({ height, side }: { height: number; side: 'left' | 'right' }) {
  if (height < 2) return null;
  const striations: React.ReactElement[] = [];
  const gap = height / (STACK_STRIATIONS + 1);
  for (let i = 1; i <= STACK_STRIATIONS; i += 1) {
    striations.push(
      <View key={i} style={[styles.stackStriation, { top: gap * i, width: STACK_WIDTH + 2, left: -1 }]} />,
    );
  }
  return (
    <View
      style={[
        styles.pageStack,
        {
          width: STACK_WIDTH,
          height,
          borderTopLeftRadius: side === 'left' ? 2 : 0,
          borderBottomLeftRadius: side === 'left' ? 2 : 0,
          borderTopRightRadius: side === 'right' ? 2 : 0,
          borderBottomRightRadius: side === 'right' ? 2 : 0,
        },
      ]}
    >
      {striations}
    </View>
  );
}

/** Computes the stack height for a given side based on reading position. */
function getStackHeight(ratio: number, bookHeight: number, side: 'left' | 'right'): number {
  const proportion = side === 'left' ? ratio : 1 - ratio;
  return Math.max(2, bookHeight * (STACK_MIN_RATIO + STACK_MAX_RATIO * proportion));
}

/** Resolves the CookbookPage for a spread leaf, or undefined for non-recipe leaves. */
function getLeafPage(leaf: CookbookLeaf | undefined, pages: CookbookPage[]): CookbookPage | undefined {
  if (!leaf || leaf.type !== 'recipe') return undefined;
  return pages[leaf.pageIndex];
}

/** Resolves the CookbookPage for a flat-leaf-list entry by index. */
function getLeafPageByIndex(
  leaves: CookbookLeaf[] | undefined,
  index: number,
  pages: CookbookPage[],
): CookbookPage | undefined {
  if (!leaves || index < 0 || index >= leaves.length) return undefined;
  return getLeafPage(leaves[index], pages);
}

// --- Mode transition animations ---
// Replaces the old FadeIn/FadeOut crossfade between one-page and spread views
// with a zoom transition. The entering view scales up from 0.94 (feels like
// it's coming toward you) while the exiting view scales down to 0.94 (feels
// like it's receding). Both fade in/out. This gives the mode switch a physical
// "leaning in to read" / "leaning back to browse" quality instead of a flat
// dissolve.
const ZOOM_SCALE = 0.94;
const ZOOM_ENTER_MS = 280;
const ZOOM_EXIT_MS = 220;
const ZOOM_ENTER_EASING = Easing.bezier(0.22, 0.72, 0.24, 1);
const ZOOM_EXIT_EASING = Easing.bezier(0.4, 0, 0.68, 0.06);

const zoomEntering = () => {
  'worklet';
  return {
    initialValues: {
      opacity: 0,
      transform: [{ scale: ZOOM_SCALE }],
    },
    animations: {
      opacity: withTiming(1, { duration: ZOOM_ENTER_MS, easing: ZOOM_ENTER_EASING }),
      transform: [{ scale: withTiming(1, { duration: ZOOM_ENTER_MS, easing: ZOOM_ENTER_EASING }) }],
    },
  };
};

const zoomExiting = () => {
  'worklet';
  return {
    initialValues: {
      opacity: 1,
      transform: [{ scale: 1 }],
    },
    animations: {
      opacity: withTiming(0, { duration: ZOOM_EXIT_MS, easing: ZOOM_EXIT_EASING }),
      transform: [{ scale: withTiming(ZOOM_SCALE, { duration: ZOOM_EXIT_MS, easing: ZOOM_EXIT_EASING }) }],
    },
  };
};

export function Cookbook3DScene({
  cookbook,
  pages,
  spreads,
  spreadIndex,
  isOpen,
  reduceMotion = false,
  opening: propOpening,
  readingView = 'spread',
  readingPageId,
  leaves,
  leafIndex = 0,
  turnRequest,
  onOpen,
  onClose,
  isBackClosed = false,
  onCloseBack,
  onOpenBack,
  onNext,
  onPrevious,
  onStageTap,
  onEnterReadingView,
  onOpenRecipe,
  style,
}: Cookbook3DSceneProps) {
  const { width, height } = useWindowDimensions();
  const isCompactPhone = width < TOUCH_PAGING_BREAKPOINT;
  const bookGeometry = resolveNativeBookGeometry(width, height, isCompactPhone);
  const readingPageGeometry = resolveNativeReadingPageGeometry(width, height);
  const leafWidth = bookGeometry.pageWidth;
  const bookHeight = bookGeometry.pageHeight;
  const coverBinding = resolveCookbookBinding({
    finishId: cookbook?.coverFinishId,
    colorId: cookbook?.coverColorId,
    legacyStyleId: cookbook?.coverStyle,
  });
  const coverColor = coverBinding.cloth;
  const activeSpread = spreads[spreadIndex] ?? spreads[0];
  const requestedPageIndex = pages.findIndex((page) => page.id === readingPageId);
  const fallbackLeaf =
    activeSpread?.right.type === 'recipe'
      ? activeSpread.right
      : activeSpread?.left.type === 'recipe'
        ? activeSpread.left
        : null;
  const readingPageIndex = requestedPageIndex >= 0 ? requestedPageIndex : (fallbackLeaf?.pageIndex ?? -1);
  // One-page mode navigates through all leaves (bookplate, ToC, recipes,
  // blank), not just recipe pages. The flat leaf list drives boundaries and
  // the current/next/prev content.
  const hasLeaves = Boolean(leaves && leaves.length > 0);
  const currentLeaf = hasLeaves ? leaves![Math.min(leafIndex, leaves!.length - 1)] : undefined;
  const isPhysicalPageReading = isCompactPhone && readingView === 'page' && hasLeaves;

  // Display indices lag behind the live spreadIndex/leafIndex by one render
  // cycle: they only update in the useLayoutEffect that fires AFTER a turn
  // commits. This keeps the Skia leaf textures and underneath pages stable
  // through the handoff — when spreadIndex changes (via onNext/onPrevious),
  // the underneath/Skia images still reflect the pre-turn spread for that
  // one intermediate render, matching the content the curling leaf was
  // showing. Without this, the images recompute from the new spreadIndex
  // before turnDirection resets, causing a 1-frame flash of wrong content.
  const [displaySpreadIndex, setDisplaySpreadIndex] = useState(spreadIndex);
  const [displayLeafIndex, setDisplayLeafIndex] = useState(leafIndex);
  const [pageTextureUris, setPageTextureUris] = useState<Record<string, string>>({});
  const pageTextureUrisRef = useRef(pageTextureUris);

  const handlePageTextureReady = useCallback((pageId: string, uri: string) => {
    const previousUri = pageTextureUrisRef.current[pageId];
    if (previousUri === uri) return;
    if (previousUri) releaseCapture(previousUri);

    const nextUris = { ...pageTextureUrisRef.current, [pageId]: uri };
    pageTextureUrisRef.current = nextUris;
    setPageTextureUris(nextUris);
  }, []);

  useEffect(
    () => () => {
      Object.values(pageTextureUrisRef.current).forEach(releaseCapture);
    },
    [],
  );

  const canGoPrevious = leafIndex > 0;
  const canGoNext = leafIndex < (leaves?.length ?? 1) - 1;
  // Display-index-based boundaries for the underneath (next/prev reveal) pages.
  // These lag one render behind canGoNext/canGoPrevious so the underneath pages
  // don't change content before the turn shared values reset.
  const displayCanGoPrevious = displayLeafIndex > 0;
  const displayCanGoNext = displayLeafIndex < (leaves?.length ?? 1) - 1;
  const readingPageWidth = readingPageGeometry.pageWidth;
  const readingPageHeight = readingPageGeometry.pageHeight;
  // In browse mode a swipe turns whole spreads; in physical reading it turns
  // single pages. Boundaries and travel are measured against the active mode.
  const canTurnNext = isPhysicalPageReading ? canGoNext : spreadIndex < spreads.length - 1;
  const canTurnPrevious = isPhysicalPageReading ? canGoPrevious : spreadIndex > 0;
  const atFrontEdge = isPhysicalPageReading ? leafIndex === 0 : spreadIndex === 0;
  const atBackEdge = isPhysicalPageReading
    ? leafIndex === (leaves?.length ?? 1) - 1
    : spreadIndex === spreads.length - 1;
  // In spread mode the user drags one page width (not the full spread), and
  // the turn target is the spine (center of the spread) rather than the edge.
  const turnSurfaceWidth = isPhysicalPageReading ? readingPageWidth : leafWidth;
  const turnTargetX = isPhysicalPageReading ? undefined : leafWidth;
  const turnProgress = useSharedValue(0);
  const turnDirection = useSharedValue<PageTurnDirection>(0);
  const isSettling = useSharedValue(0);
  const turnGrabX = useSharedValue(0);
  const grabYRatio = useSharedValue(0.5);
  const lastHandledTurnRequestId = useRef<number | null>(null);
  const pageZoomScale = useSharedValue(READER_MIN_ZOOM);
  const pageZoomStartScale = useSharedValue(READER_MIN_ZOOM);
  const pageZoomTranslateX = useSharedValue(0);
  const pageZoomTranslateY = useSharedValue(0);
  const pageZoomStartTranslateX = useSharedValue(0);
  const pageZoomStartTranslateY = useSharedValue(0);
  const pageZoomStartFocalX = useSharedValue(0);
  const pageZoomStartFocalY = useSharedValue(0);
  const [isPageZoomed, setIsPageZoomed] = useState(false);
  const updatePageZoomedState = useCallback((zoomed: boolean) => {
    setIsPageZoomed(zoomed);
  }, []);

  const setPageZoom = useCallback(
    (targetScale: number) => {
      const nextScale = clampReaderZoomScale(targetScale);
      const zoomed = nextScale > READER_ZOOMED_THRESHOLD;
      setIsPageZoomed(zoomed);
      pageZoomScale.value = reduceMotion
        ? nextScale
        : withTiming(nextScale, { duration: 180, easing: Easing.out(Easing.cubic) });
      if (!zoomed) {
        pageZoomTranslateX.value = reduceMotion ? 0 : withTiming(0, { duration: 180 });
        pageZoomTranslateY.value = reduceMotion ? 0 : withTiming(0, { duration: 180 });
      }
    },
    [pageZoomScale, pageZoomTranslateX, pageZoomTranslateY, reduceMotion],
  );

  const resetPageZoom = useCallback(() => {
    setPageZoom(READER_MIN_ZOOM);
  }, [setPageZoom]);

  useEffect(() => {
    pageZoomScale.value = READER_MIN_ZOOM;
    pageZoomTranslateX.value = 0;
    pageZoomTranslateY.value = 0;
    setIsPageZoomed(false);
  }, [leafIndex, pageZoomScale, pageZoomTranslateX, pageZoomTranslateY, readingView]);

  // Book open/close: the cover is always mounted. It swings open around
  // the spine (gutter) and stays at -175° (face-down on the left) while
  // the book is open. When closed, it swings back to 0°. The cover is
  // never unmounted — it stays in the tree so the user can swipe it open
  // and closed naturally. Deep-linked opens start with the animation
  // complete (opening = 1).
  //
  // When the parent passes an opening SharedValue, it owns the animation
  // (so the cover swing and reader chrome share one clock). Otherwise the
  // scene animates its own value from isOpen — backward-compatible fallback
  // for standalone usage.
  const localOpening = useSharedValue(isOpen ? 1 : 0);
  const opening = propOpening ?? localOpening;

  const bookEntryPositionStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: resolveBookStageTranslation(opening.value, leafWidth) }],
  }));

  useEffect(() => {
    if (propOpening) return; // Parent owns the open/close animation.
    opening.value = reduceMotion
      ? isOpen
        ? 1
        : 0
      : withTiming(isOpen ? 1 : 0, {
          duration: isOpen ? 980 : 620,
          easing: isOpen ? Easing.bezier(0.22, 0.72, 0.24, 1) : Easing.bezier(0.5, 0, 0.75, 0.2),
        });
  }, [isOpen, opening, propOpening, reduceMotion]);

  // Back cover: mirrors the front cover. When the book is open, the back
  // cover is at +175° (face-down on the right, under the pages). When the
  // user swipes forward on the last spread, it swings to 0° (covering the
  // left page, closing the book from the back). backOpening = 1 means open
  // (face-down, invisible), backOpening = 0 means closed (visible, on left).
  const backOpening = useSharedValue(isBackClosed ? 0 : 1);

  useEffect(() => {
    backOpening.value = reduceMotion
      ? isBackClosed
        ? 0
        : 1
      : withTiming(isBackClosed ? 0 : 1, {
          duration: isBackClosed ? 620 : 760,
          easing: isBackClosed ? Easing.bezier(0.5, 0, 0.75, 0.2) : Easing.bezier(0.22, 0.72, 0.24, 1),
        });
  }, [isBackClosed, backOpening, reduceMotion]);

  // The cover swings from 0° (closed, over the right page) to -175° (open,
  // face-down on the left). The cover is always mounted — it stays in the
  // tree so the user can swipe it open and closed naturally.
  //
  // Opacity: the cover fades out as it passes edge-on (~50% of the swing,
  // ~-90°) and is invisible when face-down. This avoids the "stuck cover"
  // appearance where the rotated cover is still visible at -175°.
  // backfaceVisibility: 'hidden' has known iOS bugs with Reanimated on
  // newer Expo versions, so opacity interpolation is the reliable approach.
  //
  // The cover is offset right by half the spread width so its left edge
  // (the hinge) sits at the gutter (center of the spread). The rotation
  // pivots around that left edge using the manual translate-rotate-translate
  // hinge technique (transformOrigin is unreliable with Reanimated's
  // animated transform array):
  //   translateX(hingeOffset)  — position over the right page
  //   translateX(-W/2)         — shift pivot to the left edge
  //   rotateY(angle)           — swing around the left edge (gutter)
  //   translateX(W/2)          — shift back from the pivot
  const coverHingeOffset = isPhysicalPageReading ? 0 : bookGeometry.frontCoverOffsetX;
  const coverOpenStyle = useAnimatedStyle(() => ({
    opacity: interpolate(opening.value, [0, 0.48, 0.52, 1], [1, 1, 0, 0], Extrapolation.CLAMP),
    transform: [
      { translateX: coverHingeOffset },
      { perspective: 1200 },
      { translateX: -leafWidth / 2 },
      { rotateY: `${interpolate(opening.value, [0, 1], [0, -175])}deg` },
      { translateX: leafWidth / 2 },
    ],
  }));

  // Back cover: mirrored hinge. The back cover is positioned over the LEFT
  // page, hinged at its RIGHT edge (the gutter). When open (backOpening = 1),
  // it swings to +175° (face-down on the right, under the pages). When closed
  // (backOpening = 0), it's at 0° (covering the left page). Opacity fades in
  // as it swings past edge-on — the inverse of the front cover.
  //
  // Hinge technique (mirrored):
  //   translateX(-hingeOffset)  — position over the left page
  //   translateX(W/2)           — shift pivot to the right edge
  //   rotateY(angle)            — swing around the right edge (gutter)
  //   translateX(-W/2)          — shift back from the pivot
  const backCoverHingeOffset = isPhysicalPageReading ? 0 : -bookGeometry.backCoverOffsetX;
  const backCoverOpenStyle = useAnimatedStyle(() => ({
    opacity: interpolate(backOpening.value, [0, 0.48, 0.52, 1], [1, 1, 0, 0], Extrapolation.CLAMP),
    transform: [
      { translateX: -backCoverHingeOffset },
      { perspective: 1200 },
      { translateX: leafWidth / 2 },
      { rotateY: `${interpolate(backOpening.value, [0, 1], [0, 175])}deg` },
      { translateX: -leafWidth / 2 },
    ],
  }));

  // The spread underneath fades in as the cover opens. When the book is
  // closed (opening = 0), the spread is invisible — simulating a real
  // closed book where you only see the cover, not the pages inside. The
  // spread becomes visible as the cover swings past edge-on (~50%), so
  // by the time the cover is face-down and invisible, the spread is
  // fully revealed. This is the inverse of the cover opacity fade.
  // The spread is also hidden when the BACK cover closes — it fades out
  // as the back cover swings shut. The spread is only visible when BOTH
  // covers are open, so we take the minimum of the two opacity values.
  const spreadVisibilityStyle = useAnimatedStyle(() => {
    const frontOpacity = interpolate(opening.value, [0, 0.45, 0.55, 1], [0, 0, 1, 1], Extrapolation.CLAMP);
    const backOpacity = interpolate(backOpening.value, [0, 0.45, 0.55, 1], [0, 0, 1, 1], Extrapolation.CLAMP);
    return { opacity: Math.min(frontOpacity, backOpacity) };
  });

  // Display-spread derivatives: these lag one render behind spreadIndex so
  // the Skia leaf textures and underneath pages stay stable through the turn
  // commit handoff (see displaySpreadIndex comment above).
  const displayActiveSpread = spreads[displaySpreadIndex] ?? spreads[0];
  const displayCurrentLeaf = hasLeaves ? leaves![Math.min(displayLeafIndex, leaves!.length - 1)] : undefined;
  const nextSpread = spreads[displaySpreadIndex + 1];
  const prevSpread = spreads[displaySpreadIndex - 1];
  // The curling leaf front face shows the page being turned AWAY.
  // The curling leaf back face shows the DESTINATION page (the page that
  // will be revealed when the turn completes), so there's no pop on commit.
  // Forward: right page curls away → back face = next spread's left page.
  // Backward: left page curls away → back face = prev spread's right page.
  // Single-page: current page curls away → back face = next/prev leaf.
  // Non-recipe leaves (ToC, bookplate, blank) get a Skia-drawn texture from
  // createLeafTexture so they turn with visible content, not blank cream.
  const forwardLeafPage = isPhysicalPageReading
    ? getLeafPageByIndex(leaves, displayLeafIndex, pages)
    : getLeafPage(displayActiveSpread?.right, pages);
  const backwardLeafPage = isPhysicalPageReading
    ? getLeafPageByIndex(leaves, displayLeafIndex - 1, pages)
    : getLeafPage(displayActiveSpread?.left, pages);
  const forwardBackFacePage = isPhysicalPageReading
    ? getLeafPageByIndex(leaves, displayLeafIndex + 1, pages)
    : getLeafPage(nextSpread?.left, pages);
  const backwardBackFacePage = isPhysicalPageReading
    ? getLeafPageByIndex(leaves, displayLeafIndex - 2, pages)
    : getLeafPage(prevSpread?.right, pages);
  const forwardLeafTextureUri = forwardLeafPage ? pageTextureUris[forwardLeafPage.id] : undefined;
  const backwardLeafTextureUri = backwardLeafPage ? pageTextureUris[backwardLeafPage.id] : undefined;
  const forwardBackTextureUri = forwardBackFacePage ? pageTextureUris[forwardBackFacePage.id] : undefined;
  const backwardBackTextureUri = backwardBackFacePage ? pageTextureUris[backwardBackFacePage.id] : undefined;
  const forwardLeafImage = useImage(
    SKIA_ENABLED ? getCookbookPageTurnImageSource(forwardLeafPage, forwardLeafTextureUri) : null,
  );
  const backwardLeafImage = useImage(
    SKIA_ENABLED ? getCookbookPageTurnImageSource(backwardLeafPage, backwardLeafTextureUri) : null,
  );
  const forwardBackFaceImage = useImage(
    SKIA_ENABLED ? getCookbookPageTurnImageSource(forwardBackFacePage, forwardBackTextureUri) : null,
  );
  const backwardBackFaceImage = useImage(
    SKIA_ENABLED ? getCookbookPageTurnImageSource(backwardBackFacePage, backwardBackTextureUri) : null,
  );

  // Generate Skia-drawn textures for non-recipe leaves in both spread and page modes.
  // These are used in place of the recipe page images for the curl mesh.
  const textureWidth = isPhysicalPageReading ? readingPageWidth : leafWidth;
  const textureHeight = isPhysicalPageReading ? readingPageHeight : bookHeight;
  const forwardLeafForTexture = isPhysicalPageReading ? displayCurrentLeaf : displayActiveSpread?.right;
  const backwardLeafForTexture = isPhysicalPageReading ? leaves?.[displayLeafIndex - 1] : displayActiveSpread?.left;
  const forwardBackLeafForTexture = isPhysicalPageReading ? leaves?.[displayLeafIndex + 1] : nextSpread?.left;
  const backwardBackLeafForTexture = isPhysicalPageReading ? leaves?.[displayLeafIndex - 2] : prevSpread?.right;

  const forwardLeafTexture = useMemo(
    () =>
      SKIA_ENABLED && forwardLeafForTexture && forwardLeafForTexture.type !== 'recipe'
        ? createLeafTexture(forwardLeafForTexture, textureWidth, textureHeight, cookbook, pages)
        : null,
    [forwardLeafForTexture, textureWidth, textureHeight, cookbook, pages],
  );
  const backwardLeafTexture = useMemo(
    () =>
      SKIA_ENABLED && backwardLeafForTexture && backwardLeafForTexture.type !== 'recipe'
        ? createLeafTexture(backwardLeafForTexture, textureWidth, textureHeight, cookbook, pages)
        : null,
    [backwardLeafForTexture, textureWidth, textureHeight, cookbook, pages],
  );
  const forwardBackLeafTexture = useMemo(
    () =>
      SKIA_ENABLED && forwardBackLeafForTexture && forwardBackLeafForTexture.type !== 'recipe'
        ? createLeafTexture(forwardBackLeafForTexture, textureWidth, textureHeight, cookbook, pages)
        : null,
    [forwardBackLeafForTexture, textureWidth, textureHeight, cookbook, pages],
  );
  const backwardBackLeafTexture = useMemo(
    () =>
      SKIA_ENABLED && backwardBackLeafForTexture && backwardBackLeafForTexture.type !== 'recipe'
        ? createLeafTexture(backwardBackLeafForTexture, textureWidth, textureHeight, cookbook, pages)
        : null,
    [backwardBackLeafForTexture, textureWidth, textureHeight, cookbook, pages],
  );

  // Use generated textures for non-recipe leaves, fall back to loaded images.
  const forwardImage = forwardLeafTexture ?? forwardLeafImage;
  const backwardImage = backwardLeafTexture ?? backwardLeafImage;
  const forwardBackImage = forwardBackLeafTexture ?? forwardBackFaceImage;
  const backwardBackImage = backwardBackLeafTexture ?? backwardBackFaceImage;

  // While a turn runs, the Skia leaf draws the turning page (curl, back face,
  // fold shadow); the flat RN leaves underneath only gate their visibility so
  // the turning page never double-renders. On native (without Skia), the flat
  // leaves provide a simple rotate-and-fade page turn instead.
  const currentPageTurnStyle = useAnimatedStyle(() => {
    const dir = turnDirection.value;
    const progress = turnProgress.value;
    if (dir === 0 || progress === 0) return { opacity: 1, transform: [{ rotateY: '0deg' }] };
    if (SKIA_ENABLED) {
      // In single-page backward turns, the previous page uncurls IN over the current page,
      // so the current page remains visible underneath.
      if (isPhysicalPageReading && dir === -1) {
        return { opacity: 1, transform: [{ rotateY: '0deg' }] };
      }
      return { opacity: 0, transform: [{ rotateY: '0deg' }] };
    }
    const halfPageWidth = readingPageWidth / 2;
    return {
      opacity: interpolate(progress, [0, 0.48, 0.56, 1], [1, 1, 0, 0], Extrapolation.CLAMP),
      transform: [
        { perspective: 1000 },
        { translateX: -halfPageWidth },
        { rotateY: `${-progress * 175 * dir}deg` },
        { translateX: halfPageWidth },
      ],
    };
  }, [isPhysicalPageReading, readingPageWidth]);

  const nextPageRevealStyle = useAnimatedStyle(() => ({
    opacity: turnDirection.value === 1 ? 1 : 0,
    transform: [{ scale: 0.992 + turnProgress.value * 0.008 }],
  }));

  const prevPageRevealStyle = useAnimatedStyle(() => ({
    opacity: turnDirection.value === -1 ? 1 : 0,
    transform: [{ scale: 0.992 + turnProgress.value * 0.008 }],
  }));

  const pageZoomStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: pageZoomTranslateX.value },
      { translateY: pageZoomTranslateY.value },
      { scale: pageZoomScale.value },
    ],
  }));

  // In spread mode, the underneath pages show the destination spread's pages
  // so there's no pop when the turn commits. Forward: next spread's right page
  // under the right leaf. Backward: prev spread's left page under the left leaf.
  const spreadRightUnderneathStyle = useAnimatedStyle(() => ({
    opacity: !isPhysicalPageReading && turnDirection.value === 1 ? 1 : 0,
  }));
  const spreadLeftUnderneathStyle = useAnimatedStyle(() => ({
    opacity: !isPhysicalPageReading && turnDirection.value === -1 ? 1 : 0,
  }));

  const commitTurn = useCallback(
    (direction: -1 | 1) => {
      void Haptics.selectionAsync();
      if (direction === 1) onNext();
      else onPrevious();
    },
    [onNext, onPrevious],
  );

  const notifyTurnGrabbed = useCallback(() => {
    void Haptics.selectionAsync();
  }, []);

  const notifyTurnCancelled = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const startCanonicalTurn = useCallback(
    (direction: -1 | 1) => {
      const canTurn = direction === 1 ? canTurnNext : canTurnPrevious;
      if (!isOpen || isPageZoomed || !canTurn) return;
      if (turnDirection.value !== 0 || isSettling.value !== 0) return;

      if (isBackClosed) {
        if (direction === -1 && onOpenBack) onOpenBack();
        return;
      }

      onStageTap?.();
      notifyTurnGrabbed();
      cancelAnimation(turnProgress);
      grabYRatio.value = 0.5;
      turnDirection.value = direction;
      turnProgress.value = CORNER_LIFT_PROGRESS;
      isSettling.value = 1;

      if (reduceMotion) {
        turnProgress.value = 0;
        turnDirection.value = 0;
        isSettling.value = 0;
        commitTurn(direction);
        return;
      }

      turnProgress.value = withSpring(1, TURN_COMMIT_SPRING, (finished) => {
        if (!finished) return;
        runOnJS(commitTurn)(direction);
      });
    },
    [
      canTurnNext,
      canTurnPrevious,
      commitTurn,
      grabYRatio,
      isBackClosed,
      isOpen,
      isPageZoomed,
      isSettling,
      notifyTurnGrabbed,
      onOpenBack,
      onStageTap,
      reduceMotion,
      turnDirection,
      turnProgress,
    ],
  );

  useEffect(() => {
    if (!turnRequest || lastHandledTurnRequestId.current === turnRequest.id) return;
    lastHandledTurnRequestId.current = turnRequest.id;
    startCanonicalTurn(turnRequest.direction);
  }, [startCanonicalTurn, turnRequest]);

  // Layout effect: resets the turn values synchronously after the new leaves
  // commit but before paint, so the handoff frame never flashes stale content.
  // The display indices are updated here too, so the Skia/underneath images
  // catch up to the new spread/leaf at the same moment the shared values reset
  // (making the curling leaf invisible). This prevents a 1-frame flash where
  // the new spreadIndex has propagated but turnDirection hasn't reset yet.
  useLayoutEffect(() => {
    cancelAnimation(turnProgress);
    turnProgress.value = 0;
    turnDirection.value = 0;
    isSettling.value = 0;
    grabYRatio.value = 0.5;
    setDisplaySpreadIndex(spreadIndex);
    setDisplayLeafIndex(leafIndex);
  }, [grabYRatio, isSettling, leafIndex, readingPageIndex, readingView, spreadIndex, turnDirection, turnProgress]);

  // Drag-to-turn: progress is driven by the pointer's position, not by
  // accumulated drag distance, so the leaf tracks the finger 1:1 and follows
  // it back when the drag reverses. A turn in flight can be re-grabbed — a
  // new gesture cancels the running spring and takes over from the current
  // progress instead of waiting for the settle to finish.
  //
  // Corner lift: on touch-down (before drag activates), the page corner lifts
  // slightly in the turn direction implied by the touch position — right side
  // → forward, left side → backward. This makes the page feel alive under the
  // finger, matching the StPageFlip fold_corner behavior.
  // Swipe-to-open on the closed cover: a forward swipe (left) opens the
  // book. Only active when the book is closed — when open, the cover layer
  // has pointerEvents: 'none' so this gesture never receives touches.
  const coverSwipeGesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(!isOpen)
        .activeOffsetX([-20, 20])
        .failOffsetY([-80, 80])
        .onEnd((event) => {
          if (event.translationX < -20) {
            runOnJS(onOpen)();
          }
        }),
    [isOpen, onOpen],
  );

  const turnGesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(isOpen && !isPageZoomed)
        .maxPointers(1)
        .activeOffsetX([-8, 8])
        .failOffsetY([-80, 80])
        .cancelsTouchesInView(true)
        .onBegin((event) => {
          // Wake the reader chrome on any stage touch — same pattern as the
          // web document-level touchstart listener.
          if (onStageTap) runOnJS(onStageTap)();
          cancelAnimation(turnProgress);
          isSettling.value = 0;

          // Track the vertical grab coordinate ratio (0=top, 1=bottom) for
          // cone/cylinder corner-peel deformation. The book content is
          // centered within the gesture surface, so we subtract the vertical
          // offset of the page from event.y before dividing by page height.
          const surfaceH = isPhysicalPageReading ? readingPageHeight : bookHeight;
          const stageHeight = isPhysicalPageReading ? readingPageHeight + 30 : bookHeight + 24;
          const pageOffsetInStage = isPhysicalPageReading ? 15 : 12;
          const stageYOffset = Math.max(0, (height - stageHeight) / 2);
          const pageTopY = stageYOffset + pageOffsetInStage;
          grabYRatio.value = Math.max(0, Math.min(1, (event.y - pageTopY) / Math.max(surfaceH, 1)));

          // Preserve the current turn direction and progress when re-grabbing
          // mid-turn. Calculate the grab point that would produce the current
          // progress at the current pointer position, so the page doesn't
          // snap to 0 when the user catches it mid-flip.
          const currentDir = turnDirection.value;
          const currentProgress = turnProgress.value;
          if (currentDir !== 0 && currentProgress > 0) {
            // Back-calculate grabX from the progress formula:
            // progress = (grabX - pointerX) / travel  (forward)
            // progress = (pointerX - grabX) / travel  (backward)
            // travel = 2 * |targetX - grabX|
            // For simplicity, use the pointer as the grab point offset
            // by the progress * pageWidth, so the page stays where it is.
            const offset = currentProgress * turnSurfaceWidth;
            turnGrabX.value = currentDir === 1 ? event.x + offset : event.x - offset;
          } else {
            // New touch: lift the corner slightly based on which side was
            // touched. Right half → forward curl, left half → backward curl.
            turnDirection.value = event.x > width / 2 ? 1 : -1;
            turnGrabX.value = event.x;
            turnProgress.value = CORNER_LIFT_PROGRESS;
          }
        })
        .onUpdate((event) => {
          // Determine or correct the turn direction once the drag is large
          // enough. If the corner lift guessed wrong (user touched right but
          // dragged right), switch direction and reset progress.
          if (Math.abs(event.translationX) >= 4) {
            const dragDir = event.translationX < 0 ? 1 : -1;
            if (turnDirection.value === 0) {
              turnDirection.value = dragDir;
              runOnJS(notifyTurnGrabbed)();
            } else if (turnDirection.value !== dragDir && turnProgress.value < 0.15) {
              turnDirection.value = dragDir;
              turnProgress.value = 0;
              runOnJS(notifyTurnGrabbed)();
            }
          }

          const direction = turnDirection.value;
          if (direction === 0) return;
          const canTurn = direction === 1 ? canTurnNext : canTurnPrevious;
          turnProgress.value = resolveTurnProgress({
            grabX: turnGrabX.value,
            pointerX: event.x,
            pageWidth: turnSurfaceWidth,
            direction,
            canTurn,
            targetX: turnTargetX,
          });
        })
        .onEnd((event) => {
          const direction = turnDirection.value;
          if (direction === 0) return;

          // Close the book: backward swipe on the first spread or first leaf.
          // This takes priority over the corner-lift release check
          // below, because on spread 0 canTurnPrevious is false and
          // turnProgress stays at the corner-lift value — without this
          // check the gesture would just spring back harmlessly.
          if (direction === -1 && atFrontEdge && !isBackClosed && event.translationX > 24 && onClose) {
            turnDirection.value = 0;
            turnProgress.value = 0;
            isSettling.value = 0;
            runOnJS(onClose)();
            return;
          }

          // Close the back cover: forward swipe on the last spread or leaf. The
          // back cover swings from +175° (face-down on the right) to 0°
          // (covering the left page), closing the book from the back.
          // Same priority logic as the front cover close above.
          if (direction === 1 && atBackEdge && !isBackClosed && event.translationX < -24 && onCloseBack) {
            turnDirection.value = 0;
            turnProgress.value = 0;
            isSettling.value = 0;
            runOnJS(onCloseBack)();
            return;
          }

          // Reopen the back cover: backward swipe when the back cover is
          // closed. The back cover swings from 0° back to +175°, revealing
          // the last spread again.
          if (direction === -1 && !isPhysicalPageReading && isBackClosed && event.translationX > 24 && onOpenBack) {
            turnDirection.value = 0;
            turnProgress.value = 0;
            isSettling.value = 0;
            runOnJS(onOpenBack)();
            return;
          }

          // If this was just a corner lift (touch without enough drag),
          // release quietly without haptic feedback.
          if (turnProgress.value <= CORNER_LIFT_PROGRESS + 0.02) {
            if (reduceMotion) {
              turnProgress.value = 0;
              turnDirection.value = 0;
              isSettling.value = 0;
              return;
            }
            isSettling.value = 1;
            turnProgress.value = withSpring(0, { damping: 22, stiffness: 220, mass: 0.6 }, () => {
              turnDirection.value = 0;
              isSettling.value = 0;
            });
            return;
          }

          const canTurn = direction === 1 ? canTurnNext : canTurnPrevious;
          const release = resolveTurnRelease({
            progress: turnProgress.value,
            velocityX: event.velocityX,
            direction,
            pageWidth: turnSurfaceWidth,
          });

          isSettling.value = 1;

          if (!canTurn || !release.commit) {
            runOnJS(notifyTurnCancelled)();
            if (reduceMotion) {
              turnProgress.value = 0;
              turnDirection.value = 0;
              isSettling.value = 0;
              return;
            }
            // When !canTurn, always direct velocity back to 0 to prevent
            // the spring from overshooting further into the turn.
            const cancelVelocity = canTurn ? release.settleVelocity : -Math.abs(release.settleVelocity);
            turnProgress.value = withSpring(
              0,
              { damping: 22, stiffness: 190, mass: 0.72, velocity: cancelVelocity },
              () => {
                turnDirection.value = 0;
                isSettling.value = 0;
              },
            );
            return;
          }

          if (reduceMotion) {
            turnProgress.value = 0;
            turnDirection.value = 0;
            isSettling.value = 0;
            runOnJS(commitTurn)(direction);
            return;
          }

          turnProgress.value = withSpring(
            1,
            {
              ...TURN_COMMIT_SPRING,
              velocity: release.settleVelocity,
            },
            (finished) => {
              if (!finished) return;
              runOnJS(commitTurn)(direction);
            },
          );
        })
        .onFinalize((_event, success) => {
          if (success || isSettling.value !== 0) return;
          turnProgress.value = reduceMotion ? 0 : withTiming(0, { duration: 120 });
          turnDirection.value = 0;
        }),
    [
      canTurnNext,
      canTurnPrevious,
      atBackEdge,
      atFrontEdge,
      commitTurn,
      grabYRatio,
      bookHeight,
      height,
      isBackClosed,
      isPageZoomed,
      isPhysicalPageReading,
      isOpen,
      isSettling,
      notifyTurnCancelled,
      notifyTurnGrabbed,
      onClose,
      onCloseBack,
      onOpenBack,
      onStageTap,
      readingPageHeight,
      reduceMotion,
      turnDirection,
      turnGrabX,
      turnProgress,
      turnSurfaceWidth,
      turnTargetX,
      width,
    ],
  );

  const pinchZoomGesture = useMemo(
    () =>
      Gesture.Pinch()
        .enabled(isPhysicalPageReading)
        .onBegin((event) => {
          if (onStageTap) runOnJS(onStageTap)();
          pageZoomStartScale.value = pageZoomScale.value;
          pageZoomStartTranslateX.value = pageZoomTranslateX.value;
          pageZoomStartTranslateY.value = pageZoomTranslateY.value;
          pageZoomStartFocalX.value = event.focalX;
          pageZoomStartFocalY.value = event.focalY;
        })
        .onUpdate((event) => {
          const nextScale = clampReaderZoomScale(pageZoomStartScale.value * event.scale);
          const scaleRatio = nextScale / Math.max(pageZoomStartScale.value, READER_MIN_ZOOM);
          const focalX = pageZoomStartFocalX.value - width / 2;
          const focalY = pageZoomStartFocalY.value - height / 2;
          const nextTranslateX =
            pageZoomStartTranslateX.value + (1 - scaleRatio) * (focalX - pageZoomStartTranslateX.value);
          const nextTranslateY =
            pageZoomStartTranslateY.value + (1 - scaleRatio) * (focalY - pageZoomStartTranslateY.value);
          pageZoomScale.value = nextScale;
          pageZoomTranslateX.value = clampReaderZoomTranslation(nextTranslateX, readingPageWidth, nextScale);
          pageZoomTranslateY.value = clampReaderZoomTranslation(nextTranslateY, readingPageHeight, nextScale);
        })
        .onEnd(() => {
          const zoomed = pageZoomScale.value > READER_ZOOMED_THRESHOLD;
          if (!zoomed) {
            pageZoomScale.value = reduceMotion ? READER_MIN_ZOOM : withTiming(READER_MIN_ZOOM, { duration: 160 });
            pageZoomTranslateX.value = reduceMotion ? 0 : withTiming(0, { duration: 160 });
            pageZoomTranslateY.value = reduceMotion ? 0 : withTiming(0, { duration: 160 });
          }
          runOnJS(updatePageZoomedState)(zoomed);
        }),
    [
      height,
      isPhysicalPageReading,
      onStageTap,
      pageZoomScale,
      pageZoomStartFocalX,
      pageZoomStartFocalY,
      pageZoomStartScale,
      pageZoomStartTranslateX,
      pageZoomStartTranslateY,
      pageZoomTranslateX,
      pageZoomTranslateY,
      readingPageHeight,
      readingPageWidth,
      reduceMotion,
      updatePageZoomedState,
      width,
    ],
  );

  const zoomPanGesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(isPhysicalPageReading && isPageZoomed)
        .minDistance(1)
        .onBegin(() => {
          pageZoomStartTranslateX.value = pageZoomTranslateX.value;
          pageZoomStartTranslateY.value = pageZoomTranslateY.value;
        })
        .onUpdate((event) => {
          pageZoomTranslateX.value = clampReaderZoomTranslation(
            pageZoomStartTranslateX.value + event.translationX,
            readingPageWidth,
            pageZoomScale.value,
          );
          pageZoomTranslateY.value = clampReaderZoomTranslation(
            pageZoomStartTranslateY.value + event.translationY,
            readingPageHeight,
            pageZoomScale.value,
          );
        }),
    [
      isPageZoomed,
      isPhysicalPageReading,
      pageZoomScale,
      pageZoomStartTranslateX,
      pageZoomStartTranslateY,
      pageZoomTranslateX,
      pageZoomTranslateY,
      readingPageHeight,
      readingPageWidth,
    ],
  );

  const doubleTapZoomGesture = useMemo(
    () =>
      Gesture.Tap()
        .enabled(isPhysicalPageReading)
        .numberOfTaps(2)
        .maxDuration(260)
        .onEnd((event, success) => {
          if (!success) return;
          const nextScale = nextDoubleTapZoomScale(pageZoomScale.value);
          const zoomed = nextScale > READER_ZOOMED_THRESHOLD;
          const nextTranslateX = zoomed
            ? clampReaderZoomTranslation((width / 2 - event.x) * (nextScale - 1), readingPageWidth, nextScale)
            : 0;
          const nextTranslateY = zoomed
            ? clampReaderZoomTranslation((height / 2 - event.y) * (nextScale - 1), readingPageHeight, nextScale)
            : 0;
          pageZoomScale.value = reduceMotion ? nextScale : withTiming(nextScale, { duration: 180 });
          pageZoomTranslateX.value = reduceMotion ? nextTranslateX : withTiming(nextTranslateX, { duration: 180 });
          pageZoomTranslateY.value = reduceMotion ? nextTranslateY : withTiming(nextTranslateY, { duration: 180 });
          runOnJS(updatePageZoomedState)(zoomed);
        }),
    [
      height,
      isPhysicalPageReading,
      pageZoomScale,
      pageZoomTranslateX,
      pageZoomTranslateY,
      readingPageHeight,
      readingPageWidth,
      reduceMotion,
      updatePageZoomedState,
      width,
    ],
  );

  // Normal drags turn pages. Once zoomed, the same one-finger drag pans the
  // page instead. Pinch and double-tap run alongside that exclusive choice.
  const composedGesture = useMemo(
    () =>
      Gesture.Simultaneous(
        Gesture.Exclusive(coverSwipeGesture, zoomPanGesture, turnGesture),
        pinchZoomGesture,
        doubleTapZoomGesture,
      ),
    [coverSwipeGesture, doubleTapZoomGesture, pinchZoomGesture, turnGesture, zoomPanGesture],
  );

  return (
    <View style={[styles.container, style]}>
      <GestureDetector gesture={composedGesture}>
        <Animated.View style={[styles.sceneSurface, bookEntryPositionStyle]}>
          <Animated.View style={styles.gestureSurface} pointerEvents="auto">
            {isPhysicalPageReading ? (
              <Animated.View
                entering={reduceMotion ? undefined : zoomEntering}
                exiting={reduceMotion ? undefined : zoomExiting}
                style={[
                  styles.physicalPageStage,
                  { width: readingPageGeometry.stageWidth, height: readingPageHeight + 30 },
                ]}
              >
                {/* Page stacks: left grows as you read forward, right thins */}
                {(() => {
                  const total = leaves?.length ?? 1;
                  const ratio = total > 1 ? leafIndex / (total - 1) : 0;
                  const leftH = getStackHeight(ratio, readingPageHeight, 'left');
                  const rightH = getStackHeight(ratio, readingPageHeight, 'right');
                  const stageH = readingPageHeight + 30;
                  return (
                    <>
                      <View
                        style={{
                          position: 'absolute',
                          left: readingPageGeometry.pageOffsetX - STACK_WIDTH,
                          top: (stageH - leftH) / 2,
                          zIndex: 0,
                        }}
                      >
                        <PageStack height={leftH} side="left" />
                      </View>
                      <View
                        style={{
                          position: 'absolute',
                          left: readingPageGeometry.pageOffsetX + readingPageWidth,
                          top: (stageH - rightH) / 2,
                          zIndex: 0,
                        }}
                      >
                        <PageStack height={rightH} side="right" />
                      </View>
                    </>
                  );
                })()}
                <Animated.View pointerEvents="none" style={[styles.physicalPageFallback, pageZoomStyle]}>
                  <BookBlockUnderlay width={readingPageWidth} height={readingPageHeight} coverColor={coverColor} />
                  {displayCanGoNext ? (
                    <Animated.View
                      style={[
                        styles.physicalFallbackLeaf,
                        styles.nativePageLayer,
                        { width: readingPageWidth, height: readingPageHeight },
                        nextPageRevealStyle,
                      ]}
                    >
                      <CookbookLeafPage
                        leaf={leaves![displayLeafIndex + 1]}
                        cookbook={cookbook}
                        pages={pages}
                        onOpenRecipe={onOpenRecipe}
                        onPageTextureReady={handlePageTextureReady}
                      />
                      <BookLeafShade side="right" />
                    </Animated.View>
                  ) : null}
                  {displayCanGoPrevious ? (
                    <Animated.View
                      style={[
                        styles.physicalFallbackLeaf,
                        styles.nativePageLayer,
                        { width: readingPageWidth, height: readingPageHeight },
                        prevPageRevealStyle,
                      ]}
                    >
                      <CookbookLeafPage
                        leaf={leaves![displayLeafIndex - 1]}
                        cookbook={cookbook}
                        pages={pages}
                        onOpenRecipe={onOpenRecipe}
                        onPageTextureReady={handlePageTextureReady}
                      />
                      <BookLeafShade side="right" />
                    </Animated.View>
                  ) : null}
                  <Animated.View
                    style={[
                      styles.physicalFallbackLeaf,
                      styles.nativePageLayer,
                      styles.currentNativePage,
                      { width: readingPageWidth, height: readingPageHeight },
                      currentPageTurnStyle,
                    ]}
                  >
                    <CookbookLeafPage
                      leaf={currentLeaf!}
                      cookbook={cookbook}
                      pages={pages}
                      onOpenRecipe={onOpenRecipe}
                      onPageTextureReady={handlePageTextureReady}
                    />
                    <BookLeafShade side="right" />
                  </Animated.View>
                  {SKIA_ENABLED ? (
                    <TurningLeafSkia
                      forwardImage={forwardImage}
                      backwardImage={backwardImage}
                      forwardBackImage={forwardBackImage}
                      backwardBackImage={backwardBackImage}
                      width={readingPageWidth}
                      height={readingPageHeight}
                      forwardOffsetX={readingPageGeometry.pageOffsetX}
                      offsetY={15}
                      progress={turnProgress}
                      direction={turnDirection}
                      grabYRatio={grabYRatio}
                      onePageMode
                    />
                  ) : null}
                  <BookGutter
                    height={readingPageHeight}
                    style={{
                      left: readingPageGeometry.bindingLeft,
                      top: 15,
                      zIndex: 4,
                    }}
                  />
                </Animated.View>
                {currentLeaf?.type === 'recipe' ? (
                  <Pressable
                    style={StyleSheet.absoluteFill}
                    onPress={() => {
                      const page = getLeafPage(currentLeaf, pages);
                      if (page) onOpenRecipe(page);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`${getLeafPage(currentLeaf, pages)?.title ?? 'Recipe'} reading page`}
                    accessibilityHint={
                      isPageZoomed
                        ? 'Drag to move around the page. Double tap to reset zoom.'
                        : 'Double tap or pinch to zoom. Swipe horizontally to change recipes.'
                    }
                    accessibilityActions={[
                      ...(!isPageZoomed && displayCanGoPrevious
                        ? [{ name: 'decrement' as const, label: 'Previous recipe' }]
                        : []),
                      ...(!isPageZoomed && displayCanGoNext
                        ? [{ name: 'increment' as const, label: 'Next recipe' }]
                        : []),
                      {
                        name: isPageZoomed ? 'zoom-out' : 'zoom-in',
                        label: isPageZoomed ? 'Reset zoom' : 'Zoom in',
                      },
                    ]}
                    onAccessibilityAction={(event) => {
                      if (event.nativeEvent.actionName === 'decrement' && displayCanGoPrevious) {
                        startCanonicalTurn(-1);
                      }
                      if (event.nativeEvent.actionName === 'increment' && displayCanGoNext) {
                        startCanonicalTurn(1);
                      }
                      if (event.nativeEvent.actionName === 'zoom-in') {
                        setPageZoom(nextDoubleTapZoomScale(READER_MIN_ZOOM));
                      }
                      if (event.nativeEvent.actionName === 'zoom-out') {
                        resetPageZoom();
                      }
                    }}
                  />
                ) : null}
                {isPageZoomed ? (
                  <Pressable
                    style={[styles.resetZoomButton, { right: readingPageGeometry.pageOffsetX + Spacing.sm }]}
                    onPress={resetPageZoom}
                    accessibilityRole="button"
                    accessibilityLabel="Reset page zoom"
                  >
                    <Minimize2 size={16} color={Colors.text} />
                    <Text style={styles.resetZoomText}>Reset</Text>
                  </Pressable>
                ) : null}
              </Animated.View>
            ) : (
              <Animated.View
                style={spreadVisibilityStyle}
                pointerEvents={isOpen ? 'auto' : 'none'}
                accessibilityElementsHidden={!isOpen}
                importantForAccessibility={isOpen ? 'auto' : 'no-hide-descendants'}
              >
                <Animated.View
                  entering={reduceMotion ? undefined : zoomEntering}
                  exiting={reduceMotion ? undefined : zoomExiting}
                >
                  <View
                    style={[styles.spreadStage, { width: bookGeometry.stageWidth, height: bookGeometry.stageHeight }]}
                  >
                    {/* Page stacks: left grows as you read forward, right thins */}
                    {(() => {
                      const ratio = spreads.length > 1 ? spreadIndex / (spreads.length - 1) : 0;
                      const leftH = getStackHeight(ratio, bookHeight, 'left');
                      const rightH = getStackHeight(ratio, bookHeight, 'right');
                      return (
                        <>
                          <View
                            style={{
                              position: 'absolute',
                              left: 0,
                              top: (bookGeometry.stageHeight - leftH) / 2,
                              zIndex: 0,
                            }}
                          >
                            <PageStack height={leftH} side="left" />
                          </View>
                          <View
                            style={{
                              position: 'absolute',
                              left: bookGeometry.stageWidth - STACK_WIDTH,
                              top: (bookGeometry.stageHeight - rightH) / 2,
                              zIndex: 0,
                            }}
                          >
                            <PageStack height={rightH} side="right" />
                          </View>
                        </>
                      );
                    })()}
                    <OpenBookSpread
                      width={leafWidth * 2}
                      height={bookHeight}
                      coverColor={coverColor}
                      left={
                        <CookbookLeafPage
                          leaf={activeSpread.left}
                          cookbook={cookbook}
                          pages={pages}
                          onOpenRecipe={(page) =>
                            readingView === 'spread' ? onEnterReadingView(page) : onOpenRecipe(page)
                          }
                          onPageTextureReady={handlePageTextureReady}
                        />
                      }
                      right={
                        <CookbookLeafPage
                          leaf={activeSpread.right}
                          cookbook={cookbook}
                          pages={pages}
                          onOpenRecipe={(page) =>
                            readingView === 'spread' ? onEnterReadingView(page) : onOpenRecipe(page)
                          }
                          onPageTextureReady={handlePageTextureReady}
                        />
                      }
                    />
                    {/* Underneath pages: show the destination spread's pages
                      so the turn commits with zero pop. */}
                    {nextSpread ? (
                      <Animated.View
                        pointerEvents="none"
                        style={[
                          styles.underneathRight,
                          { left: leafWidth + bookGeometry.frameInset, top: 12, width: leafWidth, height: bookHeight },
                          spreadRightUnderneathStyle,
                        ]}
                      >
                        <CookbookLeafPage
                          leaf={nextSpread.right}
                          cookbook={cookbook}
                          pages={pages}
                          onOpenRecipe={onOpenRecipe}
                          onPageTextureReady={handlePageTextureReady}
                        />
                        <BookLeafShade side="right" />
                      </Animated.View>
                    ) : null}
                    {prevSpread ? (
                      <Animated.View
                        pointerEvents="none"
                        style={[
                          styles.underneathLeft,
                          { left: bookGeometry.frameInset, top: 12, width: leafWidth, height: bookHeight },
                          spreadLeftUnderneathStyle,
                        ]}
                      >
                        <CookbookLeafPage
                          leaf={prevSpread.left}
                          cookbook={cookbook}
                          pages={pages}
                          onOpenRecipe={onOpenRecipe}
                          onPageTextureReady={handlePageTextureReady}
                        />
                        <BookLeafShade side="left" />
                      </Animated.View>
                    ) : null}
                    {SKIA_ENABLED ? (
                      <TurningLeafSkia
                        forwardImage={forwardImage}
                        backwardImage={backwardImage}
                        forwardBackImage={forwardBackImage}
                        backwardBackImage={backwardBackImage}
                        width={leafWidth}
                        height={bookHeight}
                        forwardOffsetX={leafWidth + bookGeometry.frameInset}
                        backwardOffsetX={bookGeometry.frameInset}
                        offsetY={12}
                        progress={turnProgress}
                        direction={turnDirection}
                        grabYRatio={grabYRatio}
                      />
                    ) : null}
                    <BookGutter
                      height={bookHeight}
                      style={{
                        left: bookGeometry.frameInset + leafWidth - BOOK_GUTTER_WIDTH / 2,
                        top: 12,
                        zIndex: 4,
                      }}
                    />
                  </View>
                </Animated.View>
              </Animated.View>
            )}
          </Animated.View>
          {/* The cover is always mounted. It swings open/closed via the
          coverOpenStyle animation. pointerEvents: 'box-none' when closed
          so the Pressable inside receives taps but swipes pass through to
          the gesture surface; 'none' when open so nothing on the cover
          intercepts touches. */}
          <View style={styles.coverLayer} pointerEvents={isOpen ? 'none' : 'box-none'}>
            <Animated.View style={[styles.coverPivot, coverOpenStyle]}>
              <Pressable onPress={onOpen} accessibilityLabel={`Open ${cookbook?.title ?? 'cookbook'}`}>
                <PhysicalBook
                  title={cookbook?.title ?? 'My Cookbook'}
                  coverStyle={cookbook?.coverStyle ?? 'handwritten'}
                  coverFinishId={cookbook?.coverFinishId}
                  coverColorId={cookbook?.coverColorId}
                  pageCount={pages.length}
                  imageAsset={cookbook?.coverImageAsset}
                  width={leafWidth}
                  showShadow={false}
                />
              </Pressable>
            </Animated.View>
          </View>
          {/* Back cover: mirrors the front cover. Positioned over the LEFT page,
          hinged at the right edge (gutter). When the book is open, it's
          face-down on the right (invisible). When the user swipes forward
          on the last spread, it swings to 0° covering the left page.
          pointerEvents: 'box-none' when closed so the Pressable inside
          receives taps; 'none' when open. */}
          <View style={styles.coverLayer} pointerEvents={isBackClosed ? 'box-none' : 'none'}>
            <Animated.View style={[styles.backCoverPivot, backCoverOpenStyle]}>
              <Pressable onPress={onOpenBack} accessibilityLabel="Open back cover">
                <PhysicalBook
                  title=""
                  coverStyle={cookbook?.coverStyle ?? 'handwritten'}
                  coverFinishId={cookbook?.coverFinishId}
                  coverColorId={cookbook?.coverColorId}
                  pageCount={pages.length}
                  imageAsset={cookbook?.coverImageAsset}
                  face="back"
                  width={leafWidth}
                  showShadow={false}
                />
              </Pressable>
            </Animated.View>
          </View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sceneSurface: {
    flex: 1,
    alignSelf: 'stretch',
  },
  gestureSurface: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  coverPivot: {
    // The hinge (left edge / gutter) is handled by the manual
    // translate-rotate-translate technique in coverOpenStyle, not by
    // transformOrigin (which is unreliable with Reanimated transforms).
  },
  backCoverPivot: {
    // The hinge (right edge / gutter) is handled by the manual
    // translate-rotate-translate technique in backCoverOpenStyle.
  },
  physicalPageStage: {
    position: 'relative',
    // Clips the curling page so it tucks cleanly into the left binding edge
    // rather than projecting across the empty screen background.
    overflow: 'hidden',
    borderRadius: Radii.numeric[18],
  },
  physicalPageFallback: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  physicalFallbackLeaf: {
    overflow: 'hidden',
    borderRadius: Radii.numeric[9],
    borderTopLeftRadius: 2,
    borderBottomLeftRadius: 2,
    backgroundColor: Colors.book.page,
    borderWidth: 1,
    borderColor: Colors.book.edgeStrong,
  },
  nativePageLayer: {
    position: 'absolute',
  },
  currentNativePage: {
    zIndex: 2,
    boxShadow: Shadows.custom.sceneSoft,
  },
  resetZoomButton: {
    position: 'absolute',
    top: 23,
    zIndex: 12,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.legacySurface.v69,
    boxShadow: Colors.book.cardShadow,
  },
  resetZoomText: {
    color: Colors.text,
    fontFamily: Fonts.ui.semibold,
    fontSize: Typography.sizes.md,
    lineHeight: Typography.metrics.lineHeight16,
  },
  spreadStage: {
    position: 'relative',
  },
  underneathRight: {
    position: 'absolute',
    zIndex: 1,
    overflow: 'hidden',
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
  },
  underneathLeft: {
    position: 'absolute',
    zIndex: 1,
    overflow: 'hidden',
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  pageStack: {
    position: 'absolute',
    zIndex: 0,
    backgroundColor: Colors.book.pageWarm,
    borderWidth: 0.5,
    borderColor: Colors.book.edge,
    overflow: 'hidden',
  },
  stackStriation: {
    position: 'absolute',
    height: 0.5,
    backgroundColor: Colors.book.edge,
    opacity: 0.5,
  },
});
