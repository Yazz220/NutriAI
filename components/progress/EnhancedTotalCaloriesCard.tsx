import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { BarChart, LineChart } from 'react-native-chart-kit';
import { ChevronRight, TrendingUp, TrendingDown, BarChart3, LineChart as LineChartIcon, Target } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/spacing';
import { useNutritionWithMealPlan } from '@/hooks/useNutritionWithMealPlan';
import { ProgressCardContainer } from '@/components/progress/ProgressCardContainer';

const { width: screenWidth } = Dimensions.get('window');
const chartWidth = screenWidth - 64;

interface EnhancedTotalCaloriesCardProps { 
  onPress?: () => void; 
  onOpenPeriod?: (period: 'week' | 'month' | 'quarter') => void;
}

type PeriodKey = 'week' | 'month' | 'quarter';
type ChartType = 'bar' | 'line';

const PERIODS: { key: PeriodKey; label: string; days: number }[] = [
  { key: 'week', label: 'Week', days: 7 },
  { key: 'month', label: 'Month', days: 30 },
  { key: 'quarter', label: '3 Months', days: 90 },
];

export const EnhancedTotalCaloriesCard: React.FC<EnhancedTotalCaloriesCardProps> = ({ onPress, onOpenPeriod }) => {
  const { getDailyProgress } = useNutritionWithMealPlan();
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodKey>('week');
  const [chartType, setChartType] = useState<ChartType>('bar');

  // Safe progress getter to avoid runtime crashes on missing data
  const getSafeProgress = (date: string) => {
    const p: any = getDailyProgress?.(date) ?? {};
    return {
      calories: {
        consumed: typeof p?.calories?.consumed === 'number' ? p.calories.consumed : 0,
        goal: typeof p?.calories?.goal === 'number' ? p.calories.goal : 0,
      },
    };
  };

  const computeStats = (days: number) => {
    const list: string[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      list.push(d.toISOString().split('T')[0]);
    }
    
    const dailyData = list.map(ds => {
      const p = getSafeProgress(ds);
      return {
        date: ds,
        consumed: p.calories.consumed,
        goal: p.calories.goal,
        adherence: p.calories.goal > 0 ? (p.calories.consumed / p.calories.goal) * 100 : 0
      };
    });

    const totalConsumed = dailyData.reduce((sum, d) => sum + d.consumed, 0);
    const totalGoal = dailyData.reduce((sum, d) => sum + d.goal, 0);
    const avgDaily = Math.round(totalConsumed / days);
    const avgAdherence = Math.round(dailyData.reduce((sum, d) => sum + d.adherence, 0) / days);
    
    // Calculate trend (comparing first half vs second half)
    const midPoint = Math.floor(dailyData.length / 2);
    const firstHalf = dailyData.slice(0, midPoint);
    const secondHalf = dailyData.slice(midPoint);
    const firstAvg = firstHalf.reduce((sum, d) => sum + d.consumed, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, d) => sum + d.consumed, 0) / secondHalf.length;
    const trend = firstAvg > 0 ? ((secondAvg - firstAvg) / firstAvg) * 100 : 0;

    return { 
      totalConsumed: Math.round(totalConsumed), 
      totalGoal: Math.round(totalGoal), 
      avgDaily,
      avgAdherence,
      trend,
      dailyData,
      hasData: dailyData.some(d => d.consumed > 0)
    };
  };

  const currentStats = useMemo(() => {
    const period = PERIODS.find(p => p.key === selectedPeriod);
    return computeStats(period?.days || 7);
  }, [selectedPeriod, getDailyProgress]);

  const allStats = useMemo(() => {
    return PERIODS.map(p => ({ 
      key: p.key, 
      label: p.label, 
      ...computeStats(p.days) 
    }));
  }, [getDailyProgress]);

  // Prepare chart data
  const chartData = useMemo(() => {
    if (!currentStats.hasData) return null;

    const recentData = currentStats.dailyData.slice(-7); // Show last 7 days for readability
    
    return {
      labels: recentData.map(d => new Date(d.date).toLocaleDateString('en-US', { weekday: 'short' })),
      datasets: [{
        data: recentData.map(d => d.consumed),
        color: (opacity = 1) => `rgba(74, 144, 226, ${opacity})`,
        strokeWidth: 3,
      }]
    };
  }, [currentStats]);

  const renderChart = () => {
    if (!chartData) {
      return (
        <View style={styles.emptyChart}>
          <Target size={32} color={Colors.lightText} />
          <Text style={styles.emptyChartText}>Start logging to see your progress</Text>
        </View>
      );
    }

    const chartConfig = {
      backgroundGradientFrom: Colors.card,
      backgroundGradientTo: Colors.card,
      decimalPlaces: 0,
      color: (opacity = 1) => `rgba(74, 144, 226, ${opacity})`,
      labelColor: (opacity = 1) => Colors.lightText,
      propsForBackgroundLines: { stroke: Colors.border, strokeWidth: 0.5 },
    };

    if (chartType === 'bar') {
      return (
        <BarChart
          data={chartData}
          width={chartWidth}
          height={160}
          chartConfig={chartConfig}
          style={styles.chart}
        />
      );
    } else {
      return (
        <LineChart
          data={chartData}
          width={chartWidth}
          height={160}
          chartConfig={chartConfig}
          bezier
          style={styles.chart}
        />
      );
    }
  };

  return (
    <ProgressCardContainer onPress={onPress} style={styles.card} padding={20}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.title}>Calorie Analytics</Text>
      </View>

      {/* Period Selector */}
      <View style={styles.periodSelector}>
        {PERIODS.map(period => (
          <TouchableOpacity
            key={period.key}
            style={[styles.periodButton, selectedPeriod === period.key && styles.periodButtonActive]}
            onPress={() => setSelectedPeriod(period.key)}
          >
            <Text style={[styles.periodText, selectedPeriod === period.key && styles.periodTextActive]}>
              {period.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Key Metrics */}
      <View style={styles.metricsRow}>
        <View style={styles.metricItem}>
          <Text style={styles.metricValue}>{currentStats.avgDaily}</Text>
          <Text style={styles.metricLabel}>Avg Daily</Text>
        </View>
        <View style={styles.metricItem}>
          <Text style={styles.metricValue}>{currentStats.avgAdherence}%</Text>
          <Text style={styles.metricLabel}>Adherence</Text>
        </View>
        <View style={styles.metricItem}>
          <View style={styles.trendContainer}>
            {currentStats.trend > 0 ? (
              <TrendingUp size={16} color={Colors.success} />
            ) : currentStats.trend < 0 ? (
              <TrendingDown size={16} color={Colors.error} />
            ) : null}
            <Text style={[styles.metricValue, { 
              color: currentStats.trend > 0 ? Colors.success : currentStats.trend < 0 ? Colors.error : Colors.text 
            }]}>
              {currentStats.trend > 0 ? '+' : ''}{currentStats.trend.toFixed(1)}%
            </Text>
          </View>
          <Text style={styles.metricLabel}>Trend</Text>
        </View>
      </View>

      {/* Chart */}
      <View style={styles.chartContainer}>
        {renderChart()}
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
    position: 'relative',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    textAlign: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  chartTypeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chartTypeButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: Colors.primary,
  },
  periodText: {
    fontSize: 14,
    fontWeight: Typography.weights.medium,
    color: Colors.text,
  },
  periodTextActive: {
    color: Colors.white,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    paddingVertical: 12,
    backgroundColor: Colors.background,
    borderRadius: 12,
  },
  metricItem: {
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 18,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    marginBottom: 2,
  },
  metricLabel: {
    fontSize: 12,
    color: Colors.lightText,
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  chartContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  chart: {
    borderRadius: 16,
  },
  emptyChart: {
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
    borderRadius: 16,
  },
  emptyChartText: {
    fontSize: 14,
    color: Colors.lightText,
    marginTop: 8,
  },
});
