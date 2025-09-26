import React, { useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { Colors } from '@/constants/colors';
import { Spacing, Typography } from '@/constants/spacing';

export interface VerticalNumberPickerProps {
  min: number;
  max: number;
  value: number;
  onChange: (value: number) => void;
  itemHeight?: number; // px
}

export function VerticalNumberPicker({
  min,
  max,
  value,
  onChange,
  itemHeight = 56,
}: VerticalNumberPickerProps) {
  const total = max - min + 1;
  const indices = useMemo(() => Array.from({ length: total }, (_, i) => i), [total]);

  const scrollRef = useRef<ScrollView>(null);
  const programmatic = useRef(false);
  const lastIndexEmitted = useRef<number | null>(null);

  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  const valueToOffsetY = (val: number) => (clamp(val) - min) * itemHeight;

  // Make sure scroll position reflects external value
  useEffect(() => {
    const y = valueToOffsetY(value);
    programmatic.current = true;
    scrollRef.current?.scrollTo({ y, animated: false });
    const t = setTimeout(() => { programmatic.current = false; }, 0);
    return () => clearTimeout(t);
  }, [value, min, max, itemHeight]);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (programmatic.current) return;
    const y = e.nativeEvent.contentOffset.y;
    const rawIndex = y / itemHeight;
    const nearestIndex = Math.round(rawIndex);
    if (lastIndexEmitted.current !== nearestIndex) {
      lastIndexEmitted.current = nearestIndex;
      onChange(clamp(min + nearestIndex));
    }
  };

  return (
    <View style={[styles.container, { height: itemHeight * 5 }]}> 
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={itemHeight}
        snapToAlignment="center"
        decelerationRate="fast"
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingVertical: (itemHeight * 2) }}
      >
        {indices.map((i) => {
          const num = min + i;
          const isSelected = num === value;
          return (
            <View key={String(num)} style={[styles.item, { height: itemHeight }]}> 
              <Text style={[styles.itemText, isSelected && styles.itemTextSelected]}>
                {num}
              </Text>
            </View>
          );
        })}
      </ScrollView>

      {/* Center selection highlight */}
      <View pointerEvents="none" style={[styles.highlight, { height: itemHeight }]}/>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  item: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemText: {
    fontSize: 28,
    color: Colors.lightText,
    fontWeight: Typography.weights.semibold,
  },
  itemTextSelected: {
    color: Colors.text,
  },
  highlight: {
    position: 'absolute',
    left: '15%',
    right: '15%',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
});
