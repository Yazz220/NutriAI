import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, Modal, SafeAreaView, ScrollView } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Target, TrendingUp, X, ChevronRight } from 'lucide-react-native';

import { Colors } from '@/constants/colors';
import { Spacing, Typography } from '@/constants/spacing';
import type { WeightTrackingHandle } from '@/hooks/useWeightTracking';
import { ProgressCardContainer } from '@/components/progress/ProgressCardContainer';

const AnyLineChart = LineChart as unknown as React.ComponentType<any>;

interface WeightChartState {
  labels: string[];
  data: number[];
  lastWeight: number;
  lastDate: string;
  progressData?: number[];
}

type ViewMode = 'default' | 'goal';
type TimePeriod = '1W' | '1M' | '6M' | '1Y';

const TIME_PERIODS: { key: TimePeriod; label: string; days: number }[] = [
  { key: '1W', label: '1W', days: 7 },
  { key: '1M', label: '1M', days: 30 },
  { key: '6M', label: '6M', days: 180 },
  { key: '1Y', label: '1Y', days: 365 },
];

const screenWidth = Dimensions.get('window').width;
const horizontalMargins = 16 * 2;
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
  const [viewMode, setViewMode] = useState<ViewMode>('default');
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('1W');
  const [showModal, setShowModal] = useState(false);

  const chartState = useMemo<WeightChartState | null>(() => {
    if (!entries || entries.length === 0) {
      return null;
    }

    const sorted = entries
      .slice()
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Filter by time period
    const selectedPeriod = TIME_PERIODS.find(p => p.key === timePeriod);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - (selectedPeriod?.days || 7));
    
    const filtered = sorted.filter(entry => new Date(entry.date) >= cutoffDate);
    const dataToUse = filtered.length > 0 ? filtered : sorted.slice(-7);

    const labels = dataToUse.map((entry) => {
      if (timePeriod === '1W') {
        return formatDate(entry.date);
      } else {
        const date = new Date(entry.date);
        return `${date.getMonth() + 1}/${date.getDate()}`;
      }
    });
    
    const data = dataToUse.map((entry) => Number(entry.weight.toFixed(1)));
    const last = dataToUse[dataToUse.length - 1];

    // Calculate progress data for goal mode
    let progressData: number[] | undefined;
    if (viewMode === 'goal' && goal?.targetWeight) {
      const startWeight = dataToUse[0]?.weight || goal.targetWeight;
      progressData = dataToUse.map((entry) => {
        const totalChange = goal.targetWeight - startWeight;
        const currentChange = entry.weight - startWeight;
        return totalChange !== 0 ? (currentChange / totalChange) * 100 : 0;
      });
    }

    return {
      labels,
      data,
      lastWeight: last.weight,
      lastDate: last.date,
      progressData,
    };
  }, [entries, timePeriod, viewMode, goal]);

  // Calculate stats
  const stats = useMemo(() => {
    if (!chartState || chartState.data.length === 0) {
      return { currentWeight: 0, weightChange: 0, progressPercent: 0, daysTracked: 0 };
    }

    const currentWeight = chartState.lastWeight;
    const firstWeight = chartState.data[0];
    const weightChange = currentWeight - firstWeight;
    
    let progressPercent = 0;
    if (goal?.targetWeight && goal?.startWeight) {
      const totalGoal = Math.abs(goal.targetWeight - goal.startWeight);
      const currentProgress = Math.abs(currentWeight - goal.startWeight);
      progressPercent = totalGoal > 0 ? (currentProgress / totalGoal) * 100 : 0;
    }

    return {
      currentWeight,
      weightChange,
      progressPercent: Math.min(100, progressPercent),
      daysTracked: chartState.data.length,
    };
  }, [chartState, goal]);

  const getChartData = () => {
    if (!chartState) return null;

    if (viewMode === 'goal' && chartState.progressData) {
      return {
        labels: chartState.labels,
        datasets: [
          {
            data: chartState.progressData,
            color: (opacity = 1) => `rgba(74, 144, 226, ${opacity})`,
            strokeWidth: 3,
          },
        ],
      };
    }

    return {
      labels: chartState.labels,
      datasets: [
        {
          data: chartState.data,
          color: (opacity = 1) => `rgba(74, 144, 226, ${opacity})`,
          strokeWidth: 3,
        },
      ],
    };
  };

  const renderChart = (isModal = false) => {
    if (!chartState) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No data yet</Text>
          <Text style={styles.emptySubtitle}>Log a weight entry to unlock your progress chart.</Text>
        </View>
      );
    }

    return (
      <View style={styles.chartWrap}>
        <AnyLineChart
          data={getChartData()!}
          width={defaultChartWidth}
          height={isModal ? 240 : 160}
          chartConfig={{
            backgroundGradientFrom: Colors.background,
            backgroundGradientTo: Colors.background,
            decimalPlaces: viewMode === 'goal' ? 0 : 1,
            color: (opacity = 1) => `rgba(74, 144, 226, ${opacity})`,
            labelColor: (opacity = 1) => Colors.lightText,
            propsForBackgroundLines: { stroke: Colors.border, strokeWidth: 0.5 },
          }}
          bezier
          style={styles.chart}
        />
      </View>
    );
  };

  return (
    <>
      <ProgressCardContainer style={styles.card} onPress={() => setShowModal(true)} padding={16}>
        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={styles.title}>{viewMode === 'goal' ? 'Goal Weight' : 'Weight'}</Text>
          <View style={styles.viewRow}>
            <Text style={styles.viewText}>Details</Text>
            <ChevronRight size={16} color={Colors.primary} />
          </View>
        </View>

        {/* Stats Overview */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{formatKg(stats.currentWeight)}</Text>
            <Text style={styles.statLabel}>Current</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { 
              color: stats.weightChange > 0 ? Colors.error : stats.weightChange < 0 ? Colors.success : Colors.text 
            }]}>
              {stats.weightChange > 0 ? '+' : ''}{stats.weightChange.toFixed(1)} kg
            </Text>
            <Text style={styles.statLabel}>Change</Text>
          </View>
          {viewMode === 'goal' && (
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: Colors.primary }]}>
                {stats.progressPercent.toFixed(0)}%
              </Text>
              <Text style={styles.statLabel}>Progress</Text>
            </View>
          )}
        </View>

        {/* Mode Switch */}
        <View style={styles.switchRow}>
          <TouchableOpacity
            style={[styles.switchBtn, viewMode === 'default' && styles.switchBtnActive]}
            onPress={() => setViewMode('default')}
          >
            <TrendingUp size={14} color={viewMode === 'default' ? Colors.white : Colors.lightText} />
            <Text style={[styles.switchText, viewMode === 'default' && styles.switchTextActive]}>
              Weight
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.switchBtn, viewMode === 'goal' && styles.switchBtnActive]}
            onPress={() => setViewMode('goal')}
          >
            <Target size={14} color={viewMode === 'goal' ? Colors.white : Colors.lightText} />
            <Text style={[styles.switchText, viewMode === 'goal' && styles.switchTextActive]}>
              Goal
            </Text>
          </TouchableOpacity>
        </View>

        {/* Period Selector */}
        <View style={styles.periodRow}>
          {TIME_PERIODS.map((period) => (
            <TouchableOpacity
              key={period.key}
              style={[styles.periodBtn, timePeriod === period.key && styles.periodBtnActive]}
              onPress={() => setTimePeriod(period.key)}
            >
              <Text style={[styles.periodText, timePeriod === period.key && styles.periodTextActive]}>
                {period.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Chart */}
        {renderChart(false)}

        <Text style={styles.hint}>Tap for detailed weight analysis</Text>
      </ProgressCardContainer>

      {/* Interactive Modal */}
      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowModal(false)}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowModal(false)} style={styles.closeButton}>
              <X size={24} color={Colors.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{viewMode === 'goal' ? 'Goal Weight Progress' : 'Weight Tracking'}</Text>
            <View style={{ width: 32 }} />
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {/* Modal Stats */}
            <View style={styles.modalStatsRow}>
              <View style={styles.modalStatItem}>
                <Text style={styles.modalStatValue}>{formatKg(stats.currentWeight)}</Text>
                <Text style={styles.modalStatLabel}>Current Weight</Text>
              </View>
              <View style={styles.modalStatItem}>
                <Text style={styles.modalStatValue}>{formatKg(goal?.targetWeight)}</Text>
                <Text style={styles.modalStatLabel}>Target Weight</Text>
              </View>
              <View style={styles.modalStatItem}>
                <Text style={[styles.modalStatValue, { color: Colors.primary }]}>
                  {stats.progressPercent.toFixed(0)}%
                </Text>
                <Text style={styles.modalStatLabel}>Progress</Text>
              </View>
            </View>

            {/* Modal Mode Switch */}
            <View style={styles.modalSwitchRow}>
              <TouchableOpacity
                style={[styles.modalSwitchBtn, viewMode === 'default' && styles.modalSwitchBtnActive]}
                onPress={() => setViewMode('default')}
              >
                <TrendingUp size={16} color={viewMode === 'default' ? Colors.white : Colors.lightText} />
                <Text style={[styles.modalSwitchText, viewMode === 'default' && styles.modalSwitchTextActive]}>
                  Weight Tracking
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSwitchBtn, viewMode === 'goal' && styles.modalSwitchBtnActive]}
                onPress={() => setViewMode('goal')}
              >
                <Target size={16} color={viewMode === 'goal' ? Colors.white : Colors.lightText} />
                <Text style={[styles.modalSwitchText, viewMode === 'goal' && styles.modalSwitchTextActive]}>
                  Goal Progress
                </Text>
              </TouchableOpacity>
            </View>

            {/* Modal Period Selector */}
            <View style={styles.modalPeriodRow}>
              {TIME_PERIODS.map((period) => (
                <TouchableOpacity
                  key={period.key}
                  style={[styles.modalPeriodBtn, timePeriod === period.key && styles.modalPeriodBtnActive]}
                  onPress={() => setTimePeriod(period.key)}
                >
                  <Text style={[styles.modalPeriodText, timePeriod === period.key && styles.modalPeriodTextActive]}>
                    {period.key === '1W' ? '1 Week' : period.key === '1M' ? '1 Month' : period.key === '6M' ? '6 Months' : '1 Year'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Modal Chart */}
            {renderChart(true)}

            {/* Modal Footer Stats */}
            <View style={styles.modalFooterStats}>
              <View style={styles.modalFooterStatItem}>
                <Text style={styles.modalFooterStatLabel}>Days Tracked</Text>
                <Text style={styles.modalFooterStatValue}>{stats.daysTracked}</Text>
              </View>
              <View style={styles.modalFooterStatItem}>
                <Text style={styles.modalFooterStatLabel}>Weight Change</Text>
                <Text style={[styles.modalFooterStatValue, { 
                  color: stats.weightChange > 0 ? Colors.error : stats.weightChange < 0 ? Colors.success : Colors.text 
                }]}>
                  {stats.weightChange > 0 ? '+' : ''}{stats.weightChange.toFixed(1)} kg
                </Text>
              </View>
              <View style={styles.modalFooterStatItem}>
                <Text style={styles.modalFooterStatLabel}>Last Update</Text>
                <Text style={styles.modalFooterStatValue}>{formatDate(chartState?.lastDate || '')}</Text>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  
  // Header (matching NutritionTrendsCard)
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
  
  // Stats Row
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
    fontSize: 20,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.lightText,
    marginTop: 2,
  },
  
  // Mode Switch Row
  switchRow: { 
    flexDirection: 'row',
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 4,
    marginBottom: 12,
  },
  switchBtn: { 
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8, 
    paddingHorizontal: 8, 
    borderRadius: 8,
    gap: 4,
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
  
  // Period Row
  periodRow: { 
    flexDirection: 'row',
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  periodBtn: { 
    flex: 1,
    paddingVertical: 6, 
    paddingHorizontal: 8, 
    borderRadius: 8,
    alignItems: 'center',
  },
  periodBtnActive: { 
    backgroundColor: Colors.primary,
  },
  periodText: { 
    fontSize: 11, 
    color: Colors.lightText, 
    fontWeight: Typography.weights.medium 
  },
  periodTextActive: { 
    color: Colors.white,
    fontWeight: Typography.weights.semibold,
  },
  
  // Chart
  chartWrap: { 
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 8,
    marginBottom: 12,
  },
  chart: { 
    borderRadius: 8,
  },
  
  // Hint
  hint: { 
    fontSize: 11, 
    color: Colors.lightText, 
    textAlign: 'center',
  },
  
  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: Colors.background,
    borderRadius: 12,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: Typography.sizes.sm,
    color: Colors.lightText,
    textAlign: 'center',
  },
  
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  closeButton: {
    padding: Spacing.xs,
  },
  modalTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
    textAlign: 'center',
  },
  modalBody: {
    flex: 1,
    padding: 16,
  },
  
  // Modal Stats
  modalStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
  },
  modalStatItem: {
    alignItems: 'center',
  },
  modalStatValue: {
    fontSize: 18,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  modalStatLabel: {
    fontSize: 11,
    color: Colors.lightText,
    marginTop: 4,
  },
  
  // Modal Switches
  modalSwitchRow: { 
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  modalSwitchBtn: { 
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12, 
    paddingHorizontal: 12, 
    borderRadius: 8,
    gap: 6,
  },
  modalSwitchBtnActive: { 
    backgroundColor: Colors.primary,
  },
  modalSwitchText: { 
    fontSize: 14, 
    color: Colors.lightText, 
    fontWeight: Typography.weights.medium 
  },
  modalSwitchTextActive: { 
    color: Colors.white,
    fontWeight: Typography.weights.semibold,
  },
  
  // Modal Period
  modalPeriodRow: { 
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
    gap: 4,
  },
  modalPeriodBtn: { 
    flex: 1,
    paddingVertical: 10, 
    paddingHorizontal: 8, 
    borderRadius: 8,
    alignItems: 'center',
  },
  modalPeriodBtnActive: { 
    backgroundColor: Colors.primary,
  },
  modalPeriodText: { 
    fontSize: 12, 
    color: Colors.lightText, 
    fontWeight: Typography.weights.medium 
  },
  modalPeriodTextActive: { 
    color: Colors.white,
    fontWeight: Typography.weights.semibold,
  },
  
  // Modal Footer Stats
  modalFooterStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
  },
  modalFooterStatItem: {
    alignItems: 'center',
  },
  modalFooterStatLabel: {
    fontSize: 11,
    color: Colors.lightText,
    marginBottom: 4,
  },
  modalFooterStatValue: {
    fontSize: 14,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
  },
});