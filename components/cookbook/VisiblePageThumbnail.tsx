/* eslint-disable react-hooks/immutability -- Reanimated shared values hold measured layout. */
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { runOnJS, useAnimatedReaction, useSharedValue, type SharedValue } from 'react-native-reanimated';

/** Sortable.Grid mounts every tile; only mount its image when it reaches the viewport. */
export function VisiblePageThumbnail({
  children,
  scrollOffset,
  position,
}: {
  children: ReactNode;
  scrollOffset: SharedValue<number>;
  position: number;
}) {
  const ref = useRef<View>(null);
  const { height: viewportHeight, width: viewportWidth } = useWindowDimensions();
  const bounds = useSharedValue<{ top: number; height: number } | null>(null);
  const [visible, setVisible] = useState(false);
  const measure = useCallback(() => {
    ref.current?.measureInWindow((_x, y, _width, height) => {
      if (height <= 0) return;
      bounds.value = { top: y + scrollOffset.value, height };
      setVisible(y < viewportHeight && y + height > 0);
    });
  }, [bounds, scrollOffset, viewportHeight]);
  useEffect(measure, [measure, position, viewportWidth]);
  useAnimatedReaction(
    () => {
      const box = bounds.value;
      return !!box && box.top - scrollOffset.value < viewportHeight && box.top + box.height - scrollOffset.value > 0;
    },
    (next, previous) => {
      if (next !== previous) runOnJS(setVisible)(next);
    },
    [viewportHeight],
  );
  return (
    <View ref={ref} collapsable={false} onLayout={measure} style={{ width: '100%', height: '100%' }}>
      {visible ? children : null}
    </View>
  );
}
