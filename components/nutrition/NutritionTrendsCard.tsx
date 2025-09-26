import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { ChevronRight, TrendingUp, TrendingDown } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { Typography, Spacing } from '@/constants/spacing';
import { useNutritionWithMealPlan } from '@/hooks/useNutritionWithMealPlan';
import { LineChart, PieChart } from 'react-native-chart-kit';
import { ProgressCardContainer } from '@/components/progress/ProgressCardContainer';

const hexToRgba = (hex: string, opacity: number) => {
  const sanitized = hex.replace('#', '');
  const value = parseInt(sanitized, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};


interface NutritionTrendsCardProps { onPress?: () => void }

export const NutritionTrendsCard: React.FC<NutritionTrendsCardProps> = ({ onPress }) => {
  const { getDailyProgress } = useNutritionWithMealPlan();
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('7d');

  const dailyData = useMemo(() => {
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
    const data: { date: string; calories: number; protein: number; carbs: number; fats: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ds = d.toISOString().split('T')[0];
      const prog = getDailyProgress(ds);
      data.push({ 
        date: ds, 
        calories: prog.calories.consumed,
        protein: prog.macros.protein.consumed,
        carbs: prog.macros.carbs.consumed,
        fats: prog.macros.fats.consumed
      });
    }
    return data;
  }, [period, getDailyProgress]);

  // Calculate averages and trends
  const stats = useMemo(() => {
    if (dailyData.length === 0) return { avgCalories: 0, trend: 0, macroBreakdown: [], avgProtein: 0, avgCarbs: 0, avgFats: 0 };
    
    const avgCalories = Math.round(dailyData.reduce((sum, d) => sum + d.calories, 0) / dailyData.length);
    const avgProtein = Math.round(dailyData.reduce((sum, d) => sum + d.protein, 0) / dailyData.length);
    const avgCarbs = Math.round(dailyData.reduce((sum, d) => sum + d.carbs, 0) / dailyData.length);
    const avgFats = Math.round(dailyData.reduce((sum, d) => sum + d.fats, 0) / dailyData.length);
    
    // Calculate trend (comparing first half vs second half)
    const midPoint = Math.floor(dailyData.length / 2);
    const firstHalf = dailyData.slice(0, midPoint);
    const secondHalf = dailyData.slice(midPoint);
    const firstAvg = firstHalf.reduce((sum, d) => sum + d.calories, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, d) => sum + d.calories, 0) / secondHalf.length;
    const trend = firstAvg > 0 ? ((secondAvg - firstAvg) / firstAvg) * 100 : 0;
    
    // Macro breakdown for donut chart
    const macroBreakdown = [
      { name: 'Protein', population: avgProtein * 4, color: Colors.nutrition.protein, legendFontColor: Colors.text, legendFontSize: 12 },
      { name: 'Carbs', population: avgCarbs * 4, color: Colors.nutrition.carbs, legendFontColor: Colors.text, legendFontSize: 12 },
      { name: 'Fats', population: avgFats * 9, color: Colors.nutrition.fats, legendFontColor: Colors.text, legendFontSize: 12 },
    ];
    
    return { avgCalories, trend, macroBreakdown, avgProtein, avgCarbs, avgFats };
  }, [dailyData]);

  const chartData = useMemo(() => {
    const step = period === '90d' ? 10 : period === '30d' ? 3 : 1;
    const labels = dailyData.map((d, idx) => {
      if (idx % step !== 0) return '';
      const dt = new Date(d.date);
      return period === '7d' ? dt.toLocaleDateString(undefined, { weekday: 'short' }) : `${dt.getMonth() + 1}/${dt.getDate()}`;
    });
    return {
      labels,
      datasets: [
        {
          data: dailyData.map(d => d.calories),
          color: (opacity = 1) => hexToRgba(Colors.nutrition.calories, opacity),
          strokeWidth: 3,
        },
      ],
    };
  }, [dailyData, period]);

  const screenWidth = Dimensions.get('window').width;
  const chartWidth = screenWidth - 32; // card margin
  const chartHeight = 180;

  return (
    <ProgressCardContainer style={styles.card} onPress={onPress} padding={16}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Nutrition Trends</Text>
        <View style={styles.viewRow}>
          <Text style={styles.viewText}>Details</Text>
          <ChevronRight size={16} color={Colors.primary} />
        </View>
      </View>

      {/* Stats Overview */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.avgCalories}</Text>
          <Text style={styles.statLabel}>Avg Calories</Text>
        </View>
        <View style={styles.trendContainer}>
          <View style={styles.trendRow}>
            {stats.trend > 0 ? (
              <TrendingUp size={16} color={Colors.success} />
            ) : (
              <TrendingDown size={16} color={Colors.error} />
            )}
            <Text style={[styles.trendText, { color: stats.trend > 0 ? Colors.success : Colors.error }]}>
              {Math.abs(stats.trend).toFixed(1)}%
            </Text>
          </View>
          <Text style={styles.statLabel}>Trend</Text>
        </View>
      </View>

      {/* Period switch */}
      <View style={styles.switchRow}>
        {(['7d','30d','90d'] as const).map(p => (
          <TouchableOpacity
            key={p}
            style={[styles.switchBtn, period === p && styles.switchBtnActive]}
            onPress={() => setPeriod(p)}
          >
            <Text style={[styles.switchText, period === p && styles.switchTextActive]}>
              {p === '7d' ? '7D' : p === '30d' ? '1M' : '3M'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Charts Container */}
      <View style={styles.chartsContainer}>
        {/* Line Chart */}
        <View style={styles.chartWrap}>
          <LineChart
            data={chartData}
            width={chartWidth - 32}
            height={160}
            chartConfig={{
              backgroundGradientFrom: Colors.card,
              backgroundGradientTo: Colors.card,
              decimalPlaces: 0,
              color: (opacity = 1) => hexToRgba(Colors.nutrition.calories, opacity),
              labelColor: (opacity = 1) => Colors.lightText,
              propsForBackgroundLines: { stroke: Colors.border, strokeWidth: 0.5 },
            }}
            bezier
            style={styles.chart}
          />
        </View>

        {/* Macro Breakdown Donut */}
        {stats.macroBreakdown.length > 0 && (
          <View style={styles.donutSection}>
            <Text style={styles.donutTitle}>Macro Breakdown</Text>
            <View style={styles.donutContainer}>
              <PieChart
                data={stats.macroBreakdown}
                width={140}
                height={140}
                chartConfig={{
                  color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                }}
                accessor="population"
                backgroundColor="transparent"
                hasLegend={false}
                center={[10, 0]}
              />
              <View style={styles.donutCenter}>
                <Text style={styles.donutCenterLabel}>kcal</Text>
              </View>
            </View>
            
            {/* Legend */}
              <View style={styles.legend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: Colors.nutrition.protein }]} />
                <Text style={styles.legendText}>Protein {stats.avgProtein}g</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: Colors.nutrition.carbs }]} />
                <Text style={styles.legendText}>Carbs {stats.avgCarbs}g</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: Colors.nutrition.fats }]} />
                <Text style={styles.legendText}>Fats {stats.avgFats}g</Text>
              </View>
              </View>
          </View>
        )}
      </View>

      <Text style={styles.hint}>Tap for detailed nutrition analysis</Text>
    </ProgressCardContainer>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  headerRow: { 
    position: 'relative',
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginBottom: 16 
  },
  title: { 
    fontSize: Typography.sizes.lg, 
    fontWeight: Typography.weights.bold, 
    color: Colors.text,
    textAlign: 'center',
  },
  viewRow: { 
    position: 'absolute',
    right: 0,
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 6, 
    backgroundColor: Colors.background, 
    borderRadius: 8, 
    paddingHorizontal: 8, 
    paddingVertical: 4 
  },
  viewText: { 
    color: Colors.primary, 
    fontSize: Typography.sizes.sm, 
    fontWeight: Typography.weights.medium 
  },
  
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.lightText,
    marginTop: 2,
  },
  trendContainer: {
    alignItems: 'center',
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trendText: {
    fontSize: 18,
    fontWeight: Typography.weights.semibold,
  },
  
  switchRow: { 
    flexDirection: 'row',
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  switchBtn: { 
    flex: 1,
    paddingVertical: 8, 
    paddingHorizontal: 12, 
    borderRadius: 8,
    alignItems: 'center',
  },
  switchBtnActive: { 
    backgroundColor: Colors.primary,
  },
  switchText: { 
    fontSize: 12, 
    color: Colors.lightText, 
    fontWeight: Typography.weights.medium 
  },
  switchTextActive: { 
    color: Colors.white,
    fontWeight: Typography.weights.semibold,
  },
  
  chartsContainer: {
    gap: 20,
  },
  chartWrap: { 
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 8,
  },
  chart: { 
    borderRadius: 8,
  },
  
  donutSection: {
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
  },
  donutTitle: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
    marginBottom: 12,
  },
  donutContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutCenterValue: {
    fontSize: 18,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  donutCenterLabel: {
    fontSize: 10,
    color: Colors.lightText,
  },
  
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    marginTop: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    color: Colors.lightText,
  },
  
  hint: { 
    fontSize: 11, 
    color: Colors.lightText, 
    marginTop: 16,
    textAlign: 'center',
  },
});

