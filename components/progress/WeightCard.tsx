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
  const currentWeight = getCurrentWeight();
  const currentWeightValue = currentWeight?.weight;
  const goalWeight = goal?.targetWeight;
  const stats = getProgressStats();
  const progressPercentage = Math.round(stats.progress);
  const trend = getWeightTrend();

  const formatLastWeighIn = () => {
    if (!currentWeight) return '7d';
    
    const entryDate = new Date(currentWeight.date);
    const today = new Date();
    const daysDiff = Math.floor((today.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff === 0) return 'Today';
    if (daysDiff === 1) return '1d';
    return `${daysDiff}d`;
  };

  // Prepare chart data for last 30 days
  const chartData = useMemo(() => {
    const recentEntries = entries.slice(-10); // Last 10 entries for readability
    if (recentEntries.length < 2) return null;

    return {
      labels: recentEntries.map((_, i) => i % 3 === 0 ? 
        new Date(recentEntries[i].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''),
      datasets: [{
        data: recentEntries.map(entry => entry.weight),
        color: (opacity = 1) => `rgba(34, 197, 94, ${opacity})`,
        strokeWidth: 2,
      }]
    };
  }, [entries]);

  return (
    <ProgressCardContainer onPress={onPress} style={styles.card} padding={20}>
      <View style={styles.cardContent}>
        <View style={styles.header}>
          <Text style={styles.title}>My Weight</Text>
        </View>
        
        <View style={styles.weightDisplay}>
          <Text style={styles.currentWeight}>{typeof currentWeightValue === 'number' ? `${currentWeightValue.toFixed(1)} kg` : '-- kg'}</Text>
          <View style={styles.goalRow}>
            <Text style={styles.goalWeight}>Goal {typeof goalWeight === 'number' ? `${goalWeight.toFixed(1)} kg` : '-- kg'}</Text>
            {trend && trend.weightChange !== 0 && (
              <View style={styles.trendContainer}>
                {trend.weightChange > 0 ? (
                  <TrendingUp size={14} color={Colors.success} />
                ) : (
                  <TrendingDown size={14} color={Colors.error} />
                )}
                <Text style={[styles.trendText, { 
                  color: trend.weightChange > 0 ? Colors.success : Colors.error
                }]}>
                  {Math.abs(trend.weightChange).toFixed(1)}kg
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Mini Chart */}
        {chartData && (
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
        )}

        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progressPercentage}%` }]} />
          </View>
          <Text style={styles.progressText}>{progressPercentage}%</Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.nextWeighIn}>Last weigh-in: {formatLastWeighIn()}</Text>
          <View style={styles.footerRight}>
            <Calendar size={12} color={Colors.lightText} />
            <Text style={styles.entriesCount}>{entries.length} entries</Text>
          </View>
        </View>
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
