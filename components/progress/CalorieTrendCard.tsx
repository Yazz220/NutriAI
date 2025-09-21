import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { ChevronRight, TrendingUp, TrendingDown } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/spacing';
import { ProgressCardContainer } from '@/components/progress/ProgressCardContainer';

interface CaloriePoint {
  date: string;
  consumed: number;
  goal: number;
}

interface CalorieTrendCardProps {
  data: CaloriePoint[];
  onPressDetails?: () => void;
}

const { width: screenWidth } = Dimensions.get('window');
const chartWidth = screenWidth - 64;

const chartConfig = {
  backgroundGradientFrom: Colors.card,
  backgroundGradientTo: Colors.card,
  decimalPlaces: 0,
  color: (opacity = 1) => gba(34, 197, 94, ),
  labelColor: () => Colors.lightText,
  propsForDots: {
    r: '3',
    strokeWidth: '2',
    stroke: Colors.primary,
  },
  propsForBackgroundLines: {
    stroke: Colors.border,
  },
};

export const CalorieTrendCard: React.FC<CalorieTrendCardProps> = ({ data, onPressDetails }) => {
  const hasData = data.some(point => point.consumed > 0 || point.goal > 0);

  const labels = data.map(point => new Date(point.date).toLocaleDateString('en-US', { weekday: 'short' }));

  const consumedSeries = data.map(point => point.consumed);
  const goalSeries = data.map(point => point.goal);

  const totalConsumed = consumedSeries.reduce((sum, value) => sum + value, 0);
  const totalGoal = goalSeries.reduce((sum, value) => sum + value, 0);
  const averageConsumed = data.length ? Math.round(totalConsumed / data.length) : 0;
  const averageGoal = data.length ? Math.round(totalGoal / data.length) : 0;
  const adherence = averageGoal > 0 ? Math.round((averageConsumed / averageGoal) * 100) : 0;

  const trend = (() => {
    if (data.length < 2) return 0;
    const mid = Math.floor(data.length / 2);
    const firstHalf = consumedSeries.slice(0, mid);
    const secondHalf = consumedSeries.slice(mid);
    const firstAvg = firstHalf.reduce((sum, value) => sum + value, 0) / Math.max(firstHalf.length, 1);
    const secondAvg = secondHalf.reduce((sum, value) => sum + value, 0) / Math.max(secondHalf.length, 1);
    return Math.round(((secondAvg - firstAvg) / Math.max(firstAvg, 1)) * 100);
  })();

  const trendIcon = trend >= 0 ? TrendingUp : TrendingDown;
  const trendColor = trend >= 0 ? Colors.success : Colors.error;

  return (
    <ProgressCardContainer style={styles.card} padding={20}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Energy trend</Text>
        <TouchableOpacity style={styles.detailButton} onPress={onPressDetails} accessibilityRole="button">
          <Text style={styles.detailText}>See details</Text>
          <ChevronRight size={16} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.metricRow}>
        <View style={styles.metricItem}>
          <Text style={styles.metricValue}>{averageConsumed.toLocaleString()} kcal</Text>
          <Text style={styles.metricLabel}>Average daily intake</Text>
        </View>
        <View style={styles.metricItem}>
          <Text style={styles.metricValue}>{adherence}%</Text>
          <Text style={styles.metricLabel}>Goal adherence</Text>
        </View>
        <View style={styles.metricItem}>
          <View style={styles.trendIndicator}>
            <trendIcon size={16} color={trendColor} />
            <Text style={[styles.metricValue, { color: trendColor }]}>{Math.abs(trend)}%</Text>
          </View>
          <Text style={styles.metricLabel}>Change vs prior days</Text>
        </View>
      </View>

      {hasData ? (
        <View accessible accessibilityLabel="Line chart of calories consumed versus goal over the past days">
          <LineChart
            data={{
              labels,
              datasets: [
                {
                  data: consumedSeries,
                  color: (opacity = 1) => gba(34, 197, 94, ),
                  strokeWidth: 3,
                },
                {
                  data: goalSeries,
                  color: (opacity = 1) => gba(148, 163, 184, ),
                  strokeWidth: 2,
                },
              ],
              legend: ['Consumed', 'Goal'],
            }}
            width={chartWidth}
            height={180}
            chartConfig={chartConfig}
            style={styles.chart}
            bezier
            fromZero
          />
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No logs yet</Text>
          <Text style={styles.emptySubtitle}>Track meals to unlock your personal trend</Text>
        </View>
      )}

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Targets are based on your current goal. Consistency over time helps Nosh refine recommendations.
        </Text>
      </View>
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
  detailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: Typography.weights.semibold,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  metricItem: {
    flex: 1,
    paddingHorizontal: 4,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
  },
  metricLabel: {
    fontSize: 12,
    color: Colors.lightText,
    marginTop: 2,
  },
  trendIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  chart: {
    borderRadius: 16,
  },
  emptyState: {
    height: 160,
    borderRadius: 16,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
  },
  emptySubtitle: {
    fontSize: 12,
    color: Colors.lightText,
    marginTop: 4,
  },
  footer: {
    marginTop: 16,
  },
  footerText: {
    fontSize: 12,
    color: Colors.lightText,
    lineHeight: 18,
  },
});
