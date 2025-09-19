import React, { useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, useWindowDimensions, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { Colors } from '@/constants/colors';
// no spacing/typography imports needed here

export interface HorizontalRulerPickerProps {
  min: number;
  max: number;
  step?: number; // units per tick
  value: number; // in display units
  onChange: (value: number) => void;
  majorTickInterval?: number; // in display units
  decimalPlaces?: number; // for accessibility announcements/labels if needed
  showLabels?: boolean; // show numeric labels under major ticks
}

// A reusable horizontally scrollable ruler with a fixed center pointer
export function HorizontalRulerPicker({
  min,
  max,
  step = 1,
  value,
  onChange,
  majorTickInterval = 5,
  showLabels = false,
}: HorizontalRulerPickerProps) {
  const { width } = useWindowDimensions();
  const TICK_SPACING = 12; // px per step

  const totalSteps = useMemo(() => Math.round((max - min) / step), [min, max, step]);
  const majorEverySteps = useMemo(() => Math.max(1, Math.round(majorTickInterval / step)), [majorTickInterval, step]);

  const scrollRef = useRef<ScrollView>(null);
  const programmatic = useRef(false);
  const lastIndexEmitted = useRef<number | null>(null);

  const clamp = (v: number) => Math.min(max, Math.max(min, v));

  const valueToOffsetX = (val: number) => {
    const index = Math.round((clamp(val) - min) / step);
    return index * TICK_SPACING;
  };

  const offsetXToValue = (x: number) => {
    const rawIndex = x / TICK_SPACING;
    const nearestIndex = Math.round(rawIndex);
    const val = min + nearestIndex * step;
    return clamp(val);
  };

  // Center content by padding half the screen width on both sides
  const sidePadding = Math.floor(width / 2);

  // Keep scroll position in sync when value prop changes externally
  useEffect(() => {
    const x = valueToOffsetX(value);
    programmatic.current = true;
    scrollRef.current?.scrollTo({ x, animated: false });
    // small timeout so onScroll after programmatic move is ignored
    const t = setTimeout(() => { programmatic.current = false; }, 0);
    return () => clearTimeout(t);
  }, [value, min, max, step]);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (programmatic.current) return;
    const x = e.nativeEvent.contentOffset.x;
    const rawIndex = x / TICK_SPACING;
    const nearestIndex = Math.round(rawIndex);
    if (lastIndexEmitted.current !== nearestIndex) {
      lastIndexEmitted.current = nearestIndex;
      const newVal = min + nearestIndex * step;
      onChange(clamp(newVal));
    }
  };

  const ticks = useMemo(() => Array.from({ length: totalSteps + 1 }, (_, i) => i), [totalSteps]);

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: sidePadding }}
        decelerationRate="fast"
        snapToInterval={TICK_SPACING}
        snapToAlignment="center"
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {ticks.map((i) => {
          const isMajor = i % majorEverySteps === 0;
          const tickValue = min + i * step;
          return (
            <View key={i} style={[styles.tickContainer, { width: TICK_SPACING }]}>
              <View style={[styles.tick, isMajor ? styles.tickMajor : styles.tickMinor]} />
              {isMajor && showLabels && (
                <Text style={styles.tickLabel}>{formatLabel(tickValue)}</Text>
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* Center pointer */}
      <View pointerEvents="none" style={styles.pointerContainer}>
        <View style={styles.pointer} />
      </View>
    </View>
  );
}

function formatLabel(v: number) {
  // Avoid floating point noise for common steps
  if (Number.isInteger(v)) return String(v);
  const s = v.toFixed(1);
  return s.endsWith('.0') ? String(Math.round(v)) : s;
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 110,
    justifyContent: 'center',
  },
  tickContainer: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 18,
  },
  tick: {
    width: 2,
    backgroundColor: Colors.border,
  },
  tickMinor: {
    height: 16,
  },
  tickMajor: {
    height: 28,
    backgroundColor: Colors.text,
  },
  tickLabel: {
    position: 'absolute',
    bottom: 0,
    fontSize: 12,
    color: Colors.lightText,
    textAlign: 'center',
  },
  pointerContainer: {
    position: 'absolute',
    left: '50%',
    top: 0,
    bottom: 0,
    width: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointer: {
    position: 'absolute',
    width: 3,
    height: 70,
    backgroundColor: Colors.primary,
    transform: [{ translateX: -1.5 }],
    borderRadius: 2,
  },
});
