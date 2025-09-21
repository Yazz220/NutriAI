import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TrendingUp, TrendingDown, Circle } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/spacing';
import { ProgressCardContainer } from '@/components/progress/ProgressCardContainer';

interface WeeklySnapshotCardProps {
  caloriesTendency?: number; // percent change vs last week
  mealsLogged: number;
  averageSleepHours?: number;
  healthyMealRatio?: number; // 0-1
  onPressDetails?: () => void;
}

export const WeeklySnapshotCard: React.FC<WeeklySnapshotCardProps> = ({
  caloriesTendency,
  mealsLogged,
  averageSleepHours,
  healthyMealRatio,
  onPressDetails,
}) => {
  const healthyPercent = useMemo(() => {
    if (!Number.isFinite(healthyMealRatio ?? NaN)) return undefined;
    return Math.round((healthyMealRatio ?? 0) * 100);
  }, [healthyMealRatio]);

  const trendIcon = !Number.isFinite(caloriesTendency ?? NaN)
    ? Circle
    : (caloriesTendency ?? 0) >= 0
      ? TrendingUp
      : TrendingDown;

  const trendColor = !Number.isFinite(caloriesTendency ?? NaN)
    ? Colors.lightText
    : (caloriesTendency ?? 0) >= 0
      ? Colors.success
      : Colors.error;

  const trendLabel = !Number.isFinite(caloriesTendency ?? NaN)
    ? 'Stable energy intake'
    : ${Math.abs(Math.round(caloriesTendency ?? 0))}%  vs last week;

  return (
    <ProgressCardContainer style={styles.card} padding={20} onPress={onPressDetails}>
      <Text style={styles.title}>Weekly snapshot</Text>
      <Text style={styles.subtitle}>Quick highlights from your recent logs</Text>

      <View style={styles.row}>
        <View style={styles.highlight}>
          <trendIcon size={18} color={trendColor} />
          <Text style={styles.highlightLabel}>Energy trend</Text>
          <Text style={[styles.highlightValue, { color: trendColor }]}>{trendLabel}</Text>
        </View>
        <View style={styles.highlight}>
          <Text style={styles.highlightLabel}>Meals logged</Text>
          <Text style={styles.highlightValue}>{mealsLogged}</Text>
          <Text style={styles.highlightHelper}>This week</Text>
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.highlight}>
          <Text style={styles.highlightLabel}>Avg sleep</Text>
          <Text style={styles.highlightValue}>
            {Number.isFinite(averageSleepHours ?? NaN)
              ? ${Math.round((averageSleepHours ?? 0) * 10) / 10} hrs
              : '--'}
          </Text>
          <Text style={styles.highlightHelper}>Reported via tracking</Text>
        </View>
        <View style={styles.highlight}>
          <Text style={styles.highlightLabel}>Healthy choices</Text>
          <Text style={styles.highlightValue}>
            {typeof healthyPercent === 'number' ? ${healthyPercent}% : '--'}
          </Text>
          <Text style={styles.highlightHelper}>Meals meeting macro targets</Text>
        </View>
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
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  highlight: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 12,
  },
  highlightLabel: {
    fontSize: 12,
    color: Colors.lightText,
    marginBottom: 4,
  },
  highlightValue: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: Typography.weights.semibold,
  },
  highlightHelper: {
    fontSize: 11,
    color: Colors.lightText,
    marginTop: 4,
  },
});
