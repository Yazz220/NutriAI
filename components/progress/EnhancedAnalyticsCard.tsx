import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ScrollView } from 'react-native';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import { Calendar, TrendingUp, TrendingDown, Download, Filter, BarChart3, LineChart as LineChartIcon, PieChart as PieChartIcon } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { ComponentThemes, ChartPalettes } from '@/constants/colorThemes';
import { Typography } from '@/constants/spacing';
import { useNutritionWithMealPlan } from '@/hooks/useNutritionWithMealPlan';
import { useWeightTracking } from '@/hooks/useWeightTracking';
import { ProgressCardContainer } from '@/components/progress/ProgressCardContainer';
import { exportToCSV, ExportData } from '@/utils/exportUtils';

const { width: screenWidth } = Dimensions.get('window');
const chartWidth = screenWidth - 64;

type ChartType = 'line' | 'bar' | 'pie';
type DataType = 'calories' | 'weight' | 'macros' | 'adherence';
type TimeRange = '7d' | '30d' | '90d' | '1y';

interface EnhancedAnalyticsCardProps {
  onPress?: () => void;
}

export const EnhancedAnalyticsCard: React.FC<EnhancedAnalyticsCardProps> = ({ onPress }) => {
  const { getDailyProgress } = useNutritionWithMealPlan();
  const { entries: weightEntries } = useWeightTracking();
  
  const [selectedChart, setSelectedChart] = useState<ChartType>('line');
  const [selectedData, setSelectedData] = useState<DataType>('calories');
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [showFilters, setShowFilters] = useState(false);

  const timeRangeOptions = [
    { key: '7d' as TimeRange, label: '7D', days: 7 },
    { key: '30d' as TimeRange, label: '1M', days: 30 },
    { key: '90d' as TimeRange, label: '3M', days: 90 },
    { key: '1y' as TimeRange, label: '1Y', days: 365 },
  ];

  // Safe progress getter to guard against undefined/null fields
  const getSafeProgress = (date: string) => {
    const p: any = getDailyProgress?.(date) ?? {};
    return {
      calories: {
        consumed: typeof p?.calories?.consumed === 'number' ? p.calories.consumed : 0,
        goal: typeof p?.calories?.goal === 'number' ? p.calories.goal : 0,
      },
      macros: {
        protein: {
          consumed: typeof p?.macros?.protein?.consumed === 'number' ? p.macros.protein.consumed : 0,
          goal: typeof p?.macros?.protein?.goal === 'number' ? p.macros.protein.goal : 0,
        },
        carbs: {
          consumed: typeof p?.macros?.carbs?.consumed === 'number' ? p.macros.carbs.consumed : 0,
          goal: typeof p?.macros?.carbs?.goal === 'number' ? p.macros.carbs.goal : 0,
        },
        fats: {
          consumed: typeof p?.macros?.fats?.consumed === 'number' ? p.macros.fats.consumed : 0,
          goal: typeof p?.macros?.fats?.goal === 'number' ? p.macros.fats.goal : 0,
        },
      },
    };
  };

  const dataTypeOptions = [
    { key: 'calories' as DataType, label: 'Calories', charts: ['line', 'bar'] },
    { key: 'weight' as DataType, label: 'Weight', charts: ['line'] },
    { key: 'macros' as DataType, label: 'Macros', charts: ['pie', 'bar'] },
    { key: 'adherence' as DataType, label: 'Goal Adherence', charts: ['bar', 'pie'] },
  ];

  // Generate data based on selected parameters
  const chartData = useMemo(() => {
    const days = timeRangeOptions.find(t => t.key === timeRange)?.days || 30;
    const dates: string[] = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().split('T')[0]);
    }

    switch (selectedData) {
      case 'calories': {
        const calorieData = dates.map(date => {
          const progress = getSafeProgress(date);
          return {
            date,
            consumed: progress.calories.consumed,
            goal: progress.calories.goal,
            adherence: progress.calories.goal > 0 ? (progress.calories.consumed / progress.calories.goal) * 100 : 0
          };
        });

        if (selectedChart === 'line') {
          return {
            labels: calorieData.map((_, i) => i % Math.ceil(calorieData.length / 6) === 0 ? 
              new Date(dates[i]).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''),
            datasets: [
              {
                data: calorieData.map(d => d.consumed),
                color: (opacity = 1) => `rgba(74, 144, 226, ${opacity})`,
                strokeWidth: 3,
              },
              {
                data: calorieData.map(d => d.goal),
                color: (opacity = 1) => `rgba(156, 163, 175, ${opacity})`,
                strokeWidth: 2,
              }
            ],
            legend: ['Consumed', 'Goal']
          };
        } else if (selectedChart === 'bar') {
          const recentData = calorieData.slice(-7);
          return {
            labels: recentData.map(d => new Date(d.date).toLocaleDateString('en-US', { weekday: 'short' })),
            datasets: [{
              data: recentData.map(d => d.consumed)
            }]
          };
        }
        break;
      }

      case 'weight': {
        const filteredHistory = weightEntries.filter((entry: any) => {
          const entryDate = new Date(entry.date);
          const cutoffDate = new Date();
          cutoffDate.setDate(cutoffDate.getDate() - days);
          return entryDate >= cutoffDate;
        }).slice(-20); // Limit to last 20 entries for readability

        if (filteredHistory.length === 0) {
          return {
            labels: ['No Data'],
            datasets: [{ data: [0] }]
          };
        }

        return {
          labels: filteredHistory.map((_: any, i: number) => i % Math.ceil(filteredHistory.length / 6) === 0 ? 
            new Date(filteredHistory[i].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''),
          datasets: [{
            data: filteredHistory.map((entry: any) => entry.weight),
            color: (opacity = 1) => `rgba(34, 197, 94, ${opacity})`,
            strokeWidth: 3,
          }]
        };
      }

      case 'macros': {
        const macroData = dates.map(date => {
          const progress = getSafeProgress(date);
          return {
            protein: progress.macros.protein.consumed,
            carbs: progress.macros.carbs.consumed,
            fats: progress.macros.fats.consumed,
          };
        });

        const avgMacros = {
          protein: macroData.reduce((sum, d) => sum + d.protein, 0) / macroData.length,
          carbs: macroData.reduce((sum, d) => sum + d.carbs, 0) / macroData.length,
          fats: macroData.reduce((sum, d) => sum + d.fats, 0) / macroData.length,
        };

        if (selectedChart === 'pie') {
          return [
            { name: 'Protein', population: avgMacros.protein * 4, color: Colors.nutrition.protein, legendFontColor: Colors.text, legendFontSize: 12 },
            { name: 'Carbs', population: avgMacros.carbs * 4, color: Colors.nutrition.carbs, legendFontColor: Colors.text, legendFontSize: 12 },
            { name: 'Fats', population: avgMacros.fats * 9, color: Colors.nutrition.fats, legendFontColor: Colors.text, legendFontSize: 12 },
          ];
        } else if (selectedChart === 'bar') {
          const recentData = macroData.slice(-7);
          return {
            labels: recentData.map((_, i) => new Date(dates[dates.length - 7 + i]).toLocaleDateString('en-US', { weekday: 'short' })),
            datasets: [{
              data: recentData.map(d => d.protein + d.carbs + d.fats)
            }]
          };
        }
        break;
      }

      case 'adherence': {
        const adherenceData = dates.map(date => {
          const progress = getSafeProgress(date);
          const calorieAdherence = progress.calories.goal > 0 ? Math.min(100, (progress.calories.consumed / progress.calories.goal) * 100) : 0;
          const proteinAdherence = progress.macros.protein.goal > 0 ? Math.min(100, (progress.macros.protein.consumed / progress.macros.protein.goal) * 100) : 0;
          const carbsAdherence = progress.macros.carbs.goal > 0 ? Math.min(100, (progress.macros.carbs.consumed / progress.macros.carbs.goal) * 100) : 0;
          const fatsAdherence = progress.macros.fats.goal > 0 ? Math.min(100, (progress.macros.fats.consumed / progress.macros.fats.goal) * 100) : 0;
          
          return {
            date,
            calories: calorieAdherence,
            protein: proteinAdherence,
            carbs: carbsAdherence,
            fats: fatsAdherence,
            overall: (calorieAdherence + proteinAdherence + carbsAdherence + fatsAdherence) / 4
          };
        });

        if (selectedChart === 'bar') {
          const recentData = adherenceData.slice(-7);
          return {
            labels: recentData.map(d => new Date(d.date).toLocaleDateString('en-US', { weekday: 'short' })),
            datasets: [{
              data: recentData.map(d => d.overall)
            }]
          };
        } else if (selectedChart === 'pie') {
          const avgAdherence = {
            calories: adherenceData.reduce((sum, d) => sum + d.calories, 0) / adherenceData.length,
            protein: adherenceData.reduce((sum, d) => sum + d.protein, 0) / adherenceData.length,
            carbs: adherenceData.reduce((sum, d) => sum + d.carbs, 0) / adherenceData.length,
            fats: adherenceData.reduce((sum, d) => sum + d.fats, 0) / adherenceData.length,
          };

          return [
            { name: 'Calories', population: avgAdherence.calories, color: Colors.nutrition.calories, legendFontColor: Colors.text, legendFontSize: 12 },
            { name: 'Protein', population: avgAdherence.protein, color: Colors.nutrition.protein, legendFontColor: Colors.text, legendFontSize: 12 },
            { name: 'Carbs', population: avgAdherence.carbs, color: Colors.nutrition.carbs, legendFontColor: Colors.text, legendFontSize: 12 },
            { name: 'Fats', population: avgAdherence.fats, color: Colors.nutrition.fats, legendFontColor: Colors.text, legendFontSize: 12 },
          ];
        }
        break;
      }
    }

    return null;
  }, [selectedData, selectedChart, timeRange, getDailyProgress, weightEntries]);

  // Calculate insights
  const insights = useMemo(() => {
    const days = timeRangeOptions.find(t => t.key === timeRange)?.days || 30;
    const dates: string[] = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().split('T')[0]);
    }

    const progressData = dates.map(date => getSafeProgress(date));
    
    // Calculate trends
    const midPoint = Math.floor(progressData.length / 2);
    const firstHalf = progressData.slice(0, midPoint);
    const secondHalf = progressData.slice(midPoint);
    
    const firstHalfAvg = firstHalf.reduce((sum, p) => sum + p.calories.consumed, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, p) => sum + p.calories.consumed, 0) / secondHalf.length;
    const trend = firstHalfAvg > 0 ? ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100 : 0;
    
    const avgCalories = progressData.reduce((sum, p) => sum + p.calories.consumed, 0) / progressData.length;
    const avgAdherence = progressData.reduce((sum, p) => {
      return sum + (p.calories.goal > 0 ? (p.calories.consumed / p.calories.goal) * 100 : 0);
    }, 0) / progressData.length;

    return {
      trend: Math.round(trend * 10) / 10,
      avgCalories: Math.round(avgCalories),
      avgAdherence: Math.round(avgAdherence),
      isImproving: trend > 0,
      daysTracked: progressData.filter(p => p.calories.consumed > 0).length
    };
  }, [timeRange, getDailyProgress]);

  const availableCharts = dataTypeOptions.find(d => d.key === selectedData)?.charts || ['line'];

  const renderChart = () => {
    if (!chartData) return null;

    const chartConfig = {
      backgroundGradientFrom: Colors.card,
      backgroundGradientTo: Colors.card,
      decimalPlaces: 0,
      color: (opacity = 1) => `rgba(45, 90, 61, ${opacity})`, 
      labelColor: (opacity = 1) => Colors.textTertiary,
      propsForBackgroundLines: { stroke: Colors.border, strokeWidth: 0.5 },
    };

    switch (selectedChart) {
      case 'line':
        return (
          <LineChart
            data={chartData as any}
            width={chartWidth}
            height={200}
            chartConfig={chartConfig}
            bezier
            style={styles.chart}
          />
        );
      case 'bar':
        return (
          <BarChart
            data={chartData as any}
            width={chartWidth}
            height={200}
            chartConfig={chartConfig}
            style={styles.chart}
          />
        );
      case 'pie':
        return (
          <PieChart
            data={chartData as any}
            width={chartWidth}
            height={200}
            chartConfig={chartConfig}
            accessor="population"
            backgroundColor="transparent"
            style={styles.chart}
          />
        );
      default:
        return null;
    }
  };

  return (
    <ProgressCardContainer onPress={onPress} style={styles.card} padding={20}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Analytics Dashboard</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.filterButton}
            onPress={() => setShowFilters(!showFilters)}
          >
            <Filter size={16} color={Colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.exportButton}
            onPress={async () => {
              const days = timeRangeOptions.find(t => t.key === timeRange)?.days || 30;
              const dates: string[] = [];
              
              for (let i = days - 1; i >= 0; i--) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                dates.push(d.toISOString().split('T')[0]);
              }

              let exportData: ExportData;
              
              if (selectedData === 'calories') {
                const data = dates.map(date => {
                  const progress = getDailyProgress(date);
                  return {
                    date,
                    consumed: progress.calories.consumed,
                    goal: progress.calories.goal,
                    adherence: progress.calories.goal > 0 ? (progress.calories.consumed / progress.calories.goal) * 100 : 0
                  };
                });
                
                exportData = {
                  type: 'calories',
                  timeRange,
                  data,
                  summary: {
                    totalEntries: data.filter(d => d.consumed > 0).length,
                    averageValue: Math.round(data.reduce((sum, d) => sum + d.consumed, 0) / data.length),
                    trend: insights.trend,
                    dateRange: `${dates[0]} to ${dates[dates.length - 1]}`
                  }
                };
              } else {
                // Simplified export for other data types
                exportData = {
                  type: selectedData,
                  timeRange,
                  data: [],
                  summary: {
                    totalEntries: 0,
                    averageValue: 0,
                    trend: 0,
                    dateRange: `${dates[0]} to ${dates[dates.length - 1]}`
                  }
                };
              }

              await exportToCSV(exportData);
            }}
          >
            <Download size={16} color={Colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Insights Summary */}
      <View style={styles.insightsRow}>
        <View style={styles.insightItem}>
          <View style={styles.insightIconContainer}>
            {insights.isImproving ? (
              <TrendingUp size={16} color={Colors.success} />
            ) : (
              <TrendingDown size={16} color={Colors.error} />
            )}
          </View>
          <Text style={styles.insightValue}>{insights.trend > 0 ? '+' : ''}{insights.trend}%</Text>
          <Text style={styles.insightLabel}>Trend</Text>
        </View>
        <View style={styles.insightItem}>
          <Text style={styles.insightValue}>{insights.avgCalories}</Text>
          <Text style={styles.insightLabel}>Avg Calories</Text>
        </View>
        <View style={styles.insightItem}>
          <Text style={styles.insightValue}>{insights.avgAdherence}%</Text>
          <Text style={styles.insightLabel}>Adherence</Text>
        </View>
        <View style={styles.insightItem}>
          <Text style={styles.insightValue}>{insights.daysTracked}</Text>
          <Text style={styles.insightLabel}>Days Tracked</Text>
        </View>
      </View>

      {/* Filters */}
      {showFilters && (
        <View style={styles.filtersContainer}>
          {/* Data Type Selection */}
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Data Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
              {dataTypeOptions.map(option => (
                <TouchableOpacity
                  key={option.key}
                  style={[styles.filterChip, selectedData === option.key && styles.filterChipActive]}
                  onPress={() => {
                    setSelectedData(option.key);
                    if (!option.charts.includes(selectedChart)) {
                      setSelectedChart(option.charts[0] as ChartType);
                    }
                  }}
                >
                  <Text style={[styles.filterChipText, selectedData === option.key && styles.filterChipTextActive]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Chart Type Selection */}
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Chart Type</Text>
            <View style={styles.chartTypeRow}>
              {availableCharts.map(chart => (
                <TouchableOpacity
                  key={chart}
                  style={[styles.chartTypeButton, selectedChart === chart && styles.chartTypeButtonActive]}
                  onPress={() => setSelectedChart(chart as ChartType)}
                >
                  {chart === 'line' && <LineChartIcon size={16} color={selectedChart === chart ? Colors.white : Colors.text} />}
                  {chart === 'bar' && <BarChart3 size={16} color={selectedChart === chart ? Colors.white : Colors.text} />}
                  {chart === 'pie' && <PieChartIcon size={16} color={selectedChart === chart ? Colors.white : Colors.text} />}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Time Range Selection */}
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Time Range</Text>
            <View style={styles.timeRangeRow}>
              {timeRangeOptions.map(option => (
                <TouchableOpacity
                  key={option.key}
                  style={[styles.timeRangeButton, timeRange === option.key && styles.timeRangeButtonActive]}
                  onPress={() => setTimeRange(option.key)}
                >
                  <Text style={[styles.timeRangeText, timeRange === option.key && styles.timeRangeTextActive]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      )}

      {/* Chart */}
      <View style={styles.chartContainer}>
        {renderChart()}
      </View>

      {/* Chart Legend/Info */}
      <View style={styles.chartInfo}>
        <Text style={styles.chartInfoText}>
          {selectedData === 'calories' && selectedChart === 'line' && 'Blue: Consumed, Gray: Goal'}
          {selectedData === 'weight' && 'Weight progression over time'}
          {selectedData === 'macros' && selectedChart === 'pie' && 'Average macro distribution (calories)'}
          {selectedData === 'adherence' && 'Goal adherence percentage'}
        </Text>
      </View>
    </ProgressCardContainer>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 8,
    backgroundColor: ComponentThemes.cards.default.background,
    borderColor: ComponentThemes.cards.default.border,
    shadowColor: ComponentThemes.cards.default.shadow,
  },
  header: {
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
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  exportButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingVertical: 12,
    backgroundColor: Colors.background,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  insightItem: {
    alignItems: 'center',
    flex: 1,
  },
  insightIconContainer: {
    marginBottom: 4,
  },
  insightValue: {
    fontSize: 16,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    marginBottom: 2,
  },
  insightLabel: {
    fontSize: 12,
    color: Colors.lightText,
  },
  filtersContainer: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  filterSection: {
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: Typography.weights.medium,
    color: Colors.text,
    marginBottom: 8,
  },
  filterScroll: {
    flexDirection: 'row',
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.card,
    marginRight: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterChipText: {
    fontSize: 12,
    color: Colors.text,
  },
  filterChipTextActive: {
    color: Colors.white,
  },
  chartTypeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  chartTypeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chartTypeButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  timeRangeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  timeRangeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  timeRangeButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  timeRangeText: {
    fontSize: 12,
    color: Colors.text,
    fontWeight: Typography.weights.medium,
  },
  timeRangeTextActive: {
    color: Colors.white,
  },
  chartContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  chart: {
    borderRadius: 16,
  },
  chartInfo: {
    alignItems: 'center',
  },
  chartInfoText: {
    fontSize: 12,
    color: Colors.lightText,
    textAlign: 'center',
  },
});
