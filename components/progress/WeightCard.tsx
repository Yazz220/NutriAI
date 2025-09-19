import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { TrendingUp, TrendingDown, Calendar } from 'lucide-react-native';

import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/spacing';
import { useWeightTracking } from '@/hooks/useWeightTracking';
import { ProgressCardContainer } from '@/components/progress/ProgressCardContainer';

const { width: screenWidth } = Dimensions.get('window');

interface WeightCardProps {
  onPress: () => void;
}

export const WeightCard: React.FC<WeightCardProps> = ({ onPress }) => {
  const { getCurrentWeight, goal, getProgressStats, entries, getWeightTrend } = useWeightTracking();
  
  // Extract weight data
  const currentWeight = getCurrentWeight();
  const currentWeightValue = currentWeight?.weight;
  const goalWeight = goal?.targetWeight;
  const stats = getProgressStats();
  const progressPercentage = Math.round(stats.progress);
  const trend = getWeightTrend();

  /**
   * Formats the last weigh-in date as a human-readable string
   */
  const formatLastWeighIn = () => {
    if (!currentWeight) return '7d';
    
    const entryDate = new Date(currentWeight.date);
    const today = new Date();
    const daysDiff = Math.floor((today.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff === 0) return 'Today';
    if (daysDiff === 1) return '1d';
    return `${daysDiff}d`;
  };

  /**
   * Prepares chart data from recent weight entries
   */
  const chartData = useMemo(() => {
    const recentEntries = entries.slice(-10); // Last 10 entries for readability
    if (recentEntries.length < 2) return null;

    return {
      labels: recentEntries.map((entry, index) => {
        // Show labels only every 3rd entry to avoid crowding
        return index % 3 === 0 
          ? new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          : '';
      }),
      datasets: [{
        data: recentEntries.map(entry => entry.weight),
        color: (opacity = 1) => `rgba(34, 197, 94, ${opacity})`,
        strokeWidth: 2,
      }]
    };
  }, [entries]);

  /**
   * Renders the weight trend indicator with icon and change amount
   */
  const renderWeightTrend = () => {
    if (!trend || trend.weightChange === 0) return null;

    const isPositive = trend.weightChange > 0;
    const trendColor = isPositive ? Colors.success : Colors.error;
    const TrendIcon = isPositive ? TrendingUp : TrendingDown;

    return (
      <View style={styles.trendContainer}>
        <TrendIcon size={14} color={trendColor} />
        <Text style={[styles.trendText, { color: trendColor }]}>
          {Math.abs(trend.weightChange).toFixed(1)}kg
        </Text>
      </View>
    );
  };

  /**
   * Renders the mini weight chart if data is available
   */
  const renderMiniChart = () => {
    if (!chartData) return null;

    return (
      <View style={styles.chartContainer}>
        <LineChart
          data={chartData}
          width={screenWidth * 0.4}
          height={80}
          chartConfig={{
            backgroundGradientFrom: Colors.card,
            backgroundGradientTo: Colors.card,
            decimalPlaces: 1,
            color: (opacity = 1) => `rgba(34, 197, 94, ${opacity})`,
            labelColor: (opacity = 1) => Colors.lightText,
            propsForBackgroundLines: { stroke: 'transparent' },
          }}
          style={styles.chart}
        />
      </View>
    );
  };

  /**
   * Renders the progress bar showing goal completion percentage
   */
  const renderProgressBar = () => (
    <View style={styles.progressContainer}>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${progressPercentage}%` }]} />
      </View>
      <Text style={styles.progressText}>{progressPercentage}%</Text>
    </View>
  );

  /**
   * Renders the footer with last weigh-in date and entry count
   */
  const renderFooter = () => (
    <View style={styles.footer}>
      <Text style={styles.nextWeighIn}>Last weigh-in: {formatLastWeighIn()}</Text>
      <View style={styles.footerRight}>
        <Calendar size={12} color={Colors.lightText} />
        <Text style={styles.entriesCount}>{entries.length} entries</Text>
      </View>
    </View>
  );

  return (
    <ProgressCardContainer onPress={onPress} style={styles.card} padding={20}>
      <View style={styles.cardContent}>
        <View style={styles.header}>
          <Text style={styles.title}>My Weight</Text>
        </View>
        
        <View style={styles.weightDisplay}>
          <Text style={styles.currentWeight}>
            {typeof currentWeightValue === 'number' ? `${currentWeightValue.toFixed(1)} kg` : '-- kg'}
          </Text>
          <View style={styles.goalRow}>
            <Text style={styles.goalWeight}>
              Goal {typeof goalWeight === 'number' ? `${goalWeight.toFixed(1)} kg` : '-- kg'}
            </Text>
            {renderWeightTrend()}
          </View>
        </View>

        {renderMiniChart()}

        {renderProgressBar()}

        {renderFooter()}
      </View>
    </ProgressCardContainer>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 0, // padding handled by GlassSurface
    marginVertical: 8,
  },
  cardContent: {
    // No specific styling needed
  },
  header: {
    marginBottom: 12,
  },
  title: {
    fontSize: 14,
    color: Colors.lightText,
    fontWeight: Typography.weights.medium,
  },
  weightDisplay: {
    marginBottom: 12,
  },
  currentWeight: {
    fontSize: 28,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    marginBottom: 4,
  },
  goalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  goalWeight: {
    fontSize: 14,
    color: Colors.lightText,
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trendText: {
    fontSize: 12,
    fontWeight: Typography.weights.medium,
  },
  chartContainer: {
    alignItems: 'center',
    marginBottom: 12,
    overflow: 'hidden',
    borderRadius: 8,
  },
  chart: {
    borderRadius: 8,
  },
  progressContainer: {
    marginBottom: 12,
  },
  progressBar: {
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  progressText: {
    marginTop: 6,
    fontSize: 12,
    color: Colors.lightText,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nextWeighIn: {
    fontSize: 14,
    color: Colors.lightText,
  },
  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  entriesCount: {
    fontSize: 12,
    color: Colors.lightText,
  },
});
