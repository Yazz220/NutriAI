import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';

import { Colors } from '@/constants/colors';
import { Spacing, Typography } from '@/constants/spacing';
import type { WeightTrackingHandle } from '@/hooks/useWeightTracking';
import { ProgressCardContainer } from '@/components/progress/ProgressCardContainer';

const screenWidth = Dimensions.get('window').width;
const horizontalMargins = 16 * 2; // ProgressCardContainer default horizontal margins
const horizontalPadding = Spacing.xl * 2;
const defaultChartWidth = Math.max(260, screenWidth - horizontalMargins - horizontalPadding);

const formatKg = (value?: number | null) => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '--';
  }
  return `${value.toFixed(1)} kg`;
};

const formatDate = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${month}/${day}`;
};

export const WeightProgressChartCard = ({ tracking }: { tracking: WeightTrackingHandle }) => {
  const { entries, goal } = tracking;

  const chartState = useMemo(() => {
    if (!entries || entries.length === 0) {
      return null as null | {
        labels: string[];
        data: number[];
        lastWeight: number;
        lastDate: string;
      };
    }

    const sorted = entries
      .slice()
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const trimmed = sorted.slice(-7);
    const labels = trimmed.map((entry) => formatDate(entry.date));
    const data = trimmed.map((entry) => Number(entry.weight.toFixed(1)));
    const last = trimmed[trimmed.length - 1];

    return {
      labels,
      data,
      lastWeight: last.weight,
      lastDate: last.date,
    };
  }, [entries]);

  return (
    <ProgressCardContainer padding={Spacing.xl}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionLabel}>Goal progress</Text>
      </View>

      {chartState ? (
        <View style={styles.chartWrapper}>
          <LineChart
            data={{
              labels: chartState.labels,
              datasets: [
                {
                  data: chartState.data,
                  color: (opacity = 1) => `rgba(106, 162, 69, ${opacity})`,
                  strokeWidth: 3,
                },
              ],
            }}
            width={defaultChartWidth}
            height={220}
            yAxisSuffix=" kg"
            chartConfig={{
              backgroundGradientFrom: Colors.card,
              backgroundGradientTo: Colors.card,
              decimalPlaces: 1,
              color: (opacity = 1) => `rgba(63, 109, 42, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(104, 118, 70, ${opacity})`,
              fillShadowGradient: Colors.success,
              fillShadowGradientOpacity: 0.16,
              propsForDots: {
                r: '5',
                strokeWidth: '2',
                stroke: Colors.white,
              },
              propsForBackgroundLines: {
                strokeDasharray: '',
                stroke: Colors.border,
              },
            }}
            bezier
            withVerticalLines={false}
            segments={4}
            style={styles.chart}
            renderDotContent={({ x, y, index, value }) => {
              if (index !== chartState.data.length - 1) {
                return null;
              }
              const numericValue = typeof value === 'string' ? parseFloat(value) : Number(value);
              return (
                <View key={`dot-${index}`} style={[styles.dotLabel, { left: x - 38, top: y - 40 }]}> 
                  <Text style={styles.dotLabelText}>{numericValue.toFixed(1)} kg</Text>
                </View>
              );
            }}
          />

          <View style={styles.footerRow}>
            <View style={styles.footerItem}>
              <Text style={styles.footerLabel}>Last update</Text>
              <Text style={styles.footerValue}>{formatDate(chartState.lastDate)}</Text>
            </View>
            <View style={styles.footerItem}>
              <Text style={styles.footerLabel}>Current</Text>
              <Text style={styles.footerValue}>{formatKg(chartState.lastWeight)}</Text>
            </View>
            <View style={styles.footerItem}>
              <Text style={styles.footerLabel}>Goal</Text>
              <Text style={styles.footerValue}>{formatKg(goal?.targetWeight)}</Text>
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No data yet</Text>
          <Text style={styles.emptySubtitle}>Log a weight entry to unlock your progress chart.</Text>
        </View>
      )}
    </ProgressCardContainer>
  );
};

const styles = StyleSheet.create({
  headerRow: {
    width: '100%',
    marginBottom: Spacing.lg,
  },
  sectionLabel: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  chartWrapper: {
    width: '100%',
    alignItems: 'center',
  },
  chart: {
    borderRadius: 16,
  },
  dotLabel: {
    position: 'absolute',
    backgroundColor: Colors.success,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  dotLabelText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    color: Colors.onSuccess,
  },
  footerRow: {
    width: '100%',
    marginTop: Spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerItem: {
    flex: 1,
    alignItems: 'center',
  },
  footerLabel: {
    fontSize: Typography.sizes.sm,
    color: Colors.lightText,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  footerValue: {
    marginTop: 4,
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
  },
  emptyState: {
    width: '100%',
    paddingVertical: Spacing.xl,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    fontSize: Typography.sizes.md,
    color: Colors.lightText,
    textAlign: 'center',
  },
});
