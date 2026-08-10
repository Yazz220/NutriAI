import React, { useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { BookCover } from '@/components/cookbook/BookCover';
import { CookbookLeafPage } from '@/components/cookbook/CookbookLeafPage';
import { OpenBookSpread } from '@/components/cookbook/OpenBookSpread';
import { Colors } from '@/constants/colors';
import type { Cookbook3DSceneProps } from '@/components/cookbook/Cookbook3DScene.types';
import { TOUCH_PAGING_BREAKPOINT, type CookbookLeaf } from '@/utils/cookbook/reader';

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
  const previousSpread = spreads[spreadIndex - 1];
  const nextSpread = spreads[spreadIndex + 1];
  const requestedPageIndex = pages.findIndex((page) => page.id === readingPageId);
  const fallbackLeaf =
    activeSpread?.right.type === 'recipe'
      ? activeSpread.right
      : activeSpread?.left.type === 'recipe'
        ? activeSpread.left
        : null;
  const readingPageIndex = requestedPageIndex >= 0 ? requestedPageIndex : (fallbackLeaf?.pageIndex ?? -1);
  const readingLeaf: CookbookLeaf | null =
    readingPageIndex >= 0
      ? { type: 'recipe', id: pages[readingPageIndex].id, pageIndex: readingPageIndex }
      : null;
  const previousReadingLeaf: CookbookLeaf | null =
    readingPageIndex > 0
      ? {
          type: 'recipe',
          id: pages[readingPageIndex - 1].id,
          pageIndex: readingPageIndex - 1,
        }
      : null;
  const nextReadingLeaf: CookbookLeaf | null =
    readingPageIndex >= 0 && readingPageIndex < pages.length - 1
      ? {
          type: 'recipe',
          id: pages[readingPageIndex + 1].id,
          pageIndex: readingPageIndex + 1,
        }
      : null;
  const isSinglePageReading = isCompactPhone && readingView === 'topdown' && Boolean(readingLeaf);
  const canGoPrevious = isSinglePageReading ? readingPageIndex > 0 : spreadIndex > 0;
  const canGoNext = isSinglePageReading ? readingPageIndex < pages.length - 1 : spreadIndex < spreads.length - 1;
  const readingPageHeight = Math.min((width - 24) * 1.5, height - 190);
  const readingPageWidth = readingPageHeight / 1.5;
  const dragX = useSharedValue(0);

  const commitTurn = useCallback(
    (direction: -1 | 1) => {
      if (direction === 1) onNext();
      else onPrevious();
    },
    [onNext, onPrevious],
  );

  const turnGesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(isOpen && isCompactPhone)
        .activeOffsetX([-12, 12])
        .failOffsetY([-28, 28])
        .cancelsTouchesInView(false)
        .onUpdate((event) => {
          const limit = width * 0.3;
          dragX.value = Math.max(-limit, Math.min(limit, event.translationX));
        })
        .onEnd((event) => {
          const direction: -1 | 1 = event.translationX < 0 ? 1 : -1;
          const canTurn = direction === 1 ? canGoNext : canGoPrevious;
          const shouldTurn =
            Math.abs(event.translationX) > width * 0.16 || Math.abs(event.velocityX) > 640;

          if (!canTurn || !shouldTurn) {
            dragX.value = withTiming(0, {
              duration: 220,
              easing: Easing.out(Easing.cubic),
            });
            return;
          }

          dragX.value = withTiming(
            direction === 1 ? -width * 0.26 : width * 0.26,
            { duration: 170, easing: Easing.in(Easing.cubic) },
            (finished) => {
              if (!finished) return;
              runOnJS(commitTurn)(direction);
              dragX.value = direction === 1 ? width * 0.07 : -width * 0.07;
              dragX.value = withTiming(0, {
                duration: 230,
                easing: Easing.out(Easing.cubic),
              });
            },
          );
        }),
    [canGoNext, canGoPrevious, commitTurn, dragX, isCompactPhone, isOpen, width],
  );

  const singlePageGestureStyle = useAnimatedStyle(() => {
    const progress = dragX.value / Math.max(width, 1);
    return {
      opacity: 1 - Math.min(Math.abs(progress) * 0.5, 0.14),
      transform: [
        { perspective: 900 },
        { translateX: dragX.value },
        { rotateY: `${progress * -7}deg` },
        { scale: 1 - Math.min(Math.abs(progress) * 0.08, 0.025) },
      ],
    };
  });

  const nextRevealStyle = useAnimatedStyle(() => ({
    opacity: dragX.value < 0 ? 1 : 0,
  }));

  const previousRevealStyle = useAnimatedStyle(() => ({
    opacity: dragX.value > 0 ? 1 : 0,
  }));

  const nextTurningLeafStyle = useAnimatedStyle(() => {
    const progress = Math.max(0, Math.min(1, -dragX.value / Math.max(width * 0.26, 1)));
    return {
      opacity: dragX.value < 0 ? 1 : 0,
      transform: [{ perspective: 900 }, { rotateY: `${-progress * 88}deg` }],
    };
  });

  const previousTurningLeafStyle = useAnimatedStyle(() => {
    const progress = Math.max(0, Math.min(1, dragX.value / Math.max(width * 0.26, 1)));
    return {
      opacity: dragX.value > 0 ? 1 : 0,
      transform: [{ perspective: 900 }, { rotateY: `${progress * 88}deg` }],
    };
  });

  return (
    <View style={[styles.container, style]}>
      {isOpen ? (
        <GestureDetector gesture={turnGesture}>
          <View style={styles.gestureSurface}>
            {isSinglePageReading && readingLeaf ? (
              <View
                style={[
                  styles.singlePageStage,
                  { width: readingPageWidth, height: readingPageHeight },
                ]}
              >
                {previousReadingLeaf ? (
                  <Animated.View
                    pointerEvents="none"
                    style={[styles.singlePage, styles.pageUnderlay, previousRevealStyle]}
                  >
                    <CookbookLeafPage
                      leaf={previousReadingLeaf}
                      cookbook={cookbook}
                      pages={pages}
                      onSelectRecipe={onPrevious}
                      onOpenRecipe={onOpenRecipe}
                    />
                  </Animated.View>
                ) : null}
                {nextReadingLeaf ? (
                  <Animated.View
                    pointerEvents="none"
                    style={[styles.singlePage, styles.pageUnderlay, nextRevealStyle]}
                  >
                    <CookbookLeafPage
                      leaf={nextReadingLeaf}
                      cookbook={cookbook}
                      pages={pages}
                      onSelectRecipe={onNext}
                      onOpenRecipe={onOpenRecipe}
                    />
                  </Animated.View>
                ) : null}
                <Animated.View
                  key="single-page-reading"
                  entering={FadeIn.duration(260)}
                  exiting={FadeOut.duration(160)}
                  style={[styles.singlePage, singlePageGestureStyle]}
                >
                  <CookbookLeafPage
                    leaf={readingLeaf}
                    cookbook={cookbook}
                    pages={pages}
                    onSelectRecipe={onNext}
                    onOpenRecipe={onOpenRecipe}
                  />
                </Animated.View>
              </View>
            ) : (
              <Animated.View
                key={`open-spread-${readingView}`}
                entering={FadeIn.duration(260)}
                exiting={FadeOut.duration(160)}
                style={
                  readingView === 'tilted' ? styles.browsePerspective : styles.readPerspective
                }
              >
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

                  {previousSpread ? (
                    <Animated.View
                      pointerEvents="none"
                      style={[
                        styles.spreadLeaf,
                        styles.leftSpreadLeaf,
                        { top: 12, left: 10, width: leafWidth, height: bookHeight },
                        previousRevealStyle,
                      ]}
                    >
                      <CookbookLeafPage
                        leaf={previousSpread.left}
                        cookbook={cookbook}
                        pages={pages}
                        onSelectRecipe={onPrevious}
                        onOpenRecipe={onOpenRecipe}
                      />
                    </Animated.View>
                  ) : null}
                  {nextSpread ? (
                    <Animated.View
                      pointerEvents="none"
                      style={[
                        styles.spreadLeaf,
                        styles.rightSpreadLeaf,
                        { top: 12, left: leafWidth + 10, width: leafWidth, height: bookHeight },
                        nextRevealStyle,
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

                  <Animated.View
                    pointerEvents="none"
                    style={[
                      styles.spreadLeaf,
                      styles.rightSpreadLeaf,
                      styles.nextTurningLeaf,
                      { top: 12, left: leafWidth + 10, width: leafWidth, height: bookHeight },
                      nextTurningLeafStyle,
                    ]}
                  >
                    <CookbookLeafPage
                      leaf={activeSpread.right}
                      cookbook={cookbook}
                      pages={pages}
                      onSelectRecipe={onNext}
                      onOpenRecipe={onOpenRecipe}
                    />
                  </Animated.View>
                  <Animated.View
                    pointerEvents="none"
                    style={[
                      styles.spreadLeaf,
                      styles.leftSpreadLeaf,
                      styles.previousTurningLeaf,
                      { top: 12, left: 10, width: leafWidth, height: bookHeight },
                      previousTurningLeafStyle,
                    ]}
                  >
                    <CookbookLeafPage
                      leaf={activeSpread.left}
                      cookbook={cookbook}
                      pages={pages}
                      onSelectRecipe={onPrevious}
                      onOpenRecipe={onOpenRecipe}
                    />
                  </Animated.View>
                </View>
              </Animated.View>
            )}
          </View>
        </GestureDetector>
      ) : (
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
      )}
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  browsePerspective: {
    transform: [{ perspective: 900 }, { rotateX: '18deg' }, { scale: 0.96 }, { translateY: -8 }],
  },
  readPerspective: {
    transform: [{ scale: 1.02 }],
  },
  singlePageStage: {
    position: 'relative',
  },
  singlePage: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    borderRadius: 10,
    backgroundColor: Colors.book.page,
    borderWidth: 1,
    borderColor: Colors.book.edgeStrong,
    boxShadow: '0 18px 42px rgba(35,33,28,0.2)',
    zIndex: 2,
  },
  pageUnderlay: {
    zIndex: 1,
    boxShadow: 'none',
  },
  spreadStage: {
    position: 'relative',
  },
  spreadLeaf: {
    position: 'absolute',
    overflow: 'hidden',
    backgroundColor: Colors.book.page,
    zIndex: 2,
    backfaceVisibility: 'hidden',
  },
  leftSpreadLeaf: {
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  rightSpreadLeaf: {
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
  },
  nextTurningLeaf: {
    transformOrigin: 'left center',
    boxShadow: '-8px 4px 16px rgba(35,33,28,0.14)',
    zIndex: 3,
  },
  previousTurningLeaf: {
    transformOrigin: 'right center',
    boxShadow: '8px 4px 16px rgba(35,33,28,0.14)',
    zIndex: 3,
  },
});
