import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { Calendar, TrendingUp, TrendingDown, BarChart3, Activity } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { Spacing, Typography } from '@/constants/spacing';
import { WeeklyTrend, DailyProgress } from '@/hooks/useNutrition';

interface NutritionTrendsProps {
  weeklyTrends: WeeklyTrend[];
  getDailyProgress: (date: string) => DailyProgress;
  selectedDate: string;
  onDateChange: (date: string) => void;
}

type TrendPeriod = '7d' | '30d' | '90d';
type ChartType = 'calories' | 'adherence' | 'macros';

const screenWidth = Dimensions.get('window').width;

export const NutritionTrends: React.FC<NutritionTrendsProps> = ({
  weeklyTrends,
  getDailyProgress,
  selectedDate,
  onDateChange,
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState<TrendPeriod>('7d');
  const [selectedChart, setSelectedChart] = useState<ChartType>('calories');

  // Generate daily data for the selected period
  const dailyData = useMemo(() => {
    const days = selectedPeriod === '7d' ? 7 : selectedPeriod === '30d' ? 30 : 90;
    const data: DailyProgress[] = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateISO = date.toISOString().split('T')[0];
      data.push(getDailyProgress(dateISO));
    }
    
    return data;
  }, [selectedPeriod, getDailyProgress]);

  // Chart configuration
  const chartConfig = {
    backgroundColor: Colors.card,
    backgroundGradientFrom: Colors.card,
    backgroundGradientTo: Colors.card,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(74, 144, 226, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(156, 163, 175, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: Colors.primary,
    },
    propsForBackgroundLines: {
      strokeDasharray: '',
      stroke: Colors.border,
      strokeWidth: 1,
    },
  };

  // Prepare chart data based on selected chart type
  const getChartData = () => {
    const labels = dailyData.map(day => {
      const date = new Date(day.date);
      return selectedPeriod === '7d' 
        ? date.toLocaleDateString(undefined, { weekday: 'short' })
        : `${date.getMonth() + 1}/${date.getDate()}`;
    });

    switch (selectedChart) {
      case 'calories':
        return {
          labels,
          datasets: [
            {
              data: dailyData.map(day => day.calories.consumed),
              color: (opacity = 1) => `rgba(74, 144, 226, ${opacity})`,
              strokeWidth: 2,
            },
          ],
        };
      
      case 'adherence':
        return {
          labels,
          datasets: [
            {
              data: dailyData.map(day => Math.round(day.calories.percentage * 100)),
              color: (opacity = 1) => `rgba(34, 197, 94, ${opacity})`,
              strokeWidth: 2,
            },
          ],
        };
      
      case 'macros':
        return {
          labels,
          datasets: [
            {
              data: dailyData.map(day => day.macros.protein.consumed),
              color: (opacity = 1) => `rgba(76, 205, 196, ${opacity})`,
              strokeWidth: 2,
            },
            {
              data: dailyData.map(day => day.macros.carbs.consumed),
              color: (opacity = 1) => `rgba(255, 107, 107, ${opacity})`,
              strokeWidth: 2,
            },
            {
              data: dailyData.map(day => day.macros.fats.consumed),
              color: (opacity = 1) => `rgba(69, 183, 209, ${opacity})`,
              strokeWidth: 2,
            },
          ],
        };
      
      default:
        return { labels: [], datasets: [] };
    }
  };

  // Calculate trend statistics
  const trendStats = useMemo(() => {
    if (dailyData.length < 2) return null;

    const recent = dailyData.slice(-7); // Last 7 days
    const previous = dailyData.slice(-14, -7); // Previous 7 days

    const recentAvg = recent.reduce((sum, day) => sum + day.calories.consumed, 0) / recent.length;
    const previousAvg = previous.length > 0 
      ? previous.reduce((sum, day) => sum + day.calories.consumed, 0) / previous.length
      : recentAvg;

    const calorieChange = recentAvg - previousAvg;
    const calorieChangePercent = previousAvg > 0 ? (calorieChange / previousAvg) * 100 : 0;

    const recentAdherence = recent.reduce((sum, day) => sum + (day.status === 'met' ? 1 : 0), 0) / recent.length;
    const previousAdherence = previous.length > 0
      ? previous.reduce((sum, day) => sum + (day.status === 'met' ? 1 : 0), 0) / previous.length
      : recentAdherence;

    const adherenceChange = recentAdherence - previousAdherence;

    return {
      avgCalories: Math.round(recentAvg),
      calorieChange: Math.round(calorieChange),
      calorieChangePercent: Math.round(calorieChangePercent),
      adherenceRate: Math.round(recentAdherence * 100),
      adherenceChange: Math.round(adherenceChange * 100),
      daysOnTrack: recent.filter(day => day.status === 'met').length,
      totalDays: recent.length,
    };
  }, [dailyData]);

  const renderPeriodSelector = () => (
    <View style={styles.periodSelector}>
      {(['7d', '30d', '90d'] as TrendPeriod[]).map((period) => (
        <TouchableOpacity
          key={period}
          style={[
            styles.periodButton,
            selectedPeriod === period && styles.selectedPeriodButton,
          ]}
          onPress={() => setSelectedPeriod(period)}
        >
          <Text
            style={[
              styles.periodButtonText,
              selectedPeriod === period && styles.selectedPeriodButtonText,
            ]}
          >
            {period === '7d' ? '7 Days' : period === '30d' ? '30 Days' : '90 Days'}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderChartSelector = () => (
    <View style={styles.chartSelector}>
      {[
        { type: 'calories' as ChartType, label: 'Calories', icon: Activity },
        { type: 'adherence' as ChartType, label: 'Goal %', icon: TrendingUp },
        { type: 'macros' as ChartType, label: 'Macros', icon: BarChart3 },
      ].map(({ type, label, icon: Icon }) => (
        <TouchableOpacity
          key={type}
          style={[
            styles.chartButton,
            selectedChart === type && styles.selectedChartButton,
          ]}
          onPress={() => setSelectedChart(type)}
        >
          <Icon 
            size={16} 
            color={selectedChart === type ? Colors.primary : Colors.lightText} 
          />
          <Text
            style={[
              styles.chartButtonText,
              selectedChart === type && styles.selectedChartButtonText,
            ]}
          >
            {label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderTrendStats = () => {
    if (!trendStats) return null;

    return (
      <View style={styles.statsContainer}>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{trendStats.avgCalories}</Text>
            <Text style={styles.statLabel}>Avg Calories</Text>
            <View style={styles.statChange}>
              {trendStats.calorieChange > 0 ? (
                <TrendingUp size={12} color={Colors.success} />
              ) : trendStats.calorieChange < 0 ? (
                <TrendingDown size={12} color={Colors.warning} />
              ) : null}
              <Text
                style={[
                  styles.statChangeText,
                  {
                    color: trendStats.calorieChange > 0 
                      ? Colors.success 
                      : trendStats.calorieChange < 0 
                      ? Colors.warning 
                      : Colors.lightText
                  }
                ]}
              >
                {trendStats.calorieChange > 0 ? '+' : ''}{trendStats.calorieChange}
              </Text>
            </View>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statValue}>{trendStats.adherenceRate}%</Text>
            <Text style={styles.statLabel}>Goal Adherence</Text>
            <View style={styles.statChange}>
              {trendStats.adherenceChange > 0 ? (
                <TrendingUp size={12} color={Colors.success} />
              ) : trendStats.adherenceChange < 0 ? (
                <TrendingDown size={12} color={Colors.warning} />
              ) : null}
              <Text
                style={[
                  styles.statChangeText,
                  {
                    color: trendStats.adherenceChange > 0 
                      ? Colors.success 
                      : trendStats.adherenceChange < 0 
                      ? Colors.warning 
                      : Colors.lightText
                  }
                ]}
              >
                {trendStats.adherenceChange > 0 ? '+' : ''}{trendStats.adherenceChange}%
              </Text>
            </View>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statValue}>{trendStats.daysOnTrack}/{trendStats.totalDays}</Text>
            <Text style={styles.statLabel}>Days on Track</Text>
            <Text style={styles.statSubtext}>Last 7 days</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderChart = () => {
    const chartData = getChartData();
    
    if (chartData.datasets.length === 0 || chartData.datasets[0].data.length === 0) {
      return (
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>No data available for this period</Text>
        </View>
      );
    }

    const chartWidth = screenWidth - (Spacing.md * 2);

    return (
      <View style={styles.chartContainer}>
        <LineChart
          data={chartData}
          width={chartWidth}
          height={220}
          chartConfig={chartConfig}
          bezier
          style={styles.chart}
          withInnerLines={true}
          withOuterLines={false}
          withVerticalLines={false}
          withHorizontalLines={true}
          withDots={selectedPeriod === '7d'}
          withShadow={false}
          fromZero={selectedChart === 'adherence'}
        />
        
        {selectedChart === 'macros' && (
          <View style={styles.macroLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#4ECDC4' }]} />
              <Text style={styles.legendText}>Protein</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#FF6B6B' }]} />
              <Text style={styles.legendText}>Carbs</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#45B7D1' }]} />
              <Text style={styles.legendText}>Fats</Text>
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Nutrition Trends</Text>
        <Text style={styles.subtitle}>Track your progress over time</Text>
      </View>

      {renderTrendStats()}
      {renderPeriodSelector()}
      {renderChartSelector()}
      {renderChart()}

      {/* Weekly Summary */}
      {weeklyTrends.length > 0 && (
        <View style={styles.weeklySection}>
          <Text style={styles.sectionTitle}>Weekly Summary</Text>
          {weeklyTrends.slice(0, 4).map((week, index) => (
            <View key={week.weekStartDate} style={styles.weekCard}>
              <View style={styles.weekHeader}>
                <Text style={styles.weekDate}>
                  Week of {new Date(week.weekStartDate).toLocaleDateString()}
                </Text>
                <Text style={styles.weekAdherence}>{week.goalAdherence}% adherence</Text>
              </View>
              <View style={styles.weekStats}>
                <Text style={styles.weekCalories}>
                  Avg: {week.averageCalories} cal/day
                </Text>
                <Text style={styles.weekDays}>
                  {week.daysMetGoal}/{week.totalDays} days on track
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.lg,
  },
  title: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: Typography.sizes.sm,
    color: Colors.lightText,
  },
  
  // Stats
  statsContainer: {
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.lg,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    alignItems: 'center',
  },
  statValue: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: Typography.sizes.xs,
    color: Colors.lightText,
    textAlign: 'center',
    marginBottom: 4,
  },
  statChange: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  statChangeText: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.medium,
  },
  statSubtext: {
    fontSize: Typography.sizes.xs,
    color: Colors.lightText,
    textAlign: 'center',
  },
  
  // Period selector
  periodSelector: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  periodButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    alignItems: 'center',
  },
  selectedPeriodButton: {
    borderColor: Colors.primary,
    backgroundColor: Colors.tints.brandTintSoft,
  },
  periodButtonText: {
    fontSize: Typography.sizes.sm,
    color: Colors.text,
    fontWeight: Typography.weights.medium,
  },
  selectedPeriodButtonText: {
    color: Colors.primary,
  },
  
  // Chart selector
  chartSelector: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  chartButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    gap: Spacing.xs,
  },
  selectedChartButton: {
    borderColor: Colors.primary,
    backgroundColor: Colors.tints.brandTintSoft,
  },
  chartButtonText: {
    fontSize: Typography.sizes.sm,
    color: Colors.lightText,
    fontWeight: Typography.weights.medium,
  },
  selectedChartButtonText: {
    color: Colors.primary,
  },
  
  // Chart
  chartContainer: {
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.lg,
  },
  chart: {
    borderRadius: 16,
  },
  macroLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing.md,
    gap: Spacing.lg,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: Typography.sizes.xs,
    color: Colors.lightText,
  },
  noDataContainer: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 220,
  },
  noDataText: {
    fontSize: Typography.sizes.sm,
    color: Colors.lightText,
    textAlign: 'center',
  },
  
  // Weekly section
  weeklySection: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  weekCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  weekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  weekDate: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    color: Colors.text,
  },
  weekAdherence: {
    fontSize: Typography.sizes.sm,
    color: Colors.primary,
    fontWeight: Typography.weights.medium,
  },
  weekStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  weekCalories: {
    fontSize: Typography.sizes.sm,
    color: Colors.lightText,
  },
  weekDays: {
    fontSize: Typography.sizes.sm,
    color: Colors.lightText,
  },
});