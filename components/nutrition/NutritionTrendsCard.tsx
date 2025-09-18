import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { Typography, Spacing } from '@/constants/spacing';
import { useNutritionWithMealPlan } from '@/hooks/useNutritionWithMealPlan';
import { LineChart } from 'react-native-chart-kit';
import { ProgressCardContainer } from '@/components/progress/ProgressCardContainer';

interface NutritionTrendsCardProps { onPress?: () => void }

export const NutritionTrendsCard: React.FC<NutritionTrendsCardProps> = ({ onPress }) => {
  const { getDailyProgress } = useNutritionWithMealPlan();
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('7d');

  const dailyData = useMemo(() => {
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
    const data: { date: string; calories: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ds = d.toISOString().split('T')[0];
      const prog = getDailyProgress(ds);
      data.push({ date: ds, calories: prog.calories.consumed });
    }
    return data;
  }, [period, getDailyProgress]);

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
          color: (opacity = 1) => `rgba(74, 144, 226, ${opacity})`,
          strokeWidth: 2,
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

      {/* Period switch */}
      <View style={styles.switchRow}>
        {(['7d','30d','90d'] as const).map(p => (
          <TouchableOpacity
            key={p}
            style={[styles.switchBtn, period === p && styles.switchBtnActive]}
            onPress={() => setPeriod(p)}
          >
            <Text style={[styles.switchText, period === p && styles.switchTextActive]}>
              {p === '7d' ? '7d' : p === '30d' ? '30d' : '90d'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Inline chart */}
      <View style={styles.chartWrap}>
        <LineChart
          data={chartData}
          width={chartWidth - 32}
          height={chartHeight}
          chartConfig={{
            backgroundGradientFrom: Colors.card,
            backgroundGradientTo: Colors.card,
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(74, 144, 226, ${opacity})`,
            labelColor: (opacity = 1) => Colors.lightText,
            propsForBackgroundLines: { stroke: Colors.border },
          }}
          bezier
          style={styles.chart}
        />
      </View>

      <Text style={styles.hint}>Tap card for full details and zoom</Text>
    </ProgressCardContainer>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  title: { fontSize: Typography.sizes.md, fontWeight: Typography.weights.semibold, color: Colors.text },
  viewRow: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.background, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  viewText: { color: Colors.primary, fontSize: Typography.sizes.sm, fontWeight: Typography.weights.medium },
  switchRow: { flexDirection: 'row', gap: 8, marginTop: 4, marginBottom: 12 },
  switchBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: Colors.border },
  switchBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  switchText: { fontSize: 12, color: Colors.lightText, fontWeight: Typography.weights.medium },
  switchTextActive: { color: Colors.white },
  chartWrap: { alignItems: 'center' },
  chart: { borderRadius: 12 },
  hint: { fontSize: 11, color: Colors.lightText, marginTop: 10 },
});
