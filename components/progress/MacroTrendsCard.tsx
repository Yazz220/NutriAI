import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/spacing';
import { ProgressCardContainer } from '@/components/progress/ProgressCardContainer';

interface MacroAverages {
  label: string;
  consumed: number;
  goal?: number;
  color: string;
}

interface MacroTrendsCardProps {
  macros: MacroAverages[];
  loggingDays: number;
}

function clampPercentage(value: number) {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return value;
}

export const MacroTrendsCard: React.FC<MacroTrendsCardProps> = ({ macros, loggingDays }) => {
  const adherenceText = (() => {
    if (loggingDays === 0) return 'Log meals to unlock macro insights.';
    if (loggingDays < 3) return 'Great start! A few more days will reveal clearer trends.';
    return Based on  logged day.;
  })();

  return (
    <ProgressCardContainer style={styles.card} padding={20}>
      <Text style={styles.title}>Macro balance</Text>
      <Text style={styles.subtitle}>{adherenceText}</Text>

      {macros.map((macro) => {
        const goal = macro.goal ?? 0;
        const percent = clampPercentage(goal > 0 ? (macro.consumed / goal) * 100 : 0);
        const delta = goal > 0 ? Math.round(macro.consumed - goal) : 0;
        return (
          <View key={macro.label} style={styles.macroRow}>
            <View style={styles.macroHeader}>
              <Text style={styles.macroLabel}>{macro.label}</Text>
              <Text style={styles.macroValue}>
                {Math.round(macro.consumed).toLocaleString()} g
                {goal ?  /  g : ''}
              </Text>
            </View>
            <View style={styles.track}>
              <View
                style={[styles.fill, { width: ${percent}%, backgroundColor: macro.color }]}
                accessible
                accessibilityLabel={${macro.label}  percent of target}
              />
            </View>
            {goal > 0 ? (
              <Text style={styles.delta}>
                {delta === 0
                  ? 'On target'
                  : delta > 0
                    ? ${Math.abs(delta).toLocaleString()} g above goal
                    : ${Math.abs(delta).toLocaleString()} g below goal}
              </Text>
            ) : (
              <Text style={styles.delta}>No target set</Text>
            )}
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
  macroRow: {
    marginBottom: 14,
  },
  macroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
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
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.background,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
  },
  delta: {
    fontSize: 12,
    color: Colors.lightText,
    marginTop: 4,
  },
});
