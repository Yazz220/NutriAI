/* eslint-disable react-hooks/immutability -- Reanimated shared values are read inside animated styles by design. */
import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { ContactShadow } from '@/components/physical-book/ContactShadow';
import {
  resolveShelfPose,
  resolveShelfShadow,
  resolveSpineFacePose,
  type ShelfGeometry,
} from '@/utils/cookbook/physicalShelf';

/**
 * One slot on the spine-packed shelf. Three sibling layers all derive from
 * the shared carousel offset on the UI thread, forming a two-face cuboid:
 *
 * - shadow: slides with the book and narrows to the spine footprint as the
 *   book pivots away (the board is static, so the shadow never rotates).
 * - spine: a perpendicular plane hinged at the cover's left edge — visible
 *   on the flanks, edge-on (hidden) at center.
 * - cover: the full front cover, facing forward at center and foreshortened
 *   to a sliver on the flanks.
 */

interface ShelfBookSlotProps {
  index: number;
  shelfOffset: SharedValue<number>;
  geometry: ShelfGeometry;
  coverWidth: number;
  height: number;
  spineWidth: number;
  /** Stage x coordinate of the carousel center. */
  stageCenterX: number;
  /** Stage y position of the book's bottom edge. */
  bottom: number;
  /** Called with the live carousel offset at press time, so the parent can
   * distinguish "tap to center" from "tap to open" without stale state. */
  onPress: (liveOffset: number) => void;
  accessibilityLabel: string;
  cover: React.ReactNode;
  spine: React.ReactNode;
}

const PERSPECTIVE = 900;

export function ShelfBookSlot({
  index,
  shelfOffset,
  geometry,
  coverWidth,
  height,
  spineWidth,
  stageCenterX,
  bottom,
  onPress,
  accessibilityLabel,
  cover,
  spine,
}: ShelfBookSlotProps) {
  const coverStyle = useAnimatedStyle(() => {
    const pose = resolveShelfPose(index - shelfOffset.value, geometry);
    return {
      transform: [
        { perspective: PERSPECTIVE },
        { translateX: pose.translateX },
        { translateY: pose.translateY },
        { rotateY: `${pose.rotateY}deg` },
        { scale: pose.scale },
      ],
      opacity: pose.opacity,
      zIndex: pose.zIndex,
    };
  });

  const spineStyle = useAnimatedStyle(() => {
    const offset = index - shelfOffset.value;
    const pose = resolveShelfPose(offset, geometry);
    const face = resolveSpineFacePose(offset, pose.rotateY, geometry, coverWidth, spineWidth);
    return {
      transform: [
        { perspective: PERSPECTIVE },
        { translateX: face.translateX },
        { translateY: pose.translateY },
        { rotateY: `${face.rotateY}deg` },
        { scale: pose.scale },
      ],
      opacity: pose.opacity * pose.spineBlend,
      zIndex: pose.zIndex - 1,
    };
  });

  const shadowStyle = useAnimatedStyle(() => {
    const shadow = resolveShelfShadow(index - shelfOffset.value, geometry, coverWidth, spineWidth);
    return {
      transform: [{ translateX: shadow.translateX }, { scaleX: shadow.scaleX }],
      // ContactShadow bakes opacity 0.3 into its Skia color; normalize here.
      opacity: shadow.opacity / 0.3,
    };
  });

  return (
    <>
      <Animated.View
        style={[styles.shadowLayer, { left: stageCenterX - coverWidth / 2, bottom, width: coverWidth }, shadowStyle]}
        pointerEvents="none"
      >
        <ContactShadow width={coverWidth} />
      </Animated.View>

      <Animated.View
        style={[styles.spineLayer, { left: stageCenterX - spineWidth / 2, bottom, width: spineWidth, height }, spineStyle]}
      >
        <Pressable
          onPress={() => onPress(shelfOffset.value)}
          style={styles.pressable}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
        >
          {spine}
        </Pressable>
      </Animated.View>

      <Animated.View
        style={[styles.coverLayer, { left: stageCenterX - coverWidth / 2, bottom, width: coverWidth, height }, coverStyle]}
      >
        <Pressable
          onPress={() => onPress(shelfOffset.value)}
          style={styles.pressable}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
        >
          {cover}
        </Pressable>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  shadowLayer: {
    position: 'absolute',
    zIndex: 1,
  },
  spineLayer: {
    position: 'absolute',
  },
  coverLayer: {
    position: 'absolute',
  },
  pressable: {
    flex: 1,
  },
});
