import React, { useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, NativeSyntheticEvent, NativeScrollEvent, useWindowDimensions } from 'react-native';
import { Colors } from '@/constants/colors';

export interface VerticalRulerPickerProps {
  min: number;
  max: number;
  step?: number; // units per tick
  value: number;
  onChange: (value: number) => void;
  majorTickInterval?: number; // in display units
  showLabels?: boolean; // default false as per design
}

export function VerticalRulerPicker({
  min,
  max,
  step = 1,
  value,
  onChange,
  majorTickInterval = 10,
  showLabels = false,
}: VerticalRulerPickerProps) {
  const { height: screenHeight } = useWindowDimensions();
  const TICK_SPACING = 12; // px per step

  const totalSteps = useMemo(() => Math.round((max - min) / step), [min, max, step]);
  const majorEverySteps = useMemo(() => Math.max(1, Math.round(majorTickInterval / step)), [majorTickInterval, step]);

  const scrollRef = useRef<ScrollView>(null);
  const programmatic = useRef(false);
  const lastIndexEmitted = useRef<number | null>(null);

  const clamp = (v: number) => Math.min(max, Math.max(min, v));

  const valueToOffsetY = (val: number) => {
    const index = Math.round((clamp(val) - min) / step);
    return index * TICK_SPACING;
  };

  useEffect(() => {
    const y = valueToOffsetY(value);
    programmatic.current = true;
    scrollRef.current?.scrollTo({ y, animated: false });
    const t = setTimeout(() => { programmatic.current = false; }, 0);
    return () => clearTimeout(t);
  }, [value, min, max, step]);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (programmatic.current) return;
    const y = e.nativeEvent.contentOffset.y;
    const rawIndex = y / TICK_SPACING;
    const nearestIndex = Math.round(rawIndex);
    if (lastIndexEmitted.current !== nearestIndex) {
      lastIndexEmitted.current = nearestIndex;
      const newVal = min + nearestIndex * step;
      onChange(clamp(newVal));
    }
  };

  const sidePadding = Math.floor(0); // vertical ruler fills vertically
  const ticks = useMemo(() => Array.from({ length: totalSteps + 1 }, (_, i) => i), [totalSteps]);

  return (
    <View style={[styles.container, { height: Math.min(320, screenHeight * 0.55) }]}>
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={TICK_SPACING}
        snapToAlignment="center"
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingVertical: (Math.min(320, screenHeight * 0.55) / 2) }}
      >
        {ticks.map((i) => {
          const isMajor = i % majorEverySteps === 0;
          const tickValue = min + i * step;
          return (
            <View key={i} style={[styles.tickRow, { height: TICK_SPACING }]}> 
              <View style={[styles.tickLine, isMajor ? styles.tickMajor : styles.tickMinor]} />
              {isMajor && showLabels && (
                <Text style={styles.tickLabel}>{formatLabel(tickValue)}</Text>
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* Center horizontal pointer */}
      <View pointerEvents="none" style={styles.pointerContainer}>
        <View style={styles.pointer} />
      </View>
    </View>
  );
}

function formatLabel(v: number) {
  if (Number.isInteger(v)) return String(v);
  const s = v.toFixed(1);
  return s.endsWith('.0') ? String(Math.round(v)) : s;
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignSelf: 'stretch',
    position: 'relative',
  },
  tickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 8,
  },
  tickLine: {
    height: 2,
    backgroundColor: Colors.border,
  },
  tickMinor: {
    width: 24,
  },
  tickMajor: {
    width: 40,
    backgroundColor: Colors.text,
  },
  tickLabel: {
    marginLeft: 8,
    fontSize: 12,
    color: Colors.lightText,
  },
  pointerContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '50%',
    height: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointer: {
    position: 'absolute',
    width: '86%',
    height: 3,
    backgroundColor: Colors.primary,
    borderRadius: 2,
    transform: [{ translateY: -1.5 }],
  },
});
