import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { Text } from '@/components/ui/Text';
import type {
  CookbookPageStyleOption,
  CreationPageStyleId,
} from '@/constants/cookbookCustomization';
import { Colors } from '@/constants/colors';
import { Radii, Shadows, Spacing, Typography } from '@/constants/spacing';
import { Fonts } from '@/utils/fonts';

const MAX_VIEWPORT_WIDTH = 640;
const MAX_ITEM_EXTENT = 300;
const PAGE_HORIZONTAL_INSET = 18;
const PAGE_ASPECT_RATIO = 4 / 5;

interface PageStyleCarouselProps {
  value: CreationPageStyleId;
  options: CookbookPageStyleOption[];
  disabled: boolean;
  onChange: (value: CreationPageStyleId) => void;
}

export function PageStyleCarousel({
  value,
  options,
  disabled,
  onChange,
}: PageStyleCarouselProps) {
  const { width: windowWidth } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const scrollRef = useRef<React.ElementRef<typeof Animated.ScrollView>>(null);
  const selectedIndex = Math.max(0, options.findIndex((option) => option.id === value));
  const committedIndexRef = useRef(selectedIndex);
  const [previewIndex, setPreviewIndex] = useState(selectedIndex);
  const [measuredWidth, setMeasuredWidth] = useState(0);
  const estimatedWidth = Math.max(240, windowWidth - Spacing.xl * 2);
  const viewportWidth = Math.min(MAX_VIEWPORT_WIDTH, measuredWidth || estimatedWidth);
  const itemExtent = Math.min(MAX_ITEM_EXTENT, viewportWidth * 0.76);
  const pageWidth = itemExtent - PAGE_HORIZONTAL_INSET * 2;
  const pageHeight = pageWidth / PAGE_ASPECT_RATIO;
  const stageHeight = pageHeight + Spacing.lg;
  const scrollX = useSharedValue(selectedIndex * itemExtent);
  const previewOption = options[previewIndex] ?? options[selectedIndex] ?? options[0];

  const commitIndex = useCallback((rawIndex: number) => {
    const index = Math.max(0, Math.min(options.length - 1, rawIndex));
    const option = options[index];
    if (!option) return;
    if (committedIndexRef.current === index) return;
    committedIndexRef.current = index;
    setPreviewIndex(index);
    onChange(option.id);
  }, [onChange, options]);

  const handleScrollEnd = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    commitIndex(Math.round(event.nativeEvent.contentOffset.x / itemExtent));
  }, [commitIndex, itemExtent]);

  const selectByTap = useCallback((index: number) => {
    scrollRef.current?.scrollTo({
      x: index * itemExtent,
      y: 0,
      animated: !reduceMotion,
    });
    commitIndex(index);
  }, [commitIndex, itemExtent, reduceMotion]);

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    const nextWidth = Math.min(MAX_VIEWPORT_WIDTH, event.nativeEvent.layout.width);
    if (nextWidth > 0 && Math.abs(nextWidth - measuredWidth) > 1) setMeasuredWidth(nextWidth);
  }, [measuredWidth]);

  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({
      x: selectedIndex * itemExtent,
      y: 0,
      animated: false,
    });
  }, [itemExtent, selectedIndex]);

  if (!previewOption) return null;

  return (
    <View
      style={styles.container}
      onLayout={handleLayout}
      testID="page-style-carousel"
    >
      <Animated.ScrollView
        ref={scrollRef}
        horizontal
        directionalLockEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={!disabled && options.length > 1}
        scrollEventThrottle={16}
        onScroll={onScroll}
        onMomentumScrollEnd={handleScrollEnd}
        onScrollEndDrag={handleScrollEnd}
        snapToInterval={itemExtent}
        snapToAlignment="start"
        decelerationRate="fast"
        disableIntervalMomentum
        bounces={false}
        contentContainerStyle={{
          paddingHorizontal: Math.max(0, (viewportWidth - itemExtent) / 2),
        }}
        style={[styles.rail, { height: stageHeight }]}
        testID="page-style-rail"
      >
        {options.map((item, index) => (
          <PageStyleSlide
            key={item.id}
            option={item}
            index={index}
            itemExtent={itemExtent}
            pageWidth={pageWidth}
            pageHeight={pageHeight}
            scrollX={scrollX}
            selected={index === previewIndex}
            disabled={disabled}
            reduceMotion={reduceMotion}
            onPress={() => selectByTap(index)}
          />
        ))}
      </Animated.ScrollView>

      <View style={styles.selectionCopy} accessibilityLiveRegion="polite">
        <Text style={styles.selectionName}>{previewOption.name}</Text>
        <Text style={styles.selectionDescription}>{previewOption.description}</Text>
      </View>

      <View style={styles.pageDots} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {options.map((option, index) => (
          <View
            key={option.id}
            style={[styles.pageDot, index === previewIndex && styles.pageDotSelected]}
          />
        ))}
      </View>
    </View>
  );
}

function PageStyleSlide({
  option,
  index,
  itemExtent,
  pageWidth,
  pageHeight,
  scrollX,
  selected,
  disabled,
  reduceMotion,
  onPress,
}: {
  option: CookbookPageStyleOption;
  index: number;
  itemExtent: number;
  pageWidth: number;
  pageHeight: number;
  scrollX: SharedValue<number>;
  selected: boolean;
  disabled: boolean;
  reduceMotion: boolean;
  onPress: () => void;
}) {
  const animatedStyle = useAnimatedStyle(() => {
    const inputRange = [
      (index - 1) * itemExtent,
      index * itemExtent,
      (index + 1) * itemExtent,
    ];
    return {
      opacity: interpolate(scrollX.value, inputRange, [0.52, 1, 0.52], Extrapolation.CLAMP),
      transform: [
        {
          translateY: reduceMotion
            ? 0
            : interpolate(scrollX.value, inputRange, [16, 0, 16], Extrapolation.CLAMP),
        },
        {
          scale: reduceMotion
            ? 1
            : interpolate(scrollX.value, inputRange, [0.88, 1, 0.88], Extrapolation.CLAMP),
        },
        {
          rotateZ: reduceMotion
            ? '0deg'
            : `${interpolate(scrollX.value, inputRange, [3.5, 0, -3.5], Extrapolation.CLAMP)}deg`,
        },
      ],
    };
  }, [index, itemExtent, reduceMotion]);

  return (
    <Animated.View style={[styles.slide, { width: itemExtent }, animatedStyle]}>
      <Pressable
        style={({ pressed }) => [
          styles.pageButton,
          selected && styles.pageButtonSelected,
          pressed && styles.pageButtonPressed,
        ]}
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityState={{ selected, disabled }}
        accessibilityLabel={`${option.name} recipe page style: ${option.description}`}
      >
        <Image
          source={option.samples.brownies}
          resizeMode="contain"
          style={[styles.pageImage, { width: pageWidth, height: pageHeight }]}
          testID={`page-style-sample-${option.id}`}
          accessible={false}
        />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    gap: Spacing.sm,
  },
  rail: {
    width: '100%',
    flexGrow: 0,
  },
  slide: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: PAGE_HORIZONTAL_INSET,
  },
  pageButton: {
    borderRadius: Radii.numeric[10],
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.book.page,
    boxShadow: Shadows.custom.studio,
    overflow: 'hidden',
    outlineWidth: 0,
  },
  pageButtonSelected: {
    borderColor: Colors.primary,
    borderWidth: 2,
  },
  pageButtonPressed: {
    opacity: 0.84,
    transform: [{ scale: 0.985 }],
  },
  pageImage: {
    aspectRatio: PAGE_ASPECT_RATIO,
    backgroundColor: Colors.book.page,
  },
  selectionCopy: {
    minHeight: 52,
    alignItems: 'center',
    gap: Spacing.values[2],
    paddingHorizontal: Spacing.lg,
  },
  selectionName: {
    color: Colors.primary,
    fontFamily: Fonts.display.semibold,
    fontSize: Typography.sizes.lg,
    lineHeight: Typography.metrics.lineHeight24,
    textAlign: 'center',
  },
  selectionDescription: {
    color: Colors.textTertiary,
    fontFamily: Fonts.ui.regular,
    fontSize: Typography.sizes.sm,
    lineHeight: Typography.metrics.lineHeight18,
    textAlign: 'center',
  },
  pageDots: {
    minHeight: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.values[6],
  },
  pageDot: {
    width: 5,
    height: 5,
    borderRadius: Radii.full,
    backgroundColor: Colors.borderStrong,
  },
  pageDotSelected: {
    width: 16,
    backgroundColor: Colors.primary,
  },
});
