import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  Easing,
  FadeIn,
  FadeOut,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useImage } from '@shopify/react-native-skia';
import { BookCover } from '@/components/cookbook/BookCover';
import { CookbookLeafPage } from '@/components/cookbook/CookbookLeafPage';
import { OpenBookSpread } from '@/components/cookbook/OpenBookSpread';
import { TurningLeafSkia } from '@/components/cookbook/TurningLeafSkia';
import { Colors } from '@/constants/colors';
import type { Cookbook3DSceneProps } from '@/components/cookbook/Cookbook3DScene.types';
import { getCookbookPageImageSource } from '@/utils/cookbook/pageImage';
import {
  resolveTurnProgress,
  resolveTurnRelease,
  type PageTurnDirection,
} from '@/utils/cookbook/physicalBook';
import { TOUCH_PAGING_BREAKPOINT } from '@/utils/cookbook/reader';

// Skia Canvas renders the curling page leaf. Requires a dev client build
// with the matching native Skia binary (2.3.0+ on Expo SDK 54).
const SKIA_ENABLED = true;

export function Cookbook3DScene({
  cookbook,
  pages,
  spreads,
  spreadIndex,
  isOpen,
  readingView = 'tilted',
  readingPageId,
  onOpen,
  onNext,
  onPrevious,
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
  const isPhysicalPageReading = isCompactPhone && readingView === 'topdown' && readingPageIndex >= 0;
  const canGoPrevious = readingPageIndex > 0;
  const canGoNext = readingPageIndex < pages.length - 1;
  const readingPageHeight = Math.min((width - 24) * 1.5, height - 190);
  const readingPageWidth = readingPageHeight / 1.5;
  // In browse mode a swipe turns whole spreads; in physical reading it turns
  // single pages. Boundaries and travel are measured against the active mode.
  const canTurnNext = isPhysicalPageReading ? canGoNext : spreadIndex < spreads.length - 1;
  const canTurnPrevious = isPhysicalPageReading ? canGoPrevious : spreadIndex > 0;
  const turnSurfaceWidth = isPhysicalPageReading ? readingPageWidth : leafWidth * 2;
  const turnProgress = useSharedValue(0);
  const turnDirection = useSharedValue<PageTurnDirection>(0);
  const isSettling = useSharedValue(0);
  const turnGrabX = useSharedValue(0);

  // Book open/close: the cover stays mounted while it pivots open around the
  // spine, and the stage stays mounted while it settles closed, so neither
  // ever hard-cuts. Deep-linked opens start with the animation complete.
  const opening = useSharedValue(isOpen ? 1 : 0);
  const [coverMounted, setCoverMounted] = useState(!isOpen);
  const [stageMounted, setStageMounted] = useState(isOpen);

  useEffect(() => {
    if (isOpen) {
      setStageMounted(true);
      setCoverMounted(true);
      opening.value = withTiming(
        1,
        { duration: 980, easing: Easing.bezier(0.22, 0.72, 0.24, 1) },
        (finished) => {
          if (finished) runOnJS(setCoverMounted)(false);
        },
      );
    } else {
      setCoverMounted(true);
      opening.value = withTiming(
        0,
        { duration: 620, easing: Easing.bezier(0.5, 0, 0.75, 0.2) },
        (finished) => {
          if (finished) runOnJS(setStageMounted)(false);
        },
      );
    }
  }, [isOpen, opening]);

  const coverOpenStyle = useAnimatedStyle(() => ({
    opacity: interpolate(opening.value, [0, 0.62, 1], [1, 1, 0]),
    transform: [
      { perspective: 1200 },
      { rotateY: `${interpolate(opening.value, [0, 1], [0, -102])}deg` },
      { translateX: interpolate(opening.value, [0, 1], [0, -10]) },
    ],
  }));

  const stageRevealStyle = useAnimatedStyle(() => ({
    opacity: interpolate(opening.value, [0, 0.3, 1], [0, 0.35, 1]),
    transform: [
      { scale: interpolate(opening.value, [0, 1], [0.93, 1]) },
      { translateY: interpolate(opening.value, [0, 1], [12, 0]) },
    ],
  }));

  // Browse↔read is a continuous camera-like morph, not a remount crossfade.
  const readingMode = useSharedValue(readingView === 'topdown' ? 1 : 0);
  useEffect(() => {
    readingMode.value = withTiming(readingView === 'topdown' ? 1 : 0, {
      duration: 420,
      easing: Easing.bezier(0.3, 0.7, 0.3, 1),
    });
  }, [readingView, readingMode]);

  const spreadModeStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 900 },
      { rotateX: `${interpolate(readingMode.value, [0, 1], [18, 0])}deg` },
      { scale: interpolate(readingMode.value, [0, 1], [0.96, 1.02]) },
      { translateY: interpolate(readingMode.value, [0, 1], [-8, 0]) },
    ],
  }));

  // In browse mode the same pan gesture sweeps the spread sideways with a
  // slight lift, then the shared release physics decides commit or spring-back.
  const spreadSwipeStyle = useAnimatedStyle(() => {
    const progress = turnProgress.value;
    const direction = turnDirection.value;
    if (direction === 0 || progress === 0) {
      return { opacity: 1, transform: [{ translateX: 0 }] };
    }
    return {
      opacity: 1 - progress * 0.5,
      transform: [
        { perspective: 900 },
        { translateX: -progress * 90 * direction },
        { rotateY: `${-progress * 12 * direction}deg` },
      ],
    };
  });

  const currentRecipePage = readingPageIndex >= 0 ? pages[readingPageIndex] : undefined;
  const previousRecipePage = readingPageIndex > 0 ? pages[readingPageIndex - 1] : undefined;
  const forwardLeafImage = useImage(SKIA_ENABLED ? getCookbookPageImageSource(currentRecipePage) : null);
  const backwardLeafImage = useImage(SKIA_ENABLED ? getCookbookPageImageSource(previousRecipePage) : null);

  // While a turn runs, the Skia leaf draws the turning page (curl, back face,
  // fold shadow); the flat RN leaves underneath only gate their visibility so
  // the turning page never double-renders. On native (without Skia), the flat
  // leaves provide a simple rotate-and-fade page turn instead.
  const currentPageTurnStyle = useAnimatedStyle(() => {
    const dir = turnDirection.value;
    const progress = turnProgress.value;
    if (dir === 0 || progress === 0) return { opacity: 1, transform: [{ rotateY: '0deg' }] };
    if (SKIA_ENABLED) return { opacity: dir === 1 ? 0 : 1, transform: [{ rotateY: '0deg' }] };
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
  useLayoutEffect(() => {
    turnProgress.value = 0;
    turnDirection.value = 0;
    isSettling.value = 0;
  }, [isSettling, readingPageIndex, spreadIndex, turnDirection, turnProgress]);

  // Drag-to-turn: progress is driven by the pointer's position, not by
  // accumulated drag distance, so the leaf tracks the finger 1:1 and follows
  // it back when the drag reverses. A turn in flight can be re-grabbed — a
  // new gesture cancels the running spring and takes over from the current
  // progress instead of waiting for the settle to finish.
  const turnGesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(isOpen)
        .activeOffsetX([-8, 8])
        .failOffsetY([-80, 80])
        .cancelsTouchesInView(true)
        .onBegin((event) => {
          cancelAnimation(turnProgress);
          isSettling.value = 0;
          turnDirection.value = 0;
          turnGrabX.value = event.x;
        })
        .onUpdate((event) => {
          if (turnDirection.value === 0 && Math.abs(event.translationX) >= 4) {
            turnDirection.value = event.translationX < 0 ? 1 : -1;
            runOnJS(notifyTurnGrabbed)();
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
          });
        })
        .onEnd((event) => {
          const direction = turnDirection.value;
          if (direction === 0) return;
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
            turnProgress.value = withSpring(
              0,
              { damping: 22, stiffness: 190, mass: 0.72, velocity: release.settleVelocity },
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
      isOpen,
      isSettling,
      notifyTurnCancelled,
      notifyTurnGrabbed,
      turnDirection,
      turnGrabX,
      turnProgress,
      turnSurfaceWidth,
    ],
  );

  return (
    <View style={[styles.container, style]}>
      {stageMounted ? (
        <GestureDetector gesture={turnGesture}>
          <Animated.View
            style={[styles.gestureSurface, stageRevealStyle]}
            pointerEvents={isOpen ? 'auto' : 'none'}
          >
            {isPhysicalPageReading ? (
              <Animated.View
                entering={FadeIn.duration(220)}
                exiting={FadeOut.duration(180)}
                style={[
                  styles.physicalPageStage,
                  { width: Math.min(width, readingPageWidth + 42), height: readingPageHeight + 30 },
                ]}
              >
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
                  {canGoNext ? (
                    <Animated.View
                      style={[
                        styles.physicalFallbackLeaf,
                        styles.nativePageLayer,
                        { width: readingPageWidth, height: readingPageHeight },
                        nextPageRevealStyle,
                      ]}
                    >
                      <CookbookLeafPage
                        leaf={{
                          type: 'recipe',
                          id: pages[readingPageIndex + 1].id,
                          pageIndex: readingPageIndex + 1,
                        }}
                        cookbook={cookbook}
                        pages={pages}
                        onSelectRecipe={onNext}
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
                      leaf={{
                        type: 'recipe',
                        id: pages[readingPageIndex].id,
                        pageIndex: readingPageIndex,
                      }}
                      cookbook={cookbook}
                      pages={pages}
                      onSelectRecipe={onNext}
                      onOpenRecipe={onOpenRecipe}
                    />
                  </Animated.View>
                  {SKIA_ENABLED ? (
                    <TurningLeafSkia
                      forwardImage={forwardLeafImage}
                      backwardImage={backwardLeafImage}
                      width={readingPageWidth}
                      height={readingPageHeight}
                      offsetX={(Math.min(width, readingPageWidth + 42) - readingPageWidth) / 2}
                      offsetY={15}
                      progress={turnProgress}
                      direction={turnDirection}
                    />
                  ) : null}
                </View>
                <Pressable
                  style={StyleSheet.absoluteFill}
                  onPress={() => onOpenRecipe(pages[readingPageIndex])}
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${pages[readingPageIndex]?.title ?? 'recipe'} in reading view`}
                />
              </Animated.View>
            ) : (
              <Animated.View
                entering={FadeIn.duration(220)}
                exiting={FadeOut.duration(180)}
                style={spreadModeStyle}
              >
                <Animated.View style={spreadSwipeStyle}>
                  <View
                    style={[
                      styles.spreadStage,
                      { width: leafWidth * 2 + 20, height: bookHeight + 24 },
                    ]}
                  >
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
                          readingView === 'tilted'
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
                          readingView === 'tilted'
                            ? onEnterReadingView(page)
                            : onOpenRecipe(page)
                        }
                      />
                    }
                  />
                  </View>
                </Animated.View>
              </Animated.View>
            )}
          </Animated.View>
        </GestureDetector>
      ) : null}
      {coverMounted ? (
        <View style={styles.coverLayer} pointerEvents={isOpen ? 'none' : 'auto'}>
          <Animated.View style={[styles.coverPivot, coverOpenStyle]}>
            <Pressable onPress={onOpen} accessibilityLabel={`Open ${cookbook?.title ?? 'cookbook'}`}>
              <BookCover
                title={cookbook?.title ?? 'My Cookbook'}
                coverStyle={cookbook?.coverStyle ?? 'handwritten'}
                pageCount={pages.length}
                imageAsset={cookbook?.coverImageAsset}
                width={leafWidth}
                showPageCount={false}
              />
            </Pressable>
          </Animated.View>
        </View>
      ) : null}
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
  },
  coverPivot: {
    transformOrigin: 'left center',
  },
  physicalPageStage: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 18,
  },
  physicalPageFallback: {
    ...StyleSheet.absoluteFillObject,
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
});
