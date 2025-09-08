import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { Colors } from '@/constants/colors';
import { Spacing, Typography } from '@/constants/spacing';
import { useWeightLog } from '@/hooks/useWeightLog';

function formatISO(date = new Date()): string {
  return date.toISOString().split('T')[0];
}

function linePath(points: { x: number; y: number }[]) {
  if (points.length === 0) return '';
  const d = points.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ');
  return d;
}

export const WeightTracker: React.FC<{ rangeDays?: 30 | 60 | 90 }> = ({ rangeDays = 30 }) => {
  const { entries, latest, addOrUpdate, getRange } = useWeightLog();
  const [input, setInput] = useState('');
  const [unit] = useState<'kg' | 'lb'>('kg');

  const range = useMemo(() => getRange(rangeDays), [getRange, rangeDays]);
  const weights = range.map(e => e.weightKg);
  const min = weights.length ? Math.min(...weights) : 0;
  const max = weights.length ? Math.max(...weights) : 0;

  const width = 320;
  const height = 140;
  const pad = 16;
  const graphW = width - pad * 2;
  const graphH = height - pad * 2;

  const points = useMemo(() => {
    if (!range.length) return [] as { x: number; y: number }[];
    const minW = min;
    const maxW = Math.max(min + 0.1, max);
    const stepX = graphW / Math.max(1, range.length - 1);
    return range.map((e, i) => {
      const x = pad + i * stepX;
      const t = (e.weightKg - minW) / (maxW - minW);
      const y = pad + graphH - t * graphH;
      return { x, y };
    });
  }, [range, min, max, graphW, graphH]);

  const d = linePath(points);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Body Weight</Text>
        {latest && <Text style={styles.latest}>Last: {latest.weightKg.toFixed(1)} kg</Text>}
      </View>

      <Svg width={width} height={height}>
        <Path d={d} stroke={Colors.primary} strokeWidth={2} fill="none" />
        {points.map((p, i) => (
          <Circle key={i} cx={p.x} cy={p.y} r={2} fill={Colors.primary} />
        ))}
      </Svg>

      <View style={styles.inputRow}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder={`Enter weight (${unit})`}
          placeholderTextColor={Colors.lightText}
          keyboardType="numeric"
          style={styles.input}
        />
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => {
            const n = Number(input);
            if (!isNaN(n) && n > 0) {
              addOrUpdate(formatISO(), unit === 'kg' ? n : n * 0.45359237);
              setInput('');
            }
          }}
        >
          <Text style={styles.addBtnText}>Add</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, borderRadius: 12, padding: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  title: { color: Colors.text, fontSize: Typography.h3.fontSize, fontWeight: Typography.h3.fontWeight },
  latest: { color: Colors.lightText, fontSize: 12, fontWeight: '600' },
  inputRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  input: { flex: 1, backgroundColor: Colors.secondary, borderRadius: 8, paddingHorizontal: 12, color: Colors.text, height: 40 },
  addBtn: { backgroundColor: Colors.primary, borderRadius: 8, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', height: 40 },
  addBtnText: { color: Colors.white, fontWeight: '700' },
});

export default WeightTracker;
