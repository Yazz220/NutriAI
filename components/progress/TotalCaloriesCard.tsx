import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/spacing';
import { useNutritionWithMealPlan } from '@/hooks/useNutritionWithMealPlan';
import { ProgressCardContainer } from '@/components/progress/ProgressCardContainer';

interface TotalCaloriesCardProps { onPress?: () => void; onOpenPeriod?: (period: 'week' | 'month' | 'quarter') => void }

type PeriodKey = 'week' | 'month' | 'quarter';
const PERIODS: { key: PeriodKey; label: string; days: number }[] = [
  { key: 'week', label: 'Week', days: 7 },
  { key: 'month', label: 'Month', days: 30 },
  { key: 'quarter', label: '3 Months', days: 90 },
];

export const TotalCaloriesCard: React.FC<TotalCaloriesCardProps> = ({ onPress, onOpenPeriod }) => {
  const { getDailyProgress } = useNutritionWithMealPlan();

  const computeStats = (days: number) => {
    const list: string[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      list.push(d.toISOString().split('T')[0]);
    }
    let consumed = 0;
    let goal = 0;
    let entries = 0;
    for (const ds of list) {
      const p = getDailyProgress(ds);
      // Only count past/today (avoid future dates)
      consumed += p.calories.consumed;
      goal += p.calories.goal;
      entries += 1;
    }
    const pct = goal > 0 ? Math.min(1, consumed / goal) : 0;
    return { consumed: Math.round(consumed), goal: Math.round(goal), pct, hasData: entries > 0 };
  };

  const stats = useMemo(() => {
    return PERIODS.map(p => ({ key: p.key, label: p.label, ...computeStats(p.days) }));
  }, [getDailyProgress]);

  return (
    <ProgressCardContainer onPress={onPress} style={styles.card} padding={20}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Total Calories</Text>
        <Text style={styles.expandHint}>Summary</Text>
      </View>

      {/* KPI rows */}
      {stats.map(({ key, label, consumed, goal, pct, hasData }) => {
        const days = key === 'week' ? 7 : key === 'month' ? 30 : 90;
        const avg = hasData ? Math.round(consumed / days) : 0;
        const adherence = hasData && goal > 0 ? Math.round((Math.min(1, consumed / goal)) * 100) : 0;
        return (
          <TouchableOpacity key={key} style={styles.kpiRow} onPress={() => onOpenPeriod?.(key)} activeOpacity={0.8}>
            <View style={styles.kpiLeft}>
              <Text style={styles.kpiLabel}>{label}</Text>
              <Text style={styles.kpiSub}>{avg} avg/day</Text>
            </View>
            <View style={styles.kpiCenter}>
              {hasData ? (
                <Text style={styles.kpiValue}>{consumed} / {goal}</Text>
              ) : (
                <Text style={styles.kpiMuted}>No data</Text>
              )}
            </View>
            <View style={styles.kpiRight}>
              <Text style={styles.kpiAdh}>{adherence}%</Text>
              <ChevronRight size={18} color={Colors.lightText} />
            </View>
          </TouchableOpacity>
        );
      })}
    </ProgressCardContainer>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 0, // padding handled by GlassSurface
    marginHorizontal: 16,
    marginVertical: 8,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  timeframeContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  timeframeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.background,
  },
  timeframeButtonActive: {
    backgroundColor: Colors.text,
  },
  timeframeText: {
    fontSize: 12,
    fontWeight: Typography.weights.medium,
    color: Colors.lightText,
  },
  timeframeTextActive: {
    color: Colors.white,
  },
  content: {
    minHeight: 120,
    justifyContent: 'center',
  },
  periodsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  periodItem: { alignItems: 'center', width: '32%' },
  periodLabel: { marginTop: 8, fontSize: 12, color: Colors.lightText },
  periodValue: { marginTop: 4, fontSize: 16, fontWeight: Typography.weights.bold, color: Colors.text },
  periodSub: { fontSize: 12, color: Colors.lightText },
  emptyStateMini: { marginTop: 12 },
  kpiRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderTopWidth: 1, borderTopColor: Colors.border },
  kpiLeft: { width: '30%' },
  kpiCenter: { width: '50%', alignItems: 'center' },
  kpiRight: { width: '20%', flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 6 },
  kpiLabel: { fontSize: 14, color: Colors.text, fontWeight: Typography.weights.medium },
  kpiSub: { fontSize: 12, color: Colors.lightText, marginTop: 2 },
  kpiValue: { fontSize: 14, color: Colors.text, fontWeight: Typography.weights.semibold },
  kpiAdh: { fontSize: 12, color: Colors.lightText },
  kpiMuted: { fontSize: 12, color: Colors.lightText },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.lightText,
    textAlign: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  expandHint: {
    fontSize: 12,
    color: Colors.lightText,
  },
  expandedArea: {
    marginTop: 12,
  },
  expandedChart: {
    height: 120,
    backgroundColor: Colors.background,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  chartLabel: {
    color: Colors.lightText,
  },
  breakdownContainer: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 12,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  breakdownLabel: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: Typography.weights.medium,
  },
  breakdownValue: {
    fontSize: 12,
    color: Colors.lightText,
  },
  breakdownRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  breakdownPercent: {
    fontSize: 12,
    color: Colors.lightText,
  },
});



