import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/spacing';
import { ProgressCardContainer } from '@/components/progress/ProgressCardContainer';

interface MacroInfo {
  label: string;
  consumed: number;
  goal?: number;
  color: string;
}

interface ProgressOverviewCardProps {
  caloriesConsumed: number;
  calorieTarget?: number;
  macros: MacroInfo[];
  remainingCalories?: number;
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

export const ProgressOverviewCard: React.FC<ProgressOverviewCardProps> = ({
  caloriesConsumed,
  calorieTarget,
  macros,
  remainingCalories,
}) => {
  const calorieProgress = clampPercentage(
    calorieTarget && calorieTarget > 0 ? (caloriesConsumed / calorieTarget) * 100 : 0,
  );

  return (
    <ProgressCardContainer style={styles.card} padding={20}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Today&apos;s energy</Text>
        {typeof remainingCalories === 'number' && Number.isFinite(remainingCalories) ? (
          <Text style={styles.caption}>
            {remainingCalories >= 0
              ? `${remainingCalories.toLocaleString()} kcal remaining`
              : `${Math.abs(remainingCalories).toLocaleString()} kcal over target`}
          </Text>
        ) : null}
      </View>

      <View style={styles.calorieRow}>
        <View style={styles.calorieAmount}>
          <Text style={styles.calorieValue}>{formatNumber(caloriesConsumed, 'kcal')}</Text>
          <Text style={styles.calorieLabel}>Consumed today</Text>
        </View>
        <View style={styles.calorieTarget}>
          <Text style={styles.targetLabel}>Target</Text>
          <Text style={styles.targetValue}>{formatNumber(calorieTarget ?? NaN, 'kcal')}</Text>
        </View>
      </View>

      <View
        style={styles.progressTrack}
        accessible
        accessibilityLabel={`Calorie progress ${calorieProgress} percent`}
      >
        <View style={[styles.progressFill, { width: `${calorieProgress}%` }]} />
      </View>

      <View style={styles.divider} />

      <Text style={styles.sectionLabel}>Macronutrients</Text>
      {macros.map((macro) => {
        const goal = macro.goal ?? 0;
        const percent = clampPercentage(goal > 0 ? (macro.consumed / goal) * 100 : 0);
        return (
          <View key={macro.label} style={styles.macroItem}>
            <View style={styles.macroHeader}>
              <Text style={styles.macroLabel}>{macro.label}</Text>
              <Text style={styles.macroValue}>
                {formatNumber(macro.consumed, 'g')} {goal ? `of ${goal} g` : ''}
              </Text>
            </View>
            <View
              style={styles.macroTrack}
              accessible
              accessibilityLabel={`${macro.label} ${percent} percent of target`}
            >
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
    alignItems: 'center',
    justifyContent: 'space-between',
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
  calorieAmount: {
    flex: 1,
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
  calorieTarget: {
    alignItems: 'flex-end',
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
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginBottom: 16,
    opacity: 0.6,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: Typography.weights.medium,
    color: Colors.lightText,
    marginBottom: 8,
  },
  macroItem: {
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
    fontWeight: Typography.weights.medium,
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
