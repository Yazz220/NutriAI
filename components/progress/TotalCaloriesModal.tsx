import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/spacing';
import { X } from 'lucide-react-native';
import { useNutritionWithMealPlan } from '@/hooks/useNutritionWithMealPlan';
import FitnessRing from '@/components/ui/FitnessRing';

const periods = ['Week', 'Month', '3 Months'] as const;

type TotalCaloriesModalProps = {
  visible: boolean;
  onClose: () => void;
};

const TotalCaloriesModal: React.FC<TotalCaloriesModalProps> = ({ visible, onClose }) => {
  const [periodIndex, setPeriodIndex] = useState(0);
  const { getDailyProgress } = useNutritionWithMealPlan();

  const periodDays = useMemo(() => (periodIndex === 0 ? 7 : periodIndex === 1 ? 30 : 90), [periodIndex]);

  const periodStats = useMemo(() => {
    const list: string[] = [];
    for (let i = periodDays - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      list.push(d.toISOString().split('T')[0]);
    }
    let consumed = 0;
    let goal = 0;
    let fromLogged = 0;
    let fromPlanned = 0;
    let protein = 0;
    let carbs = 0;
    let fats = 0;
    let daysMet = 0;
    let daysCount = 0;
    for (const ds of list) {
      const p = getDailyProgress(ds);
      consumed += p.calories.consumed;
      goal += p.calories.goal;
      fromLogged += p.calories.fromLogged;
      fromPlanned += p.calories.fromPlanned;
      protein += p.macros.protein.consumed;
      carbs += p.macros.carbs.consumed;
      fats += p.macros.fats.consumed;
      if (p.status === 'met') daysMet += 1;
      daysCount += 1;
    }
    const avg = daysCount > 0 ? Math.round(consumed / daysCount) : 0;
    const adherence = daysCount > 0 ? Math.round((daysMet / daysCount) * 100) : 0;
    const pct = goal > 0 ? Math.min(1, consumed / goal) : 0;
    return {
      consumed: Math.round(consumed),
      goal: Math.round(goal),
      avg,
      daysMet,
      days: daysCount,
      adherence,
      fromLogged: Math.round(fromLogged),
      fromPlanned: Math.round(fromPlanned),
      protein: Math.round(protein),
      carbs: Math.round(carbs),
      fats: Math.round(fats),
      pct,
    };
  }, [getDailyProgress, periodDays]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Total Calories</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.periodRow}>
          {periods.map((p, i) => (
            <TouchableOpacity
              key={p}
              style={[styles.periodButton, periodIndex === i && styles.periodButtonActive]}
              onPress={() => setPeriodIndex(i)}
            >
              <Text style={[styles.periodText, periodIndex === i && styles.periodTextActive]}>{p}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.card}>
            <View style={styles.summaryTop}>
              <FitnessRing size={90} stroke={10} rings={[{ pct: periodStats.pct, color: Colors.primary }]} backgroundColor={Colors.border} />
              <View style={styles.summaryRight}>
                <Text style={styles.largeValue}>{periodStats.consumed}</Text>
                <Text style={styles.smallLabel}>of {periodStats.goal} kcal</Text>
                <View style={styles.progressBar}><View style={[styles.progressFill, { width: `${Math.min(100, periodStats.pct * 100)}%` }]} /></View>
                <Text style={styles.goalText}>Avg/day {periodStats.avg} kcal</Text>
              </View>
            </View>

            <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Summary</Text></View>
            <View style={styles.breakdownContainer}>
              <View style={styles.breakdownRow}><Text style={styles.breakdownLabel}>Days in period</Text><Text style={styles.breakdownValue}>{periodStats.days}</Text></View>
              <View style={styles.breakdownRow}><Text style={styles.breakdownLabel}>Days met goal</Text><Text style={styles.breakdownValue}>{periodStats.daysMet}</Text></View>
              <View style={styles.breakdownRow}><Text style={styles.breakdownLabel}>Goal adherence</Text><Text style={styles.breakdownValue}>{periodStats.adherence}%</Text></View>
              <View style={styles.breakdownRow}><Text style={styles.breakdownLabel}>From logged</Text><Text style={styles.breakdownValue}>{periodStats.fromLogged} kcal</Text></View>
              <View style={[styles.breakdownRow, { borderBottomWidth: 0 }]}><Text style={styles.breakdownLabel}>From planned</Text><Text style={styles.breakdownValue}>{periodStats.fromPlanned} kcal</Text></View>
            </View>

            <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Macros (total)</Text></View>
            <View style={styles.breakdownContainer}>
              <View style={styles.breakdownRow}><Text style={styles.breakdownLabel}>Protein</Text><Text style={styles.breakdownValue}>{periodStats.protein} g</Text></View>
              <View style={styles.breakdownRow}><Text style={styles.breakdownLabel}>Carbs</Text><Text style={styles.breakdownValue}>{periodStats.carbs} g</Text></View>
              <View style={[styles.breakdownRow, { borderBottomWidth: 0 }]}><Text style={styles.breakdownLabel}>Fats</Text><Text style={styles.breakdownValue}>{periodStats.fats} g</Text></View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  closeButton: { padding: 8 },
  title: { fontSize: 18, fontWeight: Typography.weights.semibold, color: Colors.text },
  periodRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
  periodButton: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, backgroundColor: Colors.card },
  periodButtonActive: { backgroundColor: Colors.primary },
  periodText: { color: Colors.text },
  periodTextActive: { color: Colors.white },
  content: { paddingHorizontal: 16 },
  card: { backgroundColor: Colors.card, borderRadius: 12, padding: 16, marginBottom: 24 },
  summaryTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 16 },
  summaryRight: { flex: 1 },
  largeValue: { fontSize: 28, fontWeight: Typography.weights.bold, color: Colors.text },
  smallLabel: { fontSize: 14, color: Colors.lightText, marginBottom: 8 },
  progressBar: { width: '100%', height: 8, backgroundColor: Colors.border, borderRadius: 6, overflow: 'hidden', marginBottom: 8 },
  progressFill: { height: '100%', backgroundColor: Colors.primary },
  goalText: { fontSize: 12, color: Colors.lightText },
  sectionHeader: { marginTop: 8, marginBottom: 6 },
  sectionTitle: { fontSize: 16, fontWeight: Typography.weights.semibold, color: Colors.text },
  breakdownContainer: { marginTop: 8 },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  breakdownLabel: { fontSize: 14, color: Colors.text, fontWeight: Typography.weights.medium },
  breakdownValue: { fontSize: 12, color: Colors.lightText },
});

export default TotalCaloriesModal;
