import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/spacing';
import { ProgressCardContainer } from '@/components/progress/ProgressCardContainer';

interface MacroSnapshotCardProps {
  macros: Array<{
    label: string;
    consumed: number;
    goal?: number;
    color: string;
  }>;
}

function format(value: number) {
  if (!Number.isFinite(value)) return '--';
  return `${Math.round(value).toLocaleString()} g`;
}

function percent(consumed: number, goal?: number) {
  if (!goal || goal <= 0) return '--';
  return `${Math.round((consumed / goal) * 100)}%`;
}

export const MacroSnapshotCard: React.FC<MacroSnapshotCardProps> = ({ macros }) => {
  return (
    <ProgressCardContainer style={styles.card} padding={20}>
      <Text style={styles.title}>Macro snapshot</Text>
      <Text style={styles.subtitle}>Your daily breakdown at a glance.</Text>

      <View style={styles.grid}>
        {macros.map((macro) => (
          <View key={macro.label} style={styles.cell}>
            <View style={[styles.dot, { backgroundColor: macro.color }]} />
            <Text style={styles.label}>{macro.label}</Text>
            <Text style={styles.value}>{format(macro.consumed)}</Text>
            <Text style={styles.hint}>{percent(macro.consumed, macro.goal)} of target</Text>
          </View>
        ))}
      </View>
    </ProgressCardContainer>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.lightText,
    marginBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
  },
  cell: {
    width: '30%',
    backgroundColor: Colors.background,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 6,
  },
  label: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: Typography.weights.medium,
  },
  value: {
    fontSize: 16,
    color: Colors.text,
    marginTop: 2,
  },
  hint: {
    fontSize: 11,
    color: Colors.lightText,
    marginTop: 4,
  },
});
