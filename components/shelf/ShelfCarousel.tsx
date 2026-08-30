/* eslint-disable react-hooks/immutability -- Reanimated shared values are intentionally mutated through their .value API. */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { cancelAnimation, runOnJS, useSharedValue, withSpring } from 'react-native-reanimated';
import { ShelfBookSlot } from '@/components/shelf/ShelfBookSlot';
import { PHYSICAL_BOOK_ASPECT, resolveSpineWidth } from '@/components/physical-book/PhysicalBook';
import {
  clampShelfOffset,
  clampShelfVelocity,
  resolvePagedSnapTarget,
  resolveShelfCarouselGeometry,
  resolveShelfGesturePitch,
  type ShelfGeometry,
} from '@/utils/cookbook/physicalShelf';
import type { ContextActionGroup, ContextActionId } from '@/utils/cookbook/contextActions';

/**
 * The spine-packed 3D shelf carousel. One shared value (`shelfOffset`, in
 * slot units) is driven by a pan gesture; every slot derives its cover pose,
 * spine-face pose, and shadow from it on the UI thread, so browsing the
 * shelf never touches the JS thread per frame. Gesture deltas are scaled by
 * the pitch profile at the current offset, keeping finger tracking 1:1 as
 * the packing density changes between center and flanks.
 *
 * Generic over the item type: the cookbook shelf renders cookbooks with a
 * trailing create volume; the creation studio renders binding presets.
 */

// Gentle settle: books ease into the detent instead of snapping to it.
const SNAP_SPRING = { damping: 23, stiffness: 105, mass: 1.1 };

interface ShelfCarouselTrailingSlot {
  renderCover: (width: number) => React.ReactNode;
  renderSpine: (spineWidth: number, height: number) => React.ReactNode;
  onActivate: () => void;
  accessibilityLabel: string;
}

interface ShelfCarouselProps<T> {
  items: T[];
  keyExtractor: (item: T) => string;
  renderCover: (item: T, width: number) => React.ReactNode;
  renderCoverAction?: (item: T) => React.ReactNode;
  renderSpine: (item: T, spineWidth: number, height: number) => React.ReactNode;
  spineWidthFor?: (item: T, bookWidth: number) => number;
  accessibilityLabelFor: (item: T) => string;
  onActivateItem: (item: T) => void;
  contextActionsFor?: (item: T) => ContextActionGroup[];
  onContextAction?: (item: T, actionId: ContextActionId) => void;
  onOpenContextActions?: (item: T) => void;
  activeIndex?: number;
  trailingSlot?: ShelfCarouselTrailingSlot;
  onActiveIndexChange: (index: number) => void;
  /** Distance from the stage's bottom edge to the top of the shelf board. */
  boardClearance: number;
}

export function ShelfCarousel<T>({
  items,
  keyExtractor,
  renderCover,
  renderCoverAction,
  renderSpine,
  spineWidthFor,
  accessibilityLabelFor,
  onActivateItem,
  contextActionsFor,
  onContextAction,
  onOpenContextActions,
  activeIndex,
  trailingSlot,
  onActiveIndexChange,
  boardClearance,
}: ShelfCarouselProps<T>) {
  const [stageWidth, setStageWidth] = useState(0);
  const bookWidth = Math.min(Math.max(stageWidth * 0.46, 150), 200);
  const bookHeight = bookWidth * PHYSICAL_BOOK_ASPECT;
  const nominalSpineWidth = resolveSpineWidth(bookWidth, 12);
  const geometry: ShelfGeometry = useMemo(() => {
    const spineWidths = items.map((item) => spineWidthFor?.(item, bookWidth) ?? nominalSpineWidth);
    return resolveShelfCarouselGeometry(bookWidth, [nominalSpineWidth, ...spineWidths]);
  }, [bookWidth, items, nominalSpineWidth, spineWidthFor]);
  const trailing = trailingSlot ? 1 : 0;
  const maxIndex = Math.max(0, items.length - 1 + trailing);

  const shelfOffset = useSharedValue(0);
  const startOffset = useSharedValue(0);
  const lastDetent = useSharedValue(0);

  const notifyDetent = useCallback(
    (detent: number) => {
      void Haptics.selectionAsync();
      onActiveIndexChange(detent);
    },
    [onActiveIndexChange],
  );

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-8, 8])
        .failOffsetY([-48, 48])
        .onBegin(() => {
          cancelAnimation(shelfOffset);
          startOffset.value = shelfOffset.value;
        })
        .onUpdate((event) => {
          const pitch = resolveShelfGesturePitch(shelfOffset.value, geometry);
          const raw = startOffset.value - event.translationX / pitch;
          shelfOffset.value = clampShelfOffset(raw, maxIndex);
          const detent = Math.round(Math.max(0, Math.min(maxIndex, shelfOffset.value)));
          if (detent !== lastDetent.value) {
            lastDetent.value = detent;
            runOnJS(notifyDetent)(detent);
          }
        })
        .onEnd((event) => {
          const pitch = resolveShelfGesturePitch(shelfOffset.value, geometry);
          // Clamp the fling: narrow flank pitches would otherwise amplify a
          // flick into a multi-slot whip.
          const velocitySlots = clampShelfVelocity(-event.velocityX / pitch);
          const target = resolvePagedSnapTarget(shelfOffset.value, velocitySlots, maxIndex);
          lastDetent.value = target;
          shelfOffset.value = withSpring(target, { ...SNAP_SPRING, velocity: velocitySlots });
          runOnJS(onActiveIndexChange)(target);
        }),
    [shelfOffset, startOffset, lastDetent, geometry, maxIndex, notifyDetent, onActiveIndexChange],
  );

  const scrollTo = useCallback(
    (index: number) => {
      lastDetent.value = index;
      shelfOffset.value = withSpring(index, SNAP_SPRING);
      onActiveIndexChange(index);
      void Haptics.selectionAsync();
    },
    [shelfOffset, lastDetent, onActiveIndexChange],
  );

  // Tap decisions read the LIVE offset, not React state: after a fling the
  // JS activeIndex can lag the shelf, and a stale comparison used to open
  // the wrong book.
  const handleSlotPress = useCallback(
    (index: number, liveOffset: number) => {
      if (Math.abs(index - liveOffset) >= 0.5) {
        scrollTo(index);
        return;
      }
      const item = index < items.length ? items[index] : undefined;
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (item) {
        onActivateItem(item);
      } else {
        trailingSlot?.onActivate();
      }
    },
    [items, onActivateItem, trailingSlot, scrollTo],
  );

  // If the collection shrinks (deleted book) past the current offset, settle
  // onto the new end of the shelf.
  useEffect(() => {
    if (shelfOffset.value > maxIndex) {
      shelfOffset.value = withSpring(maxIndex, SNAP_SPRING);
      lastDetent.value = maxIndex;
      onActiveIndexChange(maxIndex);
    }
  }, [maxIndex, shelfOffset, lastDetent, onActiveIndexChange]);

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    setStageWidth(event.nativeEvent.layout.width);
  }, []);

  const stageCenterX = stageWidth / 2;
  const slotCount = items.length + trailing;

  return (
    <GestureDetector gesture={pan}>
      <View style={{ flex: 1, overflow: 'visible' }} onLayout={handleLayout} collapsable={false}>
        {stageWidth > 0
          ? Array.from({ length: slotCount }).map((_, index) => {
              const item = index < items.length ? items[index] : undefined;
              const spineWidth = item ? (spineWidthFor?.(item, bookWidth) ?? nominalSpineWidth) : nominalSpineWidth;
              return (
                <ShelfBookSlot
                  key={item ? keyExtractor(item) : 'trailing-slot'}
                  index={index}
                  shelfOffset={shelfOffset}
                  geometry={geometry}
                  coverWidth={bookWidth}
                  height={bookHeight}
                  spineWidth={spineWidth}
                  stageCenterX={stageCenterX}
                  bottom={boardClearance}
                  accessibilityLabel={
                    item ? accessibilityLabelFor(item) : (trailingSlot?.accessibilityLabel ?? 'Create')
                  }
                  onPress={(liveOffset) => handleSlotPress(index, liveOffset)}
                  contextActions={item ? contextActionsFor?.(item) : undefined}
                  onContextAction={item && onContextAction ? (actionId) => onContextAction(item, actionId) : undefined}
                  onOpenContextActions={item && onOpenContextActions ? () => onOpenContextActions(item) : undefined}
                  cover={item ? renderCover(item, bookWidth) : trailingSlot?.renderCover(bookWidth)}
                  coverAction={item && index === activeIndex ? renderCoverAction?.(item) : undefined}
                  spine={
                    item ? renderSpine(item, spineWidth, bookHeight) : trailingSlot?.renderSpine(spineWidth, bookHeight)
                  }
                />
              );
            })
          : null}
      </View>
    </GestureDetector>
  );
}
