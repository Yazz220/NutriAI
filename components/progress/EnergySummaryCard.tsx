import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/spacing';
import { ProgressCardContainer } from '@/components/progress/ProgressCardContainer';

interface EnergySummaryCardProps {
  caloriesConsumed: number;
  calorieTarget?: number;
  remainingCalories?: number;
  macros: Array<{
    label: string;
    consumed: number;
    goal?: number;
    color: string;
  }>;
}

function clampPercentage(value: number) {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return value;
}

function formatNumber(value: number, unit: 'kcal' | 'g') {
  if (!Number.isFinite(value)) return '--';
  const rounded = Math.round(value);
  return unit === 'kcal' ? `${rounded.toLocaleString()} kcal` : `${rounded.toLocaleString()} g`;
}

export const EnergySummaryCard: React.FC<EnergySummaryCardProps> = ({
  caloriesConsumed,
  calorieTarget,
  remainingCalories,
  macros,
}) => {
  const progress = clampPercentage(
    calorieTarget && calorieTarget > 0 ? (caloriesConsumed / calorieTarget) * 100 : 0,
  );

  const remainingCaption = (() => {
    if (!Number.isFinite(remainingCalories ?? NaN)) return null;
    if (!Number.isFinite(calorieTarget ?? NaN)) return null;
    if ((remainingCalories ?? 0) >= 0) {
      return `${Math.round(remainingCalories ?? 0).toLocaleString()} kcal remaining`;
    }
    return `${Math.abs(Math.round(remainingCalories ?? 0)).toLocaleString()} kcal above target`;
  })();

  return (
    <ProgressCardContainer style={styles.card} padding={20}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Today&apos;s energy</Text>
        {remainingCaption ? <Text style={styles.caption}>{remainingCaption}</Text> : null}
      </View>

      <View style={styles.calorieRow}>
        <View style={styles.calorieBlock}>
          <Text style={styles.calorieValue}>{formatNumber(caloriesConsumed, 'kcal')}</Text>
          <Text style={styles.calorieLabel}>Consumed today</Text>
        </View>
        <View style={styles.calorieBlockRight}>
          <Text style={styles.targetLabel}>Target</Text>
          <Text style={styles.targetValue}>{formatNumber(calorieTarget ?? NaN, 'kcal')}</Text>
        </View>
      </View>

      <View
        style={styles.progressTrack}
        accessible
        accessibilityLabel={`Calorie progress ${Math.round(progress)} percent`}
      >
        <View style={[styles.progressFill, { width: `${progress}%` }]} />
      </View>

      <View style={styles.macrosHeader}>
        <Text style={styles.sectionLabel}>Macronutrients</Text>
      </View>

      {macros.map((macro) => {
        const goal = macro.goal ?? 0;
        const percent = clampPercentage(goal > 0 ? (macro.consumed / goal) * 100 : 0);
        return (
          <View key={macro.label} style={styles.macroRow}>
            <View style={styles.macroHeader}>
              <Text style={styles.macroLabel}>{macro.label}</Text>
              <Text style={styles.macroValue}>
                {formatNumber(macro.consumed, 'g')} {goal ? `of ${formatNumber(goal, 'g')}` : ''}
              </Text>
            </View>
            <View style={styles.macroTrack} accessible accessibilityLabel={`${macro.label} ${Math.round(percent)} percent of target`}>
              <View style={[styles.macroFill, { width: `${percent}%`, backgroundColor: macro.color }]} />
            </View>
          </View>
        );
      })}
    </ProgressCardContainer>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  caption: {
    fontSize: 12,
    color: Colors.lightText,
  },
  calorieRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  calorieBlock: {
    flex: 1,
  },
  calorieBlockRight: {
    alignItems: 'flex-end',
  },
  calorieValue: {
    fontSize: 28,
    fontWeight: Typography.weights.bold,
    color: Colors.primary,
  },
  calorieLabel: {
    fontSize: 13,
    color: Colors.lightText,
  },
  targetLabel: {
    fontSize: 12,
    color: Colors.lightText,
  },
  targetValue: {
    fontSize: 16,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.border,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
  },
  macrosHeader: {
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 13,
    color: Colors.lightText,
    fontWeight: Typography.weights.medium,
  },
  macroRow: {
    marginBottom: 12,
  },
  macroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  macroLabel: {
    fontSize: 14,
    color: Colors.text,
  },
  macroValue: {
    fontSize: 13,
    color: Colors.lightText,
  },
  macroTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.background,
    overflow: 'hidden',
  },
  macroFill: {
    height: '100%',
    borderRadius: 3,
  },
});
