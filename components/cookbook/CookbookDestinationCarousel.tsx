/* eslint-disable react-hooks/immutability -- Reanimated shared values are intentionally mutated through their .value API. */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  cancelAnimation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';
import { PhysicalBook } from '@/components/physical-book/PhysicalBook';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { Radii, Spacing, Typography } from '@/constants/spacing';
import type { Cookbook } from '@/types/cookbook';
import { Fonts } from '@/utils/fonts';

export const DESTINATION_CAROUSEL_ITEM_WIDTH = 108;
const BOOK_WIDTH = 72;
const EDGE_RESISTANCE = 0.18;
const MAX_FLING_PAGES_PER_SECOND = 4.5;
const SNAP_SPRING = { damping: 24, stiffness: 190, mass: 0.82 };

export function normalizeDestinationCarouselIndex(index: number, itemCount: number): number {
  'worklet';
  if (itemCount <= 0) return 0;
  return ((Math.round(index) % itemCount) + itemCount) % itemCount;
}

export function getDestinationCarouselRelativePosition(
  index: number,
  offset: number,
  itemCount: number,
): number {
  'worklet';
  if (itemCount <= 0) return 0;
  const relative = index - offset;
  return relative - Math.round(relative / itemCount) * itemCount;
}

export function applyDestinationCarouselResistance(rawOffset: number, startOffset: number): number {
  'worklet';
  const delta = rawOffset - startOffset;
  const distance = Math.abs(delta);
  if (distance <= 1) return rawOffset;
  const resistedDistance = 1 + Math.min(0.42, (distance - 1) * EDGE_RESISTANCE);
  return startOffset + Math.sign(delta) * resistedDistance;
}

export function resolveDestinationCarouselSnap(
  offset: number,
  velocityX: number,
  startOffset: number,
): number {
  'worklet';
  const velocityInPages = Math.max(
    -MAX_FLING_PAGES_PER_SECOND,
    Math.min(MAX_FLING_PAGES_PER_SECOND, -velocityX / DESTINATION_CAROUSEL_ITEM_WIDTH),
  );
  const projected = offset + velocityInPages * 0.1;
  const startIndex = Math.round(startOffset);
  const target = Math.round(projected);
  return Math.max(startIndex - 1, Math.min(startIndex + 1, target));
}

interface CookbookDestinationCarouselProps {
  cookbooks: Cookbook[];
  selectedCookbookId?: string;
  onSelect: (cookbookId: string) => void;
}

export function CookbookDestinationCarousel({
  cookbooks,
  selectedCookbookId,
  onSelect,
}: CookbookDestinationCarouselProps) {
  const reduceMotion = useReducedMotion();
  const [viewportWidth, setViewportWidth] = useState(0);
  const selectedIndex = Math.max(
    0,
    cookbooks.findIndex((cookbook) => cookbook.id === selectedCookbookId),
  );
  const [previewIndex, setPreviewIndex] = useState(selectedIndex);
  const logicalIndexRef = useRef(selectedIndex);
  const carouselOffset = useSharedValue(selectedIndex);
  const startOffset = useSharedValue(selectedIndex);
  const lastDetent = useSharedValue(selectedIndex);
  const selectedCookbook = cookbooks[previewIndex] ?? cookbooks[selectedIndex] ?? cookbooks[0];

  const previewDetent = useCallback((logicalIndex: number) => {
    setPreviewIndex(normalizeDestinationCarouselIndex(logicalIndex, cookbooks.length));
    void Haptics.selectionAsync().catch(() => undefined);
  }, [cookbooks.length]);

  const commitSelection = useCallback((logicalIndex: number) => {
    const index = normalizeDestinationCarouselIndex(logicalIndex, cookbooks.length);
    const cookbook = cookbooks[index];
    if (!cookbook) return;
    logicalIndexRef.current = logicalIndex;
    setPreviewIndex(index);
    if (cookbook.id !== selectedCookbookId) onSelect(cookbook.id);
  }, [cookbooks, onSelect, selectedCookbookId]);

  const selectByTap = useCallback((index: number) => {
    const cookbook = cookbooks[index];
    if (!cookbook) return;
    const logicalTarget = index + Math.round(
      (logicalIndexRef.current - index) / cookbooks.length,
    ) * cookbooks.length;
    cancelAnimation(carouselOffset);
    logicalIndexRef.current = logicalTarget;
    lastDetent.value = logicalTarget;
    carouselOffset.value = reduceMotion
      ? logicalTarget
      : withSpring(logicalTarget, SNAP_SPRING);
    setPreviewIndex(index);
    if (cookbook.id !== selectedCookbookId) {
      onSelect(cookbook.id);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    }
  }, [carouselOffset, cookbooks, lastDetent, onSelect, reduceMotion, selectedCookbookId]);

  useEffect(() => {
    const logicalTarget = selectedIndex + Math.round(
      (logicalIndexRef.current - selectedIndex) / Math.max(1, cookbooks.length),
    ) * Math.max(1, cookbooks.length);
    logicalIndexRef.current = logicalTarget;
    setPreviewIndex(selectedIndex);
    lastDetent.value = logicalTarget;
    carouselOffset.value = reduceMotion
      ? logicalTarget
      : withSpring(logicalTarget, SNAP_SPRING);
  }, [carouselOffset, cookbooks.length, lastDetent, reduceMotion, selectedIndex]);

  const pan = useMemo(() => Gesture.Pan()
    .enabled(cookbooks.length > 1)
    .maxPointers(1)
    .activeOffsetX([-18, 18])
    .failOffsetY([-14, 14])
    .onBegin(() => {
      cancelAnimation(carouselOffset);
      startOffset.value = carouselOffset.value;
    })
    .onUpdate((event) => {
      const rawOffset = startOffset.value - event.translationX / DESTINATION_CAROUSEL_ITEM_WIDTH;
      carouselOffset.value = applyDestinationCarouselResistance(rawOffset, startOffset.value);
      const detent = Math.round(carouselOffset.value);
      if (detent !== lastDetent.value) {
        lastDetent.value = detent;
        runOnJS(previewDetent)(detent);
      }
    })
    .onEnd((event) => {
      const target = resolveDestinationCarouselSnap(
        carouselOffset.value,
        event.velocityX,
        startOffset.value,
      );
      lastDetent.value = target;
      const velocity = Math.max(
        -MAX_FLING_PAGES_PER_SECOND,
        Math.min(MAX_FLING_PAGES_PER_SECOND, -event.velocityX / DESTINATION_CAROUSEL_ITEM_WIDTH),
      );
      carouselOffset.value = reduceMotion
        ? target
        : withSpring(target, { ...SNAP_SPRING, velocity });
      runOnJS(commitSelection)(target);
    })
    .onFinalize((_event, succeeded) => {
      if (succeeded) return;
      const target = Math.round(carouselOffset.value);
      lastDetent.value = target;
      carouselOffset.value = reduceMotion ? target : withSpring(target, SNAP_SPRING);
    }), [
    carouselOffset,
    commitSelection,
    cookbooks.length,
    lastDetent,
    previewDetent,
    reduceMotion,
    startOffset,
  ]);

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    setViewportWidth(event.nativeEvent.layout.width);
  }, []);

  if (!selectedCookbook) return null;

  return (
    <View
      style={styles.container}
      onLayout={handleLayout}
      testID="cookbook-destination-carousel"
    >
      {cookbooks.length === 1 ? (
        <View
          accessible
          accessibilityLabel={`${selectedCookbook.title}, destination cookbook`}
          style={styles.singleBook}
        >
          <DestinationBook cookbook={selectedCookbook} />
        </View>
      ) : (
        <GestureDetector gesture={pan}>
          <View
            style={styles.carouselStage}
            accessibilityLabel={`Destination cookbooks. ${selectedCookbook.title} selected.`}
            testID="destination-cookbook-gesture-stage"
          >
            {viewportWidth > 0 ? cookbooks.map((cookbook, index) => (
              <DestinationBookSlide
                key={cookbook.id}
                cookbook={cookbook}
                index={index}
                viewportWidth={viewportWidth}
                carouselOffset={carouselOffset}
                itemCount={cookbooks.length}
                reduceMotion={reduceMotion}
                selected={index === previewIndex}
                onPress={() => selectByTap(index)}
              />
            )) : null}
          </View>
        </GestureDetector>
      )}

      <Text
        key={selectedCookbook.id}
        style={styles.selectedTitle}
        numberOfLines={1}
        maxFontSizeMultiplier={1.2}
        accessibilityLiveRegion="polite"
      >
        {selectedCookbook.title}
      </Text>
    </View>
  );
}

function DestinationBook({ cookbook }: { cookbook: Cookbook }) {
  return (
    <PhysicalBook
      title={cookbook.title}
      coverStyle={cookbook.coverStyle}
      coverFinishId={cookbook.coverFinishId}
      coverColorId={cookbook.coverColorId}
      coverTitleColorId={cookbook.coverTitleColorId}
      coverTitlePlacementId={cookbook.coverTitlePlacementId}
      pageCount={cookbook.pageCount}
      imageAsset={cookbook.coverImageAsset}
      width={BOOK_WIDTH}
    />
  );
}

function DestinationBookSlide({
  cookbook,
  index,
  viewportWidth,
  carouselOffset,
  itemCount,
  reduceMotion,
  selected,
  onPress,
}: {
  cookbook: Cookbook;
  index: number;
  viewportWidth: number;
  carouselOffset: SharedValue<number>;
  itemCount: number;
  reduceMotion: boolean;
  selected: boolean;
  onPress: () => void;
}) {
  const animatedStyle = useAnimatedStyle(() => {
    const relative = getDestinationCarouselRelativePosition(
      index,
      carouselOffset.value,
      itemCount,
    );
    const distance = Math.abs(relative);
    const restrainedRelative = Math.max(-3, Math.min(3, relative));

    return {
      opacity: interpolate(distance, [0, 1, 2.2], [1, 0.44, 0], Extrapolation.CLAMP),
      zIndex: 100 - Math.round(distance * 10),
      transform: [
        { perspective: 700 },
        { translateX: relative * DESTINATION_CAROUSEL_ITEM_WIDTH },
        {
          translateY: reduceMotion
            ? 0
            : interpolate(distance, [0, 1], [0, 11], Extrapolation.CLAMP),
        },
        {
          scale: reduceMotion
            ? 1
            : interpolate(distance, [0, 1], [1, 0.72], Extrapolation.CLAMP),
        },
        { rotateZ: reduceMotion ? '0deg' : `${restrainedRelative * -6}deg` },
      ],
    };
  }, [index, itemCount, reduceMotion]);

  return (
    <Animated.View
      style={[
        styles.slide,
        { left: viewportWidth / 2 - DESTINATION_CAROUSEL_ITEM_WIDTH / 2 },
        animatedStyle,
      ]}
    >
      <Pressable
        style={({ pressed }) => [styles.slideButton, pressed && styles.slidePressed]}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`Add recipes to ${cookbook.title}`}
        accessibilityState={{ selected }}
      >
        <DestinationBook cookbook={cookbook} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    minHeight: 132,
    overflow: 'hidden',
    borderRadius: Radii.xl,
    backgroundColor: Colors.alpha.white[20],
    paddingTop: Spacing.xs,
  },
  singleBook: {
    height: 102,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  carouselStage: {
    position: 'relative',
    height: 102,
    overflow: 'hidden',
  },
  slide: {
    position: 'absolute',
    top: 0,
    width: DESTINATION_CAROUSEL_ITEM_WIDTH,
    height: 102,
    alignItems: 'center',
  },
  slideButton: {
    width: DESTINATION_CAROUSEL_ITEM_WIDTH,
    height: 102,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  slidePressed: {
    opacity: 0.78,
    transform: [{ scale: 0.97 }],
  },
  selectedTitle: {
    minHeight: 24,
    color: Colors.text,
    fontFamily: Fonts.display.semibold,
    fontSize: Typography.sizes.md,
    lineHeight: Typography.metrics.lineHeight20,
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
  },
});
