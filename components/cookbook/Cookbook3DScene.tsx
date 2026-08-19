import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import * as Haptics from 'expo-haptics';
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
import { CookbookLeafPage } from '@/components/cookbook/CookbookLeafPage';
import { OpenBookSpread } from '@/components/cookbook/OpenBookSpread';
import { TurningLeafSkia } from '@/components/cookbook/TurningLeafSkia';
import { PhysicalBook } from '@/components/physical-book/PhysicalBook';
import { Colors } from '@/constants/colors';
import type { Cookbook3DSceneProps } from '@/components/cookbook/Cookbook3DScene.types';
import type { CookbookPage } from '@/types/cookbook';
import { getCookbookPageImageSource } from '@/utils/cookbook/pageImage';
import { createLeafTexture } from '@/utils/cookbook/leafTexture';
import {
  resolveTurnProgress,
  resolveTurnRelease,
  type PageTurnDirection,
} from '@/utils/cookbook/physicalBook';
import { TOUCH_PAGING_BREAKPOINT, type CookbookLeaf } from '@/utils/cookbook/reader';

// Skia Canvas renders the curling page leaf. Requires a dev client build
// with the matching native Skia binary (2.3.0+ on Expo SDK 54).
const SKIA_ENABLED = true;

const STACK_WIDTH = 4;
const STACK_MIN_RATIO = 0.06;
const STACK_MAX_RATIO = 0.42;
const STACK_STRIATIONS = 5;

/**
 * Vertical page stack on the outer edge of the book. The height represents
 * how many pages are on that side — the right stack thins as you read
 * forward, the left stack grows. Striation lines suggest individual page
 * edges.
 */
function PageStack({
  height,
  side,
}: {
  height: number;
  side: 'left' | 'right';
}) {
  if (height < 2) return null;
  const striations: React.ReactElement[] = [];
  const gap = height / (STACK_STRIATIONS + 1);
  for (let i = 1; i <= STACK_STRIATIONS; i += 1) {
    striations.push(
      <View
        key={i}
        style={[
          styles.stackStriation,
          { top: gap * i, width: STACK_WIDTH + 2, left: -1 },
        ]}
      />,
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
function getLeafPageByIndex(leaves: CookbookLeaf[] | undefined, index: number, pages: CookbookPage[]): CookbookPage | undefined {
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
  opening: propOpening,
  readingView = 'spread',
  readingPageId,
  leaves,
  leafIndex = 0,
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
  const leafWidth = Math.max(
    120,
    Math.min(340, (width - (isCompactPhone ? 12 : 32)) / 2, (height - 210) / 1.38),
  );
  const bookHeight = leafWidth * 1.38;
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

  const canGoPrevious = leafIndex > 0;
  const canGoNext = leafIndex < (leaves?.length ?? 1) - 1;
  // Display-index-based boundaries for the underneath (next/prev reveal) pages.
  // These lag one render behind canGoNext/canGoPrevious so the underneath pages
  // don't change content before the turn shared values reset.
  const displayCanGoPrevious = displayLeafIndex > 0;
  const displayCanGoNext = displayLeafIndex < (leaves?.length ?? 1) - 1;
  // One-page reading view: 3:4 aspect ratio (industry standard for cookbooks).
  // Width fills the screen minus 32pt side margins (16pt each side), height is
  // width × 1.35. Clamped to available vertical space so it never clips.
  // References: Apple Books, Kindle, NYT Cooking — all use ~3:4 on portrait phones.
  const READING_PAGE_MARGIN = 16;
  const READING_PAGE_RATIO = 1.35;
  const readingPageWidth = Math.min(width - READING_PAGE_MARGIN * 2, (height - 190) / READING_PAGE_RATIO);
  const readingPageHeight = readingPageWidth * READING_PAGE_RATIO;
  // In browse mode a swipe turns whole spreads; in physical reading it turns
  // single pages. Boundaries and travel are measured against the active mode.
  const canTurnNext = isPhysicalPageReading ? canGoNext : spreadIndex < spreads.length - 1;
  const canTurnPrevious = isPhysicalPageReading ? canGoPrevious : spreadIndex > 0;
  // In spread mode the user drags one page width (not the full spread), and
  // the turn target is the spine (center of the spread) rather than the edge.
  const turnSurfaceWidth = isPhysicalPageReading ? readingPageWidth : leafWidth;
  const turnTargetX = isPhysicalPageReading ? undefined : leafWidth;
  const turnProgress = useSharedValue(0);
  const turnDirection = useSharedValue<PageTurnDirection>(0);
  const isSettling = useSharedValue(0);
  const turnGrabX = useSharedValue(0);
  const grabYRatio = useSharedValue(0.5);

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

  useEffect(() => {
    if (propOpening) return; // Parent owns the open/close animation.
    opening.value = withTiming(
      isOpen ? 1 : 0,
      {
        duration: isOpen ? 980 : 620,
        easing: isOpen
          ? Easing.bezier(0.22, 0.72, 0.24, 1)
          : Easing.bezier(0.5, 0, 0.75, 0.2),
      },
    );
  }, [isOpen, opening, propOpening]);

  // Back cover: mirrors the front cover. When the book is open, the back
  // cover is at +175° (face-down on the right, under the pages). When the
  // user swipes forward on the last spread, it swings to 0° (covering the
  // left page, closing the book from the back). backOpening = 1 means open
  // (face-down, invisible), backOpening = 0 means closed (visible, on left).
  const backOpening = useSharedValue(isBackClosed ? 0 : 1);

  useEffect(() => {
    backOpening.value = withTiming(
      isBackClosed ? 0 : 1,
      {
        duration: isBackClosed ? 620 : 760,
        easing: isBackClosed
          ? Easing.bezier(0.5, 0, 0.75, 0.2)
          : Easing.bezier(0.22, 0.72, 0.24, 1),
      },
    );
  }, [isBackClosed, backOpening]);

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
  const coverHingeOffset = isPhysicalPageReading ? 0 : leafWidth / 2 + 10;
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
  const backCoverHingeOffset = isPhysicalPageReading ? 0 : leafWidth / 2 + 10;
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
  const forwardLeafImage = useImage(SKIA_ENABLED ? getCookbookPageImageSource(forwardLeafPage) : null);
  const backwardLeafImage = useImage(SKIA_ENABLED ? getCookbookPageImageSource(backwardLeafPage) : null);
  const forwardBackFaceImage = useImage(SKIA_ENABLED ? getCookbookPageImageSource(forwardBackFacePage) : null);
  const backwardBackFaceImage = useImage(SKIA_ENABLED ? getCookbookPageImageSource(backwardBackFacePage) : null);

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
    return {
      opacity: 1 - progress * 0.7,
      transform: [
        { perspective: 1000 },
        { rotateY: `${-progress * 78 * dir}deg` },
      ],
    };
  });

  const nextPageRevealStyle = useAnimatedStyle(() => ({
    opacity: turnDirection.value === 1 ? 1 : 0,
    transform: [{ scale: 0.992 + turnProgress.value * 0.008 }],
  }));

  const prevPageRevealStyle = useAnimatedStyle(() => ({
    opacity: !isPhysicalPageReading && turnDirection.value === -1 ? 1 : 0,
    transform: [{ scale: 0.992 + turnProgress.value * 0.008 }],
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

  // Layout effect: resets the turn values synchronously after the new leaves
  // commit but before paint, so the handoff frame never flashes stale content.
  // The display indices are updated here too, so the Skia/underneath images
  // catch up to the new spread/leaf at the same moment the shared values reset
  // (making the curling leaf invisible). This prevents a 1-frame flash where
  // the new spreadIndex has propagated but turnDirection hasn't reset yet.
  useLayoutEffect(() => {
    turnProgress.value = 0;
    turnDirection.value = 0;
    isSettling.value = 0;
    grabYRatio.value = 0.5;
    setDisplaySpreadIndex(spreadIndex);
    setDisplayLeafIndex(leafIndex);
  }, [grabYRatio, isSettling, leafIndex, readingPageIndex, spreadIndex, turnDirection, turnProgress]);

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
  const CORNER_LIFT_PROGRESS = 0.05;

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
        .enabled(isOpen)
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

          // Close the book: backward swipe on the first spread (bookplate /
          // ToC). This takes priority over the corner-lift release check
          // below, because on spread 0 canTurnPrevious is false and
          // turnProgress stays at the corner-lift value — without this
          // check the gesture would just spring back harmlessly.
          if (
            direction === -1 &&
            !isPhysicalPageReading &&
            spreadIndex === 0 &&
            !isBackClosed &&
            event.translationX > 24 &&
            onClose
          ) {
            turnDirection.value = 0;
            turnProgress.value = 0;
            isSettling.value = 0;
            runOnJS(onClose)();
            return;
          }

          // Close the back cover: forward swipe on the LAST spread. The
          // back cover swings from +175° (face-down on the right) to 0°
          // (covering the left page), closing the book from the back.
          // Same priority logic as the front cover close above.
          if (
            direction === 1 &&
            !isPhysicalPageReading &&
            spreadIndex === spreads.length - 1 &&
            !isBackClosed &&
            event.translationX < -24 &&
            onCloseBack
          ) {
            turnDirection.value = 0;
            turnProgress.value = 0;
            isSettling.value = 0;
            runOnJS(onCloseBack)();
            return;
          }

          // Reopen the back cover: backward swipe when the back cover is
          // closed. The back cover swings from 0° back to +175°, revealing
          // the last spread again.
          if (
            direction === -1 &&
            !isPhysicalPageReading &&
            isBackClosed &&
            event.translationX > 24 &&
            onOpenBack
          ) {
            turnDirection.value = 0;
            turnProgress.value = 0;
            isSettling.value = 0;
            runOnJS(onOpenBack)();
            return;
          }

          // If this was just a corner lift (touch without enough drag),
          // release quietly without haptic feedback.
          if (turnProgress.value <= CORNER_LIFT_PROGRESS + 0.02) {
            isSettling.value = 1;
            turnProgress.value = withSpring(
              0,
              { damping: 22, stiffness: 220, mass: 0.6 },
              () => {
                turnDirection.value = 0;
                isSettling.value = 0;
              },
            );
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

          turnProgress.value = withSpring(
            1,
            {
              damping: 24,
              stiffness: 175,
              mass: 0.78,
              overshootClamping: true,
              velocity: release.settleVelocity,
            },
            (finished) => {
              if (!finished) return;
              runOnJS(commitTurn)(direction);
            },
          );
        }),
    [
      canTurnNext,
      canTurnPrevious,
      commitTurn,
      grabYRatio,
      bookHeight,
      height,
      isBackClosed,
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
      spreadIndex,
      spreads.length,
      turnDirection,
      turnGrabX,
      turnProgress,
      turnSurfaceWidth,
      turnTargetX,
      width,
    ],
  );

  // Compose the cover swipe and page-turn gestures with Gesture.Exclusive.
  // Only one can activate at a time. When !isOpen, coverSwipeGesture is
  // enabled and turnGesture is disabled — so forward swipe opens the book.
  // When isOpen, the reverse — turnGesture handles page turns and the
  // close-by-swipe on spread 0. This avoids nested GestureDetectors, which
  // are unreliable per react-native-gesture-handler docs.
  const composedGesture = useMemo(
    () => Gesture.Exclusive(coverSwipeGesture, turnGesture),
    [coverSwipeGesture, turnGesture],
  );

  return (
    <View style={[styles.container, style]}>
      <GestureDetector gesture={composedGesture}>
        <Animated.View
          style={styles.gestureSurface}
          pointerEvents="auto"
        >
            {isPhysicalPageReading ? (
              <Animated.View
                entering={zoomEntering}
                exiting={zoomExiting}
                style={[
                  styles.physicalPageStage,
                  { width: Math.min(width, readingPageWidth + 42), height: readingPageHeight + 30 },
                ]}
              >
                {/* Page stacks: left grows as you read forward, right thins */}
                {(() => {
                  const total = leaves?.length ?? 1;
                  const ratio = total > 1 ? leafIndex / (total - 1) : 0;
                  const leftH = getStackHeight(ratio, readingPageHeight, 'left');
                  const rightH = getStackHeight(ratio, readingPageHeight, 'right');
                  const stageW = Math.min(width, readingPageWidth + 42);
                  const stageH = readingPageHeight + 30;
                  return (
                    <>
                      <View style={{ position: 'absolute', left: 2, top: (stageH - leftH) / 2, zIndex: 0 }}>
                        <PageStack height={leftH} side="left" />
                      </View>
                      <View style={{ position: 'absolute', left: stageW - STACK_WIDTH - 2, top: (stageH - rightH) / 2, zIndex: 0 }}>
                        <PageStack height={rightH} side="right" />
                      </View>
                    </>
                  );
                })()}
                <View pointerEvents="none" style={styles.physicalPageFallback}>
                  <View
                    style={[
                      styles.physicalFallbackCover,
                      { width: readingPageWidth + 10, height: readingPageHeight + 12 },
                    ]}
                  />
                  <View
                    style={[
                      styles.physicalFallbackEdges,
                      { width: readingPageWidth + 4, height: readingPageHeight + 6 },
                    ]}
                  />
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
                        onSelectRecipe={onNext}
                        onOpenRecipe={onOpenRecipe}
                      />
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
                        onSelectRecipe={onPrevious}
                        onOpenRecipe={onOpenRecipe}
                      />
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
                      onSelectRecipe={onNext}
                      onOpenRecipe={onOpenRecipe}
                    />
                  </Animated.View>
                  {SKIA_ENABLED ? (
                    <TurningLeafSkia
                      forwardImage={forwardImage}
                      backwardImage={backwardImage}
                      forwardBackImage={forwardBackImage}
                      backwardBackImage={backwardBackImage}
                      width={readingPageWidth}
                      height={readingPageHeight}
                      forwardOffsetX={(Math.min(width, readingPageWidth + 42) - readingPageWidth) / 2}
                      offsetY={15}
                      progress={turnProgress}
                      direction={turnDirection}
                      grabYRatio={grabYRatio}
                      onePageMode
                    />
                  ) : null}
                </View>
                {currentLeaf?.type === 'recipe' ? (
                  <Pressable
                    style={StyleSheet.absoluteFill}
                    onPress={() => {
                      const page = getLeafPage(currentLeaf, pages);
                      if (page) onOpenRecipe(page);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`Open ${getLeafPage(currentLeaf, pages)?.title ?? 'recipe'} in reading view`}
                  />
                ) : null}
              </Animated.View>
            ) : (
              <Animated.View
                entering={zoomEntering}
                exiting={zoomExiting}
                style={spreadVisibilityStyle}
              >
                <View
                  style={[
                    styles.spreadStage,
                    { width: leafWidth * 2 + 20, height: bookHeight + 24 },
                  ]}
                >
                  {/* Page stacks: left grows as you read forward, right thins */}
                  {(() => {
                    const ratio = spreads.length > 1 ? spreadIndex / (spreads.length - 1) : 0;
                    const leftH = getStackHeight(ratio, bookHeight, 'left');
                    const rightH = getStackHeight(ratio, bookHeight, 'right');
                    return (
                      <>
                        <View style={{ position: 'absolute', left: 0, top: (bookHeight + 24 - leftH) / 2, zIndex: 0 }}>
                          <PageStack height={leftH} side="left" />
                        </View>
                        <View style={{ position: 'absolute', left: leafWidth * 2 + 20 - STACK_WIDTH, top: (bookHeight + 24 - rightH) / 2, zIndex: 0 }}>
                          <PageStack height={rightH} side="right" />
                        </View>
                      </>
                    );
                  })()}
                  <OpenBookSpread
                    width={leafWidth * 2}
                    height={bookHeight}
                    left={
                      <CookbookLeafPage
                        leaf={activeSpread.left}
                        cookbook={cookbook}
                        pages={pages}
                        onSelectRecipe={onPrevious}
                        onOpenRecipe={(page) =>
                          readingView === 'spread'
                            ? onEnterReadingView(page)
                            : onOpenRecipe(page)
                        }
                      />
                    }
                    right={
                      <CookbookLeafPage
                        leaf={activeSpread.right}
                        cookbook={cookbook}
                        pages={pages}
                        onSelectRecipe={onNext}
                        onOpenRecipe={(page) =>
                          readingView === 'spread'
                            ? onEnterReadingView(page)
                            : onOpenRecipe(page)
                        }
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
                        { left: leafWidth + 10, top: 12, width: leafWidth, height: bookHeight },
                        spreadRightUnderneathStyle,
                      ]}
                    >
                      <CookbookLeafPage
                        leaf={nextSpread.right}
                        cookbook={cookbook}
                        pages={pages}
                        onSelectRecipe={onNext}
                        onOpenRecipe={onOpenRecipe}
                      />
                    </Animated.View>
                  ) : null}
                  {prevSpread ? (
                    <Animated.View
                      pointerEvents="none"
                      style={[
                        styles.underneathLeft,
                        { left: 10, top: 12, width: leafWidth, height: bookHeight },
                        spreadLeftUnderneathStyle,
                      ]}
                    >
                      <CookbookLeafPage
                        leaf={prevSpread.left}
                        cookbook={cookbook}
                        pages={pages}
                        onSelectRecipe={onPrevious}
                        onOpenRecipe={onOpenRecipe}
                      />
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
                      forwardOffsetX={leafWidth + 10}
                      backwardOffsetX={10}
                      offsetY={12}
                      progress={turnProgress}
                      direction={turnDirection}
                      grabYRatio={grabYRatio}
                    />
                  ) : null}
                </View>
              </Animated.View>
            )}
          </Animated.View>
        </GestureDetector>
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
              pageCount={pages.length}
              width={leafWidth}
              showShadow={false}
            />
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
    borderRadius: 18,
  },
  physicalPageFallback: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  physicalFallbackCover: {
    position: 'absolute',
    borderRadius: 12,
    backgroundColor: '#26311f',
    transform: [{ translateY: 3 }],
    boxShadow: '0 18px 38px rgba(35,33,28,0.2)',
  },
  physicalFallbackEdges: {
    position: 'absolute',
    borderRadius: 10,
    backgroundColor: '#ded8c8',
    transform: [{ translateY: 1 }],
  },
  physicalFallbackLeaf: {
    overflow: 'hidden',
    borderRadius: 9,
    backgroundColor: Colors.book.page,
    borderWidth: 1,
    borderColor: Colors.book.edgeStrong,
  },
  nativePageLayer: {
    position: 'absolute',
  },
  currentNativePage: {
    zIndex: 2,
    transformOrigin: 'left center',
    boxShadow: '-8px 10px 24px rgba(35,33,28,0.14)',
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
